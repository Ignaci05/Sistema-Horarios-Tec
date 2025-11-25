// js/js-dashboard-controller.js (Controlador principal del DASHBOARD)

import { logout } from './modules/auth.js';
import { renderNavMenu, loadInitialView } from './modules/router.js'; // ⬅️ Importa loadInitialView

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    
    // 🛑 1. DETENER CICLO: Si no hay rol, redirige al login y DETIENE la ejecución.
    if (!userRole) {
        window.location.href = 'index.html';
        return; // ¡CRUCIAL! Detiene la ejecución del script aquí.
    }

    // 2. Lógica del Dashboard (solo si hay sesión)
    
    // Renderizar el Menú de Navegación según el Rol
    renderNavMenu(userRole);
    
    // Configurar el Botón de Cerrar Sesión
    document.getElementById('logout-button').addEventListener('click', (e) => {
        e.preventDefault();
        logout(); // Llama a la función de logout
    });

    // 4. Cargar la Vista Principal por Defecto (Segun Rol)
    loadInitialView(userRole); // ✅ LLAMADA CORREGIDA: Usa el rol para determinar qué vista cargar.
});