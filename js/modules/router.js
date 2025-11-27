// js/modules/router.js
import { loadMateriasView } from '../views/materiasView.js';
import { loadDocentesView } from '../views/docentesView.js';
import { loadGruposView } from '../views/gruposViews.js';
import { loadAulasView } from '../views/aulasView.js';
import { loadHorarioGridView } from '../views/horarioGridView.js';
import { loadDocenteProfile } from '../views/perfilDocente.js';
// Mapeo de vistas a sus requerimientos de rol (RF 1)
const VIEWS_MAP = {
    'view-horario': {
        name: 'Horario General',
        roles: ['subdirector', 'jefe', 'docente'], // Todos deben ver el horario asignado [cite: 24]
        icon: '📊',
        loadFunction: loadHorarioGridView
    },
    'view-materias': {
        name: 'Gestión de Materias',
        roles: ['subdirector', 'jefe'], // Jefe de Departamento debe crear y editar materias [cite: 17]
        icon: '📚',
        loadFunction: loadMateriasView
    },
    'view-docentes': {
        name: 'Gestión de Docentes',
        roles: ['subdirector', 'jefe'], // Jefe de Departamento debe poder agregar docentes [cite: 19]
        icon: '👨‍🏫',
        loadFunction: loadDocentesView
    },
    'view-aulas': {
        name: 'Gestión de Aulas',
        roles: ['subdirector', 'jefe'], // Jefe de Departamento debe poder ver y editar aulas [cite: 21]
        icon: '🏛️',
        loadFunction: loadAulasView
    },
    'view-grupos': {
        name: 'Gestión de Grupos',
        roles: ['subdirector'], // Rol de gestión total (Subdirector)
        icon: '👥',
        loadFunction: loadGruposView
    },
    'view-perfil-docente': {
        name: 'Mi Perfil/Horario',
        roles: ['docente'], // Docente debe poder seleccionar materias y ver su horario [cite: 23, 24]
        icon: '👤',
        loadFunction: loadDocenteProfile
    }
};

/**
 * Carga una vista específica, muestra el título y actualiza el menú activo.
 * @param {string} viewId - El ID de la vista (ej: 'view-materias').
 */
export const loadView = (viewId) => {
    const viewData = VIEWS_MAP[viewId];
    
    // 1. Actualizar el título principal
    const viewTitle = document.getElementById('view-title');
    if (viewTitle) {
        viewTitle.textContent = viewData?.name || 'Dashboard Principal';
    }

    // 2. Ejecutar la función de carga de contenido (CRUD)
    const appContent = document.getElementById('app-content');
    
    if (viewData?.loadFunction) {
        viewData.loadFunction(); // ⬅️ Ejecutar la función que inyecta HTML y la lógica
    } else {
        // Fallback para vistas no implementadas
        appContent.innerHTML = `
            <h2 class="section-title">${viewData?.name}</h2>
            <p class="description-text">Esta vista está pendiente de implementación (Módulo de ${viewData?.name}).</p>
        `;
    }

    // 3. Actualizar clase activa del menú
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('nav-active'));
    const activeItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeItem) {
         activeItem.classList.add('nav-active');
    }
};

/**
 * Carga la vista inicial predeterminada al entrar al Dashboard, basada en el rol.
 * @param {string} userRole - El rol del usuario ('subdirector', 'jefe', 'docente').
 */
export const loadInitialView = (userRole) => {
    let initialViewId = 'view-horario'; // Default para Subdirector/Jefe
    
    if (userRole === 'docente') {
        // El docente (D-002) debe ir a su perfil personal.
        initialViewId = 'view-perfil-docente';
    } else if (userRole === 'subdirector' || userRole === 'jefe') {
        // Subdirector (D-003) y Jefe inician viendo el horario global.
        initialViewId = 'view-horario';
    }
    
    loadView(initialViewId); // Carga la vista seleccionada
};

/**
 * Genera el menú de navegación dinámicamente basado en el rol del usuario.
 * @param {string} userRole - El rol del usuario ('subdirector', 'jefe', 'docente').
 */
export const renderNavMenu = (userRole) => {
    const navContainer = document.querySelector('.nav-menu');
    navContainer.innerHTML = ''; // Limpiar el menú estático

    // Si es Subdirector, puede "ver y hacer todo"[cite: 15].
    const isSubdirector = userRole === 'subdirector';

    // Construir los enlaces
    Object.keys(VIEWS_MAP).forEach(viewId => {
        const viewData = VIEWS_MAP[viewId];
        
        // Determinar si tiene permiso
        const hasPermission = isSubdirector || viewData.roles.includes(userRole);

        if (hasPermission) {
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'nav-item';
            link.setAttribute('data-view', viewId);
            link.innerHTML = `${viewData.icon} ${viewData.name}`;
            
            // Agregar el listener para cambiar la vista
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadView(viewId);
            });

            navContainer.appendChild(link);
        }
    });

    // Agregar el separador y la info del usuario
    navContainer.insertAdjacentHTML('beforeend', `<hr class="nav-separator">`);
    
    const userInfoHTML = `
        <div class="user-info">
            <span class="user-role">Rol: ${userRole.toUpperCase()}</span>
            <span class="user-name">${localStorage.getItem('userName') || 'Usuario'}</span>
            <a href="#" id="logout-button" class="nav-item logout-link">🚪 Cerrar Sesión</a>
        </div>
    `;
    navContainer.insertAdjacentHTML('beforeend', userInfoHTML);
};