// js/views/materiasView.js

import { getMaterias, saveMateria, deleteMateria } from '../modules/materiasData.js';
import { showAlert, showConfirm } from '../modules/uiHandler.js'; // ✅ Importamos modales

let currentMateriaId = null;

/**
 * Renderiza la fila de una materia.
 */
const renderMateriaRow = (materia) => {
    return `
        <tr data-id="${materia.id}">
            <td>${materia.id.substring(0, 6)}...</td>
            <td>${materia.nombre}</td>
            <td>${materia.horasSemanales}</td>
            <td>${materia.creditos}</td>
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

    document.getElementById('nombre-materia').value = materia?.nombre || '';
    document.getElementById('horas-semanales').value = materia?.horasSemanales || '';
    document.getElementById('creditos').value = materia?.creditos || '';
    
    document.querySelector('#materia-form button[type="submit"]').textContent = materia ? 'Guardar Cambios' : 'Crear Materia';
};

/**
 * Maneja los listeners del formulario.
 */
const setupFormListeners = () => {
    const form = document.getElementById('materia-form');
    const clearBtn = document.getElementById('clear-materia-btn'); // 🆕 ID botón Limpiar

    if (!form || !clearBtn) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const materia = {
            id: currentMateriaId,
            nombre: document.getElementById('nombre-materia').value.trim(),
            horasSemanales: document.getElementById('horas-semanales').value,
            creditos: document.getElementById('creditos').value
        };

        try {
            await saveMateria(materia);
            // ✅ Modal de Éxito
            await showAlert('Operación Exitosa', `Materia ${materia.id ? 'actualizada' : 'creada'} con éxito.`, 'success');
            fillForm(null); 
            renderMateriasTable(); 
        } catch (error) {
            // ❌ Modal de Error
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
    // Editar
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const materiaToEdit = materias.find(m => m.id === id);
            if (materiaToEdit) fillForm(materiaToEdit);
        });
    });

    // Eliminar
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            // ⚠️ Modal de Confirmación
            const confirm = await showConfirm('¿Eliminar Materia?', 'Esta acción no se puede deshacer. ¿Desea continuar?');
            
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
        <p class="description-text">Permite al Jefe de Departamento y Subdirector crear, editar y eliminar materias. Cada materia debe tener un número de horas semanales y créditos asociados.</p>

        <div class="crud-layout">
            <div class="form-container card p-30">
                <h3 class="form-title">Crear/Editar Materia</h3>
                <form id="materia-form" class="materia-form">
                    <div class="form-group">
                        <label for="nombre-materia">Nombre de la Materia:</label>
                        <input type="text" id="nombre-materia" required>
                    </div>
                    <div class="form-group">
                        <label for="horas-semanales">Horas Semanales:</label>
                        <input type="number" id="horas-semanales" min="1" max="10" required>
                    </div>
                    <div class="form-group">
                        <label for="creditos">Créditos Totales:</label>
                        <input type="number" id="creditos" min="1" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Crear Materia</button>
                    <button type="button" id="clear-materia-btn" class="btn btn-secondary btn-block mt-10">Limpiar</button>
                </form>
            </div>

            <div class="table-container card p-30">
                <h3 class="table-title">Listado de Materias Registradas</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID (Ref)</th>
                                <th>Nombre</th>
                                <th>Horas Semanales</th>
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