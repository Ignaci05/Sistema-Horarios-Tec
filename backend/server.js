// backend/server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// CONEXIÓN A MYSQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'canela-1', // PON AQUÍ TU CONTRASEÑA SI TIENES UNA
    database: 'sistema_horarios'
});

db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        return;
    }
    console.log('Conectado a MySQL correctamente.');
});

// --- RUTA 1: LOGIN ---
app.post('/api/login', (req, res) => {
    const { matricula, password } = req.body;
    const query = 'SELECT * FROM usuarios WHERE matricula = ? AND password = ?';
    
    db.query(query, [matricula, password], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error en servidor' });
        if (results.length > 0) {
            const usuario = results[0];
            res.json({ success: true, user: { uid: usuario.id, nombre: usuario.nombre, role: usuario.rol, matricula: usuario.matricula } });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    });
});

// --- RUTA 2: CREAR USUARIO (Esto es lo que te faltaba o no cargó) ---
app.post('/api/usuarios', (req, res) => {
    const { nombre, matricula, password, rol } = req.body;
    if (!matricula || !password || !rol) return res.status(400).json({ success: false, message: 'Faltan datos' });

    const query = 'INSERT INTO usuarios (nombre, matricula, password, rol) VALUES (?, ?, ?, ?)';
    
    db.query(query, [nombre, matricula, password, rol], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Matrícula ya existe' });
            return res.status(500).json({ success: false, message: 'Error DB' });
        }
        res.json({ success: true, id: result.insertId });
    });
});

// --- RUTA 3: ACTUALIZAR USUARIO ---
app.put('/api/usuarios/:matricula', (req, res) => {
    const matricula = req.params.matricula;
    const { nombre, password, rol } = req.body;
    let query = 'UPDATE usuarios SET nombre = ?, rol = ?';
    let params = [nombre, rol];

    if (password && password.trim() !== "") {
        query += ', password = ?';
        params.push(password);
    }
    query += ' WHERE matricula = ?';
    params.push(matricula);

    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// --- RUTA 4: ELIMINAR USUARIO ---
app.delete('/api/usuarios/:matricula', (req, res) => {
    const matricula = req.params.matricula;
    db.query('DELETE FROM usuarios WHERE matricula = ?', [matricula], (err, result) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});