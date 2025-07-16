// backend/routes/photocopies.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
const ntpClient = require('ntp-client');

// Función helper para registrar en auditoría
const registrarAuditoria = async (usuarioId, accion, tablaAfectada, registroId, descripcion) => {
  try {
    await db.promise().query(
      `INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, descripcion, fecha)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [usuarioId, accion, tablaAfectada, registroId, descripcion]
    );
  } catch (err) {
    console.error('Error al registrar auditoría:', err);
    // No interrumpir la operación principal por error de auditoría
  }
};

// Función para obtener la hora oficial de Chile desde ntp.shoa.cl
const obtenerHoraOficialChile = () => {
  return new Promise((resolve, reject) => {
    // Timeout de 5 segundos para evitar que la aplicación se cuelgue
    const timeout = setTimeout(() => {
      console.warn('⚠️  Timeout al conectar con ntp.shoa.cl, usando hora local de Chile');
      const fechaLocal = moment().tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss');
      resolve(fechaLocal);
    }, 5000);

    // Intentar obtener hora desde el servidor NTP de SHOA (Chile)
    ntpClient.getNetworkTime('ntp.shoa.cl', 123, (err, date) => {
      clearTimeout(timeout); // Limpiar el timeout si la respuesta llega a tiempo
      
      if (err) {
        console.warn('⚠️  No se pudo conectar con ntp.shoa.cl:', err.message);
        // Fallback: usar hora local convertida a zona horaria de Chile
        const fechaLocal = moment().tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss');
        resolve(fechaLocal);
      } else {
        // Convertir la fecha NTP a zona horaria de Chile
        const fechaNTP = moment(date).tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss');
        console.log('✅ Hora obtenida desde ntp.shoa.cl:', fechaNTP);
        resolve(fechaNTP);
      }
    });
  });
};

// Middleware para verificar JWT
const verificarToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  const token = bearerHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
};

// Función helper para verificar permisos específicos
const verificarPermiso = async (usuarioId, permiso) => {
  try {
    // Verificar si es propietario de algún grupo
    const [userGroups] = await db.promise().query(
      `SELECT 
         g.propietario_id,
         (g.propietario_id = ?) AS es_propietario
       FROM usuarios_grupos ug
       JOIN grupos g ON ug.grupo_id = g.id
       WHERE ug.usuario_id = ? AND ug.estado = 'activo'`,
      [usuarioId, usuarioId]
    );
    
    // Si es propietario, tiene todos los permisos
    const isOwner = userGroups.some(ug => ug.es_propietario === 1);
    if (isOwner) {
      return true;
    }
    
    // Verificar permisos específicos (usando nombres correctos)
    const [permissions] = await db.promise().query(
      `SELECT DISTINCT p.codigo
       FROM usuarios_grupos ug
       JOIN roles_permisos rp ON ug.rol_id = rp.rol_id
       JOIN permisos_atomicos p ON rp.permiso_id = p.id
       WHERE ug.usuario_id = ? AND ug.estado = 'activo' AND p.codigo = ?
       
       UNION
       
       SELECT DISTINCT p.codigo
       FROM usuarios_permisos_especiales upe
       JOIN permisos_atomicos p ON upe.permiso_id = p.id
       WHERE upe.usuario_id = ? AND upe.estado = 'activo' AND p.codigo = ?`,
      [usuarioId, permiso, usuarioId, permiso]
    );
    
    return permissions.length > 0;
  } catch (error) {
    console.error('Error verificando permiso:', error);
    return false;
  }
};

// Obtener lista de usuarios que han registrado fotocopias
router.get('/users', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT DISTINCT
         u.id AS usuario_id,
         u.nombre AS usuario_nombre
       FROM fotocopias p
       JOIN usuarios u ON p.usuario_id = u.id
       ORDER BY u.nombre`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// Obtener registros con filtros opcionales de fecha y usuario
router.get('/', verificarToken, async (req, res) => {
  const { desde, hasta, usuario_id } = req.query;
  const usuarioId = req.usuario.id;
  
  try {
    // Verificar permisos de visualización
    const puedeVer = await verificarPermiso(usuarioId, 'fotocopia_leer');
    if (!puedeVer) {
      return res.status(403).json({ 
        message: 'No tienes permisos para ver registros de fotocopias' 
      });
    }

    let sql = `SELECT
        p.id,
        p.cantidad,
        p.tipo,
        p.doble_hoja,
        p.comentario,
        DATE_FORMAT(p.registrado_en, '%Y-%m-%d %H:%i:%s') AS registrado_en,
        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        g.nombre AS grupo_nombre
      FROM fotocopias p
      JOIN usuarios u ON p.usuario_id = u.id
      JOIN grupos g ON p.grupo_id = g.id`;
    const conditions = [];
    const params = [];

    if (desde) {
      conditions.push('DATE(p.registrado_en) >= ?');
      params.push(desde);
    }
    if (hasta) {
      conditions.push('DATE(p.registrado_en) <= ?');
      params.push(hasta);
    }
    if (usuario_id) {
      conditions.push('p.usuario_id = ?');
      params.push(usuario_id);
    }
    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY p.registrado_en DESC';

    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener registros' });
  }
});

// Crear nuevo registro de fotocopia
router.post('/', verificarToken, async (req, res) => {
  const { cantidad, tipo, doble_hoja, comentario } = req.body;
  const usuarioId = req.usuario.id;

  try {
    // Verificar permisos de creación
    const puedeCrear = await verificarPermiso(usuarioId, 'fotocopia_escribir');
    if (!puedeCrear) {
      return res.status(403).json({ 
        message: 'No tienes permisos para crear registros de fotocopias' 
      });
    }

    console.log('🔍 Buscando grupo para usuario:', usuarioId);
    
    // Intentar obtener grupo activo del usuario
    let [ugRows] = await db.promise().query(
      `SELECT grupo_id
         FROM usuarios_grupos
        WHERE usuario_id = ?
          AND (estado = 'activo' OR estado IS NULL)
        ORDER BY grupo_id ASC
        LIMIT 1`,
      [usuarioId]
    );
    
    // Si no encuentra con estado, buscar cualquier grupo del usuario
    if (ugRows.length === 0) {
      console.log('⚠️  No se encontró grupo con estado activo, buscando cualquier grupo...');
      [ugRows] = await db.promise().query(
        `SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = ? LIMIT 1`,
        [usuarioId]
      );
    }
    
    // Si aún no encuentra, crear un grupo personal
    if (ugRows.length === 0) {
      console.log('⚠️  No se encontró ningún grupo, creando grupo personal...');
      
      // Crear grupo personal
      const [gRes] = await db.promise().query(
        'INSERT INTO grupos (nombre, descripcion, propietario_id, es_personal) VALUES (?,?,?,1)',
        [`Personal-${usuarioId}`, 'Grupo personal', usuarioId]
      );
      const grpId = gRes.insertId;
      
      // Asociar usuario al grupo
      await db.promise().query(
        `INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol_id, estado)
         VALUES (?, ?, (SELECT id FROM roles WHERE nombre = 'propietario'), 'activo')`,
        [usuarioId, grpId]
      );
      
      ugRows = [{ grupo_id: grpId }];
    }
    
    const grupoId = ugRows[0].grupo_id;
    console.log('✅ Usando grupo_id:', grupoId);

    // Obtener fecha/hora oficial de Chile desde el servidor NTP de SHOA
    // Esto asegura que todos los registros usen la hora oficial de Chile
    const registroEn = await obtenerHoraOficialChile();
    console.log('🕐 Registrando con hora oficial:', registroEn);

    // Insertar registro
    const [result] = await db.promise().query(
      `INSERT INTO fotocopias
         (cantidad, tipo, doble_hoja, comentario, registrado_en, usuario_id, grupo_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cantidad, tipo, doble_hoja ? 1 : 0, comentario, registroEn, usuarioId, grupoId]
    );

    // Registrar en auditoría
    await registrarAuditoria(
      usuarioId,
      'CREAR',
      'fotocopias',
      result.insertId,
      `Creado registro de fotocopia: ${cantidad} ${tipo === 'bn' ? 'B/N' : 'Color'}${doble_hoja ? ' (doble hoja)' : ''}`
    );

    // Devolver el registro recién creado
    const [newRec] = await db.promise().query(
      `SELECT
         p.id,
         p.cantidad,
         p.tipo,
         p.doble_hoja,
         p.comentario,
         DATE_FORMAT(p.registrado_en, '%Y-%m-%d %H:%i:%s') AS registrado_en,
         u.id AS usuario_id,
         u.nombre AS usuario_nombre,
         g.nombre AS grupo_nombre
       FROM fotocopias p
       JOIN usuarios u ON p.usuario_id = u.id
       JOIN grupos g ON p.grupo_id = g.id
       WHERE p.id = ?`,
      [result.insertId]
    );
    res.json(newRec[0]);
  } catch (err) {
    console.error('Error en POST /photocopies:', err);
    res.status(500).json({ message: 'Error al crear registro', error: err.message });
  }
});

// Actualizar registro de fotocopia
router.put('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { cantidad, tipo, doble_hoja, comentario } = req.body;
  const usuarioId = req.usuario.id;
  
  try {
    // Verificar permisos de edición
    const puedeEditar = await verificarPermiso(usuarioId, 'fotocopia_editar');
    if (!puedeEditar) {
      return res.status(403).json({ 
        message: 'No tienes permisos para editar registros de fotocopias' 
      });
    }

    console.log('🔄 Actualizando registro:', { id, usuarioId });
    
    // Verificar que el registro existe y pertenece al usuario (o es propietario)
    const [rows] = await db.promise().query(
   `SELECT p.*, g.propietario_id
      FROM fotocopias p
    LEFT JOIN grupos g ON g.id = p.grupo_id  -- <- LEFT JOIN evita perder filas
     WHERE p.id = ?`,
   [id]
 );

 if (rows.length === 0) {
   return res.status(404).json({ message: 'Registro no encontrado' });
 }

 const record    = rows[0];
 const isOwner   = record.propietario_id === usuarioId;
 const isCreator = record.usuario_id    === usuarioId;    if (!isOwner && !isCreator) {
      return res.status(403).json({ message: 'Sin permisos para esta acción' });
    }
    
    // Formatear fecha/hora de registro con zona horaria de Chile (Santiago)
    // Para edición, mantenemos la fecha/hora original del registro
    const registroEn = record.registrado_en;
    
    // Actualizar registro (manteniendo usuario_id y grupo_id originales)
    await db.promise().query(
      `UPDATE fotocopias 
       SET cantidad = ?, tipo = ?, doble_hoja = ?, comentario = ?, registrado_en = ?
       WHERE id = ?`,
      [cantidad, tipo, doble_hoja ? 1 : 0, comentario, registroEn, id]
    );
    
    // Registrar en auditoría
    await registrarAuditoria(
      usuarioId,
      'ACTUALIZAR',
      'fotocopias',
      id,
      `Actualizado registro de fotocopia: ${cantidad} ${tipo === 'bn' ? 'B/N' : 'Color'}${doble_hoja ? ' (doble hoja)' : ''}`
    );

    // Devolver el registro actualizado
    const [updated] = await db.promise().query(
      `SELECT
         p.id,
         p.cantidad,
         p.tipo,
         p.doble_hoja,
         p.comentario,
         DATE_FORMAT(p.registrado_en, '%Y-%m-%d %H:%i:%s') AS registrado_en,
         u.id AS usuario_id,
         u.nombre AS usuario_nombre,
         g.nombre AS grupo_nombre
       FROM fotocopias p
       JOIN usuarios u ON p.usuario_id = u.id
       JOIN grupos g ON p.grupo_id = g.id
       WHERE p.id = ?`,
      [id]
    );
    
    console.log('✅ Registro actualizado exitosamente');
    res.json(updated[0]);
  } catch (err) {
    console.error('❌ Error al actualizar registro:', err);
    res.status(500).json({ message: 'Error al actualizar registro', error: err.message });
  }
});

// Eliminar registro de fotocopia
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuario.id;
  
  try {
    // Verificar permisos de eliminación
    const puedeEliminar = await verificarPermiso(usuarioId, 'fotocopia_eliminar');
    if (!puedeEliminar) {
      return res.status(403).json({ 
        message: 'No tienes permisos para eliminar registros de fotocopias' 
      });
    }

    console.log('🗑️  Eliminando registro:', { id, usuarioId });
    
    // Verificar que el registro existe y pertenece al usuario (o es propietario)
    const [existing] = await db.promise().query(
      `SELECT p.*, g.propietario_id
       FROM fotocopias p
       JOIN grupos g ON p.grupo_id = g.id
       WHERE p.id = ?`,
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    
    const record = existing[0];
    const isOwner = record.propietario_id === usuarioId;
    const isCreator = record.usuario_id === usuarioId;
    
    // Solo el creador o el propietario del grupo puede eliminar
    if (!isOwner && !isCreator) {
      return res.status(403).json({ message: 'Sin permisos para eliminar este registro' });
    }
    
    // Registrar en auditoría antes de eliminar
    await registrarAuditoria(
      usuarioId,
      'ELIMINAR',
      'fotocopias',
      id,
      `Eliminado registro de fotocopia: ${record.cantidad} ${record.tipo === 'bn' ? 'B/N' : 'Color'}${record.doble_hoja ? ' (doble hoja)' : ''}`
    );
    
    // Eliminar registro
    await db.promise().query('DELETE FROM fotocopias WHERE id = ?', [id]);
    
    console.log('✅ Registro eliminado exitosamente');
    res.json({ message: 'Registro eliminado exitosamente' });
  } catch (err) {
    console.error('❌ Error al eliminar registro:', err);
    res.status(500).json({ message: 'Error al eliminar registro', error: err.message });
  }
});

// Obtener registros de auditoría para fotocopias
router.get('/auditoria', verificarToken, async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  try {
    console.log('🔍 Consultando auditoría de fotocopias...');
    
    const [rows] = await db.promise().query(
      `SELECT 
         a.id,
         a.usuario_id,
         a.accion,
         a.tabla_afectada,
         a.registro_id,
         a.descripcion,
         DATE_FORMAT(a.fecha, '%Y-%m-%d %H:%i:%s') AS fecha,
         u.nombre AS usuario_nombre
       FROM auditoria a
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.tabla_afectada = 'fotocopias'
       ORDER BY a.fecha DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    
    // Obtener el total de registros para paginación
    const [countResult] = await db.promise().query(
      `SELECT COUNT(*) as total 
       FROM auditoria 
       WHERE tabla_afectada = 'fotocopias'`
    );
    
    console.log('📊 Auditoría consultada:', rows.length, 'registros');
    res.json({
      records: rows,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('❌ Error en consulta de auditoría:', err);
    res.status(500).json({ message: 'Error al consultar auditoría' });
  }
});

// Estadísticas generales con filtros de fecha
router.get('/stats', verificarToken, async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    console.log('🔍 Calculando estadísticas...', { desde, hasta });
    
    let sql = `
      SELECT
        COALESCE(SUM(CASE WHEN p.doble_hoja = 1 THEN p.cantidad * 2 ELSE p.cantidad END), 0) AS total,
        COALESCE(SUM(p.cantidad), 0) AS hojas_totales,
        COALESCE(SUM(CASE WHEN p.tipo = 'bn' 
                          THEN (CASE WHEN p.doble_hoja = 1 THEN p.cantidad * 2 ELSE p.cantidad END) END), 0) AS bn,
        COALESCE(SUM(CASE WHEN p.tipo = 'color' 
                          THEN (CASE WHEN p.doble_hoja = 1 THEN p.cantidad * 2 ELSE p.cantidad END) END), 0) AS color,
        COALESCE(SUM(CASE WHEN p.doble_hoja = 1 THEN p.cantidad END), 0) AS doble_hoja
      FROM fotocopias p`;

    const conditions = [];
    const params = [];
    
    if (desde) {
      conditions.push('DATE(p.registrado_en) >= ?');
      params.push(desde);
    }
    if (hasta) {
      conditions.push('DATE(p.registrado_en) <= ?');
      params.push(hasta);
    }
    
    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await db.promise().query(sql, params);
    console.log('📊 Estadísticas calculadas:', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error en estadísticas:', err);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

// Endpoint para obtener permisos específicos de fotocopias
router.get('/permissions', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        // Verificar si es propietario (tiene todos los permisos automáticamente)
        const esPropietario = req.usuario.rol_global === 'propietario';
        
        // Obtener rol y grupo del usuario
        const [userRol] = await db.promise().query(`
            SELECT ug.rol_id, r.nombre as rol_nombre, ug.grupo_id
            FROM usuarios_grupos ug
            JOIN roles r ON r.id = ug.rol_id
            WHERE ug.usuario_id = ? AND ug.estado = 'activo'
            LIMIT 1
        `, [usuarioId]);

        console.log('🔍 Información del rol del usuario:', userRol[0]);

        // Obtener permisos específicos del usuario
        const [permisos] = await db.promise().query(`
            SELECT DISTINCT pa.codigo
            FROM permisos_atomicos pa
            LEFT JOIN usuarios_permisos_especiales upe ON pa.id = upe.permiso_id AND upe.usuario_id = ? AND upe.estado = 'activo'
            LEFT JOIN usuarios_grupos ug ON ug.usuario_id = ? AND ug.estado = 'activo'
            LEFT JOIN roles_permisos rp ON rp.rol_id = ug.rol_id AND rp.permiso_id = pa.id
            WHERE pa.activo = 1
            AND (
                pa.codigo LIKE 'fotocopia_%'
                OR pa.codigo LIKE 'copias_%'
                OR pa.codigo = 'trabajador_leer'
            )
            AND (upe.id IS NOT NULL OR rp.rol_id IS NOT NULL)
        `, [usuarioId, usuarioId]);

        console.log('🔍 Permisos encontrados:', permisos);
        
        // Construir respuesta
        const response = {
            hasAccess: esPropietario || permisos.some(p => 
                p.codigo.startsWith('fotocopia_') || 
                p.codigo.startsWith('copias_')
            ),
            isOwner: esPropietario,
            permissions: permisos.map(p => p.codigo),
            groups: userRol
        };
        
        console.log('✅ Respuesta final de permisos:', response);
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error al obtener permisos de fotocopias:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            hasAccess: false,
            isOwner: false,
            permissions: []
        });
    }
});

module.exports = router;