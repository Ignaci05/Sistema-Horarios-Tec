// js/views/perfilDocenteView.js

import { getMaterias } from '../modules/materiasData.js';
import { getDocenteById, updateDocenteMaterias } from '../modules/docentesData.js';
import { getGrupos } from '../modules/gruposData.js';

let currentUser = null;

/**
 * Genera el HTML de la lista de materias con checkboxes.
 */
const renderMateriasChecklist = (allMaterias, materiasCapacitadas = []) => {
    let html = '<div class="materias-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 10px;">';
    
    if (allMaterias.length === 0) {
        return '<p class="text-muted">No hay materias registradas en el sistema.</p>';
    }

    allMaterias.forEach(m => {
        const isChecked = materiasCapacitadas.includes(m.id) ? 'checked' : '';
        html += `
            <div class="form-check">
                <input class="form-check-input materia-check" type="checkbox" value="${m.id}" id="mat-${m.id}" ${isChecked}>
                <label class="form-check-label" for="mat-${m.id}">
                    ${m.nombre} <small class="text-muted">(${m.horasSemanales}h)</small>
                </label>
            </div>
        `;
    });
    html += '</div>';
    return html;
};

/**
 * Genera la parrilla de horario personal del docente.
 */
const renderMySchedule = async (docenteId) => {
    const container = document.getElementById('mi-horario-container');
    container.innerHTML = '<p class="text-center">Cargando tu horario...</p>';

    // Obtener grupos y filtrar donde el docenteId coincida (Lógica futura de asignación)
    const todosGrupos = await getGrupos();
    
    // ⚠️ NOTA: Como aún no agregamos "Asignar Docente" en Grupos, esto filtrará por un campo 'docenteId'
    // que agregaremos en el siguiente paso. Por ahora mostrará vacío.
    const misGrupos = todosGrupos.filter(g => g.docenteId === docenteId);

    const horas = [7, 8, 9, 10, 11, 12, 13, 14];
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

    // Mapa de ocupación
    const scheduleMap = {};
    misGrupos.forEach(g => {
        if (g.horario) {
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
                gridHTML += `
                    <td style="background-color:#E8F5E9; border:1px solid #C8E6C9;">
                        <div style="font-weight:bold; color:#2E7D32;">${clase.materia}</div>
                        <div>${clase.grupo} - ${clase.aula}</div>
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
        gridHTML = `
            <div class="alert alert-info">
                No tienes grupos asignados todavía. Contacta al Jefe de Departamento.
            </div>
            ${gridHTML}
        `;
    }

    container.innerHTML = gridHTML;
};

/**
 * Maneja el guardado de las capacidades.
 */
const setupListeners = () => {
    const btnSave = document.getElementById('btn-save-capacities');
    
    btnSave.addEventListener('click', async () => {
        const selected = [];
        document.querySelectorAll('.materia-check:checked').forEach(cb => selected.push(cb.value));

        try {
            await updateDocenteMaterias(currentUser.id, selected);
            alert("Tus materias capacitadas han sido actualizadas.");
        } catch (error) {
            alert(error.message);
        }
    });
};

/**
 * Carga principal de la vista.
 */
export const loadDocenteProfile = async () => {
    const appContent = document.getElementById('app-content');
    const userId = localStorage.getItem('userUID');

    if (!userId) {
        appContent.innerHTML = '<div class="alert alert-danger">Error: Usuario no identificado.</div>';
        return;
    }

    // Cargar datos
    const [docente, materias] = await Promise.all([
        getDocenteById(userId),
        getMaterias()
    ]);

    currentUser = docente;

    if (!docente) {
        appContent.innerHTML = '<div class="alert alert-danger">Error: No se encontró el perfil del docente.</div>';
        return;
    }

    appContent.innerHTML = `
        <h2 class="section-title">Mi Perfil Académico</h2>
        <p class="description-text">Bienvenido, <strong>${docente.nombre}</strong> (${docente.matricula}).</p>

        <div class="row" style="display: flex; flex-wrap: wrap; gap: 20px;">
            
            <div class="col-md-4 card p-30" style="flex: 1; min-width: 300px;">
                <h4 class="form-title">Materias que puedo impartir</h4>
                <p class="text-muted small">Selecciona las asignaturas para las que estás capacitado (RF 23).</p>
                
                <form id="capacities-form">
                    ${renderMateriasChecklist(materias, docente.materiasCapacitadas)}
                    <button type="button" id="btn-save-capacities" class="btn btn-primary btn-block mt-3">Guardar Selección</button>
                </form>
                
                <hr>
                <div class="info-box">
                    <strong>Carga Horaria Contratada:</strong> <br>
                    <span style="font-size:1.2em; color:var(--primary-dark);">${docente.cargaHoraria} horas/sem</span>
                </div>
            </div>

            <div class="col-md-8 card p-30" style="flex: 2; min-width: 300px;">
                <h4 class="form-title">Mi Horario Asignado</h4>
                <p class="text-muted small">Este es tu horario de clases actual (RF 24).</p>
                <div id="mi-horario-container">
                    </div>
            </div>
        </div>
    `;

    setupListeners();
    renderMySchedule(userId);
};