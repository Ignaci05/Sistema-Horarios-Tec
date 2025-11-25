// js/modules/gruposData.js

import { db } from './firebase-config.js'; 

const GRUPOS_COLLECTION = 'grupos';

export const getGrupos = async () => {
    try {
        const snapshot = await db.collection(GRUPOS_COLLECTION).get();
        const grupos = [];
        snapshot.forEach(doc => {
            grupos.push({ id: doc.id, ...doc.data() });
        });
        return grupos;
    } catch (error) {
        console.error("Error al obtener grupos:", error);
        return [];
    }
};

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
        console.error("Error disponibilidad:", error);
        return [];
    }
};

export const saveGrupo = async (grupo) => {
    // Validaciones
    if (!grupo.materiaId) throw new Error("Debes seleccionar una Materia."); // 🆕 Validación Materia
    if (!grupo.aulaId) throw new Error("Debes asignar un Aula.");
    if (!grupo.horario || grupo.horario.length === 0) throw new Error("Selecciona un horario.");
    if (!grupo.nombre) throw new Error("Asigna un nombre al grupo (Ej: A, B, 101).");

    const numAlumnos = parseInt(grupo.numAlumnos);
    if (isNaN(numAlumnos) || numAlumnos < 7) throw new Error("Mínimo 7 alumnos requeridos.");

    let divisionRequired = numAlumnos > 30;

    const dataToSave = {
        nombre: grupo.nombre, // Ej: "Grupo A"
        // 🆕 Guardamos datos de la Materia
        materiaId: grupo.materiaId,
        materiaNombre: grupo.materiaNombre, 
        // Datos de Aula y Alumnos
        aulaId: grupo.aulaId,
        aulaNombre: grupo.aulaNombre,
        numAlumnos: numAlumnos,
        divisionRequired: divisionRequired,
        horario: grupo.horario,
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (grupo.id) {
            await db.collection(GRUPOS_COLLECTION).doc(grupo.id).update(dataToSave);
            return { id: grupo.id, ...dataToSave };
        } else {
            dataToSave.createdAt = new Date().toISOString();
            await db.collection(GRUPOS_COLLECTION).add(dataToSave);
            return { id: null, ...dataToSave }; // ID se genera auto, retorno simplificado
        }
    } catch (error) {
        console.error("Error saveGrupo:", error);
        throw new Error("Error al guardar.");
    }
};

export const deleteGrupo = async (id) => {
    await db.collection(GRUPOS_COLLECTION).doc(id).delete();
};

export const divideGrupo = async (grupoId, originalNumAlumnos) => {
    try {
        const docRef = await db.collection(GRUPOS_COLLECTION).doc(grupoId).get();
        const d = docRef.data();
        const baseName = d.nombre || 'Div';
        
        const numSubGrupos = Math.ceil(originalNumAlumnos / 30);
        const newSize = Math.floor(originalNumAlumnos / numSubGrupos);

        await db.collection(GRUPOS_COLLECTION).doc(grupoId).delete();

        for (let i = 1; i <= numSubGrupos; i++) {
            const data = {
                ...d, // Heredar Materia y Aula
                nombre: `${baseName} (${i})`,
                numAlumnos: newSize,
                divisionRequired: false,
                horario: [], // Limpiar horario para evitar conflicto
                createdAt: new Date().toISOString()
            };
            await db.collection(GRUPOS_COLLECTION).add(data);
        }
    } catch (error) {
        throw new Error("Error al dividir.");
    }
};