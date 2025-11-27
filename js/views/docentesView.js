// js/views/docentesView.js (CORREGIDO)

import { getDocentes, saveDocente, deleteDocente } from '../modules/docentesData.js';
import { loadView } from '../modules/router.js'; 
import { showAlert, showConfirm } from '../modules/uiHandler.js';

let currentDocenteId = null; 

/**
 * Renderiza la fila de un docente.
 */
const renderDocenteRow = (docente) => {
    // 1. Obtener el rol, buscando 'role' o 'rol', o asignando 'docente' por defecto.
    const currentRole = docente.role || docente.rol || 'docente';
    
    // 2. Generar el badge usando el rol asegurado.
    const roleBadge = currentRole !== 'docente' 
        ? `<span style="color:red; font-weight:700;">${currentRole.toUpperCase()}</span>` 
        : currentRole;
    
    return `
        <tr data-id="${docente.id}">
            <td>${docente.matricula}</td>
            <td>${docente.nombre}</td>
            <td>${docente.cargaHoraria}</td>
            <td>${roleBadge}</td>
            <td>
                <button class="btn btn-info btn-sm edit-btn" data-id="${docente.id}">Editar</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${docente.id}">Eliminar</button>
            </td>
        </tr>
    `;
};

/**
 * Rellena y actualiza la tabla de docentes.
 */
const renderDocentesTable = async () => {
    const tableBody = document.querySelector('#docentes-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando docentes...</td></tr>';
    
    const docentes = await getDocentes();
    tableBody.innerHTML = ''; 

    if (docentes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay docentes registrados (Se requieren 15).</td></tr>';
        return;
    }

    docentes.forEach(d => {
        tableBody.insertAdjacentHTML('beforeend', renderDocenteRow(d));
    });

    setupTableListeners(docentes);
};

/**
 * Rellena el formulario con datos para edición.
 */
const fillForm = (docente = null) => {
    const form = document.getElementById('docente-form');
    if (!form) return;

    currentDocenteId = docente ? docente.id : null;
    
    const passwordInput = document.getElementById('docente-password');
    const passwordLabel = document.querySelector('label[for="docente-password"]');
    
    if (docente) {
        // MODO EDICIÓN: Campo visible pero opcional
        passwordInput.removeAttribute('required');
        passwordInput.value = ''; // Limpiar para no mostrar la contraseña real (seguridad)
        passwordInput.placeholder = "Dejar vacío para mantener la actual";
        passwordLabel.textContent = "Contraseña (Opcional al editar):";
    } else {
        // MODO CREACIÓN: Campo obligatorio
        passwordInput.setAttribute('required', 'required');
        passwordInput.value = '';
        passwordInput.placeholder = "";
        passwordLabel.textContent = "Contraseña:";
    }

    // Mostrar siempre el grupo de contraseña (quitamos el style.display = 'none')
    document.getElementById('password-group').style.display = 'block';

    document.getElementById('docente-nombre').value = docente?.nombre || '';
    document.getElementById('docente-matricula').value = docente?.matricula || '';
    document.getElementById('carga-horaria').value = docente?.cargaHoraria || '';
    document.getElementById('docente-role').value = docente?.role || 'docente';
    
    document.querySelector('#docente-form button[type="submit"]').textContent = docente ? 'Guardar Cambios' : 'Registrar Docente';
};

/**
 * Maneja los listeners del formulario.
 */
const setupFormListeners = () => {
    const form = document.getElementById('docente-form');
    const clearBtn = document.getElementById('clear-form-btn');

    if (!form || !clearBtn) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const docente = {
            id: currentDocenteId,
            nombre: document.getElementById('docente-nombre').value.trim(),
            matricula: document.getElementById('docente-matricula').value.trim(),
            cargaHoraria: document.getElementById('carga-horaria').value,
            role: document.getElementById('docente-role').value,
            // Enviamos lo que haya en el input (vacío o nueva pass)
            password: document.getElementById('docente-password')?.value || '' 
        };

        try {
            await saveDocente(docente);
           await showAlert('Operación Exitosa', `Docente ${docente.id ? 'actualizado' : 'registrado'} con éxito.`, 'success');
            
            // Recarga si cambia el rol propio (lógica existente)
            const currentUserID = localStorage.getItem('userUID');
            if (docente.id === currentUserID && docente.role !== localStorage.getItem('userRole')) {
                alert("Su rol ha sido modificado. Se recargará el dashboard.");
                localStorage.setItem('userRole', docente.role); 
                window.location.reload(); 
                return;
            }
            
            fillForm(null); 
            renderDocentesTable(); 
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
 * Maneja los listeners de los botones de la tabla (Editar/Eliminar).
 */
const setupTableListeners = (docentes) => {
    // Listener de Editar
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const docenteToEdit = docentes.find(d => d.id === id);
            if (docenteToEdit) {
                fillForm(docenteToEdit);
            }
        });
    });

    // Listener de Eliminar
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const confirm = await showConfirm('¿Eliminar Docente?', 'Esta acción no se puede deshacer. ¿Desea continuar?');
            if (confirm) {
                try {
                    await deleteDocente(id);
                    await showAlert('Eliminado', 'Docente eliminado con éxito.', 'success');
                    renderDocentesTable(); 
                } catch (error) {
                    await showAlert('Error', error.message, 'error');
                }
            }
        });
    });
};

/**
 * Función principal para cargar la vista de Docentes.
 */
export const loadDocentesView = () => {
    const appContent = document.getElementById('app-content');
    
    // Inyectar el HTML estático de la vista de Docentes
    appContent.innerHTML = `
        <h2 class="section-title">Gestión de Docentes</h2>
        <p class="description-text">Permite al Jefe de Departamento y Subdirector agregar y administrar la información de los 15 docentes. [cite_start]La carga horaria debe ser de 8 a 18 horas o de 20 a 22 horas. [cite: 34, 35, 36]</p>

        <div class="crud-layout">
            <div class="form-container card p-30">
                <h3 class="form-title">Agregar/Editar Docente</h3>
                <form id="docente-form" class="docente-form">
                    <div class="form-group"><label for="docente-nombre">Nombre Completo:</label><input type="text" id="docente-nombre" name="nombre" required></div>
                    <div class="form-group"><label for="docente-matricula">Matrícula/ID:</label><input type="text" id="docente-matricula" name="matricula" required></div>
                    
                    <div class="form-group" id="password-group">
                        <label for="docente-password">Contraseña (Solo al Crear):</label>
                        <input type="password" id="docente-password" name="password" required> 
                    </div>

                    <div class="form-group">
                        <label for="carga-horaria">Carga Horaria Semanal (Regla de Negocio):</label>
                        <select id="carga-horaria" name="cargaHoraria" required>
                            <option value="">Seleccione Categoría...</option>
                            <option value="8-18">8 - 18 horas</option>
                            <option value="20-22">20 - 22 horas</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="docente-role">Rol en el Sistema:</label>
                        <select id="docente-role" name="role" required>
                            <option value="docente">Docente</option>
                            <option value="jefe">Jefe de Departamento</option>
                            <option value="subdirector">Subdirector</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">Registrar Docente</button>
                    <button type="button" class="btn btn-secondary btn-block mt-10" id="clear-form-btn">Limpiar</button>
                </form>
            </div>

            <div class="table-container">
                <h3 class="table-title">Listado de Docentes</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Matrícula</th>
                                <th>Nombre</th>
                                <th>Carga Semanal</th>
                                <th>Rol</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="docentes-table-body">
                            </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Inicializar la vista
    setupFormListeners();
    renderDocentesTable();
};