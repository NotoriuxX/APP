const express = require('express');
const router = express.Router();
const db = require('../db'); // Conexión a la base de datos

// Obtener todos los departamentos
router.get('/departamentos', (req, res) => {
    const query = 'SELECT * FROM departamentos';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// TEST - Obtener trabajadores por grupo específico (incluye propietario)
router.get('/test/:id', (req, res) => {
    const { id } = req.params;
    console.log('Endpoint /test/:id llamado con id:', id);
    
    res.json({ 
        message: 'Endpoint funcionando', 
        id: id,
        test: true 
    });
});

// Obtener todos los trabajadores con el nombre del departamento (con filtro por grupo)
router.get('/', (req, res) => {
    const { grupo_id } = req.query; // Debe recibir el grupo_id como parámetro
    
    if (!grupo_id) {
        return res.status(400).json({ error: 'Se requiere el parámetro grupo_id' });
    }
    
    const query = `
        SELECT 
            t.id,
            t.usuario_id,
            u.nombre,
            u.apellido,
            u.email,
            u.rut,
            u.tiene_acceso,
            t.departamento_id,
            d.nombre AS departamento_nombre,
            t.fecha_contratacion,
            t.activo,
            t.grupo_id,
            t.ocupacion,
            t.telefono,
            t.direccion,
            t.cargo_especifico,
            t.observaciones,
            t.experiencia_anos,
            t.salario,
            t.fecha_ingreso,
            'trabajador' AS tipo_usuario
        FROM trabajadores t
        INNER JOIN usuarios u ON t.usuario_id = u.id
        LEFT JOIN departamentos d ON t.departamento_id = d.id
        WHERE t.grupo_id = ?
        ORDER BY u.apellido, u.nombre
    `;
    
    db.query(query, [grupo_id], (err, results) => {
        if (err) {
            console.error('Error al obtener trabajadores:', err);
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

module.exports = router;
