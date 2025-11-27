// js/login-controller.js

// 🛑 CORRECCIÓN: Solo importamos 'authenticate'. Eliminamos 'findDocsByMatricula' que ya no existe.
import { authenticate } from './modules/auth.js'; 

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Si ya hay sesión, redirigir
    if (localStorage.getItem('userRole')) {
        window.location.href = 'dashboard.html';
        return;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 
            
            if (errorMessage) {
                errorMessage.textContent = '';
                errorMessage.style.display = 'none';
            }

            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const loginButton = document.querySelector('button[type="submit"]');

            const matricula = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            // Feedback visual
            const originalBtnText = loginButton.textContent;
            loginButton.textContent = 'Verificando...';
            loginButton.disabled = true;

            try {
                // Llamada al nuevo auth.js (que conecta con MySQL)
                const authResult = await authenticate(matricula, password);

                if (authResult) {
                    // Guardar sesión
                    localStorage.setItem('userRole', authResult.role);
                    localStorage.setItem('userName', authResult.nombre);
                    localStorage.setItem('userUID', authResult.uid);
                    
                    window.location.href = 'dashboard.html'; 
                } else {
                    throw new Error('Credenciales incorrectas');
                }
            } catch (error) {
                if (errorMessage) {
                    errorMessage.textContent = 'Usuario o contraseña incorrectos.';
                    errorMessage.style.display = 'block';
                } else {
                    alert('Usuario o contraseña incorrectos.');
                }
                console.error(error);
            } finally {
                // Restaurar botón
                loginButton.textContent = originalBtnText;
                loginButton.disabled = false;
            }
        });
    }
});