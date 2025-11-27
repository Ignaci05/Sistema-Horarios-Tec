// js/modules/auth.js

const API_URL = 'http://localhost:3000/api/login';

export const authenticate = async (matricula, password) => {
    console.log("1. Intentando conectar a:", API_URL);
    console.log("2. Datos enviados:", { matricula, password });

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                matricula: matricula.trim(), 
                password: password.trim() 
            })
        });

        console.log("3. Respuesta del servidor recibida. Status:", response.status);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log("4. Datos recibidos:", data);

        if (data.success) {
            return {
                role: data.user.role,
                uid: data.user.uid.toString(),
                nombre: data.user.nombre
            };
        } else {
            return null;
        }

    } catch (error) {
        console.error("❌ Error CRÍTICO en auth.js:", error);
        
        // Mensaje amigable según el tipo de error
        if (error.message.includes("Failed to fetch")) {
            alert("Error de Conexión: No se puede contactar al servidor (Backend).\n\n1. ¿Ejecutaste 'node server.js'?\n2. ¿Está corriendo en el puerto 3000?");
        } else {
            alert(`Error de Login: ${error.message}`);
        }
        return null;
    }
};

export const logout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName'); 
    localStorage.removeItem('userUID');
    window.location.href = 'index.html'; 
};