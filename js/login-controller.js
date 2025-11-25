// js/login-controller.js

import { authenticate, findDocsByMatricula } from './modules/auth.js'; 

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // 🛑 IMPORTANTE: Si ya hay una sesión (userRole), redirecciona inmediatamente para EVITAR el ciclo.
    if (localStorage.getItem('userRole')) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Lógica para el formulario de Login (solo si no hay sesión)
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';

            const matricula = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            // Deshabilitar botón mientras autentica
            const loginButton = document.querySelector('.btn-primary');
            loginButton.textContent = 'Verificando...';
            loginButton.disabled = true;

            const authResult = await authenticate(matricula, password);

            if (authResult) {
                // Éxito: Guardar los datos de la sesión
                localStorage.setItem('userRole', authResult.role);
                localStorage.setItem('userName', authResult.nombre);
                localStorage.setItem('userUID', authResult.uid);
                
                window.location.href = 'dashboard.html'; 
            } else {
                // Fallo
                errorMessage.textContent = 'Matrícula o Contraseña incorrecta.';
                errorMessage.style.display = 'block';
            }

            loginButton.textContent = 'Acceder';
            loginButton.disabled = false;
        });
    }

    // Botón temporal de depuración: listar documentos que coinciden con la matrícula
    const debugBtn = document.getElementById('debugBtn');
    if (debugBtn) {
        debugBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const matricula = document.getElementById('username').value.trim();
            console.debug('[debug] Buscando docs para matricula:', matricula);
            const docs = await findDocsByMatricula(matricula);
            console.debug('[debug] Resultados:', docs);
            if (docs.length === 0) console.warn('[debug] No se encontraron documentos para esa matrícula');
        });
    }
});