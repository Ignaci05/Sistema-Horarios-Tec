// js/modules/auth.js (VERSIÓN SOLO FIREBASE)

import { db } from './firebase-config.js'; 

/**
 * Autentica al usuario consultando directamente Firestore.
 */
export const authenticate = async (matricula, password) => {
    try {
        const docentesRef = db.collection('docentes');
        const normalizedMatricula = (matricula ?? '').toString().trim();

        console.log(`[Auth] Buscando usuario: ${normalizedMatricula} en Firestore...`);

        // 1. Estrategia de Búsqueda Robusta (Exacta -> Mayúsculas -> Minúsculas)
        let snapshot = await docentesRef.where('matricula', '==', normalizedMatricula).limit(1).get();

        if (snapshot.empty) {
            snapshot = await docentesRef.where('matricula', '==', normalizedMatricula.toUpperCase()).limit(1).get();
        }
        if (snapshot.empty) {
            snapshot = await docentesRef.where('matricula', '==', normalizedMatricula.toLowerCase()).limit(1).get();
        }

        if (snapshot.empty) {
            console.warn('[Auth] Matrícula no encontrada.');
            return null; // Usuario no existe
        }

        // 2. Validar Contraseña
        const doc = snapshot.docs[0];
        const userData = doc.data();
        
        // Soporte para campo 'password' o 'contrasena'
        const storedPassword = (userData.password ?? userData.contrasena ?? '').toString().trim();
        const givenPassword = (password ?? '').toString().trim();

        if (storedPassword === givenPassword) {
            console.log("[Auth] Login exitoso.");
            
            // Determinar rol (fallback a 'docente' si no existe)
            const userRole = userData.role || userData.rol || 'docente'; 

            return {
                role: userRole,
                uid: doc.id,
                nombre: userData.nombre,
                matricula: userData.matricula // Importante para el perfil
            };
        } else {
            console.warn('[Auth] Contraseña incorrecta.');
            return null;
        }

    } catch (error) {
        console.error("Error crítico en autenticación:", error);
        alert("Error de conexión con Firebase. Revisa tu internet.");
        return null;
    }
};

export const logout = () => {
    localStorage.clear(); // Limpia todo (rol, uid, matricula)
    window.location.href = 'index.html'; 
};