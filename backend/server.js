// backend/server.js

// Cargar variables de entorno desde el archivo .env
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg'); // Cliente de PostgreSQL
const cors = require('cors');
const bodyParser = require('body-parser');

// Configuración del servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permitir conexiones desde el Frontend
app.use(bodyParser.json()); // Permitir leer JSON en las peticiones

// ⚠️ CONFIGURACIÓN DE LA BASE DE DATOS (PostgreSQL Remoto)
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    // La opción SSL es obligatoria para la mayoría de nubes (Railway, Supabase, Neon, etc.)
    ssl: {
        rejectUnauthorized: false
    }
});

// Prueba de conexión al iniciar
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error fatal conectando a la BD Remota:', err.message);
    } else {
        console.log('✅ Conectado exitosamente a PostgreSQL Remoto.');
    }
    if (release) release();
});

// ==========================================
// RUTAS DE LA API
// ==========================================

// 1️⃣ LOGIN (Validar credenciales)
app.post('/api/login', async (req, res) => {
    const { matricula, password } = req.body;
    
    // Consulta segura usando parámetros ($1, $2) para evitar inyección SQL
    const query = 'SELECT * FROM usuarios WHERE matricula = $1 AND password = $2';
    
    try {
        const result = await pool.query(query, [matricula, password]);
        
        if (result.rows.length > 0) {
            const usuario = result.rows[0];
            
            // Devolver datos del usuario (sin el password)
            res.json({ 
                success: true, 
                user: { 
                    uid: usuario.id, 
                    nombre: usuario.nombre, 
                    role: usuario.rol, // Asegúrate que en tu BD la columna se llame 'rol'
                    matricula: usuario.matricula 
                } 
            });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (err) {
        console.error("Error en Login:", err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 2️⃣ CREAR USUARIO (Sincronización con Firestore)
app.post('/api/usuarios', async (req, res) => {
    const { nombre, matricula, password, rol } = req.body;
    
    if (!matricula || !password || !rol) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
    }

    // RETURNING id es necesario en Postgres para obtener el ID recién creado
    const query = 'INSERT INTO usuarios (nombre, matricula, password, rol) VALUES ($1, $2, $3, $4) RETURNING id';
    
    try {
        const result = await pool.query(query, [nombre, matricula, password, rol]);
        res.json({ success: true, id: result.rows[0].id, message: 'Usuario creado en PostgreSQL' });
    } catch (err) {
        console.error("Error Crear Usuario:", err);
        // Código 23505 es violación de unicidad (Matrícula repetida)
        if (err.code === '23505') {
            return res.status(409).json({ success: false, message: 'La matrícula ya está registrada.' });
        }
        return res.status(500).json({ success: false, message: 'Error de base de datos' });
    }
});

// 3️⃣ ACTUALIZAR USUARIO (Cambio de nombre, rol o contraseña)
app.put('/api/usuarios/:matricula', async (req, res) => {
    const matricula = req.params.matricula;
    const { nombre, password, rol } = req.body;

    // Construcción dinámica de la consulta (por si el password viene vacío)
    let query = 'UPDATE usuarios SET nombre = $1, rol = $2';
    let params = [nombre, rol];
    let counter = 3; 

    if (password && password.trim() !== "") {
        query += `, password = $${counter}`;
        params.push(password);
        counter++;
    }

    query += ` WHERE matricula = $${counter}`;
    params.push(matricula);

    try {
        await pool.query(query, params);
        res.json({ success: true, message: 'Usuario actualizado' });
    } catch (err) {
        console.error("Error Actualizar Usuario:", err);
        return res.status(500).json({ success: false, message: 'Error actualizando usuario' });
    }
});

// 4️⃣ ELIMINAR USUARIO
app.delete('/api/usuarios/:matricula', async (req, res) => {
    const matricula = req.params.matricula;
    const query = 'DELETE FROM usuarios WHERE matricula = $1';

    try {
        await pool.query(query, [matricula]);
        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (err) {
        console.error("Error Eliminar Usuario:", err);
        return res.status(500).json({ success: false, message: 'Error eliminando usuario' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor PostgreSQL corriendo en http://localhost:${PORT}`);
});