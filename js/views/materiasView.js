// js/views/materiasView.js

import { getMaterias, saveMateria, deleteMateria } from '../modules/materiasData.js';
import { showAlert, showConfirm } from '../modules/uiHandler.js'; // Modales

let currentMateriaId = null;

/**
 * Renderiza la fila de una materia.
 */
const renderMateriaRow = (materia) => {
    return `
        <tr data-id="${materia.id}">
            <td><span class="badge bg-secondary">${materia.semestre}º Sem</span></td> <td style="font-weight:bold;">${materia.nombre}</td>
            <td>${materia.horasSemanales} hrs</td>
            <td>${materia.creditos} pts</td>
            <td>
                <button class="btn btn-info btn-sm edit-btn" data-id="${materia.id}">Editar</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${materia.id}">Eliminar</button>
            </td>
        </tr>
    `;
};

/**
 * Rellena y actualiza la tabla de materias.
 */
const renderMateriasTable = async () => {
    const tableBody = document.querySelector('#materias-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando materias...</td></tr>';
    
    const materias = await getMaterias();
    tableBody.innerHTML = ''; 

    if (materias.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay materias registradas.</td></tr>';
        return;
    }

    materias.forEach(m => {
        tableBody.insertAdjacentHTML('beforeend', renderMateriaRow(m));
    });

    setupTableListeners(materias);
};

/**
 * Rellena el formulario con datos para edición.
 */
const fillForm = (materia = null) => {
    const form = document.getElementById('materia-form');
    if (!form) return;

    currentMateriaId = materia ? materia.id : null;

    document.getElementById('materia-nombre').value = materia?.nombre || '';
    document.getElementById('materia-semestre').value = materia?.semestre || ''; // 🆕 Llenar semestre
    document.getElementById('horas-semanales').value = materia?.horasSemanales || '';
    document.getElementById('creditos').value = materia?.creditos || '';
    
    document.querySelector('#materia-form button[type="submit"]').textContent = materia ? 'Guardar Cambios' : 'Crear Materia';
};

/**
 * Maneja los listeners del formulario.
 */
const setupFormListeners = () => {
    const form = document.getElementById('materia-form');
    const clearBtn = document.getElementById('clear-materia-btn');

    if (!form || !clearBtn) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const materia = {
            id: currentMateriaId,
            nombre: document.getElementById('materia-nombre').value.trim(),
            semestre: document.getElementById('materia-semestre').value, // 🆕 Capturar semestre
            horasSemanales: document.getElementById('horas-semanales').value,
            creditos: document.getElementById('creditos').value
        };

        try {
            await saveMateria(materia);
            await showAlert('Operación Exitosa', `Materia guardada correctamente.`, 'success');
            fillForm(null); 
            renderMateriasTable(); 
        } catch (error) {
            await showAlert('Error al Guardar', error.message, 'error');
        }
    });

    clearBtn.addEventListener('click', () => {
        form.reset();
        fillForm(null);
    });
};

/**
 * Maneja los listeners de los botones de la tabla.
 */
const setupTableListeners = (materias) => {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const materiaToEdit = materias.find(m => m.id === id);
            if (materiaToEdit) fillForm(materiaToEdit);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const confirm = await showConfirm('¿Eliminar Materia?', 'Se eliminará permanentemente.');
            
            if (confirm) {
                try {
                    await deleteMateria(id);
                    await showAlert('Eliminada', 'Materia eliminada con éxito.', 'success');
                    renderMateriasTable(); 
                } catch (error) {
                    await showAlert('Error', error.message, 'error');
                }
            }
        });
    });
};

/**
 * Función principal para cargar la vista de Materias.
 */
export const loadMateriasView = () => {
    const appContent = document.getElementById('app-content');
    
    appContent.innerHTML = `
        <h2 class="section-title">Gestión de Materias (Asignaturas)</h2>
        <p class="description-text">Crea y edita las materias del plan de estudios.</p>

        <div class="crud-layout">
            <div class="form-container card p-30">
                <h3 class="form-title">Datos de la Materia</h3>
                <form id="materia-form" class="materia-form">
                    <div class="form-group">
                        <label for="materia-nombre">Nombre de la Materia:</label>
                        <input type="text" id="materia-nombre" required placeholder="Ej: Cálculo Diferencial">
                    </div>
                    
                    <div class="form-group">
                        <label for="materia-semestre">Semestre (1-9):</label>
                        <select id="materia-semestre" required>
                            <option value="">Seleccione...</option>
                            <option value="1">1er Semestre</option>
                            <option value="2">2do Semestre</option>
                            <option value="3">3er Semestre</option>
                            <option value="4">4to Semestre</option>
                            <option value="5">5to Semestre</option>
                            <option value="6">6to Semestre</option>
                            <option value="7">7mo Semestre</option>
                            <option value="8">8vo Semestre</option>
                            <option value="9">9no Semestre</option>
                        </select>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <div class="form-group" style="flex:1;">
                            <label for="horas-semanales">Horas/Semana:</label>
                            <input type="number" id="horas-semanales" min="1" max="10" required>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label for="creditos">Créditos:</label>
                            <input type="number" id="creditos" min="1" required>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block">Crear Materia</button>
                    <button type="button" id="clear-materia-btn" class="btn btn-secondary btn-block mt-10">Limpiar</button>
                </form>
            </div>

            <div class="table-container card p-30">
                <h3 class="table-title">Listado de Materias</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Semestre</th> <th>Nombre</th>
                                <th>Horas</th>
                                <th>Créditos</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="materias-table-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    setupFormListeners();
    renderMateriasTable();
};