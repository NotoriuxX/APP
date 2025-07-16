const express = require('express');
const router = express.Router();
const db = require('../db'); // Conexión a la base de datos

// Obtener todos los estados
router.get('/', (req, res) => {
    const query = 'SELECT * FROM estados_items';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

module.exports = router;