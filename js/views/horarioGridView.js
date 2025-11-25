// js/views/horarioGridView.js

import { getGrupos } from '../modules/gruposData.js';
import { getAulas } from '../modules/aulasData.js';
import { getMaterias } from '../modules/materiasData.js';

// Estado local para los filtros
let allGrupos = [];
let filters = {
    aulaId: '',
    materiaId: ''
};

/**
 * Carga los datos iniciales (Grupos, Aulas, Materias).
 */
const loadData = async () => {
    const [grupos, aulas, materias] = await Promise.all([
        getGrupos(),
        getAulas(),
        getMaterias()
    ]);
    
    allGrupos = grupos;
    populateFilters(aulas, materias);
    renderGrid(); // Renderizado inicial (muestra todo o vacío según diseño)
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
 * Aplica los filtros y redibuja la parrilla.
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

    // Limpiar parrilla (manteniendo estructura si fuera necesario, pero aquí reconstruimos rows)
    gridContainer.innerHTML = '';

    const horas = [7, 8, 9, 10, 11, 12, 13, 14];
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    // Filtrar grupos según selección
    const filteredGrupos = allGrupos.filter(g => {
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

            // Buscar grupos que tengan clase en este día y hora
            const activeGroups = filteredGrupos.filter(g => g.horario && g.horario.includes(slotKey));

            if (activeGroups.length > 0) {
                // Renderizar "Tarjetas" para cada clase en este horario
                activeGroups.forEach(grupo => {
                    const card = document.createElement('div');
                    card.style.cssText = `
                        background-color: #E3F2FD; 
                        border-left: 4px solid var(--secondary-blue); 
                        padding: 4px 6px; 
                        margin-bottom: 4px; 
                        border-radius: 4px;
                        font-size: 0.85em;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    `;
                    
                    // Contenido de la tarjeta
                    card.innerHTML = `
                        <div style="font-weight:bold; color:var(--primary-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${grupo.materiaNombre}
                        </div>
                        <div style="display:flex; justify-content:space-between; color:#555; font-size:0.9em;">
                            <span>${grupo.aulaNombre}</span>
                            <span style="font-weight:bold;">${grupo.nombre}</span>
                        </div>
                    `;
                    cell.appendChild(card);
                });
                
                // Si hay muchas clases (vista general), mostrar indicador de scroll o resumen
                if (activeGroups.length > 3) {
                    cell.style.overflowY = "auto";
                    cell.style.maxHeight = "100px"; // Limitar altura de celda
                }
            }

            row.appendChild(cell);
        });

        gridContainer.appendChild(row);
    });
};

/**
 * Configura los listeners de los filtros.
 */
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
    
    appContent.innerHTML = `
        <h2 class="section-title">Horario General</h2>
        <p class="description-text">Vista global de ocupación. [cite_start]Utiliza los filtros para ver aulas o materias específicas. [cite: 11, 46, 48]</p>

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
                    <button id="btn-reset-filters" class="btn btn-secondary btn-sm" style="height:42px;">Limpiar Filtros</button>
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
                        <tr><td colspan="6" style="text-align:center; padding:20px;">Cargando datos del sistema...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    loadData().then(() => {
        setupListeners();
    });
};