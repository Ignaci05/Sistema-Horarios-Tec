// js/views/aulasView.js

import { getAulas, saveAula, deleteAula } from '../modules/aulasData.js';
import { getGrupos } from '../modules/gruposData.js'; // Para leer horarios
import { showAlert, showConfirm } from '../modules/uiHandler.js'; // 🆕 Modales

let currentAulaId = null; 

/**
 * Renderiza la fila de un aula.
 */
const renderAulaRow = (aula) => {
    return `
        <tr data-id="${aula.id}">
            <td style="font-weight:bold;">${aula.nombre}</td>
            <td>${aula.capacidad} Alumnos</td>
            <td>${aula.tipo}</td>
            <td>
                <button class="btn btn-secondary btn-sm schedule-btn" data-id="${aula.id}" data-nombre="${aula.nombre}">📅 Ocupación</button>
                <button class="btn btn-info btn-sm edit-btn" data-id="${aula.id}">Editar</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${aula.id}">Eliminar</button>
            </td>
        </tr>
    `;
};

/**
 * Obtiene los grupos asignados a esta aula y construye un mapa de ocupación.
 */
const buildScheduleMap = async (aulaId) => {
    const grupos = await getGrupos();
    const scheduleMap = {};

    const aulaGrupos = grupos.filter(g => g.aulaId === aulaId);

    aulaGrupos.forEach(grupo => {
        if (grupo.horario && Array.isArray(grupo.horario)) {
            grupo.horario.forEach(slot => {
                scheduleMap[slot] = {
                    materia: grupo.materiaNombre || 'Materia Desconocida',
                    grupoNombre: grupo.nombre,
                    alumnos: grupo.numAlumnos
                };
            });
        }
    });
    return scheduleMap;
};

/**
 * Genera y muestra la parrilla de ocupación real.
 */
const showAulaSchedule = async (aulaId, aulaNombre) => {
    const container = document.getElementById('aula-schedule-section');
    container.style.display = 'block';
    container.innerHTML = '<div class="text-center p-3">Cargando ocupación...</div>';

    const scheduleMap = await buildScheduleMap(aulaId);
    
    const horas = [7, 8, 9, 10, 11, 12, 13, 14];
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

    let gridHTML = `
        <div class="card" style="border: 2px solid var(--primary-dark);">
            <div style="background: var(--primary-dark); color: white; padding: 10px 15px; display:flex; justify-content:space-between; align-items:center;">
                <h4 style="margin:0; font-size:1.1em;">📅 Ocupación: ${aulaNombre}</h4>
                <button class="btn btn-sm btn-light" style="padding: 2px 10px; font-weight:bold;" onclick="document.getElementById('aula-schedule-section').style.display='none'">X Cerrar</button>
            </div>
            <div style="overflow-x:auto;">
                <table class="table table-bordered mb-0" style="text-align:center; font-size:0.9em;">
                    <thead style="background: #f1f1f1;">
                        <tr>
                            <th style="width: 80px;">Hora</th>
                            ${dias.map(d => `<th>${d}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
    `;

    horas.forEach(hora => {
        gridHTML += `<tr><td style="font-weight:bold; vertical-align:middle;">${hora}:00 - ${hora+1}:00</td>`;
        
        dias.forEach(dia => {
            const slotKey = `${dia}-${hora}`;
            const ocupacion = scheduleMap[slotKey];

            if (ocupacion) {
                gridHTML += `
                    <td style="background-color: #E3F2FD; border: 1px solid #BBDEFB; padding: 5px;">
                        <div style="font-weight:bold; color:var(--primary-dark); font-size:0.95em;">${ocupacion.materia}</div>
                        <div style="font-size:0.85em; color:#555;">Grupo: ${ocupacion.grupoNombre}</div>
                        <div style="font-size:0.8em; color:#888;">(${ocupacion.alumnos} alum.)</div>
                    </td>`;
            } else {
                gridHTML += `
                    <td style="background-color: white; color: #ddd; vertical-align:middle;">
                        <small>Disponible</small>
                    </td>`;
            }
        });
        gridHTML += `</tr>`;
    });

    gridHTML += `</tbody></table></div></div>`;
    
    container.innerHTML = gridHTML;
    container.scrollIntoView({ behavior: 'smooth' });
};

/**
 * Renderiza la tabla principal de lista de aulas.
 */
const renderAulasTable = async () => {
    const tableBody = document.querySelector('#aulas-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Cargando aulas...</td></tr>';
    
    const aulas = await getAulas();
    tableBody.innerHTML = ''; 

    if (aulas.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay aulas registradas.</td></tr>';
        return;
    }

    aulas.forEach(a => {
        tableBody.insertAdjacentHTML('beforeend', renderAulaRow(a));
    });

    setupTableListeners(aulas);
};

/**
 * Rellena el formulario para editar.
 */
const fillForm = (aula = null) => {
    const form = document.getElementById('aula-form');
    if (!form) return;

    currentAulaId = aula ? aula.id : null;

    document.getElementById('aula-nombre').value = aula?.nombre || '';
    document.getElementById('aula-capacidad').value = aula?.capacidad || '';
    document.getElementById('aula-tipo').value = aula?.tipo || '';
    
    document.querySelector('#aula-form button[type="submit"]').textContent = aula ? 'Guardar Cambios' : 'Registrar Aula';
};

/**
 * Maneja los eventos del formulario.
 */
const setupFormListeners = () => {
    const form = document.getElementById('aula-form');
    const clearBtn = document.getElementById('clear-aula-btn');

    if (!form || !clearBtn) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const aula = {
            id: currentAulaId,
            nombre: document.getElementById('aula-nombre').value.trim(),
            capacidad: document.getElementById('aula-capacidad').value,
            tipo: document.getElementById('aula-tipo').value
        };

        try {
            await saveAula(aula);
            // ✅ Modal Éxito
            await showAlert('Operación Exitosa', `Aula ${aula.id ? 'actualizada' : 'registrada'} con éxito.`, 'success');
            fillForm(null); 
            renderAulasTable(); 
        } catch (error) {
            // ❌ Modal Error
            await showAlert('Error al Guardar', error.message, 'error');
        }
    });

    clearBtn.addEventListener('click', () => {
        form.reset();
        fillForm(null);
    });
};

/**
 * Configura los listeners de la tabla.
 */
const setupTableListeners = (aulas) => {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const aulaToEdit = aulas.find(a => a.id === btn.dataset.id);
            if (aulaToEdit) fillForm(aulaToEdit);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            // ⚠️ Modal Confirmación
            const confirm = await showConfirm('¿Eliminar Aula?', 'Se recomienda reasignar sus grupos antes de eliminar. ¿Desea continuar?');
            
            if (confirm) {
                try {
                    await deleteAula(btn.dataset.id);
                    await showAlert('Eliminada', 'Aula eliminada correctamente.', 'success');
                    renderAulasTable(); 
                } catch (error) {
                    await showAlert('Error', error.message, 'error');
                }
            }
        });
    });

    document.querySelectorAll('.schedule-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const nombre = btn.dataset.nombre;
            showAulaSchedule(id, nombre);
        });
    });
};

/**
 * Función principal de carga.
 */
export const loadAulasView = () => {
    const appContent = document.getElementById('app-content');
    
    appContent.innerHTML = `
        <h2 class="section-title">Gestión de Aulas (Infraestructura)</h2>
        <p class="description-text">Administra las 20 aulas. Haz clic en "Ocupación" para ver qué grupos están asignados a cada espacio.</p>

        <div class="crud-layout" style="display:block;">
            <div class="card p-30 mb-4">
                <h3 class="form-title">Registrar Aula</h3>
                <form id="aula-form" class="aula-form">
                    <div style="display:flex; gap:20px; flex-wrap:wrap;">
                        <div class="form-group" style="flex:2;">
                            <label>Identificador:</label>
                            <input type="text" id="aula-nombre" placeholder="Ej: Aula 205" required>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Capacidad:</label>
                            <input type="number" id="aula-capacidad" min="1" placeholder="30" required>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Tipo:</label>
                            <select id="aula-tipo" required>
                                <option value="Teórico">Teórico</option>
                                <option value="Laboratorio">Laboratorio</option>
                                <option value="Taller">Taller</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Guardar Aula</button>
                    <button type="button" id="clear-aula-btn" class="btn btn-secondary">Limpiar</button>
                </form>
            </div>

            <div class="table-container card p-30">
                <h3 class="table-title">Aulas Disponibles</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Identificador</th>
                                <th>Capacidad</th>
                                <th>Tipo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="aulas-table-body"></tbody>
                    </table>
                </div>
                
                <div id="aula-schedule-section" style="display: none; margin-top: 30px;"></div>
            </div>
        </div>
    `;

    setupFormListeners();
    renderAulasTable();
};