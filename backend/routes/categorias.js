const express = require('express');
const router = express.Router();
const db = require('../db'); // Conexión a la base de datos

// Obtener todas las categorías
router.get('/', (req, res) => {
    const query = 'SELECT * FROM tipos_items';

    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Buscar una categoría por ID
router.get('/:id', (req, res) => {
    const { id } = req.params;

    const query = 'SELECT * FROM tipos_items WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (results.length === 0) {
            res.status(404).json({ message: 'Categoría no encontrada' });
        } else {
            res.json(results[0]);
        }
    });
});

// Agregar una nueva categoría
router.post('/', (req, res) => {
    const { nombre, grupo_id } = req.body;

    if (!nombre || !grupo_id) {
        return res.status(400).json({ error: 'El nombre y grupo_id son obligatorios' });
    }

    const query = 'INSERT INTO tipos_items (nombre, grupo_id) VALUES (?, ?)';
    db.query(query, [nombre, grupo_id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({ message: 'Categoría creada', id: result.insertId });
        }
    });
});

// Modificar una categoría
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, grupo_id } = req.body;

    if (!nombre || !grupo_id) {
        return res.status(400).json({ error: 'El nombre y grupo_id son obligatorios' });
    }

    const query = 'UPDATE tipos_items SET nombre = ?, grupo_id = ? WHERE id = ?';
    db.query(query, [nombre, grupo_id, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Categoría no encontrada' });
        } else {
            res.json({ message: 'Categoría actualizada' });
        }
    });
});

// Eliminar una categoría
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    const verifyQuery = `
        SELECT i.id AS item_id, i.CCI AS codigo
        FROM items i
        WHERE i.tipo_id = ?
    `;
    db.query(verifyQuery, [id], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (results.length > 0) {
            res.status(400).json({
                message: 'La categoría tiene datos asociados. ¿Desea eliminar todo?',
                datosAsociados: results
            });
        } else {
            const deleteQuery = 'DELETE FROM tipos_items WHERE id = ?';
            db.query(deleteQuery, [id], (err, result) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ message: 'Categoría eliminada' });
                }
            });
        }
    });
});

// Confirmar eliminación de una categoría y todos sus datos asociados
router.delete('/:id/confirmar', (req, res) => {
    const { id } = req.params;

    const deleteAssociatedQuery = `
        DELETE FROM valores_campos WHERE item_id IN (SELECT id FROM items WHERE tipo_id = ?);
        DELETE FROM items WHERE tipo_id = ?;
    `;
    db.query(deleteAssociatedQuery, [id, id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const deleteCategoryQuery = 'DELETE FROM tipos_items WHERE id = ?';
            db.query(deleteCategoryQuery, [id], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ message: 'Categoría y todos sus datos asociados eliminados' });
                }
            });
        }
    });
});

// Obtener la estructura de una categoría
router.get('/:id/estructura', (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            c.id AS campo_id,
            c.nombre AS campo_nombre,
            c.tipo AS campo_tipo
        FROM campos c
        WHERE c.categoria_id = ?
    `;

    console.log(`Ejecutando consulta: ${query} con id: ${id}`);

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error(`Error ejecutando la consulta: ${err.message}`);
            res.status(500).json({ error: err.message });
        } else if (results.length === 0) {
            res.status(404).json({ message: 'No se encontró estructura para esta categoría' });
        } else {
            res.json(results);
        }
    });
});


module.exports = router;