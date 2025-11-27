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

/**
 * Obtiene un docente específico por su ID (UID).
 */
export const getDocenteById = async (id) => {
    try {
        const doc = await db.collection(DOCENTES_COLLECTION).doc(id).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error("Error al obtener docente:", error);
        return null;
    }
};

/**
 * Actualiza la lista de materias que el docente puede impartir (RF 23).
 * @param {string} id - ID del docente.
 * @param {Array} materiasIds - Array de IDs de materias seleccionadas.
 */
export const updateDocenteMaterias = async (id, materiasIds) => {
    try {
        await db.collection(DOCENTES_COLLECTION).doc(id).update({
            materiasCapacitadas: materiasIds,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error al actualizar capacidades:", error);
        throw new Error("No se pudo guardar la selección de materias.");
    }
};

/**
 * Obtiene los docentes capacitados para una materia específica.
 * @param {string} materiaId - ID de la materia.
 * @returns {Promise<Array>} Lista de docentes aptos.
 */
export const getDocentesByMateria = async (materiaId) => {
    try {
        const allDocentes = await getDocentes(); // Reutilizamos la función base
        // Filtramos en memoria porque 'materiasCapacitadas' es un array
        return allDocentes.filter(d => 
            d.materiasCapacitadas && d.materiasCapacitadas.includes(materiaId)
        );
    } catch (error) {
        console.error("Error al filtrar docentes:", error);
        return [];
    }
};