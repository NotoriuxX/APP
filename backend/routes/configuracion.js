// backend/routes/configuracion.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

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
    
    // Verificar permisos específicos
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

// Crear tabla de configuración si no existe
const crearTablaConfiguracion = async () => {
  try {
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS configuracion_sistema (
        id INT AUTO_INCREMENT PRIMARY KEY,
        configuracion_clave VARCHAR(100) NOT NULL UNIQUE,
        configuracion_valor TEXT NOT NULL,
        descripcion TEXT,
        categoria VARCHAR(100),
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        usuario_id INT,
        INDEX idx_config_clave (configuracion_clave),
        INDEX idx_config_categoria (categoria),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Tabla configuración_sistema verificada/creada');
  } catch (error) {
    console.error('Error al crear tabla de configuración:', error);
  }
};

// Inicializar configuraciones predeterminadas
const inicializarConfiguraciones = async () => {
  try {
    // Lista de configuraciones por defecto
    const configuraciones = [
      { clave: 'precio_bn', valor: '15', descripcion: 'Precio por copia en blanco y negro (CLP)', categoria: 'precios' },
      { clave: 'precio_color', valor: '50', descripcion: 'Precio por copia a color (CLP)', categoria: 'precios' },
      { clave: 'precio_doble_recargo', valor: '5', descripcion: 'Recargo por impresión doble cara (CLP)', categoria: 'precios' },
      { clave: 'fotocopia_gratis_cantidad', valor: '0', descripcion: 'Cantidad de copias gratuitas por mes', categoria: 'precios' },
      { clave: 'fotocopia_descuento_cantidad', valor: '0', descripcion: 'A partir de cuántas copias aplicar descuento', categoria: 'precios' },
      { clave: 'fotocopia_descuento_porcentaje', valor: '0', descripcion: 'Porcentaje de descuento a aplicar (%)', categoria: 'precios' }
    ];

    // Verificar e insertar configuraciones faltantes
    for (const config of configuraciones) {
      const [existingRows] = await db.promise().query(
        'SELECT COUNT(*) AS count FROM configuracion_sistema WHERE configuracion_clave = ?',
        [config.clave]
      );
      
      if (existingRows[0].count === 0) {
        await db.promise().query(
          'INSERT INTO configuracion_sistema (configuracion_clave, configuracion_valor, descripcion, categoria) VALUES (?, ?, ?, ?)',
          [config.clave, config.valor, config.descripcion, config.categoria]
        );
        console.log(`✅ Configuración "${config.clave}" inicializada`);
      }
    }
  } catch (error) {
    console.error('Error al inicializar configuraciones:', error);
  }
};

// Inicializar tabla y configuraciones al cargar el módulo
(async () => {
  await crearTablaConfiguracion();
  await inicializarConfiguraciones();
})();

// Obtener todas las configuraciones o por categoría
router.get('/', verificarToken, async (req, res) => {
  try {
    const { categoria } = req.query;
    let query = 'SELECT * FROM configuracion_sistema';
    const params = [];
    
    if (categoria) {
      query += ' WHERE categoria = ?';
      params.push(categoria);
    }
    
    query += ' ORDER BY categoria, configuracion_clave';
    
    const [rows] = await db.promise().query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener configuraciones' });
  }
});

// Obtener una configuración específica
router.get('/:clave', verificarToken, async (req, res) => {
  try {
    const { clave } = req.params;
    const [rows] = await db.promise().query(
      'SELECT * FROM configuracion_sistema WHERE configuracion_clave = ?',
      [clave]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
});

// Actualizar una configuración
router.put('/:clave', verificarToken, async (req, res) => {
  const { clave } = req.params;
  const { valor, descripcion } = req.body;
  const usuarioId = req.usuario.id;
  
  try {
    // Verificar permisos de administración
    const puedeAdministrar = await verificarPermiso(usuarioId, 'configuracion_editar');
    if (!puedeAdministrar) {
      return res.status(403).json({ 
        message: 'No tienes permisos para modificar la configuración' 
      });
    }
    
    // Verificar si existe la configuración
    const [existingRows] = await db.promise().query(
      'SELECT COUNT(*) AS count FROM configuracion_sistema WHERE configuracion_clave = ?',
      [clave]
    );
    
    if (existingRows[0].count === 0) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }
    
    // Actualizar configuración
    await db.promise().query(
      'UPDATE configuracion_sistema SET configuracion_valor = ?, descripcion = ?, usuario_id = ? WHERE configuracion_clave = ?',
      [valor, descripcion, usuarioId, clave]
    );
    
    // Obtener la configuración actualizada
    const [updated] = await db.promise().query(
      'SELECT * FROM configuracion_sistema WHERE configuracion_clave = ?',
      [clave]
    );
    
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar configuración' });
  }
});

module.exports = router;
