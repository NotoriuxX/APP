// backend/routes/photocopies.js
// Reestructurado: 1) Imports 2) Constantes 3) Middleware 4) Helpers 5) Rutas

// ================== 1. Imports ==================
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
const ntpClient = require('ntp-client');

// ================== 2. Constantes / Config ==================
const NTP_HOST = 'ntp.shoa.cl';
const NTP_PORT = 123;
const NTP_TIMEOUT_MS = 5000;
const TZ_CHILE = 'America/Santiago';

// Permisos atómicos relacionados a fotocopias
const PERMISSIONS = Object.freeze({
  CREATE: 'fotocopia_escribir',
  UPDATE: 'fotocopia_editar',
  DELETE: 'fotocopia_eliminar',
  READ:   'fotocopia_leer'
});

// Modo debug (devuelve datos mock en GET /)
const DEBUG_MODE = process.env.PHOTOCOPIES_DEBUG === 'true';

// ================== 3. Middleware ==================
// Autenticación JWT
const verificarToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  const token = bearerHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    // Estandarizamos a req.usuario
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
};

// Wrapper para rutas async (reduce try/catch repetido) - opcional de uso puntual
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ================== 4. Helpers ==================
/**
 * Calcula la cantidad de hojas necesarias según páginas (cantidad), multiplicador y si es doble hoja.
 * CORREGIDO: Para múltiples copias, calcula las hojas necesarias POR COPIA y luego multiplica.
 * Esto es conceptualmente correcto para el caso de uso real.
 */
const calcularHojasNecesarias = (cantidad, multiplicador = 1, dobleHoja = false) => {
  const cantidadNum = parseInt(cantidad) || 0;
  const multiplicadorNum = parseInt(multiplicador) || 1;
  if (cantidadNum === 0) return 0;
  
  let hojasPorCopia;
  
  if (!dobleHoja) {
    // Una cara: 1 página = 1 hoja por copia
    hojasPorCopia = cantidadNum;
  } else {
    // Doble cara: calcular hojas necesarias para UNA copia del documento
    if (cantidadNum % 2 === 0) {
      // Páginas pares en el documento: se pueden dividir exactamente
      hojasPorCopia = cantidadNum / 2;
    } else {
      // Páginas impares en el documento: la última página queda sola
      hojasPorCopia = Math.floor(cantidadNum / 2) + 1;
    }
  }
  
  // Total = hojas por copia × número de copias
  return hojasPorCopia * multiplicadorNum;
};

/** Registra acción en tabla auditoría */
const registrarAuditoria = async (usuarioId, accion, tablaAfectada, registroId, descripcion) => {
  try {
    await db.promise().query(
      `INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, descripcion, fecha)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [usuarioId, accion, tablaAfectada, registroId, descripcion]
    );
  } catch (err) {
    console.error('Error al registrar auditoría:', err);
  }
};

/** Obtiene hora oficial de Chile con fallback local */
const obtenerHoraOficialChile = () => new Promise(resolve => {
  const timeout = setTimeout(() => {
    console.warn('⚠️  Timeout NTP, usando hora local');
    resolve(moment().tz(TZ_CHILE).format('YYYY-MM-DD HH:mm:ss'));
  }, NTP_TIMEOUT_MS);

  ntpClient.getNetworkTime(NTP_HOST, NTP_PORT, (err, date) => {
    clearTimeout(timeout);
    if (err) {
      console.warn('⚠️  NTP error:', err.message);
      return resolve(moment().tz(TZ_CHILE).format('YYYY-MM-DD HH:mm:ss'));
    }
    const fecha = moment(date).tz(TZ_CHILE).format('YYYY-MM-DD HH:mm:ss');
    resolve(fecha);
  });
});

/** Verifica si usuario posee permiso específico (incluye propietario de grupo) */
const verificarPermiso = async (usuarioId, permiso) => {
  try {
    // Verificar si es propietario en algún grupo
    const [userGroups] = await db.promise().query(
      `SELECT (g.propietario_id = ?) AS es_propietario
       FROM usuarios_grupos ug
       JOIN grupos g ON ug.grupo_id = g.id
       WHERE ug.usuario_id = ? AND ug.estado = 'activo'`,
      [usuarioId, usuarioId]
    );
    if (userGroups.some(ug => ug.es_propietario === 1)) return true;

    // Permisos por rol / especiales
    const [permissions] = await db.promise().query(
      `SELECT DISTINCT p.codigo FROM (
          SELECT p.codigo
          FROM usuarios_grupos ug
          JOIN roles_permisos rp ON ug.rol_id = rp.rol_id
          JOIN permisos_atomicos p ON rp.permiso_id = p.id
          WHERE ug.usuario_id = ? AND ug.estado = 'activo' AND p.codigo = ?
          UNION
          SELECT p.codigo
          FROM usuarios_permisos_especiales upe
          JOIN permisos_atomicos p ON upe.permiso_id = p.id
          WHERE upe.usuario_id = ? AND upe.estado = 'activo' AND p.codigo = ?
      ) t`,
      [usuarioId, permiso, usuarioId, permiso]
    );
    return permissions.length > 0;
  } catch (error) {
    console.error('Error verificando permiso:', error);
    return false;
  }
};

/** Ejecuta migración automática de la tabla fotocopias si es necesaria */
const ejecutarMigracionFotocopias = async () => {
  try {
    const [structure] = await db.promise().query('DESCRIBE fotocopias');
    const columns = structure.map(col => col.Field);
    
    let migracionRealizada = false;
    
    if (!columns.includes('multiplicador')) {
      console.log('🔧 Agregando columna multiplicador...');
      await db.promise().query('ALTER TABLE fotocopias ADD COLUMN multiplicador INT DEFAULT 1 AFTER cantidad');
      migracionRealizada = true;
    }
    if (!columns.includes('tipo_hoja_id')) {
      console.log('🔧 Agregando columna tipo_hoja_id...');
      await db.promise().query('ALTER TABLE fotocopias ADD COLUMN tipo_hoja_id INT DEFAULT 1 AFTER tipo');
      migracionRealizada = true;
    }
    if (!columns.includes('total_hojas')) {
      console.log('🔧 Agregando columna total_hojas...');
      await db.promise().query('ALTER TABLE fotocopias ADD COLUMN total_hojas INT DEFAULT 0 AFTER doble_hoja');
      migracionRealizada = true;
    }
    
    // Crear tabla tipos_hoja si no existe
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS tipos_hoja (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        costo_unitario DECIMAL(10,2) DEFAULT 0.00,
        activo TINYINT(1) DEFAULT 1,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY ux_tipos_hoja_nombre (nombre)
      ) ENGINE=InnoDB
    `);
    
    // Insertar tipo por defecto si no existe
    const [tiposCount] = await db.promise().query('SELECT COUNT(*) as total FROM tipos_hoja');
    if (tiposCount[0].total === 0) {
      console.log('🔧 Insertando tipo de hoja por defecto...');
      await db.promise().query(`
        INSERT INTO tipos_hoja (nombre, descripcion, costo_unitario) VALUES
        ('A4 Estándar', 'Hoja A4 estándar', 10.00)
      `);
      migracionRealizada = true;
    }
    
    if (migracionRealizada) {
      console.log('✅ Migración de tabla fotocopias completada');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error en migración automática:', error);
    return false;
  }
};

// ================== 5. Rutas ==================
// ---- Tipos de hoja ----
router.get('/tipos-hoja', verificarToken, asyncRoute(async (req, res) => {
  const [tiposHoja] = await db.promise().query('SELECT * FROM tipos_hoja ORDER BY nombre');
  res.json(tiposHoja);
}));

router.post('/tipos-hoja', verificarToken, asyncRoute(async (req, res) => {
  const { usuario } = req;
  if (!usuario) return res.status(401).json({ error: 'No autenticado' });
  if (usuario.rol_global !== 'administrador' && usuario.rol_global !== 'propietario') {
    return res.status(403).json({ error: 'No tienes permisos para crear tipos de hoja' });
  }
  const { nombre, descripcion, costo_unitario } = req.body;
  const [result] = await db.promise().query(
    'INSERT INTO tipos_hoja (nombre, descripcion, costo_unitario) VALUES (?, ?, ?)',
    [nombre, descripcion, costo_unitario]
  );
  await registrarAuditoria(usuario.id, 'CREAR', 'tipos_hoja', result.insertId, `Creación tipo de hoja: ${nombre}`);
  res.json({ id: result.insertId });
}));

// ---- Usuarios que han registrado fotocopias ----
router.get('/users', verificarToken, asyncRoute(async (req, res) => {
  const [rows] = await db.promise().query(
    `SELECT DISTINCT u.id AS usuario_id, u.nombre AS usuario_nombre
     FROM fotocopias p
     JOIN usuarios u ON p.usuario_id = u.id
     ORDER BY u.nombre`
  );
  res.json(rows);
}));

// ---- Auditoría fotocopias ----
router.get('/auditoria', verificarToken, asyncRoute(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const lim = parseInt(limit); const off = parseInt(offset);
  const [rows] = await db.promise().query(
    `SELECT a.id, a.usuario_id, a.accion, a.tabla_afectada, a.registro_id, a.descripcion,
            DATE_FORMAT(a.fecha, '%Y-%m-%d %H:%i:%s') AS fecha, u.nombre AS usuario_nombre
     FROM auditoria a
     JOIN usuarios u ON a.usuario_id = u.id
     WHERE a.tabla_afectada = 'fotocopias'
     ORDER BY a.fecha DESC
     LIMIT ? OFFSET ?`, [lim, off]
  );
  const [countResult] = await db.promise().query(
    `SELECT COUNT(*) AS total FROM auditoria WHERE tabla_afectada = 'fotocopias'`
  );
  res.json({ records: rows, total: countResult[0].total, limit: lim, offset: off });
}));

// ---- Estadísticas ----
router.get('/stats', verificarToken, asyncRoute(async (req, res) => {
  const { desde, hasta } = req.query;
  let sql = `SELECT
      COALESCE(SUM(p.total_hojas),0) AS hojas_totales,
      COALESCE(SUM(CASE WHEN p.tipo = 'bn' THEN p.total_hojas END),0) AS bn,
      COALESCE(SUM(CASE WHEN p.tipo = 'color' THEN p.total_hojas END),0) AS color,
      COALESCE(SUM(CASE WHEN p.doble_hoja = 1 THEN 1 END),0) AS registros_doble_hoja,
      COUNT(*) AS registros
    FROM fotocopias p`;
  const conditions = []; const params = [];
  if (desde) { conditions.push('DATE(p.registrado_en) >= ?'); params.push(desde); }
  if (hasta) { conditions.push('DATE(p.registrado_en) <= ?'); params.push(hasta); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const [rows] = await db.promise().query(sql, params);
  res.json(rows[0]);
}));

// ---- Permisos fotocopias ----
router.get('/permissions', verificarToken, asyncRoute(async (req, res) => {
  const usuarioId = req.usuario.id;
  const esPropietarioGlobal = req.usuario.rol_global === 'propietario';
  const [userRol] = await db.promise().query(
    `SELECT ug.rol_id, r.nombre AS rol_nombre, ug.grupo_id
     FROM usuarios_grupos ug
     JOIN roles r ON r.id = ug.rol_id
     WHERE ug.usuario_id = ? AND ug.estado = 'activo'
     LIMIT 1`, [usuarioId]
  );
  const [permisos] = await db.promise().query(
    `SELECT DISTINCT pa.codigo
       FROM permisos_atomicos pa
       LEFT JOIN usuarios_permisos_especiales upe
              ON pa.id = upe.permiso_id AND upe.usuario_id = ? AND upe.estado = 'activo'
       LEFT JOIN usuarios_grupos ug
              ON ug.usuario_id = ? AND ug.estado = 'activo'
       LEFT JOIN roles_permisos rp
              ON rp.rol_id = ug.rol_id AND rp.permiso_id = pa.id
      WHERE pa.activo = 1
        AND (pa.codigo LIKE 'fotocopia_%' OR pa.codigo LIKE 'copias_%' OR pa.codigo = 'trabajador_leer')
        AND (upe.id IS NOT NULL OR rp.rol_id IS NOT NULL)`, [usuarioId, usuarioId]
  );
  const response = {
    hasAccess: esPropietarioGlobal || permisos.some(p => p.codigo.startsWith('fotocopia_') || p.codigo.startsWith('copias_')),
    isOwner: esPropietarioGlobal,
    permissions: permisos.map(p => p.codigo),
    groups: userRol
  };
  res.json(response);
}));

// ---- Listado / filtros ----
router.get('/', verificarToken, asyncRoute(async (req, res) => {
  const { desde, hasta, usuario_id } = req.query;
  
  // Ejecutar migración automática si es necesaria
  await ejecutarMigracionFotocopias();
  
  if (DEBUG_MODE) {
    const uid = req.usuario.id;
    const testData = [
      { id: 1, cantidad: 10, multiplicador: 5, tipo: 'bn', tipo_hoja_id: 1, doble_hoja: 0, comentario: 'Debug multiplicador 5', registrado_en: '2025-08-09 10:00:00', total_hojas: calcularHojasNecesarias(10,5,false), usuario_id: uid, usuario_nombre: 'Usuario Test', grupo_nombre: 'Grupo Test' },
      { id: 2, cantidad: 8, multiplicador: 3, tipo: 'color', tipo_hoja_id: 1, doble_hoja: 1, comentario: 'Debug multiplicador 3', registrado_en: '2025-08-09 11:00:00', total_hojas: calcularHojasNecesarias(8,3,true), usuario_id: uid, usuario_nombre: 'Usuario Test', grupo_nombre: 'Grupo Test' },
      { id: 3, cantidad: 15, multiplicador: 2, tipo: 'bn', tipo_hoja_id: 1, doble_hoja: 0, comentario: 'Debug multiplicador 2', registrado_en: '2025-08-09 12:00:00', total_hojas: calcularHojasNecesarias(15,2,false), usuario_id: uid, usuario_nombre: 'Usuario Test', grupo_nombre: 'Grupo Test' }
    ];
    return res.json(testData);
  }

  let sql = `SELECT p.id, p.cantidad, p.multiplicador, p.tipo, p.tipo_hoja_id, p.doble_hoja, p.comentario,
                    p.total_hojas,
                    DATE_FORMAT(p.registrado_en, '%Y-%m-%d %H:%i:%s') AS registrado_en,
                    u.id AS usuario_id, u.nombre AS usuario_nombre, g.nombre AS grupo_nombre
             FROM fotocopias p
             JOIN usuarios u ON p.usuario_id = u.id
             JOIN grupos g   ON p.grupo_id = g.id`;
  const conditions = []; const params = [];
  if (desde) { conditions.push('DATE(p.registrado_en) >= ?'); params.push(desde); }
  if (hasta) { conditions.push('DATE(p.registrado_en) <= ?'); params.push(hasta); }
  if (usuario_id) { conditions.push('p.usuario_id = ?'); params.push(usuario_id); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY p.registrado_en DESC';
  const [rows] = await db.promise().query(sql, params);
  res.json(rows);
}));

// ---- Crear ----
router.post('/', verificarToken, asyncRoute(async (req, res) => {
  const usuarioId = req.usuario.id;
  const { cantidad, multiplicador = 1, tipo, doble_hoja = 0, comentario, tipo_hoja_id = 1 } = req.body;

  // MIGRACIÓN AUTOMÁTICA: Verificar y agregar columnas faltantes
  await ejecutarMigracionFotocopias();

  // Verificar permiso creación
  const puedeCrear = await verificarPermiso(usuarioId, PERMISSIONS.CREATE);
  if (!puedeCrear) return res.status(403).json({ message: 'No tienes permisos para crear registros de fotocopias' });

  // Obtener grupo activo (o crear uno personal si no existe)
  let [ugRows] = await db.promise().query(
    `SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = ? AND (estado = 'activo' OR estado IS NULL) ORDER BY grupo_id ASC LIMIT 1`,
    [usuarioId]
  );
  if (ugRows.length === 0) {
    [ugRows] = await db.promise().query(`SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = ? LIMIT 1`, [usuarioId]);
  }
  if (ugRows.length === 0) {
    const [gRes] = await db.promise().query(
      'INSERT INTO grupos (nombre, descripcion, propietario_id, es_personal) VALUES (?,?,?,1)',
      [`Personal-${usuarioId}`, 'Grupo personal', usuarioId]
    );
    await db.promise().query(
      `INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol_id, estado)
       VALUES (?, ?, (SELECT id FROM roles WHERE nombre = 'propietario'), 'activo')`,
      [usuarioId, gRes.insertId]
    );
    ugRows = [{ grupo_id: gRes.insertId }];
  }
  const grupoId = ugRows[0].grupo_id;

  const registroEn = await obtenerHoraOficialChile();
  const totalHojas = calcularHojasNecesarias(cantidad, multiplicador, !!doble_hoja);

  const [result] = await db.promise().query(
    `INSERT INTO fotocopias (cantidad, multiplicador, tipo, tipo_hoja_id, doble_hoja, comentario, total_hojas, registrado_en, usuario_id, grupo_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cantidad, multiplicador, tipo, tipo_hoja_id, doble_hoja ? 1 : 0, comentario, totalHojas, registroEn, usuarioId, grupoId]
  );

  await registrarAuditoria(
    usuarioId,
    'CREAR',
    'fotocopias',
    result.insertId,
    `Creado registro de fotocopia: ${cantidad} ${tipo === 'bn' ? 'B/N' : 'Color'}${doble_hoja ? ' (doble hoja)' : ''}`
  );

  const [newRec] = await db.promise().query(
    `SELECT p.id, p.cantidad, p.multiplicador, p.tipo, p.tipo_hoja_id, p.doble_hoja, p.comentario, p.total_hojas,
            DATE_FORMAT(p.registrado_en, '%Y-%m-%d %H:%i:%s') AS registrado_en,
            u.id AS usuario_id, u.nombre AS usuario_nombre, g.nombre AS grupo_nombre
       FROM fotocopias p
       JOIN usuarios u ON p.usuario_id = u.id
       JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = ?`, [result.insertId]
  );
  res.json(newRec[0]);
}));

// ---- Actualizar ----
router.put('/:id', verificarToken, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuario.id;
  const { cantidad, multiplicador = 1, tipo, tipo_hoja_id = 1, doble_hoja = 0, comentario } = req.body;

  // Verificar permiso edición
  const puedeEditar = await verificarPermiso(usuarioId, PERMISSIONS.UPDATE);
  if (!puedeEditar) return res.status(403).json({ message: 'No tienes permisos para editar registros de fotocopias' });

  const [rows] = await db.promise().query(
    `SELECT p.*, g.propietario_id FROM fotocopias p LEFT JOIN grupos g ON g.id = p.grupo_id WHERE p.id = ?`,
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Registro no encontrado' });
  const record = rows[0];
  const isOwner = record.propietario_id === usuarioId;
  const isCreator = record.usuario_id === usuarioId;
  if (!isOwner && !isCreator) return res.status(403).json({ message: 'Sin permisos para esta acción' });

  const totalHojas = calcularHojasNecesarias(cantidad, multiplicador, !!doble_hoja);

  await db.promise().query(
    `UPDATE fotocopias SET cantidad = ?, multiplicador = ?, tipo = ?, tipo_hoja_id = ?, doble_hoja = ?, comentario = ?, total_hojas = ? WHERE id = ?`,
    [cantidad, multiplicador, tipo, tipo_hoja_id, doble_hoja ? 1 : 0, comentario, totalHojas, id]
  );

  await registrarAuditoria(
    usuarioId,
    'ACTUALIZAR',
    'fotocopias',
    id,
    `Actualizado registro de fotocopia: ${cantidad} ${tipo === 'bn' ? 'B/N' : 'Color'}${doble_hoja ? ' (doble hoja)' : ''}`
  );

  const [updated] = await db.promise().query(
    `SELECT p.id, p.cantidad, p.multiplicador, p.tipo, p.tipo_hoja_id, p.doble_hoja, p.comentario, p.total_hojas,
            DATE_FORMAT(p.registrado_en, '%Y-%m-%d %H:%i:%s') AS registrado_en,
            u.id AS usuario_id, u.nombre AS usuario_nombre, g.nombre AS grupo_nombre
       FROM fotocopias p
       JOIN usuarios u ON p.usuario_id = u.id
       JOIN grupos g ON p.grupo_id = g.id
      WHERE p.id = ?`, [id]
  );
  res.json(updated[0]);
}));

// ---- Eliminar ----
router.delete('/:id', verificarToken, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.usuario.id;
  const puedeEliminar = await verificarPermiso(usuarioId, PERMISSIONS.DELETE);
  if (!puedeEliminar) return res.status(403).json({ message: 'No tienes permisos para eliminar registros de fotocopias' });

  const [existing] = await db.promise().query(
    `SELECT p.*, g.propietario_id FROM fotocopias p JOIN grupos g ON p.grupo_id = g.id WHERE p.id = ?`,
    [id]
  );
  if (existing.length === 0) return res.status(404).json({ message: 'Registro no encontrado' });
  const record = existing[0];
  const isOwner = record.propietario_id === usuarioId;
  const isCreator = record.usuario_id === usuarioId;
  if (!isOwner && !isCreator) return res.status(403).json({ message: 'Sin permisos para eliminar este registro' });

  await registrarAuditoria(
    usuarioId,
    'ELIMINAR',
    'fotocopias',
    id,
    `Eliminado registro de fotocopia: ${record.cantidad} ${record.tipo === 'bn' ? 'B/N' : 'Color'}${record.doble_hoja ? ' (doble hoja)' : ''}`
  );
  await db.promise().query('DELETE FROM fotocopias WHERE id = ?', [id]);
  res.json({ message: 'Registro eliminado exitosamente' });
}));

// ================== 6. Export ==================
module.exports = router;