const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todos los módulos con sus permisos
router.get('/modulos', async (req, res) => {
  try {
    const [modules] = await db.query(`
      SELECT 
        ms.id,
        ms.codigo,
        ms.nombre,
        ms.descripcion,
        ms.icono,
        ms.orden
      FROM modulos_sistema ms
      WHERE ms.es_activo = true
      ORDER BY ms.orden ASC
    `);

    // Para cada módulo, obtener sus permisos
    const modulesWithPermissions = await Promise.all(modules.map(async (module) => {
      const [permissions] = await db.query(`
        SELECT 
          pm.id,
          pm.codigo,
          pm.nombre,
          pm.descripcion
        FROM permisos_modulos pm
        WHERE pm.modulo_id = ? AND pm.es_activo = true
      `, [module.id]);

      return {
        ...module,
        permisos: permissions
      };
    }));

    res.json(modulesWithPermissions);
  } catch (error) {
    console.error('Error al obtener módulos y permisos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener módulos y permisos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener permisos asignados a un rol específico
router.get('/roles/:rolId/permisos', async (req, res) => {
  const { rolId } = req.params;
  
  try {
    const [permissions] = await db.query(`
      SELECT 
        CONCAT(ms.codigo, '.', pm.codigo) as permiso_completo
      FROM roles_permisos rp
      JOIN permisos_modulos pm ON rp.permiso_id = pm.id
      JOIN modulos_sistema ms ON pm.modulo_id = ms.id
      WHERE rp.rol_id = ?
    `, [rolId]);

    res.json(permissions.map(p => p.permiso_completo));
  } catch (error) {
    console.error('Error al obtener permisos del rol:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener permisos del rol',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Actualizar permisos de un rol
router.put('/roles/:rolId/permisos', async (req, res) => {
  const { rolId } = req.params;
  const { permisos } = req.body;
  
  try {
    // Iniciar transacción
    await db.beginTransaction();

    // Eliminar permisos existentes del rol
    await db.query('DELETE FROM roles_permisos WHERE rol_id = ?', [rolId]);

    // Insertar nuevos permisos
    if (permisos && permisos.length > 0) {
      const permisosQuery = `
        INSERT INTO roles_permisos (rol_id, permiso_id, asignado_por)
        SELECT ?, pm.id, ?
        FROM permisos_modulos pm
        JOIN modulos_sistema ms ON pm.modulo_id = ms.id
        WHERE CONCAT(ms.codigo, '.', pm.codigo) IN (?)
      `;

      await db.query(permisosQuery, [
        rolId, 
        req.user?.id || null, 
        permisos
      ]);
    }

    // Confirmar transacción
    await db.commit();

    res.json({ 
      message: 'Permisos actualizados correctamente',
      permisos_actualizados: permisos?.length || 0
    });

  } catch (error) {
    // Revertir transacción en caso de error
    await db.rollback();
    
    console.error('Error al actualizar permisos del rol:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al actualizar permisos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
