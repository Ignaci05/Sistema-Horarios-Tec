// js/modules/docentesData.js (HÍBRIDO: Firestore + MySQL API)

import { db } from './firebase-config.js'; 

const DOCENTES_COLLECTION = 'docentes';
const API_URL = 'http://localhost:3000/api/usuarios'; // URL de tu Backend

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

export const getDocenteById = async (id) => {
    try {
        const doc = await db.collection(DOCENTES_COLLECTION).doc(id).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) { return null; }
};

export const updateDocenteMaterias = async (id, materiasIds) => { /* ... igual ... */ };
export const getDocentesByMateria = async (materiaId) => { /* ... igual ... */ };

/**
 * Guarda Docente en Firestore Y en MySQL (vía API).
 */
export const saveDocente = async (docente) => {
    // Validación
    if (!docente.id && !docente.password) {
        throw new Error("La contraseña es requerida para el registro.");
    }
    
    // 1. Preparar Datos
    const dataToSave = {
        nombre: docente.nombre,
        matricula: docente.matricula.toUpperCase(),
        cargaHoraria: docente.cargaHoraria,
        role: docente.role || 'docente', 
        updatedAt: new Date().toISOString()
    };

    // (Opcional) Guardamos password en Firestore solo como respaldo, 
    // aunque la "verdadera" auth ahora es MySQL.
    if (docente.password && docente.password.trim() !== "") {
        dataToSave.password = docente.password;
    }
    
    try {
        // 2. OPERACIÓN EN MYSQL (Sincronización)
        const method = docente.id ? 'PUT' : 'POST';
        const url = docente.id ? `${API_URL}/${docente.matricula}` : API_URL;
        
        const apiResponse = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: docente.nombre,
                matricula: docente.matricula,
                password: docente.password, // Puede ir vacío si es edición sin cambio
                rol: docente.role
            })
        });

        const apiResult = await apiResponse.json();

        if (!apiResult.success) {
            throw new Error("MySQL Error: " + apiResult.message);
        }

        // 3. OPERACIÓN EN FIRESTORE (Si MySQL tuvo éxito)
        if (docente.id) {
            // Actualizar Firestore
            await db.collection(DOCENTES_COLLECTION).doc(docente.id).update(dataToSave);
            return { id: docente.id, ...dataToSave };
        } else {
            // Crear Firestore
            dataToSave.createdAt = new Date().toISOString();
            const docRef = await db.collection(DOCENTES_COLLECTION).add(dataToSave);
            return { id: docRef.id, ...dataToSave };
        }

    } catch (error) {
        console.error("Error al guardar docente (Sincronización):", error);
        throw new Error(error.message || "Error de sincronización con base de datos.");
    }
};

/**
 * Elimina de Firestore Y de MySQL.
 */
export const deleteDocente = async (id) => {
    try {
        // 1. Obtener la matrícula antes de borrar de Firestore (necesaria para MySQL)
        const docRef = db.collection(DOCENTES_COLLECTION).doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) throw new Error("Docente no encontrado en Firestore.");
        
        const matricula = doc.data().matricula;

        // 2. Borrar de MySQL
        const apiResponse = await fetch(`${API_URL}/${matricula}`, { method: 'DELETE' });
        if (!apiResponse.ok) console.warn("Advertencia: No se pudo borrar de MySQL o ya no existía.");

        // 3. Borrar de Firestore
        await docRef.delete();

    } catch (error) {
        console.error("Error al eliminar docente:", error);
        throw new Error("No se pudo eliminar el docente completamente.");
    }
};