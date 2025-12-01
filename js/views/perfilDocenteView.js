// js/views/perfilDocenteView.js

import { getMaterias } from '../modules/materiasData.js';
import { getDocenteByMatricula, updateDocenteMaterias } from '../modules/docentesData.js';
import { getGrupos } from '../modules/gruposData.js';
import { showAlert } from '../modules/uiHandler.js';

let currentUser = null;

const renderMateriasChecklist = (allMaterias, materiasCapacitadas = []) => {
    let html = '<div class="materias-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 10px;">';
    if (allMaterias.length === 0) return '<p class="text-muted">No hay materias registradas.</p>';
    
    const safeCapacitadas = Array.isArray(materiasCapacitadas) ? materiasCapacitadas : [];

    allMaterias.forEach(m => {
        const isChecked = safeCapacitadas.includes(m.id) ? 'checked' : '';
        html += `
            <div class="form-check" style="margin-bottom: 5px;">
                <input class="form-check-input materia-check" type="checkbox" value="${m.id}" id="mat-${m.id}" ${isChecked} style="cursor: pointer;">
                <label class="form-check-label" for="mat-${m.id}" style="cursor: pointer;">
                    ${m.nombre} <small class="text-muted">(${m.horasSemanales}h)</small>
                </label>
            </div>
        `;
    });
    html += '</div>';
    return html;
};

const renderMySchedule = async (docenteId) => {
    const container = document.getElementById('mi-horario-container');
    if (!container) return;

    container.innerHTML = '<p class="text-center">Cargando horario...</p>';

    const todosGrupos = await getGrupos();
    
    // FILTRO: Solo los grupos donde este docente es el titular
    // IMPORTANTE: Asegúrate de que en Firestore el campo se llame 'docenteId'
    const misGrupos = todosGrupos.filter(g => g.docenteId === docenteId);
    
    // DEBUG: Ver en consola qué encontró
    console.log("--> Grupos del docente:", misGrupos);

    const horas = [7, 8, 9, 10, 11, 12, 13, 14];
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const scheduleMap = {};

    misGrupos.forEach(g => {
        if (g.horario && Array.isArray(g.horario)) {
            g.horario.forEach(slot => {
                scheduleMap[slot] = { 
                    materia: g.materiaNombre, 
                    grupo: g.nombre, 
                    aula: g.aulaNombre 
                };
            });
        }
    });

    let gridHTML = `
        <div class="table-responsive">
            <table class="table table-bordered text-center" style="font-size:0.85em;">
                <thead class="bg-light">
                    <tr>
                        <th style="width:80px;">Hora</th>
                        ${dias.map(d => `<th>${d}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    horas.forEach(hora => {
        gridHTML += `<tr><td style="font-weight:bold;">${hora}:00</td>`;
        dias.forEach(dia => {
            const slotKey = `${dia}-${hora}`;
            const clase = scheduleMap[slotKey];
            
            if (clase) {
                // PINTAR CLASE EN VERDE
                gridHTML += `
                    <td style="background-color:#E8F5E9; border:1px solid #C8E6C9; padding:5px;">
                        <div style="font-weight:bold; color:#2E7D32; font-size:0.9em;">${clase.materia}</div>
                        <div style="font-size:0.8em; color:#555;">${clase.grupo} - ${clase.aula}</div>
                    </td>
                `;
            } else {
                gridHTML += `<td></td>`;
            }
        });
        gridHTML += `</tr>`;
    });
    gridHTML += `</tbody></table></div>`;
    
    if (misGrupos.length === 0) {
        gridHTML = `<div class="alert alert-info">No tienes grupos asignados todavía.</div>` + gridHTML;
    }
    container.innerHTML = gridHTML;
};

const setupListeners = () => {
    const btnSave = document.getElementById('btn-save-capacities');
    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            const selected = [];
            document.querySelectorAll('.materia-check:checked').forEach(cb => selected.push(cb.value));
            try {
                await updateDocenteMaterias(currentUser.id, selected);
                await showAlert("Éxito", "Capacidades actualizadas.", "success");
            } catch (error) {
                await showAlert("Error", error.message, "error");
            }
        });
    }
};

export const loadDocenteProfile = async () => {
    const appContent = document.getElementById('app-content');
    const userMatricula = localStorage.getItem('userMatricula');

    if (!userMatricula) {
        appContent.innerHTML = '<div class="alert alert-warning">Falta información de sesión. Reinicia sesión.</div>';
        return;
    }

    appContent.innerHTML = '<div class="text-center p-5"><h3>Cargando perfil...</h3></div>';

    try {
        // Usamos la búsqueda robusta por matrícula
        const docente = await getDocenteByMatricula(userMatricula);

        if (!docente) {
            appContent.innerHTML = `<div class="alert alert-danger">Error: No se encontró el perfil para la matrícula <b>${userMatricula}</b> en Firestore.</div>`;
            return;
        }

        currentUser = docente;
        const materias = await getMaterias();

        // HTML CORRECTO PARA EL PERFIL (Dividido en 2 columnas)
        appContent.innerHTML = `
            <h2 class="section-title">Mi Perfil Académico</h2>
            <p class="description-text">Bienvenido, <strong>${docente.nombre}</strong> (${docente.matricula}).</p>

            <div class="row" style="display: flex; flex-wrap: wrap; gap: 20px;">
                <div class="card p-30" style="flex: 1; min-width: 300px;">
                    <h4 class="form-title">Materias que puedo impartir</h4>
                    <form id="capacities-form">
                        ${renderMateriasChecklist(materias, docente.materiasCapacitadas)}
                        <button type="button" id="btn-save-capacities" class="btn btn-primary btn-block mt-3">Guardar Selección</button>
                    </form>
                    <hr>
                    <div class="info-box"><strong>Carga Contratada:</strong> <br> ${docente.cargaHoraria || 'N/A'}</div>
                </div>

                <div class="card p-30" style="flex: 2; min-width: 300px;">
                    <h4 class="form-title">Mi Horario Asignado</h4>
                    <div id="mi-horario-container"></div>
                </div>
            </div>
        `;

        setupListeners();
        renderMySchedule(docente.id);

    } catch (error) {
        console.error(error);
        appContent.innerHTML = `<div class="alert alert-danger">Error JS: ${error.message}</div>`;
    }
};