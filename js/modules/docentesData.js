// js/modules/docentesData.js

import { db } from './firebase-config.js'; 

const DOCENTES_COLLECTION = 'docentes';

/**
 * Obtiene todos los docentes de Firestore.
 * @returns {Promise<Array>} Lista de objetos Docente.
 */
export const getDocentes = async () => {
    try {
        const snapshot = await db.collection(DOCENTES_COLLECTION).get();
        const docentes = [];
        snapshot.forEach(doc => {
            docentes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return docentes;
    } catch (error) {
        console.error("Error al obtener docentes:", error);
        return [];
    }
};

/**
 * Guarda o actualiza un docente en Firestore.
 * @param {Object} docente - Objeto del docente.
 * @returns {Promise<Object>} El docente guardado con su ID.
 */
export const saveDocente = async (docente) => {
    // ⚠️ Nota: La contraseña no debe estar vacía y debe tener el rol.
    if (!docente.password) {
        throw new Error("La contraseña es requerida para el registro.");
    }
    
    const dataToSave = {
        nombre: docente.nombre,
        matricula: docente.matricula.toUpperCase(), // Estandarizar la matrícula
        cargaHoraria: docente.cargaHoraria,
        // Al crearse, todos son docentes por defecto. El Subdirector debe cambiar el rol si es necesario.
        role: docente.role || 'docente', 
        password: docente.password, // Solo para simulación de autenticación (no segura)
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (docente.id) {
            // Actualizar (EDITAR)
            await db.collection(DOCENTES_COLLECTION).doc(docente.id).update(dataToSave);
            return { id: docente.id, ...dataToSave };
        } else {
            // Crear (NUEVO)
            dataToSave.createdAt = new Date().toISOString();
            const docRef = await db.collection(DOCENTES_COLLECTION).add(dataToSave);
            return { id: docRef.id, ...dataToSave };
        }
    } catch (error) {
        console.error("Error al guardar docente:", error);
        throw new Error("No se pudo guardar el docente. Verifique la matrícula.");
    }
};

/**
 * Elimina un docente por ID.
 */
export const deleteDocente = async (id) => {
    try {
        await db.collection(DOCENTES_COLLECTION).doc(id).delete();
    } catch (error) {
        console.error("Error al eliminar docente:", error);
        throw new Error("No se pudo eliminar el docente.");
    }
};