const express = require('express');
const router = express.Router();
const db = require('../db');
require('dotenv').config();

// ========================= ACTUALIZAR NOMBRE DE GRUPO =========================
router.put('/grupos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  if (!nombre) {
    return res.status(400).json({ message: 'El nombre es obligatorio' });
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE grupos SET nombre = ? WHERE id = ?',
      [nombre, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }
    res.json({ message: 'Grupo actualizado' });
  } catch (err) {
    console.error('❌ Error actualizando grupo:', err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;