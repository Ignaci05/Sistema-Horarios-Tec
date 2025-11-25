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
    // Validación 1: Al CREAR (sin ID), la contraseña es obligatoria.
    if (!docente.id && !docente.password) {
        throw new Error("La contraseña es requerida para el registro nuevo.");
    }
    
    const dataToSave = {
        nombre: docente.nombre,
        matricula: docente.matricula.toUpperCase(),
        cargaHoraria: docente.cargaHoraria,
        role: docente.role || 'docente', 
        updatedAt: new Date().toISOString()
    };

    // Lógica de Contraseña:
    // Solo la agregamos al objeto a guardar si NO está vacía.
    if (docente.password && docente.password.trim() !== "") {
        dataToSave.password = docente.password;
    }
    
    try {
        if (docente.id) {
            // ACTUALIZAR (EDITAR)
            // Firestore .update(dataToSave) solo actualizará los campos presentes en dataToSave.
            // Si dataToSave.password no existe (porque venía vacía), la password vieja se mantiene intacta en la BD.
            await db.collection(DOCENTES_COLLECTION).doc(docente.id).update(dataToSave);
            return { id: docente.id, ...dataToSave };
        } else {
            // CREAR (NUEVO)
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