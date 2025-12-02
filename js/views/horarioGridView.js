// js/views/horarioGridView.js

import { getGrupos } from '../modules/gruposData.js';
import { getAulas } from '../modules/aulasData.js';
import { getMaterias } from '../modules/materiasData.js';
import { getDocenteByMatricula } from '../modules/docentesData.js';

// Estado local
let allGrupos = [];
let allMaterias = []; // 🆕 Necesario para consultar el semestre del grupo
let filters = {
    aulaId: '',
    materiaId: '',
    semestre: '' // 🆕 Nuevo filtro
};

// Variables de sesión
let currentUserRole = '';
let currentUserId = ''; 

/**
 * Carga los datos iniciales.
 */
const loadData = async () => {
    currentUserRole = localStorage.getItem('userRole'); 
    const userMatricula = localStorage.getItem('userMatricula');

    if (currentUserRole === 'docente' && userMatricula) {
        try {
            const docenteFirestore = await getDocenteByMatricula(userMatricula);
            if (docenteFirestore) {
                currentUserId = docenteFirestore.id;
            }
        } catch (e) { console.error(e); }
    } else {
        currentUserId = localStorage.getItem('userUID');
    }

    const [grupos, aulas, materias] = await Promise.all([
        getGrupos(),
        getAulas(),
        getMaterias()
    ]);
    
    allGrupos = grupos;
    allMaterias = materias; // 🆕 Guardamos materias globalmente
    
    populateFilters(aulas, materias);
    renderGrid(); 
};

/**
 * Llena los selectores de filtro.
 */
const populateFilters = (aulas, materias) => {
    const aulaSelect = document.getElementById('filter-aula');
    const materiaSelect = document.getElementById('filter-materia');
    const semestreSelect = document.getElementById('filter-semestre'); // 🆕
    
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

    // 🆕 Llenar Semestres (1-9)
    if (semestreSelect) {
        semestreSelect.innerHTML = '<option value="">Todos los Semestres</option>';
        for(let i=1; i<=9; i++) {
            semestreSelect.innerHTML += `<option value="${i}">${i}º Semestre</option>`;
        }
    }
};

/**
 * Aplica los filtros manuales.
 */
const applyFilters = () => {
    filters.aulaId = document.getElementById('filter-aula').value;
    filters.materiaId = document.getElementById('filter-materia').value;
    filters.semestre = document.getElementById('filter-semestre').value; // 🆕
    renderGrid();
};

/**
 * Renderiza la parrilla de horarios.
 */
const renderGrid = () => {
    const gridContainer = document.getElementById('horario-grid-body');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    const horas = [7, 8, 9, 10, 11, 12, 13, 14];
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    // --- LÓGICA DE FILTRADO ---
    
    // 1. Filtro base por Rol
    let baseGrupos = allGrupos;
    if (currentUserRole === 'docente') {
        baseGrupos = allGrupos.filter(g => g.docenteId === currentUserId);
    } 

    // 2. Filtros de UI
    const filteredGrupos = baseGrupos.filter(g => {
        const matchAula = filters.aulaId === '' || g.aulaId === filters.aulaId;
        const matchMateria = filters.materiaId === '' || g.materiaId === filters.materiaId;
        
        // 🆕 Lógica de Filtro por Semestre
        let matchSemestre = true;
        if (filters.semestre !== '') {
            // Buscamos la materia asociada al grupo para saber su semestre
            const materiaDelGrupo = allMaterias.find(m => m.id === g.materiaId);
            if (materiaDelGrupo) {
                // Comparamos strings para evitar problemas de tipos
                matchSemestre = materiaDelGrupo.semestre.toString() === filters.semestre;
            } else {
                matchSemestre = false;
            }
        }

        return matchAula && matchMateria && matchSemestre;
    });

    // --- CONSTRUCCIÓN DE LA TABLA ---

    horas.forEach(hora => {
        const row = document.createElement('tr');
        
        const timeCell = document.createElement('td');
        timeCell.className = 'time-slot';
        timeCell.textContent = `${hora}:00 - ${hora+1}:00`;
        timeCell.style.fontWeight = 'bold';
        timeCell.style.background = '#f8f9fa';
        timeCell.style.borderRight = '2px solid #ddd';
        row.appendChild(timeCell);

        dias.forEach(dia => {
            const cell = document.createElement('td');
            cell.className = 'class-slot';
            cell.style.verticalAlign = 'top';
            cell.style.padding = '5px';
            cell.style.border = '1px solid #eee';
            
            const slotKey = `${dia}-${hora}`;
            const activeGroups = filteredGrupos.filter(g => g.horario && g.horario.includes(slotKey));

            if (activeGroups.length > 0) {
                activeGroups.forEach(grupo => {
                    const card = document.createElement('div');
                    
                    const isMyClass = (grupo.docenteId === currentUserId);
                    const bgColor = isMyClass ? '#E8F5E9' : '#E3F2FD'; 
                    const borderColor = isMyClass ? '#4CAF50' : '#2196F3';

                    card.style.cssText = `
                        background-color: ${bgColor}; 
                        border-left: 4px solid ${borderColor}; 
                        padding: 6px; 
                        margin-bottom: 5px; 
                        border-radius: 4px;
                        font-size: 0.8em;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        text-align: left;
                    `;
                    
                    let detailText = `<span>${grupo.aulaNombre}</span> <span style="font-weight:bold;">${grupo.nombre}</span>`;
                    
                    if (currentUserRole !== 'docente') {
                        const nombreProfe = grupo.docenteNombre ? grupo.docenteNombre.split(' ')[0] : 'Sin Asignar';
                        detailText += `<div style="font-size:0.8em; color:#666; margin-top:2px;">${nombreProfe}</div>`;
                    }

                    card.innerHTML = `
                        <div style="font-weight:bold; color:var(--primary-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${grupo.materiaNombre}
                        </div>
                        <div style="display:flex; flex-direction:column; color:#555; font-size:0.9em;">
                            ${detailText}
                        </div>
                    `;
                    cell.appendChild(card);
                });
            }
            row.appendChild(cell);
        });
        gridContainer.appendChild(row);
    });
};

/**
 * Listeners para botones y selects.
 */
const setupListeners = () => {
    document.getElementById('filter-aula').addEventListener('change', applyFilters);
    document.getElementById('filter-materia').addEventListener('change', applyFilters);
    document.getElementById('filter-semestre').addEventListener('change', applyFilters); // 🆕
    
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        document.getElementById('filter-aula').value = '';
        document.getElementById('filter-materia').value = '';
        document.getElementById('filter-semestre').value = ''; // 🆕
        applyFilters();
    });

    const btnExport = document.getElementById('btn-export-csv');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            exportToCSV();
        });
    }
};

/**
 * Genera reporte CSV.
 */
const exportToCSV = () => {
    // Definir qué datos exportar (respetando el filtro actual o todos los del usuario)
    let dataToExport = [];
    let filename = "";

    // Obtenemos los grupos ya filtrados por rol
    let baseGrupos = allGrupos;
    if (currentUserRole === 'docente') {
        baseGrupos = allGrupos.filter(g => g.docenteId === currentUserId);
        filename = `Horario_Personal_${new Date().toISOString().slice(0,10)}.csv`;
    } else {
        filename = `Horario_General_${new Date().toISOString().slice(0,10)}.csv`;
    }

    // 🆕 Aplicamos también los filtros de UI al CSV para que descargue lo que se ve
    dataToExport = baseGrupos.filter(g => {
        const matchAula = filters.aulaId === '' || g.aulaId === filters.aulaId;
        const matchMateria = filters.materiaId === '' || g.materiaId === filters.materiaId;
        let matchSemestre = true;
        if (filters.semestre !== '') {
            const materiaDelGrupo = allMaterias.find(m => m.id === g.materiaId);
            matchSemestre = materiaDelGrupo ? (materiaDelGrupo.semestre.toString() === filters.semestre) : false;
        }
        return matchAula && matchMateria && matchSemestre;
    });

    if (dataToExport.length === 0) {
        alert("No hay datos visibles para exportar.");
        return;
    }

    let csvContent = "\uFEFF"; 
    csvContent += "ID,Materia,Semestre,Grupo,Docente,Alumnos,Aula,Horario\n";

    dataToExport.forEach(g => {
        // Buscar semestre para el reporte
        const matObj = allMaterias.find(m => m.id === g.materiaId);
        const sem = matObj ? matObj.semestre : "?";

        const mat = (g.materiaNombre || "").replace(/,/g, " ");
        const doc = (g.docenteNombre || "").replace(/,/g, " ");
        const aula = (g.aulaNombre || "").replace(/,/g, " ");
        const hor = (g.horario || []).join(" | ");
        
        csvContent += `${g.id},${mat},${sem},${g.nombre},${doc},${g.numAlumnos},${aula},"${hor}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const loadHorarioGridView = () => {
    const appContent = document.getElementById('app-content');
    const role = localStorage.getItem('userRole');
    
    const titulo = role === 'docente' ? 'Mi Horario de Clases' : 'Horario General Institucional';
    const desc = role === 'docente' 
        ? 'Consulta tus asignaciones académicas.' 
        : 'Vista global. Filtra por Semestre, Aula o Materia.';

    appContent.innerHTML = `
        <h2 class="section-title">${titulo}</h2>
        <p class="description-text">${desc}</p>

        <div class="card p-30">
            <div class="filter-controls" style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid #eee;">
                
                <div style="flex:1; min-width: 150px;">
                    <label style="font-weight:bold; font-size:0.9em;">Filtrar por Semestre:</label>
                    <select id="filter-semestre" class="control-select"><option>Cargando...</option></select>
                </div>

                <div style="flex:1; min-width: 200px;">
                    <label style="font-weight:bold; font-size:0.9em;">Filtrar por Aula:</label>
                    <select id="filter-aula" class="control-select"><option>Cargando...</option></select>
                </div>
                <div style="flex:1; min-width: 200px;">
                    <label style="font-weight:bold; font-size:0.9em;">Filtrar por Materia:</label>
                    <select id="filter-materia" class="control-select"><option>Cargando...</option></select>
                </div>
                <div style="display:flex; align-items:flex-end; gap:10px;">
                    <button id="btn-reset-filters" class="btn btn-secondary btn-sm" style="height:42px;">Limpiar</button>
                    <button id="btn-export-csv" class="btn btn-success btn-sm" style="height:42px; background:#27ae60; color:white; border:none;">📄 CSV</button>
                </div>
            </div>

            <div class="horario-grid-container" style="overflow-x: auto;">
                <table class="horario-table" style="width:100%; border-collapse:collapse; min-width:900px;">
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
                        <tr><td colspan="6" style="text-align:center; padding:30px;">Cargando horario...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    loadData().then(() => {
        setupListeners();
    });
};