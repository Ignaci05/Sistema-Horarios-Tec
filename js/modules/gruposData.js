// js/modules/gruposData.js

import { db } from './firebase-config.js'; 

const GRUPOS_COLLECTION = 'grupos';
const DOCENTES_COLLECTION = 'docentes';

/**
 * Obtiene todos los grupos de Firestore.
 */
export const getGrupos = async () => {
    try {
        const snapshot = await db.collection(GRUPOS_COLLECTION).get();
        const grupos = [];
        snapshot.forEach(doc => {
            grupos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return grupos;
    } catch (error) {
        console.error("Error al obtener grupos:", error);
        return [];
    }
};

/**
 * Obtiene los horarios ocupados para un aula específica.
 * Se usa para bloquear casillas en la UI.
 */
export const getOccupiedSlots = async (aulaId, excludeGrupoId = null) => {
    try {
        const snapshot = await db.collection(GRUPOS_COLLECTION).where('aulaId', '==', aulaId).get();
        let occupied = [];

        snapshot.forEach(doc => {
            if (doc.id === excludeGrupoId) return;

            const data = doc.data();
            if (data.horario && Array.isArray(data.horario)) {
                occupied = occupied.concat(data.horario);
            }
        });
        return occupied;
    } catch (error) {
        console.error("Error al verificar disponibilidad de aula:", error);
        return [];
    }
};

/**
 * Verifica si un docente tiene conflictos de horario en otros grupos.
 */
export const checkDocenteAvailability = async (docenteId, proposedSchedule, excludeGrupoId = null) => {
    try {
        const snapshot = await db.collection(GRUPOS_COLLECTION).where('docenteId', '==', docenteId).get();
        let occupiedSlots = [];
        
        snapshot.forEach(doc => {
            if (doc.id === excludeGrupoId) return;
            const data = doc.data();
            if (data.horario) {
                occupiedSlots = occupiedSlots.concat(data.horario);
            }
        });

        // Si hay intersección entre el horario propuesto y el ocupado, hay conflicto.
        const hasConflict = proposedSchedule.some(slot => occupiedSlots.includes(slot));
        return !hasConflict; // Retorna TRUE si está disponible
    } catch (error) {
        console.error("Error verificando docente:", error);
        return false; 
    }
};

/**
 * Valida que el docente no exceda su carga horaria máxima contractual (RF 35, 36).
 */
const validateDocenteWorkload = async (docenteId, newHoursCount, excludeGrupoId) => {
    try {
        // 1. Obtener información del docente (Límite)
        const docRef = await db.collection(DOCENTES_COLLECTION).doc(docenteId).get();
        if (!docRef.exists) throw new Error("Docente no encontrado.");
        
        const docenteData = docRef.data();
        const tipoCarga = docenteData.cargaHoraria || ""; // Ej: "8-18" o "20-22"
        
        // Determinar límite máximo basado en el string
        let maxHours = 0;
        if (tipoCarga.includes("18")) maxHours = 18;
        else if (tipoCarga.includes("22")) maxHours = 22;
        else maxHours = 40; // Fallback si no está definido, para no bloquear

        // 2. Calcular horas actuales ocupadas en OTROS grupos
        const snapshot = await db.collection(GRUPOS_COLLECTION).where('docenteId', '==', docenteId).get();
        let currentHours = 0;

        snapshot.forEach(g => {
            if (g.id === excludeGrupoId) return; // Ignorar el grupo actual si es edición
            
            const gData = g.data();
            if (gData.horario && Array.isArray(gData.horario)) {
                currentHours += gData.horario.length;
            }
        });

        const totalHours = currentHours + newHoursCount;

        console.log(`[Validación Carga] Actual: ${currentHours}, Nuevo: ${newHoursCount}, Total: ${totalHours}, Máx: ${maxHours}`);

        if (totalHours > maxHours) {
            throw new Error(`El docente excedería su carga máxima (${maxHours} hrs). Total proyectado: ${totalHours} hrs.`);
        }

        return true; // Validación exitosa

    } catch (error) {
        console.error("Error validando carga:", error);
        throw error; // Re-lanzar para que saveGrupo lo capture y muestre la alerta
    }
};

/**
 * Crea o actualiza un grupo.
 */
export const saveGrupo = async (grupo) => {
    // --- VALIDACIONES BÁSICAS ---
    if (!grupo || !grupo.numAlumnos) throw new Error("Por favor ingresa el número de alumnos.");
    if (!grupo.materiaId) throw new Error("Debes seleccionar una Materia.");
    if (!grupo.aulaId) throw new Error("Debes asignar un Aula al grupo.");
    if (!grupo.docenteId) throw new Error("Debes asignar un Docente al grupo.");

    if (!grupo.horario || !Array.isArray(grupo.horario) || grupo.horario.length === 0) {
        throw new Error("Debes seleccionar al menos un horario en la cuadrícula.");
    }

    // --- VALIDACIÓN DE CARGA HORARIA ---
    await validateDocenteWorkload(grupo.docenteId, grupo.horario.length, grupo.id);

    // --- VALIDACIÓN DE TAMAÑO ---
    const numAlumnos = parseInt(grupo.numAlumnos);
    if (isNaN(numAlumnos)) throw new Error("El número de alumnos debe ser válido.");

    if (numAlumnos < 7) throw new Error("El grupo debe tener un mínimo de 7 alumnos.");
    
    let divisionRequired = false;
    if (numAlumnos > 30) {
        divisionRequired = true;
    }

    // --- PREPARAR DATA ---
    const dataToSave = {
        nombre: grupo.nombre || 'Sin Nombre',
        numAlumnos: numAlumnos,
        divisionRequired: divisionRequired,
        
        // Relaciones
        materiaId: grupo.materiaId,
        materiaNombre: grupo.materiaNombre || 'Materia',
        aulaId: grupo.aulaId,
        aulaNombre: grupo.aulaNombre || 'Aula',
        docenteId: grupo.docenteId,
        docenteNombre: grupo.docenteNombre || 'Docente',

        horario: grupo.horario, 
        updatedAt: new Date().toISOString()
    };
    
    // --- GUARDAR EN FIRESTORE ---
    try {
        if (grupo.id) {
            // Actualizar
            await db.collection(GRUPOS_COLLECTION).doc(grupo.id).update(dataToSave);
            return { id: grupo.id, ...dataToSave };
        } else {
            // Crear
            dataToSave.createdAt = new Date().toISOString();
            const docRef = await db.collection(GRUPOS_COLLECTION).add(dataToSave);
            return { id: docRef.id, ...dataToSave };
        }
    } catch (error) {
        console.error("Error al guardar grupo:", error);
        throw error; // Lanzar error original para mantener el mensaje de validación
    }
};

/**
 * Elimina un grupo por ID.
 */
export const deleteGrupo = async (id) => {
    try {
        await db.collection(GRUPOS_COLLECTION).doc(id).delete();
    } catch (error) {
        console.error("Error al eliminar grupo:", error);
        throw new Error("No se pudo eliminar el grupo.");
    }
};

/**
 * Simula la división de un grupo grande (RF 44).
 */
export const divideGrupo = async (grupoId, originalNumAlumnos) => {
    try {
        const docRef = await db.collection(GRUPOS_COLLECTION).doc(grupoId).get();
        const d = docRef.data(); // Datos originales
        
        const baseName = d.nombre || 'Grupo Dividido';
        const numSubGrupos = Math.ceil(originalNumAlumnos / 30);
        const newSize = Math.floor(originalNumAlumnos / numSubGrupos);

        // 1. Eliminar el grupo original
        await db.collection(GRUPOS_COLLECTION).doc(grupoId).delete();

        // 2. Crear los nuevos subgrupos (Heredan todo MENOS el horario para evitar choques)
        for (let i = 1; i <= numSubGrupos; i++) {
            const data = {
                ...d, // Copia materia, aula, docente
                nombre: `${baseName} (${i}/${numSubGrupos})`,
                numAlumnos: newSize,
                divisionRequired: false,
                horario: [], // ⚠️ Se limpia el horario para reasignar manualmente
                createdAt: new Date().toISOString()
            };
            delete data.id; // Asegurar que no se intente guardar con ID viejo
            
            await db.collection(GRUPOS_COLLECTION).add(data);
        }
    } catch (error) {
        console.error("Error en división:", error);
        throw new Error("Error al dividir los grupos.");
    }
};