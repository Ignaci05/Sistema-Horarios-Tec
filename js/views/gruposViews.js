// js/views/gruposView.js

import { getGrupos, saveGrupo, divideGrupo, deleteGrupo, getOccupiedSlots, checkDocenteAvailability } from '../modules/gruposData.js';
import { getAulas } from '../modules/aulasData.js';
import { getMaterias } from '../modules/materiasData.js';
import { getDocentesByMateria } from '../modules/docentesData.js';
import { showAlert, showConfirm } from '../modules/uiHandler.js';

let currentGrupoId = null;

// --- (renderScheduleSelector y updateScheduleAvailability SE MANTIENEN IGUAL) ---
const renderScheduleSelector = () => {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const horas = [7, 8, 9, 10, 11, 12, 13, 14]; 
    let html = `<div style="margin-top:15px; overflow-x:auto; border:1px solid #ddd; border-radius:8px;"><table class="table mb-0" style="font-size:0.8em; text-align:center; background:white;"><thead style="background:#f8f9fa;"><tr><th style="padding:8px;">Hora</th>${dias.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>`;
    horas.forEach(hora => {
        html += `<tr><td style="font-weight:bold;">${hora}:00</td>`;
        dias.forEach(dia => {
            const slotId = `${dia}-${hora}`;
            html += `<td style="padding:0;"><label style="display:block; padding:10px; cursor:pointer; margin:0; height:100%;"><input type="checkbox" class="schedule-checkbox" value="${slotId}" disabled></label></td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
};

const updateScheduleAvailability = async (aulaId, existingSchedule = []) => {
    const checkboxes = document.querySelectorAll('.schedule-checkbox');
    document.getElementById('horas-count-display').textContent = `0 horas seleccionadas`;

    if (!aulaId) {
        checkboxes.forEach(cb => { cb.disabled = true; cb.checked = false; cb.parentElement.parentElement.style.background = ''; });
        return;
    }
    
    checkboxes.forEach(cb => cb.disabled = true);
    const occupiedSlots = await getOccupiedSlots(aulaId, currentGrupoId);
    let selectedCount = 0;

    checkboxes.forEach(cb => {
        const slot = cb.value;
        const cell = cb.parentElement.parentElement;
        cb.checked = false;
        cell.style.background = '';
        
        if (occupiedSlots.includes(slot)) {
            cb.disabled = true;
            cell.style.background = '#ffcdd2'; 
            cell.title = "Aula Ocupada";
        } else {
            cb.disabled = false;
            if (existingSchedule.includes(slot)) {
                cb.checked = true;
                cell.style.background = '#c8e6c9';
                selectedCount++;
            }
            // Listener interno para contador
            cb.onclick = () => {
                const count = document.querySelectorAll('.schedule-checkbox:checked').length;
                document.getElementById('horas-count-display').textContent = `${count} horas seleccionadas`;
                cb.parentElement.parentElement.style.background = cb.checked ? '#c8e6c9' : '';
            };
        }
    });
    document.getElementById('horas-count-display').textContent = `${selectedCount} horas seleccionadas`;
};

// --- (searchAvailableDocentes SE MANTIENE IGUAL) ---
const searchAvailableDocentes = async () => {
    const materiaId = document.getElementById('grupo-materia').value;
    const docenteSelect = document.getElementById('grupo-docente');
    const btnSearch = document.getElementById('btn-search-docentes');
    
    const selectedSlots = [];
    document.querySelectorAll('.schedule-checkbox:checked').forEach(cb => selectedSlots.push(cb.value));

    if (!materiaId) { await showAlert('Falta Materia', 'Selecciona primero una Materia.', 'error'); return; }
    if (selectedSlots.length === 0) { await showAlert('Falta Horario', 'Selecciona primero el Horario.', 'error'); return; }

    btnSearch.textContent = "Buscando...";
    btnSearch.disabled = true;
    docenteSelect.innerHTML = '<option value="">Verificando disponibilidad...</option>';

    try {
        const aptDocentes = await getDocentesByMateria(materiaId);
        if (aptDocentes.length === 0) {
            docenteSelect.innerHTML = '<option value="">Ningún docente capacitado.</option>';
            return;
        }
        docenteSelect.innerHTML = '<option value="">Seleccione Docente...</option>';
        let countAvailable = 0;
        for (const docente of aptDocentes) {
            const isAvailable = await checkDocenteAvailability(docente.id, selectedSlots, currentGrupoId);
            if (isAvailable) {
                docenteSelect.innerHTML += `<option value="${docente.id}" data-nombre="${docente.nombre}">${docente.nombre} (Disponible)</option>`;
                countAvailable++;
            } else {
                docenteSelect.innerHTML += `<option value="${docente.id}" disabled style="color:red;">${docente.nombre} (Ocupado)</option>`;
            }
        }
        if (countAvailable === 0) {
            const opt = document.createElement('option');
            opt.text = "Todos los docentes aptos están ocupados.";
            docenteSelect.add(opt, 0);
        }
    } catch (error) {
        await showAlert('Error', 'Error al buscar docentes.', 'error');
    } finally {
        btnSearch.textContent = "🔍 Buscar Disponibles";
        btnSearch.disabled = false;
    }
};

// --- CARGA DE DATOS ---

const loadSelects = async () => {
    // 1. Materias: Inyectamos SEMESTRE y HORAS en data-attributes
    const materiaSelect = document.getElementById('grupo-materia');
    const materias = await getMaterias();
    materiaSelect.innerHTML = '<option value="">Selecciona Materia...</option>';
    materias.forEach(m => {
        // 🆕 Añadido data-semestre
        materiaSelect.innerHTML += `<option value="${m.id}" data-nombre="${m.nombre}" data-horas="${m.horasSemanales}" data-semestre="${m.semestre}">${m.nombre} (${m.semestre}º Sem)</option>`;
    });

    // 2. Aulas
    const aulaSelect = document.getElementById('grupo-aula');
    const aulas = await getAulas();
    aulaSelect.innerHTML = '<option value="">Selecciona Aula...</option>';
    aulas.forEach(a => {
        aulaSelect.innerHTML += `<option value="${a.id}" data-nombre="${a.nombre}">${a.nombre} (Cap: ${a.capacidad})</option>`;
    });

    aulaSelect.addEventListener('change', (e) => updateScheduleAvailability(e.target.value, []));
    
    // 🆕 Listener de Materia: Actualiza el input de Semestre y el Badge de horas
    materiaSelect.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        const horas = option.getAttribute('data-horas');
        const semestre = option.getAttribute('data-semestre');
        
        // Actualizar Semestre Automáticamente
        const semestreInput = document.getElementById('grupo-semestre-display');
        if (semestre) {
            semestreInput.value = `${semestre}º Semestre`;
        } else {
            semestreInput.value = '';
        }

        // Actualizar Badge de Horas
        const badge = document.getElementById('horas-required-display');
        if (horas) {
            badge.textContent = `Requeridas: ${horas} horas`;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    });
};

const renderGruposTable = async () => {
    const tbody = document.getElementById('grupos-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Cargando...</td></tr>';
    
    const grupos = await getGrupos();
    tbody.innerHTML = '';
    
    if (grupos.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center">Sin registros.</td></tr>'; return; }

    grupos.forEach(g => {
        const num = parseInt(g.numAlumnos) || 0;
        let style = num > 30 || g.divisionRequired ? 'color:#d32f2f; font-weight:bold;' : 'color:#388e3c;';
        let divBtn = (num > 30 || g.divisionRequired) ? `<button class="btn btn-warning btn-sm div-btn" data-id="${g.id}" data-n="${num}">Dividir</button>` : '';

        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${g.materiaNombre || '-'}</td>
                <td style="font-weight:bold;">${g.nombre}</td>
                <td>${g.docenteNombre || '<span style="color:#999; font-style:italic;">Sin Asignar</span>'}</td> 
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

// --- LÓGICA DEL FORMULARIO ---

const fillForm = async (g = null) => {
    const form = document.getElementById('grupo-form');
    currentGrupoId = g ? g.id : null;
    form.reset();
    document.getElementById('grupo-docente').innerHTML = '<option value="">Primero define Materia y Horario...</option>';
    document.getElementById('horas-required-display').style.display = 'none';

    if (g) {
        // MODO EDICIÓN
        document.getElementById('grupo-materia').value = g.materiaId || '';
        // Disparar evento change para cargar el semestre automáticamente
        document.getElementById('grupo-materia').dispatchEvent(new Event('change'));
        
        // 🆕 Extraer la letra del grupo (Ej: "7º Semestre A" -> "A")
        // Asumimos formato estándar. Si no coincide, dejamos en blanco para que el usuario elija.
        const nombreParts = (g.nombre || '').split(' ');
        const letra = nombreParts[nombreParts.length - 1]; // Tomar la última parte
        if (['A','B','C','D'].includes(letra)) {
            document.getElementById('grupo-letra').value = letra;
        }

        document.getElementById('grupo-num-alumnos').value = g.numAlumnos || '';
        document.getElementById('grupo-aula').value = g.aulaId || '';
        
        await updateScheduleAvailability(g.aulaId, g.horario || []);
        
        if (g.docenteId) {
            const docSelect = document.getElementById('grupo-docente');
            docSelect.innerHTML = `<option value="${g.docenteId}" selected>${g.docenteNombre} (Actual)</option>`;
            const opt = document.createElement('option');
            opt.text = "--- Buscar otro ---";
            opt.disabled = true;
            docSelect.add(opt);
        }
        document.querySelector('#grupo-form button[type="submit"]').textContent = 'Actualizar';
    } else {
        // MODO CREACIÓN
        updateScheduleAvailability(null);
        document.querySelector('#grupo-form button[type="submit"]').textContent = 'Crear Grupo';
        document.getElementById('grupo-semestre-display').value = ''; // Limpiar semestre
    }
};

const setupListeners = () => {
    const form = document.getElementById('grupo-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const matSel = document.getElementById('grupo-materia');
        const aulSel = document.getElementById('grupo-aula');
        const docSel = document.getElementById('grupo-docente');
        
        // 🆕 Construcción Automática del Nombre
        const semestreTxt = document.getElementById('grupo-semestre-display').value; // Ej: "7º Semestre"
        const letra = document.getElementById('grupo-letra').value; // Ej: "A"
        
        if (!semestreTxt) {
            await showAlert('Falta Información', 'Selecciona una materia para cargar el semestre.', 'error');
            return;
        }
        const nombreGrupoFinal = `${semestreTxt} ${letra}`; // "7º Semestre A"

        const slots = [];
        document.querySelectorAll('.schedule-checkbox:checked').forEach(cb => slots.push(cb.value));

        // Validación de Horas
        const selectedMatOption = matSel.options[matSel.selectedIndex];
        const horasRequeridas = parseInt(selectedMatOption.getAttribute('data-horas'));
        
        if (slots.length !== horasRequeridas) {
            await showAlert('Horario Incorrecto', `La materia "${selectedMatOption.text}" requiere exactamente ${horasRequeridas} horas semanales. Has seleccionado ${slots.length}.`, 'error');
            return;
        }

        if (!docSel.value) { 
            await showAlert('Falta Docente', 'Debes asignar un docente al grupo.', 'error'); 
            return; 
        }

        const grupo = {
            id: currentGrupoId,
            materiaId: matSel.value,
            materiaNombre: selectedMatOption.getAttribute('data-nombre'),
            nombre: nombreGrupoFinal, // ✅ Nombre automático
            numAlumnos: document.getElementById('grupo-num-alumnos').value,
            aulaId: aulSel.value,
            aulaNombre: aulSel.options[aulSel.selectedIndex].getAttribute('data-nombre'),
            docenteId: docSel.value,
            docenteNombre: docSel.options[docSel.selectedIndex].getAttribute('data-nombre') || docSel.options[docSel.selectedIndex].text,
            horario: slots
        };

        try {
            await saveGrupo(grupo);
            await showAlert('Éxito', `Grupo "${nombreGrupoFinal}" guardado correctamente.`, 'success');
            form.reset();
            fillForm(null);
            renderGruposTable();
        } catch (error) { 
            await showAlert('Error al Guardar', error.message, 'error'); 
        }
    });

    document.getElementById('clear-grupo-btn').addEventListener('click', () => fillForm(null));
    document.getElementById('btn-search-docentes').addEventListener('click', (e) => {
        e.preventDefault();
        searchAvailableDocentes();
    });
};

const setupTableListeners = (grupos) => {
    document.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => {
        fillForm(grupos.find(g => g.id === b.dataset.id));
        document.querySelector('.crud-layout').scrollIntoView({ behavior: 'smooth' });
    }));
    document.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', async () => {
        if(await showConfirm('¿Eliminar Grupo?', 'Se liberará el horario y el aula.')) { 
            try { await deleteGrupo(b.dataset.id); await showAlert('Eliminado', 'Grupo eliminado.', 'success'); renderGruposTable(); } 
            catch (e) { await showAlert('Error', e.message, 'error'); }
        }
    }));
    document.querySelectorAll('.div-btn').forEach(b => b.addEventListener('click', async () => {
        if(await showConfirm('¿Dividir Grupo?', 'Se crearán subgrupos automáticamente.')) { 
            try { await divideGrupo(b.dataset.id, b.dataset.n); await showAlert('División Exitosa', 'Subgrupos creados.', 'success'); renderGruposTable(); } 
            catch(e) { await showAlert('Error', e.message, 'error'); }
        }
    }));
};

export const loadGruposView = () => {
    document.getElementById('app-content').innerHTML = `
        <h2 class="section-title">Gestión de Grupos</h2>
        <p class="description-text">Crea grupos, asigna Aula y Horario, y selecciona un Docente disponible.</p>

        <div class="crud-layout" style="display:block;">
            <div class="card p-30 mb-4">
                <h3 class="form-title">Configuración del Grupo</h3>
                <form id="grupo-form">
                    <div style="display:flex; gap:15px; flex-wrap:wrap;">
                        <div class="form-group" style="flex:2;">
                            <label>Materia:</label>
                            <select id="grupo-materia" required><option>Cargando...</option></select>
                            <span id="horas-required-display" class="badge bg-info text-white" style="display:none; font-size:0.8em; margin-top:5px; padding:5px 10px; border-radius:15px;"></span>
                        </div>
                        
                        <div class="form-group" style="flex:1;">
                            <label>Semestre (Auto):</label>
                            <input type="text" id="grupo-semestre-display" readonly style="background:#eee; color:#555; font-weight:bold;" placeholder="-">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Identificador:</label>
                            <select id="grupo-letra" required>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                            </select>
                        </div>

                        <div class="form-group" style="flex:1;">
                            <label>Alumnos:</label>
                            <input type="number" id="grupo-num-alumnos" min="1" required>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:15px; flex-wrap:wrap;">
                        <div class="form-group" style="flex:1;">
                            <label>Aula:</label>
                            <select id="grupo-aula" required><option>Cargando...</option></select>
                        </div>
                    </div>

                    ${renderScheduleSelector()}
                    <div style="text-align:right; margin-top:5px; font-size:0.9em; font-weight:bold; color:var(--primary-dark);" id="horas-count-display">0 horas seleccionadas</div>

                    <div style="margin-top: 20px; padding: 15px; background: #f1f8e9; border: 1px solid #c5e1a5; border-radius: 8px;">
                        <label style="font-weight:bold; color:#33691e;">Asignación de Docente:</label>
                        <div style="display:flex; gap:10px; align-items:flex-end;">
                            <div style="flex-grow:1;">
                                <select id="grupo-docente" class="form-control" required>
                                    <option value="">Primero define Materia y Horario...</option>
                                </select>
                            </div>
                            <button id="btn-search-docentes" class="btn btn-info btn-sm" style="height: 42px;">🔍 Buscar Disponibles</button>
                        </div>
                    </div>

                    <div class="mt-4">
                        <button type="submit" class="btn btn-primary">Guardar Grupo</button>
                        <button type="button" id="clear-grupo-btn" class="btn btn-secondary">Cancelar</button>
                    </div>
                </form>
            </div>

            <div class="card p-30">
                <h3 class="table-title">Grupos Activos</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead><tr><th>Materia</th><th>Grupo</th><th>Docente</th><th>Alumnos</th><th>Aula</th><th>Horas</th><th>Acciones</th></tr></thead>
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