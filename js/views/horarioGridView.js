// js/views/horarioGridView.js

import { getGrupos } from '../modules/gruposData.js';
import { getAulas } from '../modules/aulasData.js';
import { getMaterias } from '../modules/materiasData.js';

// Estado local
let allGrupos = [];
let filters = {
    aulaId: '',
    materiaId: ''
};
// Variables de sesión
let currentUserRole = '';
let currentUserId = '';

/**
 * Carga los datos iniciales.
 */
const loadData = async () => {
    // Obtener datos de sesión
    currentUserRole = localStorage.getItem('userRole');
    currentUserId = localStorage.getItem('userUID');

    const [grupos, aulas, materias] = await Promise.all([
        getGrupos(),
        getAulas(),
        getMaterias()
    ]);
    
    allGrupos = grupos;
    populateFilters(aulas, materias);
    renderGrid(); 
};

/**
 * Llena los selectores de filtro.
 */
const populateFilters = (aulas, materias) => {
    const aulaSelect = document.getElementById('filter-aula');
    const materiaSelect = document.getElementById('filter-materia');
    
    if (aulaSelect) {
        aulaSelect.innerHTML = '<option value="">Todas las Aulas</option>';
        aulas.forEach(a => {
            aulaSelect.innerHTML += `<option value="${a.id}">${a.nombre}</option>`;
        });
    }

    if (materiaSelect) {
        materiaSelect.innerHTML = '<option value="">Todas las Materias</option>';
        materias.forEach(m => {
            materiaSelect.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
        });
    }
};

/**
 * Aplica los filtros manuales.
 */
const applyFilters = () => {
    filters.aulaId = document.getElementById('filter-aula').value;
    filters.materiaId = document.getElementById('filter-materia').value;
    renderGrid();
};

/**
 * Renderiza la parrilla de horarios.
 */
const renderGrid = () => {
    const gridContainer = document.getElementById('horario-grid-body');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    const horas = [7, 8, 9, 10, 11, 12, 13, 14];
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    // 1. FILTRO DE SEGURIDAD/ROL:
    // Si es docente, solo mostramos SUS grupos. Si es Admin, mostramos todos.
    let baseGrupos = allGrupos;
    
    if (currentUserRole === 'docente') {
        baseGrupos = allGrupos.filter(g => g.docenteId === currentUserId);
    }

    // 2. FILTROS DE UI (Aula/Materia)
    const filteredGrupos = baseGrupos.filter(g => {
        const matchAula = filters.aulaId ? g.aulaId === filters.aulaId : true;
        const matchMateria = filters.materiaId ? g.materiaId === filters.materiaId : true;
        return matchAula && matchMateria;
    });

    // Construir filas por hora
    horas.forEach(hora => {
        const row = document.createElement('tr');
        
        // Celda de Hora
        const timeCell = document.createElement('td');
        timeCell.className = 'time-slot';
        timeCell.textContent = `${hora}:00 - ${hora+1}:00`;
        timeCell.style.fontWeight = 'bold';
        timeCell.style.background = '#f8f9fa';
        row.appendChild(timeCell);

        // Celdas por Día
        dias.forEach(dia => {
            const cell = document.createElement('td');
            cell.className = 'class-slot';
            const slotKey = `${dia}-${hora}`;

            // Buscar coincidencias en los grupos filtrados
            const activeGroups = filteredGrupos.filter(g => g.horario && g.horario.includes(slotKey));

            if (activeGroups.length > 0) {
                activeGroups.forEach(grupo => {
                    const card = document.createElement('div');
                    // Estilo diferente para el docente para resaltar que es SU clase
                    const borderColor = currentUserRole === 'docente' ? '#4CAF50' : 'var(--secondary-blue)';
                    const bgColor = currentUserRole === 'docente' ? '#E8F5E9' : '#E3F2FD';

                    card.style.cssText = `
                        background-color: ${bgColor}; 
                        border-left: 4px solid ${borderColor}; 
                        padding: 4px 6px; 
                        margin-bottom: 4px; 
                        border-radius: 4px;
                        font-size: 0.85em;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    `;
                    
                    // Contenido de la tarjeta
                    // Si soy docente, me interesa ver el GRUPO y el AULA.
                    // Si soy Admin, me interesa ver el DOCENTE también.
                    let detailText = `<span>${grupo.aulaNombre}</span> <span style="font-weight:bold;">${grupo.nombre}</span>`;
                    
                    if (currentUserRole !== 'docente') {
                        // Mostrar nombre del profe para el admin
                        const nombreProfe = grupo.docenteNombre ? grupo.docenteNombre.split(' ')[0] : 'Sin Asignar';
                        detailText += `<div style="font-size:0.8em; color:#666; margin-top:2px;">${nombreProfe}</div>`;
                    }

                    card.innerHTML = `
                        <div style="font-weight:bold; color:var(--primary-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${grupo.materiaNombre}
                        </div>
                        <div style="display:flex; flex-direction:column; color:#555; font-size:0.9em;">
                            ${detailText}
                        </div>
                    `;
                    cell.appendChild(card);
                });
            }

            row.appendChild(cell);
        });

        gridContainer.appendChild(row);
    });
    
    // Mensaje si está vacío (útil para docentes sin carga)
    if (filteredGrupos.length === 0 && currentUserRole === 'docente') {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align:center; padding:20px; color:#666;">No tienes clases asignadas en este horario.</td>`;
        gridContainer.appendChild(row);
    }
};

const setupListeners = () => {
    document.getElementById('filter-aula').addEventListener('change', applyFilters);
    document.getElementById('filter-materia').addEventListener('change', applyFilters);
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        document.getElementById('filter-aula').value = '';
        document.getElementById('filter-materia').value = '';
        applyFilters();
    });
};

/**
 * Función principal para cargar la vista.
 */
export const loadHorarioGridView = () => {
    const appContent = document.getElementById('app-content');
    const role = localStorage.getItem('userRole');
    
    // Título dinámico
    const titulo = role === 'docente' ? 'Mi Horario de Clases' : 'Horario General Institucional';
    const desc = role === 'docente' 
        ?'Consulta tus asignaciones académicas, aulas y grupos.' 
        : 'Vista global de ocupación. Filtra por aula o materia.';

    appContent.innerHTML = `
        <h2 class="section-title">${titulo}</h2>
        <p class="description-text">${desc}</p>

        <div class="card p-30">
            <div class="filter-controls" style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid #eee;">
                <div style="flex:1; min-width: 200px;">
                    <label style="font-weight:bold; font-size:0.9em;">Filtrar por Aula:</label>
                    <select id="filter-aula" class="control-select"><option>Cargando...</option></select>
                </div>
                <div style="flex:1; min-width: 200px;">
                    <label style="font-weight:bold; font-size:0.9em;">Filtrar por Materia:</label>
                    <select id="filter-materia" class="control-select"><option>Cargando...</option></select>
                </div>
                <div style="display:flex; align-items:flex-end;">
                    <button id="btn-reset-filters" class="btn btn-secondary btn-sm" style="height:42px;">Limpiar</button>
                </div>
            </div>

            <div class="horario-grid-container" style="overflow-x: auto;">
                <table class="horario-table" style="width:100%; border-collapse:collapse; min-width:800px;">
                    <thead style="background:var(--primary-dark); color:white;">
                        <tr>
                            <th class="time-header" style="padding:10px; width:100px; position:sticky; left:0; z-index:10;">Hora</th>
                            <th>Lunes</th>
                            <th>Martes</th>
                            <th>Miércoles</th>
                            <th>Jueves</th>
                            <th>Viernes</th>
                        </tr>
                    </thead>
                    <tbody id="horario-grid-body">
                        <tr><td colspan="6" style="text-align:center; padding:20px;">Cargando horario...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    loadData().then(() => {
        setupListeners();
    });
};