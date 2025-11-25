// js/modules/auth.js

// Importar los módulos de Firebase
import { db } from './firebase-config.js'; 

/**
 * Función que maneja la autenticación consultando la colección 'docentes' en Firestore.
 * Utiliza 'matricula' y 'contraseña' para la validación.
 * * @param {string} matricula - La matrícula del docente (usada como username).
 * @param {string} password - La contraseña.
 * @returns {Promise<string|null>} El rol del usuario ('docente' fijo) o null en caso de error.
 */
export const authenticate = async (matricula, password) => {
    
    try {
        const docentesRef = db.collection('docentes');

        // Normalizar entrada
        const normalizedMatricula = (matricula ?? '').toString().trim();

        // Intenta la búsqueda con la matrícula normalizada, UPPERCASE y lowercase
        let snapshot = await docentesRef
            .where('matricula', '==', normalizedMatricula)
            .limit(1)
            .get();

        if (snapshot.empty) {
            snapshot = await docentesRef.where('matricula', '==', normalizedMatricula.toUpperCase()).limit(1).get();
        }
        
        if (snapshot.empty) {
            snapshot = await docentesRef.where('matricula', '==', normalizedMatricula.toLowerCase()).limit(1).get();
        }

        if (snapshot.empty) {
            console.error('Error de autenticación: Matrícula no encontrada.');
            return null;
        }

        // Obtener los datos del usuario y verificar la contraseña
        const doc = snapshot.docs[0];
        const userData = doc.data();
        console.debug('[auth] Usuario encontrado:', { id: doc.id, ...userData });

        // Comparación de Contraseña (usando contrasena o password)
        const storedPassword = (userData.contrasena ?? userData.password ?? '').toString().trim();
        const givenPassword = (password ?? '').toString().trim();

        if (storedPassword === givenPassword) {
            
            // 3. Éxito: Devolver el rol dinámicamente.
            // Si el campo 'role' existe, lo usa; de lo contrario, asume 'docente' como fallback.
            const userRole = userData.role || 'docente'; 

            return {
                role: userRole,
                uid: doc.id, // El ID del documento en Firestore
                nombre: userData.nombre
            };
        } else {
            console.error("Error de autenticación: Contraseña incorrecta.");
            return null;
        }

    } catch (error) {
        console.error("Error al buscar usuario en Firestore:", error.message);
        return null;
    }
};

/**
 * Función de depuración: devuelve todos los documentos que coinciden con una matrícula
 * (intenta exact, UPPERCASE y lowercase). Útil para desarrollo.
 */
export const findDocsByMatricula = async (matricula) => {
    try {
        const docentesRef = db.collection('docentes');
        const rawMatricula = (matricula ?? '').toString();
        const normalizedMatricula = rawMatricula.trim();

        const results = [];

        const q1 = await docentesRef.where('matricula', '==', normalizedMatricula).get();
        q1.forEach(d => results.push({ id: d.id, data: d.data() }));

        if (results.length === 0) {
            const q2 = await docentesRef.where('matricula', '==', normalizedMatricula.toUpperCase()).get();
            q2.forEach(d => results.push({ id: d.id, data: d.data() }));
        }

        if (results.length === 0) {
            const q3 = await docentesRef.where('matricula', '==', normalizedMatricula.toLowerCase()).get();
            q3.forEach(d => results.push({ id: d.id, data: d.data() }));
        }

        return results;
    } catch (err) {
        console.error('[auth][debug] Error buscando docs:', err.message || err);
        return [];
    }
};

/**
 * Función para simular el cierre de sesión (solo limpia el almacenamiento local).
 */
export const logout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName'); 
    localStorage.removeItem('userUID');
    window.location.href = 'index.html'; 
};