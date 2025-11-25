// js/views/dashboard.js (Controlador de Login)

import { authenticate } from '../js/modules/auth.js'; 

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Comprobar si ya estamos en el Dashboard con una sesión activa
    if (document.body.classList.contains('dashboard-layout')) {
        // Lógica de carga de Dashboard (se implementará en el siguiente paso)
        return; 
    }

    // Lógica para el formulario de Login (solo en index.html)
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';

            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            const matricula = usernameInput.value.trim();
            const password = passwordInput.value;

            // Deshabilitar botón mientras autentica
            const loginButton = document.querySelector('.btn-primary');
            loginButton.textContent = 'Verificando...';
            loginButton.disabled = true;

            // Llamada a la función asíncrona de autenticación
            const authResult = await authenticate(matricula, password);

            if (authResult) {
                // Éxito: authResult es { role, uid, nombre }
                localStorage.setItem('userRole', authResult.role);
                localStorage.setItem('userName', authResult.nombre);
                localStorage.setItem('userUID', authResult.uid);
                
                // Redirigir al dashboard
                window.location.href = 'dashboard.html'; 
            } else {
                // Fallo
                errorMessage.textContent = 'Matrícula o Contraseña incorrecta.';
                errorMessage.style.display = 'block';
            }

            // Habilitar botón y restaurar texto
            loginButton.textContent = 'Acceder';
            loginButton.disabled = false;
        });
    }
});