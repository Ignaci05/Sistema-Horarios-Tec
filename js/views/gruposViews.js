// js/views/gruposView.js

import { getGrupos, saveGrupo, divideGrupo, deleteGrupo, getOccupiedSlots } from '../modules/gruposData.js';
import { getAulas } from '../modules/aulasData.js';
import { getMaterias } from '../modules/materiasData.js'; // 🆕 Importar Materias

let currentGrupoId = null;

/**
 * Genera el selector de horario (Checkbox Grid).
 */
const renderScheduleSelector = () => {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const horas = [7, 8, 9, 10, 11, 12, 13, 14]; 

    let html = `
        <div style="margin-top:15px; overflow-x:auto; border:1px solid #ddd; border-radius:8px;">
            <table class="table mb-0" style="font-size:0.8em; text-align:center; background:white;">
                <thead style="background:#f8f9fa;">
                    <tr>
                        <th style="padding:8px;">Hora</th>
                        ${dias.map(d => `<th>${d}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    horas.forEach(hora => {
        html += `<tr><td style="font-weight:bold;">${hora}:00</td>`;
        dias.forEach(dia => {
            const slotId = `${dia}-${hora}`;
            html += `
                <td style="padding:0;">
                    <label style="display:block; padding:10px; cursor:pointer; margin:0; height:100%;">
                        <input type="checkbox" class="schedule-checkbox" value="${slotId}" disabled>
                    </label>
                </td>
            `;
        });
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
};

/**
 * Bloquea/Desbloquea horarios según el aula.
 */
const updateScheduleAvailability = async (aulaId, existingSchedule = []) => {
    const checkboxes = document.querySelectorAll('.schedule-checkbox');
    
    if (!aulaId) {
        checkboxes.forEach(cb => { cb.disabled = true; cb.checked = false; cb.parentElement.parentElement.style.background = ''; });
        return;
    }

    checkboxes.forEach(cb => cb.disabled = true); // Bloquear mientras carga
    const occupiedSlots = await getOccupiedSlots(aulaId, currentGrupoId);

    checkboxes.forEach(cb => {
        const slot = cb.value;
        const cell = cb.parentElement.parentElement;
        cb.checked = false;
        cell.style.background = '';

        if (occupiedSlots.includes(slot)) {
            cb.disabled = true;
            cell.style.background = '#ffcdd2'; // Rojo ocupado
            cell.title = "Ocupado";
        } else {
            cb.disabled = false;
            if (existingSchedule.includes(slot)) {
                cb.checked = true;
                cell.style.background = '#c8e6c9'; // Verde seleccionado
            }
        }
    });
};

/**
 * Carga los selects de Materias y Aulas.
 */
const loadSelects = async () => {
    // 1. Cargar Materias
    const materiaSelect = document.getElementById('grupo-materia');
    const materias = await getMaterias();
    materiaSelect.innerHTML = '<option value="">Selecciona Materia...</option>';
    materias.forEach(m => {
        materiaSelect.innerHTML += `<option value="${m.id}" data-nombre="${m.nombre}">${m.nombre} (${m.horasSemanales}h)</option>`;
    });

    // 2. Cargar Aulas
    const aulaSelect = document.getElementById('grupo-aula');
    const aulas = await getAulas();
    aulaSelect.innerHTML = '<option value="">Selecciona Aula...</option>';
    aulas.forEach(a => {
        aulaSelect.innerHTML += `<option value="${a.id}" data-nombre="${a.nombre}">${a.nombre} (Cap: ${a.capacidad})</option>`;
    });

    // Listener de Aula para actualizar horario
    aulaSelect.addEventListener('change', (e) => updateScheduleAvailability(e.target.value, []));
};

/**
 * Renderiza la tabla de grupos.
 */
const renderGruposTable = async () => {
    const tbody = document.getElementById('grupos-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Cargando...</td></tr>';
    
    const grupos = await getGrupos();
    tbody.innerHTML = '';

    if (grupos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay grupos creados.</td></tr>';
        return;
    }

    grupos.forEach(g => {
        const num = parseInt(g.numAlumnos) || 0;
        let style = num > 30 || g.divisionRequired ? 'color:#d32f2f; font-weight:bold;' : 'color:#388e3c;';
        let divBtn = (num > 30 || g.divisionRequired) ? `<button class="btn btn-warning btn-sm div-btn" data-id="${g.id}" data-n="${num}">Dividir</button>` : '';

        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${g.materiaNombre || '---'}</td>
                <td>${g.nombre}</td>
                <td style="${style}">${num}</td>
                <td>${g.aulaNombre || '-'}</td>
                <td>${g.horario ? g.horario.length : 0} hrs</td>
                <td>
                    ${divBtn}
                    <button class="btn btn-info btn-sm edit-btn" data-id="${g.id}">Editar</button>
                    <button class="btn btn-danger btn-sm del-btn" data-id="${g.id}">X</button>
                </td>
            </tr>
        `);
    });

    setupTableListeners(grupos);
};

const fillForm = (g = null) => {
    const form = document.getElementById('grupo-form');
    currentGrupoId = g ? g.id : null;
    form.reset();

    if (g) {
        document.getElementById('grupo-materia').value = g.materiaId || '';
        document.getElementById('grupo-nombre').value = g.nombre || '';
        document.getElementById('grupo-num-alumnos').value = g.numAlumnos || '';
        document.getElementById('grupo-aula').value = g.aulaId || '';
        updateScheduleAvailability(g.aulaId, g.horario || []);
        document.querySelector('#grupo-form button[type="submit"]').textContent = 'Actualizar';
    } else {
        updateScheduleAvailability(null);
        document.querySelector('#grupo-form button[type="submit"]').textContent = 'Crear Grupo';
    }
};

const setupListeners = () => {
    const form = document.getElementById('grupo-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const matSel = document.getElementById('grupo-materia');
        const aulSel = document.getElementById('grupo-aula');
        
        const slots = [];
        document.querySelectorAll('.schedule-checkbox:checked').forEach(cb => slots.push(cb.value));

        const grupo = {
            id: currentGrupoId,
            materiaId: matSel.value,
            materiaNombre: matSel.options[matSel.selectedIndex].getAttribute('data-nombre'),
            nombre: document.getElementById('grupo-nombre').value.trim(),
            numAlumnos: document.getElementById('grupo-num-alumnos').value,
            aulaId: aulSel.value,
            aulaNombre: aulSel.options[aulSel.selectedIndex].getAttribute('data-nombre'),
            horario: slots
        };

        try {
            await saveGrupo(grupo);
            alert("Guardado correctamente.");
            fillForm(null);
            renderGruposTable();
        } catch (error) { alert(error.message); }
    });

    document.getElementById('clear-grupo-btn').addEventListener('click', () => fillForm(null));
};

const setupTableListeners = (grupos) => {
    document.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => {
        fillForm(grupos.find(g => g.id === b.dataset.id));
    }));
    
    document.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', async () => {
        if(confirm("¿Eliminar?")) { await deleteGrupo(b.dataset.id); renderGruposTable(); }
    }));

    document.querySelectorAll('.div-btn').forEach(b => b.addEventListener('click', async () => {
        if(confirm("¿Dividir grupo?")) { 
            try { await divideGrupo(b.dataset.id, b.dataset.n); renderGruposTable(); }
            catch(e) { alert(e.message); }
        }
    }));
};

export const loadGruposView = () => {
    document.getElementById('app-content').innerHTML = `
        <h2 class="section-title">Gestión de Grupos Académicos</h2>
        <p class="description-text">Asigna una Materia a un Aula y define su horario.</p>

        <div class="crud-layout" style="display:block;">
            <div class="card p-30 mb-4">
                <h3 class="form-title">Configuración del Grupo</h3>
                <form id="grupo-form">
                    <div style="display:flex; gap:15px; flex-wrap:wrap;">
                        <div class="form-group" style="flex:2;">
                            <label>Materia:</label>
                            <select id="grupo-materia" required><option>Cargando...</option></select>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Nombre Grupo (ID):</label>
                            <input type="text" id="grupo-nombre" placeholder="Ej: A" required>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Alumnos:</label>
                            <input type="number" id="grupo-num-alumnos" min="1" required>
                        </div>
                        <div class="form-group" style="flex:2;">
                            <label>Aula:</label>
                            <select id="grupo-aula" required><option>Cargando...</option></select>
                        </div>
                    </div>

                    ${renderScheduleSelector()}

                    <div class="mt-3">
                        <button type="submit" class="btn btn-primary">Crear Grupo</button>
                        <button type="button" id="clear-grupo-btn" class="btn btn-secondary">Cancelar</button>
                    </div>
                </form>
            </div>

            <div class="card p-30">
                <h3 class="table-title">Grupos Activos</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr><th>Materia</th><th>Grupo</th><th>Alumnos</th><th>Aula</th><th>Horas</th><th>Acciones</th></tr>
                        </thead>
                        <tbody id="grupos-table-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    loadSelects();
    setupListeners();
    renderGruposTable();
};