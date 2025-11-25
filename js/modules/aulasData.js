// js/modules/aulasData.js

import { db } from './firebase-config.js'; 

const AULAS_COLLECTION = 'aulas';

/**
 * Obtiene todas las aulas de Firestore.
 * @returns {Promise<Array>} Lista de objetos Aula.
 */
export const getAulas = async () => {
    try {
        const snapshot = await db.collection(AULAS_COLLECTION).get();
        const aulas = [];
        snapshot.forEach(doc => {
            aulas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return aulas;
    } catch (error) {
        console.error("Error al obtener aulas:", error);
        return []; // ⚠️ Importante: Devolver array vacío para evitar errores en la vista
    }
};

/**
 * Guarda o actualiza un aula en Firestore.
 * @param {Object} aula - Objeto del aula.
 * @returns {Promise<Object>} El aula guardada con su ID.
 */
export const saveAula = async (aula) => {
    const dataToSave = {
        nombre: aula.nombre,
        capacidad: parseInt(aula.capacidad),
        tipo: aula.tipo,
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (aula.id) {
            // Actualizar (EDITAR)
            await db.collection(AULAS_COLLECTION).doc(aula.id).update(dataToSave);
            return { id: aula.id, ...dataToSave };
        } else {
            // Crear (NUEVA)
            dataToSave.createdAt = new Date().toISOString();
            const docRef = await db.collection(AULAS_COLLECTION).add(dataToSave);
            return { id: docRef.id, ...dataToSave };
        }
    } catch (error) {
        console.error("Error al guardar aula:", error);
        throw new Error("No se pudo guardar el aula.");
    }
};

/**
 * Elimina un aula por ID.
 * @param {string} id - ID del documento.
 */
export const deleteAula = async (id) => {
    try {
        await db.collection(AULAS_COLLECTION).doc(id).delete();
    } catch (error) {
        console.error("Error al eliminar aula:", error);
        throw new Error("No se pudo eliminar el aula.");
    }
};