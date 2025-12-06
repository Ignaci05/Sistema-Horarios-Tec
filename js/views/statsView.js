// js/views/statsView.js

import { getGrupos } from '../modules/gruposData.js';
import { getDocentes } from '../modules/docentesData.js';
import { getAulas } from '../modules/aulasData.js';

/**
 * Calcula las estadísticas principales.
 */
const calculateStats = async () => {
    const [grupos, docentes, aulas] = await Promise.all([
        getGrupos(),
        getDocentes(),
        getAulas()
    ]);

    // 1. Total de Alumnos
    let totalAlumnos = 0;
    grupos.forEach(g => {
        totalAlumnos += parseInt(g.numAlumnos) || 0;
    });

    // 2. Docentes y Grupos
    const totalDocentes = docentes.length;
    const totalGrupos = grupos.length;

    // 3. Ocupación Promedio de Aulas
    // (Comparación: Alumnos en grupos vs Capacidad total de aulas asignadas)
    let capacidadTotalUsada = 0;
    let alumnosEnAulas = 0;

    grupos.forEach(g => {
        const aula = aulas.find(a => a.id === g.aulaId);
        if (aula) {
            capacidadTotalUsada += parseInt(aula.capacidad);
            alumnosEnAulas += parseInt(g.numAlumnos);
        }
    });

    // Evitar división por cero
    const porcentajeOcupacion = capacidadTotalUsada > 0 
        ? Math.round((alumnosEnAulas / capacidadTotalUsada) * 100) 
        : 0;

    return {
        totalAlumnos,
        totalDocentes,
        totalGrupos,
        porcentajeOcupacion,
        totalAulas: aulas.length
    };
};

/**
 * Función principal para cargar la vista.
 */
export const loadStatsView = async () => {
    const appContent = document.getElementById('app-content');
    
    // Loader inicial
    appContent.innerHTML = '<div class="text-center p-5"><h3>Calculando estadísticas...</h3></div>';

    try {
        const stats = await calculateStats();

        appContent.innerHTML = `
            <h2 class="section-title">Panel de Control Principal</h2>
            <p class="description-text">Resumen ejecutivo del ciclo escolar actual.</p>

            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                
                <div class="card p-30 text-center" style="border-bottom: 5px solid #3498DB;">
                    <h3 style="font-size: 3em; color: #2C3E50; margin: 0;">${stats.totalAlumnos}</h3>
                    <p style="color: #7F8C8D; font-weight: bold; margin-top: 5px;">Alumnos Inscritos</p>
                </div>

                <div class="card p-30 text-center" style="border-bottom: 5px solid #E67E22;">
                    <h3 style="font-size: 3em; color: #2C3E50; margin: 0;">${stats.totalGrupos}</h3>
                    <p style="color: #7F8C8D; font-weight: bold; margin-top: 5px;">Grupos Activos</p>
                </div>

                <div class="card p-30 text-center" style="border-bottom: 5px solid #27AE60;">
                    <h3 style="font-size: 3em; color: #2C3E50; margin: 0;">${stats.totalDocentes}</h3>
                    <p style="color: #7F8C8D; font-weight: bold; margin-top: 5px;">Docentes en Plantilla</p>
                </div>

                <div class="card p-30 text-center" style="border-bottom: 5px solid #9B59B6;">
                    <h3 style="font-size: 3em; color: #2C3E50; margin: 0;">${stats.porcentajeOcupacion}%</h3>
                    <p style="color: #7F8C8D; font-weight: bold; margin-top: 5px;">Ocupación de Aulas</p>
                </div>

            </div>

            <div class="row" style="margin-top: 40px;">
                <div class="card p-30" style="width: 100%;">
                    <h4 class="form-title">Accesos Rápidos</h4>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="document.querySelector('[data-view=view-grupos]').click()">Nuevo Grupo</button>
                        <button class="btn btn-secondary" onclick="document.querySelector('[data-view=view-horario]').click()">Ver Horario General</button>
                        <button class="btn btn-info" onclick="document.querySelector('[data-view=view-docentes]').click()">Directorio Docente</button>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error(error);
        appContent.innerHTML = `<div class="alert alert-danger">Error al cargar estadísticas: ${error.message}</div>`;
    }
};