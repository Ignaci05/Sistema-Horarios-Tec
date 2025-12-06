// js/views/horarioGridView.js

import { getGrupos } from '../modules/gruposData.js';
import { getAulas } from '../modules/aulasData.js';
import { getMaterias } from '../modules/materiasData.js';
import { getDocentes, getDocenteByMatricula } from '../modules/docentesData.js'; // ✅ Importamos getDocentes

// Estado local
let allGrupos = [];
let allMaterias = []; 
let filters = {
    aulaId: '',
    materiaId: '',
    semestre: '',
    docenteId: '' // ✅ Filtro de docente
};

// Variables de sesión
let currentUserRole = '';
let currentUserId = ''; 

/**
 * Paleta de Colores por Semestre (Vibrantes)
 */
const getSemesterColor = (semestre) => {
    const sem = String(semestre);
    const colors = {
        '1': '#FF8A80', '2': '#FFD180', '3': '#FFFF8D',
        '4': '#CCFF90', '5': '#A7FFEB', '6': '#80D8FF',
        '7': '#82B1FF', '8': '#B388FF', '9': '#FF80AB'
    };
    return colors[sem] || '#EEEEEE';
};

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

    // ✅ Cargamos también los DOCENTES
    const [grupos, aulas, materias, docentes] = await Promise.all([
        getGrupos(),
        getAulas(),
        getMaterias(),
        getDocentes() 
    ]);
    
    allGrupos = grupos;
    allMaterias = materias;
    
    populateFilters(aulas, materias, docentes); // ✅ Pasamos docentes
    renderGrid(); 
};

/**
 * Llena los selectores de filtro.
 */
const populateFilters = (aulas, materias, docentes) => {
    const aulaSelect = document.getElementById('filter-aula');
    const materiaSelect = document.getElementById('filter-materia');
    const semestreSelect = document.getElementById('filter-semestre');
    const docenteSelect = document.getElementById('filter-docente'); // ✅ Selector Docente
    
    if (aulaSelect) {
        aulaSelect.innerHTML = '<option value="">Todas las Aulas</option>';
        aulas.forEach(a => aulaSelect.innerHTML += `<option value="${a.id}">${a.nombre}</option>`);
    }

    if (materiaSelect) {
        materiaSelect.innerHTML = '<option value="">Todas las Materias</option>';
        materias.forEach(m => materiaSelect.innerHTML += `<option value="${m.id}">${m.nombre}</option>`);
    }

    if (semestreSelect) {
        semestreSelect.innerHTML = '<option value="">Todos los Semestres</option>';
        for(let i=1; i<=9; i++) {
            semestreSelect.innerHTML += `<option value="${i}">${i}º Semestre</option>`;
        }
    }

    // ✅ Lógica para llenar Docentes
    if (docenteSelect) {
        if (currentUserRole === 'docente') {
            // Si soy docente, deshabilito este filtro (solo veo mis clases)
            docenteSelect.innerHTML = '<option value="">Mi Horario</option>';
            docenteSelect.disabled = true;
        } else {
            // Si soy Admin, lleno la lista
            docenteSelect.innerHTML = '<option value="">Todos los Docentes</option>';
            docentes.forEach(d => {
                docenteSelect.innerHTML += `<option value="${d.id}">${d.nombre}</option>`;
            });
            docenteSelect.disabled = false;
        }
    }
};

/**
 * Aplica los filtros manuales.
 */
const applyFilters = () => {
    filters.aulaId = document.getElementById('filter-aula').value;
    filters.materiaId = document.getElementById('filter-materia').value;
    filters.semestre = document.getElementById('filter-semestre').value;
    filters.docenteId = document.getElementById('filter-docente').value; // ✅ Leer filtro
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

    // 1. Filtro base por Rol (Seguridad)
    let baseGrupos = allGrupos;
    if (currentUserRole === 'docente') {
        baseGrupos = allGrupos.filter(g => g.docenteId === currentUserId);
    } 

    // 2. Filtros de UI
    const filteredGrupos = baseGrupos.filter(g => {
        const matchAula = filters.aulaId === '' || g.aulaId === filters.aulaId;
        const matchMateria = filters.materiaId === '' || g.materiaId === filters.materiaId;
        const matchDocente = filters.docenteId === '' || g.docenteId === filters.docenteId; // ✅ Filtro lógico
        
        let matchSemestre = true;
        if (filters.semestre !== '') {
            const materiaDelGrupo = allMaterias.find(m => m.id === g.materiaId);
            matchSemestre = materiaDelGrupo ? (materiaDelGrupo.semestre.toString() === filters.semestre) : false;
        }

        return matchAula && matchMateria && matchSemestre && matchDocente;
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
                    
                    // 1. OBTENER COLOR DEL SEMESTRE
                    const materiaObj = allMaterias.find(m => m.id === grupo.materiaId);
                    const semestre = materiaObj ? materiaObj.semestre : '0';
                    let bgColor = getSemesterColor(semestre);
                    
                    let borderColor = 'rgba(0,0,0,0.1)'; 
                    let borderWidth = '0 0 0 4px'; // Borde izquierdo de 4px

                    if (currentUserRole === 'docente') {
                        borderColor = '#2E7D32'; 
                    } else {
                         borderColor = 'rgba(0,0,0,0.15)';
                    }

                    card.style.cssText = `
                        background-color: ${bgColor}; 
                        border-left: 4px solid ${borderColor}; 
                        padding: 6px; 
                        margin-bottom: 5px; 
                        border-radius: 4px;
                        font-size: 0.8em;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        text-align: left;
                        cursor: default;
                        transition: transform 0.1s;
                    `;
                    
                    const materiaNombre = grupo.materiaNombre || 'Materia';
                    const semestreTxt = materiaObj?.semestre || '?';
                    card.title = `${materiaNombre} (${semestreTxt}º Semestre)`;

                    let detailText = `<span>${grupo.aulaNombre}</span> <span style="font-weight:bold;">${grupo.nombre}</span>`;
                    
                    if (currentUserRole !== 'docente') {
                        const nombreProfe = grupo.docenteNombre ? grupo.docenteNombre.split(' ')[0] : 'Sin Asignar';
                        detailText += `<div style="font-size:0.8em; color:#444; margin-top:2px;">${nombreProfe}</div>`;
                    }

                    card.innerHTML = `
                        <div style="font-weight:bold; color:var(--primary-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${materiaNombre}
                        </div>
                        <div style="display:flex; flex-direction:column; color:#555; font-size:0.9em;">
                            ${detailText}
                        </div>
                    `;

                    card.onmouseenter = () => { card.style.transform = 'scale(1.02)'; card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)'; };
                    card.onmouseleave = () => { card.style.transform = 'scale(1)'; card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; };

                    cell.appendChild(card);
                });
            }
            row.appendChild(cell);
        });
        gridContainer.appendChild(row);
    });
};

const setupListeners = () => {
    document.getElementById('filter-aula').addEventListener('change', applyFilters);
    document.getElementById('filter-materia').addEventListener('change', applyFilters);
    document.getElementById('filter-semestre').addEventListener('change', applyFilters);
    document.getElementById('filter-docente').addEventListener('change', applyFilters); // ✅ Listener Docente
    
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        document.getElementById('filter-aula').value = '';
        document.getElementById('filter-materia').value = '';
        document.getElementById('filter-semestre').value = '';
        document.getElementById('filter-docente').value = '';
        applyFilters();
    });

    const btnExport = document.getElementById('btn-export-csv');
    if (btnExport) {
        btnExport.addEventListener('click', () => exportToCSV());
    }
};

const exportToCSV = () => {
    let dataToExport = [];
    let filename = "";
    let baseGrupos = allGrupos;
    if (currentUserRole === 'docente') {
        baseGrupos = allGrupos.filter(g => g.docenteId === currentUserId);
        filename = `Horario_Personal.csv`;
    } else {
        filename = `Horario_General.csv`;
    }

    // Exportar lo que se ve (filtrado)
    dataToExport = baseGrupos.filter(g => {
        const matchAula = filters.aulaId === '' || g.aulaId === filters.aulaId;
        const matchMateria = filters.materiaId === '' || g.materiaId === filters.materiaId;
        const matchDocente = filters.docenteId === '' || g.docenteId === filters.docenteId;
        let matchSemestre = true;
        if (filters.semestre !== '') {
            const materiaDelGrupo = allMaterias.find(m => m.id === g.materiaId);
            matchSemestre = materiaDelGrupo ? (materiaDelGrupo.semestre.toString() === filters.semestre) : false;
        }
        return matchAula && matchMateria && matchSemestre && matchDocente;
    });

    if (dataToExport.length === 0) {
        alert("No hay datos visibles para exportar.");
        return;
    }

    let csvContent = "\uFEFF"; 
    csvContent += "ID,Materia,Semestre,Grupo,Docente,Alumnos,Aula,Horario\n";

    dataToExport.forEach(g => {
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
    const desc = role === 'docente' ? 'Consulta tus asignaciones académicas.' : 'Vista global. Utiliza los filtros para encontrar clases.';

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
                    <label style="font-weight:bold; font-size:0.9em;">Filtrar por Docente:</label>
                    <select id="filter-docente" class="control-select"><option value="">Cargando...</option></select>
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

            <div style="margin-top:25px; padding:15px; background:#fafafa; border-radius:8px; border:1px solid #eee;">
                <h5 style="margin-top:0; font-size:0.9em; color:#666; text-align:center;">Guía de Semestres</h5>
                <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; font-size:0.85em;">
                    <span style="padding:4px 10px; background:#FF8A80; color:#333; border-radius:15px; font-weight:bold;">1º Sem</span>
                    <span style="padding:4px 10px; background:#FFD180; color:#333; border-radius:15px; font-weight:bold;">2º Sem</span>
                    <span style="padding:4px 10px; background:#FFFF8D; color:#333; border-radius:15px; font-weight:bold;">3º Sem</span>
                    <span style="padding:4px 10px; background:#CCFF90; color:#333; border-radius:15px; font-weight:bold;">4º Sem</span>
                    <span style="padding:4px 10px; background:#A7FFEB; color:#333; border-radius:15px; font-weight:bold;">5º Sem</span>
                    <span style="padding:4px 10px; background:#80D8FF; color:#333; border-radius:15px; font-weight:bold;">6º Sem</span>
                    <span style="padding:4px 10px; background:#82B1FF; color:#333; border-radius:15px; font-weight:bold;">7º Sem</span>
                    <span style="padding:4px 10px; background:#B388FF; color:white; border-radius:15px; font-weight:bold;">8º Sem</span>
                    <span style="padding:4px 10px; background:#FF80AB; color:white; border-radius:15px; font-weight:bold;">9º Sem</span>
                </div>
            </div>
            
            <div class="horario-grid-container" style="overflow-x: auto;">
                <table class="horario-table" style="width:100%; border-collapse:collapse; min-width:900px;">
                    <thead style="background:var(--primary-dark); color:white;">
                        <tr>
                            <th class="time-header" style="padding:10px; width:100px;">Hora</th>
                            <th>Lunes</th><th>Martes</th><th>Miércoles</th><th>Jueves</th><th>Viernes</th>
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