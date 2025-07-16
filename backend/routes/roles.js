const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware para verificar token
const verificarToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY || 'tu_clave_secreta');
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

/**
 * GET /roles/available
 * Obtener todos los roles disponibles en el sistema
 */
router.get('/available', verificarToken, async (req, res) => {
  try {
    console.log('📋 Obteniendo roles disponibles...');

    const query = `
      SELECT 
        id,
        nombre,
        descripcion
      FROM roles 
      WHERE es_activo = 1
      ORDER BY 
        CASE nombre
          WHEN 'trabajador' THEN 1
          WHEN 'operario' THEN 2
          WHEN 'asistente' THEN 3
          WHEN 'tecnico' THEN 4
          WHEN 'especialista' THEN 5
          WHEN 'analista' THEN 6
          WHEN 'coordinador' THEN 7
          WHEN 'supervisor' THEN 8
          WHEN 'encargado' THEN 9
          WHEN 'jefe_seccion' THEN 10
          WHEN 'jefe_departamento' THEN 11
          WHEN 'subgerente' THEN 12
          WHEN 'gerente' THEN 13
          WHEN 'director' THEN 14
          WHEN 'administrador' THEN 15
          ELSE 99
        END,
        nombre ASC
    `;

    const [roles] = await db.promise().query(query);
    console.log(`✅ ${roles.length} roles encontrados`);

    res.json(roles);
  } catch (error) {
    console.error('❌ Error al obtener roles disponibles:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * GET /roles/:roleId/permissions
 * Obtener permisos de un rol específico
 */
router.get('/:roleId/permissions', verificarToken, async (req, res) => {
  try {
    const { roleId } = req.params;
    console.log(`📋 Obteniendo permisos para rol ID: ${roleId}`);

    const query = `
      SELECT 
        pm.id,
        pm.modulo_id,
        pm.codigo,
        pm.nombre as permiso_nombre,
        pm.descripcion as permiso_descripcion,
        m.codigo as modulo_codigo,
        m.nombre as modulo_nombre,
        m.descripcion as modulo_descripcion
      FROM roles_permisos rp
      JOIN permisos_modulos pm ON rp.permiso_id = pm.id
      JOIN modulos_sistema m ON pm.modulo_id = m.id
      WHERE rp.rol_id = ?
      ORDER BY m.orden ASC, m.nombre ASC, pm.codigo ASC
    `;

    const [permisos] = await db.promise().query(query, [roleId]);
    console.log(`✅ ${permisos.length} permisos encontrados para el rol`);

    res.json(permisos);
  } catch (error) {
    console.error('❌ Error al obtener permisos del rol:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * GET /roles/by-name/:roleName/permissions
 * Obtener permisos sugeridos para un rol específico por nombre
 */
router.get('/by-name/:roleName/permissions', verificarToken, async (req, res) => {
  try {
    const { roleName } = req.params;
    console.log(`📋 Obteniendo permisos sugeridos para rol: ${roleName}`);

    // Obtener permisos sugeridos basados en el nombre del rol
    const query = `
      SELECT DISTINCT
        pa.codigo as permiso_codigo,
        pa.nombre as permiso_nombre,
        pa.descripcion as permiso_descripcion,
        pa.modulo as modulo_nombre
      FROM roles r
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos_atomicos pa ON rp.permiso_id = pa.id
      WHERE r.nombre = ? AND r.es_activo = 1 AND pa.activo = 1
      ORDER BY pa.modulo ASC, pa.codigo ASC
    `;

    const [permisos] = await db.promise().query(query, [roleName]);
    console.log(`✅ ${permisos.length} permisos sugeridos encontrados para el rol ${roleName}`);

    res.json(permisos);
  } catch (error) {
    console.error('❌ Error al obtener permisos sugeridos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * GET /roles/permissions/:roleName
 * Obtener permisos de un rol específico por nombre
 */
router.get('/permissions/:roleName', verificarToken, async (req, res) => {
  try {
    const { roleName } = req.params;
    console.log(`📋 Obteniendo permisos para rol: ${roleName}`);

    const query = `
      SELECT 
        pm.id,
        pm.modulo_id,
        pm.codigo,
        pm.nombre as permiso_nombre,
        pm.descripcion as permiso_descripcion,
        m.codigo as modulo_codigo,
        m.nombre as modulo_nombre,
        m.descripcion as modulo_descripcion
      FROM roles r
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos_modulos pm ON rp.permiso_id = pm.id
      JOIN modulos_sistema m ON pm.modulo_id = m.id
      WHERE r.nombre = ? AND r.es_activo = 1
      ORDER BY m.orden ASC, m.nombre ASC, pm.codigo ASC
    `;

    const [permisos] = await db.promise().query(query, [roleName]);
    console.log(`✅ ${permisos.length} permisos encontrados para el rol ${roleName}`);

    res.json(permisos);
  } catch (error) {
    console.error('❌ Error al obtener permisos del rol por nombre:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

module.exports = router;
