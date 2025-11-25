// js/views/docentesView.js (CORREGIDO)

import { getDocentes, saveDocente, deleteDocente } from '../modules/docentesData.js';
import { loadView } from '../modules/router.js'; 

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
 * Rellena el formulario con datos para edición o lo limpia.
 */
const fillForm = (docente = null) => {
    const form = document.getElementById('docente-form');
    if (!form) return;

    currentDocenteId = docente ? docente.id : null;
    
    // Control de visibilidad del campo Contraseña
    const passwordGroup = document.getElementById('password-group');
    const passwordInput = document.getElementById('docente-password');
    
    if (docente) {
        passwordGroup.style.display = 'none';
        passwordInput.removeAttribute('required'); // No requerido en edición
    } else {
        passwordGroup.style.display = 'block';
        passwordInput.setAttribute('required', 'required'); // Requerido al crear
    }

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
    const clearBtn = document.getElementById('clear-form-btn'); // ⬅️ Nuevo ID para el botón Limpiar

    if (!form || !clearBtn) return;

    // 1. Listener para el SUBMIT (Crear/Editar)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const docente = {
            id: currentDocenteId,
            nombre: document.getElementById('docente-nombre').value.trim(),
            matricula: document.getElementById('docente-matricula').value.trim(),
            cargaHoraria: document.getElementById('carga-horaria').value,
            role: document.getElementById('docente-role').value,
            // Solo toma el valor de la contraseña si existe (en modo Crear)
            password: document.getElementById('docente-password')?.value || '' 
        };

        try {
            await saveDocente(docente);
            alert(`Docente ${docente.id ? 'actualizado' : 'registrado'} con éxito.`);
            
            // Lógica de recarga de sesión si el rol del usuario logueado cambia
            const currentUserID = localStorage.getItem('userUID');
            if (docente.id === currentUserID && docente.role !== localStorage.getItem('userRole')) {
                alert("Su rol ha sido modificado. Se recargará el dashboard.");
                localStorage.setItem('userRole', docente.role); 
                window.location.reload(); // Recarga completa para que el router se reinicie
                return;
            }
            
            fillForm(null); // Limpiar formulario y estado de edición
            renderDocentesTable(); 
        } catch (error) {
            alert("Error: " + error.message);
        }
    });
    
    // 2. Listener para el botón LIMPIAR/CANCELAR (Soluciona ReferenceError)
    clearBtn.addEventListener('click', () => {
        form.reset(); // Limpiar campos
        fillForm(null); // Restablecer el estado (currentDocenteId = null, mostrar campo password)
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
            if (confirm('¿Está seguro de que desea eliminar este docente?')) {
                try {
                    await deleteDocente(id);
                    alert('Docente eliminado con éxito.');
                    renderDocentesTable(); 
                } catch (error) {
                    alert("Error al eliminar: " + error.message);
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