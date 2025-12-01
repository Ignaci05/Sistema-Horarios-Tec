// js/modules/docentesData.js (VERSIÓN FINAL Y ROBUSTA)

import { db } from './firebase-config.js'; 

const DOCENTES_COLLECTION = 'docentes';
// Ajusta la URL si ya estás en producción o sigues en local
const API_URL = 'http://localhost:3000/api/usuarios'; 

/**
 * Obtiene todos los docentes de Firestore.
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
 * Obtiene un docente específico por su ID (UID de Firestore).
 */
export const getDocenteById = async (id) => {
    try {
        const doc = await db.collection(DOCENTES_COLLECTION).doc(id).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) { 
        console.error("Error getDocenteById:", error);
        return null; 
    }
};

/**
 * 🔍 BUSQUEDA ROBUSTA POR MATRÍCULA (Solución a tu error)
 * Intenta encontrar al docente probando exacto, mayúsculas y minúsculas.
 */
export const getDocenteByMatricula = async (matricula) => {
    try {
        const mat = (matricula || '').trim();
        const collection = db.collection(DOCENTES_COLLECTION);

        // 1. Intento Exacto
        let snapshot = await collection.where('matricula', '==', mat).limit(1).get();
        
        // 2. Intento Mayúsculas (D-003)
        if (snapshot.empty) {
            snapshot = await collection.where('matricula', '==', mat.toUpperCase()).limit(1).get();
        }

        // 3. Intento Minúsculas (d-003)
        if (snapshot.empty) {
            snapshot = await collection.where('matricula', '==', mat.toLowerCase()).limit(1).get();
        }

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        
        console.warn(`[DocentesData] No se encontró docente con matrícula: ${matricula}`);
        return null;

    } catch (error) {
        console.error("Error al buscar docente por matrícula:", error);
        return null;
    }
};

/**
 * Actualiza la lista de materias que el docente puede impartir.
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
    } catch (error) {
        console.error("Error al filtrar docentes:", error);
        return [];
    }
};

/**
 * Guarda Docente en Firestore Y en MySQL (Sincronización).
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

    if (docente.password && docente.password.trim() !== "") {
        dataToSave.password = docente.password;
    }
    
    try {
        // Operación MySQL
        const method = docente.id ? 'PUT' : 'POST';
        const url = docente.id ? `${API_URL}/${docente.matricula}` : API_URL;
        
        const apiResponse = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: docente.nombre,
                matricula: docente.matricula,
                password: docente.password,
                rol: docente.role
            })
        });

        const apiResult = await apiResponse.json();

        if (!apiResult.success) {
            throw new Error("MySQL Error: " + apiResult.message);
        }

        // Operación Firestore
        if (docente.id) {
            await db.collection(DOCENTES_COLLECTION).doc(docente.id).update(dataToSave);
            return { id: docente.id, ...dataToSave };
        } else {
            dataToSave.createdAt = new Date().toISOString();
            const docRef = await db.collection(DOCENTES_COLLECTION).add(dataToSave);
            return { id: docRef.id, ...dataToSave };
        }

    } catch (error) {
        console.error("Error al guardar docente:", error);
        throw new Error(error.message || "Error de sincronización.");
    }
};

/**
 * Elimina de Firestore Y de MySQL.
 */
export const deleteDocente = async (id) => {
    try {
        const docRef = db.collection(DOCENTES_COLLECTION).doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) throw new Error("Docente no encontrado en Firestore.");
        const matricula = doc.data().matricula;

        // MySQL
        await fetch(`${API_URL}/${matricula}`, { method: 'DELETE' });

        // Firestore
        await docRef.delete();

    } catch (error) {
        console.error("Error al eliminar docente:", error);
        throw new Error("No se pudo eliminar el docente.");
    }
};