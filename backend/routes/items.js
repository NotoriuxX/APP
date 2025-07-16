const express = require('express');
const router = express.Router();
const db = require('../db'); // Conexión a la base de datos

// Obtener todos los items
router.get('/', (req, res) => {
    const query = `
        SELECT 
            i.id AS item_id,
            ti.nombre AS categoria_nombre,
            i.fecha_ingreso,
            i.estado_id,
            i.CCI AS codigo,
            i.trabajador_id,
            i.grupo_id,
            i.nombre AS item_nombre,
            i.posicion,
            s.nombre AS seccion_nombre,
            c.nombre AS campo_nombre,
            c.tipo AS campo_tipo,
            vc.valor AS campo_valor
        FROM items i
        LEFT JOIN tipos_items ti ON i.tipo_id = ti.id
        LEFT JOIN secciones s ON i.seccion_id = s.id
        LEFT JOIN valores_campos vc ON i.id = vc.item_id
        LEFT JOIN campos c ON vc.campo_id = c.id
    `;

    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Transformar los resultados en una estructura más amigable
            const items = {};
            results.forEach((row) => {
                if (!items[row.item_id]) {
                    items[row.item_id] = {
                        item_id: row.item_id,
                        categoria_nombre: row.categoria_nombre,
                        fecha_ingreso: row.fecha_ingreso,
                        estado_id: row.estado_id,
                        codigo: row.codigo,
                        trabajador_id: row.trabajador_id,
                        grupo_id: row.grupo_id,
                        item_nombre: row.item_nombre,
                        posicion: row.posicion,
                        seccion_nombre: row.seccion_nombre,
                        campos_dinamicos: [],
                    };
                }
                if (row.campo_nombre) {
                    items[row.item_id].campos_dinamicos.push({
                        campo_nombre: row.campo_nombre,
                        campo_tipo: row.campo_tipo,
                        campo_valor: row.campo_valor,
                    });
                }
            });
            res.json(Object.values(items));
        }
    });
});

module.exports = router;