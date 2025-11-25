// js/modules/materiasData.js

import { db } from './firebase-config.js'; 

const MATERIAS_COLLECTION = 'materias';

/**
 * Obtiene todas las materias de Firestore.
 * @returns {Promise<Array>} Lista de objetos Materia.
 */
export const getMaterias = async () => {
    try {
        const snapshot = await db.collection(MATERIAS_COLLECTION).get();
        const materias = [];
        snapshot.forEach(doc => {
            materias.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return materias;
    } catch (error) {
        console.error("Error al obtener materias:", error);
        return [];
    }
};

/**
 * Guarda o actualiza una materia en Firestore.
 * @param {Object} materia - Objeto de materia con o sin ID.
 * @returns {Promise<Object>} La materia guardada con su ID.
 */
export const saveMateria = async (materia) => {
    const dataToSave = {
        nombre: materia.nombre,
        horasSemanales: parseInt(materia.horasSemanales),
        creditos: parseInt(materia.creditos),
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (materia.id) {
            // Actualizar (EDITAR)
            await db.collection(MATERIAS_COLLECTION).doc(materia.id).update(dataToSave);
            return { id: materia.id, ...dataToSave };
        } else {
            // Crear (NUEVA)
            dataToSave.createdAt = new Date().toISOString();
            const docRef = await db.collection(MATERIAS_COLLECTION).add(dataToSave);
            return { id: docRef.id, ...dataToSave };
        }
    } catch (error) {
        console.error("Error al guardar materia:", error);
        throw new Error("No se pudo guardar la materia.");
    }
};

/**
 * Elimina una materia por ID.
 * @param {string} id - ID del documento en Firestore.
 */
export const deleteMateria = async (id) => {
    try {
        await db.collection(MATERIAS_COLLECTION).doc(id).delete();
    } catch (error) {
        console.error("Error al eliminar materia:", error);
        throw new Error("No se pudo eliminar la materia.");
    }
};