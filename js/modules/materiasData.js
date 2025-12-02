// js/modules/materiasData.js

import { db } from './firebase-config.js';

const MATERIAS_COLLECTION = 'materias';

/**
 * Obtiene todas las materias de Firestore.
 */
export const getMaterias = async () => {
    try {
        // 1. Quitamos el orderBy de la consulta a Firestore
        const snapshot = await db.collection(MATERIAS_COLLECTION).get();

        const materias = [];
        snapshot.forEach(doc => {
            materias.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // 2. Ordenamos aquí con JavaScript
        // Si no tiene semestre, asumimos 0 para que salga al principio
        materias.sort((a, b) => {
            const semA = parseInt(a.semestre) || 0;
            const semB = parseInt(b.semestre) || 0;
            return semA - semB;
        });

        return materias;
    } catch (error) {
        console.error("Error al obtener materias:", error);
        return [];
    }
};

/**
 * Guarda o actualiza una materia.
 */
export const saveMateria = async (materia) => {
    // Validaciones
    if (!materia.nombre) throw new Error("El nombre es obligatorio.");
    if (!materia.horasSemanales) throw new Error("Las horas semanales son obligatorias.");
    if (!materia.creditos) throw new Error("Los créditos son obligatorios.");
    if (!materia.semestre) throw new Error("Debes seleccionar un semestre.");

    const dataToSave = {
        nombre: materia.nombre,
        horasSemanales: parseInt(materia.horasSemanales),
        creditos: parseInt(materia.creditos),
        semestre: parseInt(materia.semestre), // 🆕 Nuevo campo
        updatedAt: new Date().toISOString()
    };

    try {
        if (materia.id) {
            // Editar
            await db.collection(MATERIAS_COLLECTION).doc(materia.id).update(dataToSave);
            return { id: materia.id, ...dataToSave };
        } else {
            // Crear
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
 */
export const deleteMateria = async (id) => {
    try {
        await db.collection(MATERIAS_COLLECTION).doc(id).delete();
    } catch (error) {
        console.error("Error al eliminar materia:", error);
        throw new Error("No se pudo eliminar la materia.");
    }
};