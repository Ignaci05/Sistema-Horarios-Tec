// js/modules/docentesData.js (VERSIÓN SOLO FIREBASE)

import { db } from './firebase-config.js'; 

const DOCENTES_COLLECTION = 'docentes';

/**
 * Obtiene todos los docentes.
 */
export const getDocentes = async () => {
    try {
        const snapshot = await db.collection(DOCENTES_COLLECTION).get();
        const docentes = [];
        snapshot.forEach(doc => {
            docentes.push({ id: doc.id, ...doc.data() });
        });
        return docentes;
    } catch (error) {
        console.error("Error al obtener docentes:", error);
        return [];
    }
};

/**
 * Obtiene un docente por ID.
 */
export const getDocenteById = async (id) => {
    try {
        const doc = await db.collection(DOCENTES_COLLECTION).doc(id).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
        return null;
    } catch (error) { return null; }
};

/**
 * Busca docente por matrícula.
 */
export const getDocenteByMatricula = async (matricula) => {
    try {
        const mat = (matricula || '').trim();
        let snapshot = await db.collection(DOCENTES_COLLECTION).where('matricula', '==', mat).limit(1).get();
        
        if (snapshot.empty) snapshot = await db.collection(DOCENTES_COLLECTION).where('matricula', '==', mat.toUpperCase()).limit(1).get();
        
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) { return null; }
};

/**
 * Actualiza materias capacitadas.
 */
export const updateDocenteMaterias = async (id, materiasIds) => {
    try {
        await db.collection(DOCENTES_COLLECTION).doc(id).update({
            materiasCapacitadas: materiasIds,
            updatedAt: new Date().toISOString()
        });
    } catch (error) { throw new Error("Error al guardar materias."); }
};

/**
 * Filtra docentes por materia (en memoria).
 */
export const getDocentesByMateria = async (materiaId) => {
    try {
        const snapshot = await db.collection(DOCENTES_COLLECTION).get();
        const aptos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.materiasCapacitadas && Array.isArray(data.materiasCapacitadas) && data.materiasCapacitadas.includes(materiaId)) {
                aptos.push({ id: doc.id, ...data });
            }
        });
        return aptos;
    } catch (error) { return []; }
};

/**
 * Guarda Docente (Crear/Editar) SOLO en Firestore.
 */
export const saveDocente = async (docente) => {
    // Validación
    if (!docente.id && !docente.password) {
        throw new Error("La contraseña es requerida para el registro.");
    }
    
    const dataToSave = {
        nombre: docente.nombre,
        matricula: docente.matricula.toUpperCase(),
        cargaHoraria: docente.cargaHoraria,
        role: docente.role || 'docente', 
        updatedAt: new Date().toISOString()
    };

    // Guardamos la contraseña en Firestore porque es nuestro único método de auth
    if (docente.password && docente.password.trim() !== "") {
        dataToSave.password = docente.password;
    }
    
    try {
        if (docente.id) {
            // EDITAR
            await db.collection(DOCENTES_COLLECTION).doc(docente.id).update(dataToSave);
            return { id: docente.id, ...dataToSave };
        } else {
            // CREAR (Verificar duplicados manualmente)
            const exists = await getDocenteByMatricula(dataToSave.matricula);
            if (exists) throw new Error("La matrícula ya está registrada.");

            dataToSave.createdAt = new Date().toISOString();
            const docRef = await db.collection(DOCENTES_COLLECTION).add(dataToSave);
            return { id: docRef.id, ...dataToSave };
        }
    } catch (error) {
        console.error("Error al guardar docente:", error);
        throw error;
    }
};

/**
 * Elimina Docente SOLO de Firestore.
 */
export const deleteDocente = async (id) => {
    try {
        await db.collection(DOCENTES_COLLECTION).doc(id).delete();
    } catch (error) {
        console.error("Error al eliminar:", error);
        throw new Error("No se pudo eliminar el docente.");
    }
};