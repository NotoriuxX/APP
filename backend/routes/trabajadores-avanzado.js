const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔍 Verificando token:', { 
    hasAuthHeader: !!authHeader, 
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'No token'
  });

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      console.error('❌ Error verificando token:', {
        error: err.message,
        secretKey: process.env.SECRET_KEY ? 'Definido' : 'No definido'
      });
      return res.status(403).json({ error: 'Token inválido' });
    }
    console.log('✅ Token verificado exitosamente:', { userId: user.id, email: user.email });
    req.user = user;
    next();
  });
};

// GET /api/trabajadores-avanzado - Listar todos los trabajadores del grupo
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const { page = 1, limit = 10, search = '', status = 'all', department = 'all', ocupacion = 'all' } = req.query;
    const offset = (page - 1) * limit;

    // Obtener grupo del usuario
    const userGroupQuery = `
      SELECT ug.grupo_id 
      FROM usuarios_grupos ug 
      WHERE ug.usuario_id = ? AND ug.estado = 'activo'
      LIMIT 1
    `;
    const [userGroups] = await db.promise().execute(userGroupQuery, [req.user.id]);
    
    if (!userGroups.length) {
      return res.status(403).json({ error: 'Usuario sin grupo asignado' });
    }
    
    const grupoId = userGroups[0].grupo_id;

    // Construir filtros con AND
    let whereConditions = ['t.grupo_id = ?'];
    let queryParams = [grupoId];

    if (search) {
      whereConditions.push('(u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ? OR u.rut LIKE ? OR t.ocupacion LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (status !== 'all') {
      whereConditions.push('t.activo = ?');
      queryParams.push(status === 'active' ? 1 : 0);
    }

    if (department !== 'all') {
      whereConditions.push('t.departamento_id = ?');
      queryParams.push(department);
    }

    if (ocupacion !== 'all') {
      whereConditions.push('t.ocupacion = ?');
      queryParams.push(ocupacion);
    }

    const whereClause = whereConditions.join(' AND ');

    console.log('🔍 Filtros aplicados:', { search, status, department, ocupacion });
    console.log('🔧 WHERE:', whereClause);
    console.log('📋 Parámetros:', queryParams);

    // Validar y convertir limit y offset a números enteros
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const offsetNum = Math.max(0, parseInt(offset) || 0);

    // Solo agregar LIMIT/OFFSET si hay filtros activos (para mantener paginación del servidor en filtros)
    // Si no hay filtros, cargar todo para el frontend
    const hasActiveFilters = search || status !== 'all' || department !== 'all' || ocupacion !== 'all';
    
    // Query principal con información de usuario asociado
    let query = `
      SELECT 
        t.id,
        u.nombre,
        u.apellido,
        t.ocupacion,
        u.email,
        u.rut,
        t.fecha_contratacion,
        t.activo,
        t.experiencia_anos,
        t.telefono,
        d.nombre as departamento_nombre,
        d.id as departamento_id,
        u.id as usuario_id,
        u.email as usuario_email,
        1 as tiene_usuario
      FROM trabajadores t
      INNER JOIN usuarios u ON t.usuario_id = u.id
      LEFT JOIN departamentos d ON t.departamento_id = d.id
      WHERE ${whereClause}
      ORDER BY u.nombre, u.apellido
    `;

    // Solo agregar paginación si hay filtros activos
    if (hasActiveFilters) {
      query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;
    }

    console.log('🔍 Ejecutando query:', {
      sql: query,
      params: queryParams,
      paramTypes: queryParams.map(p => typeof p),
      hasActiveFilters,
      loadAll: !hasActiveFilters
    });

    const [trabajadores] = await db.promise().execute(query, queryParams);

    // Obtener departamentos para filtros
    const [departamentos] = await db.promise().execute(
      'SELECT id, nombre FROM departamentos WHERE grupo_id = ? ORDER BY nombre',
      [grupoId]
    );

    // Si hay filtros activos, incluir información de paginación
    if (hasActiveFilters) {
      // Query para contar total de registros con filtros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM trabajadores t
        WHERE ${whereClause}
      `;
      const [countResult] = await db.promise().execute(countQuery, queryParams);
      const total = countResult[0].total;

      res.json({
        trabajadores,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          departamentos
        }
      });
    } else {
      // Sin filtros, devolver todos los trabajadores sin paginación
      res.json({
        trabajadores,
        filters: {
          departamentos
        }
      });
    }

  } catch (error) {
    console.error('Error al obtener trabajadores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/trabajadores-avanzado - Crear nuevo trabajador
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 POST /trabajadores-avanzado - Iniciando creación de trabajador');
    const db = req.app.get('db');
    const {
      nombre,
      apellido,
      ocupacion,
      email,
      rut,
      departamento, // Ahora recibimos el nombre del departamento
      fecha_contratacion,
      activo = true
    } = req.body;

    console.log('📝 Datos del trabajador a crear:', { nombre, apellido, email, rut });

    // Validación básica
    if (!nombre || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }

    // Obtener grupo del usuario
    const userGroupQuery = `
      SELECT ug.grupo_id 
      FROM usuarios_grupos ug 
      WHERE ug.usuario_id = ? AND ug.estado = 'activo'
      LIMIT 1
    `;
    const [userGroups] = await db.promise().execute(userGroupQuery, [req.user.id]);
    
    if (!userGroups.length) {
      return res.status(403).json({ error: 'Usuario sin grupo asignado' });
    }
    
    const grupoId = userGroups[0].grupo_id;

    // Verificar si el email ya existe (si se proporcionó)
    if (email) {
      console.log('🔍 Verificando email duplicado:', email);
      
      // Verificar en usuarios (global - los emails de usuarios deben ser únicos)
      const [existingUser] = await db.promise().execute(
        'SELECT id FROM usuarios WHERE email = ?',
        [email]
      );
      console.log('� Usuarios con email:', existingUser.length);
      if (existingUser.length > 0) {
        console.log('❌ Email ya existe en usuarios');
        return res.status(400).json({ error: 'Ya existe un usuario registrado con este email' });
      }
    }

    // Verificar si el RUT ya existe (si se proporcionó)
    if (rut) {
      const [existingRut] = await db.promise().execute(
        'SELECT id FROM usuarios WHERE rut = ?',
        [rut]
      );
      if (existingRut.length > 0) {
        return res.status(400).json({ error: 'Ya existe un usuario con este RUT' });
      }
    }

    // Primero, crear el usuario (obligatorio en la nueva estructura)
    if (!email || !nombre || !apellido) {
      return res.status(400).json({ 
        error: 'Email, nombre y apellido son requeridos para crear trabajador' 
      });
    }

    // Crear usuario con password predeterminado
    const tempPassword = await bcrypt.hash('123456', 10);
    const insertUserQuery = `
      INSERT INTO usuarios (nombre, apellido, email, rut, password, rol_global)
      VALUES (?, ?, ?, ?, ?, 'trabajador')
    `;

    const [userResult] = await db.promise().execute(insertUserQuery, [
      nombre,
      apellido,
      email,
      rut || null,
      tempPassword
    ]);

    const usuarioId = userResult.insertId;

    // Buscar o crear departamento si se proporcionó
    let departamentoId = null;
    if (departamento && departamento.trim()) {
      // Buscar departamento existente
      const [existingDept] = await db.promise().execute(
        'SELECT id FROM departamentos WHERE nombre = ? AND grupo_id = ?',
        [departamento.trim(), grupoId]
      );

      if (existingDept.length > 0) {
        departamentoId = existingDept[0].id;
      } else {
        // Crear nuevo departamento
        const [newDept] = await db.promise().execute(
          'INSERT INTO departamentos (nombre, grupo_id) VALUES (?, ?)',
          [departamento.trim(), grupoId]
        );
        departamentoId = newDept.insertId;
      }
    }

    // Formatear fecha para MySQL (solo la parte de fecha)
    const fechaContratacionFormatted = fecha_contratacion ? 
      new Date(fecha_contratacion).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0];

    // Insertar trabajador (nueva estructura)
    const insertQuery = `
      INSERT INTO trabajadores (
        usuario_id, ocupacion, departamento_id, fecha_contratacion, 
        activo, grupo_id, experiencia_anos, telefono
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const { experiencia_anos = 0, telefono } = req.body;

    const [result] = await db.promise().execute(insertQuery, [
      usuarioId,
      ocupacion || null,
      departamentoId,
      fechaContratacionFormatted,
      activo ? 1 : 0,
      grupoId,
      experiencia_anos || 0,
      telefono || null
    ]);

    res.status(201).json({
      message: 'Trabajador creado exitosamente',
      trabajador: {
        id: result.insertId,
        usuario_id: usuarioId,
        nombre,
        apellido,
        ocupacion,
        email,
        rut,
        departamento,
        fecha_contratacion,
        activo,
        experiencia_anos: experiencia_anos || 0,
        telefono: telefono || null,
        tiene_usuario: true
      }
    });

  } catch (error) {
    console.error('Error al crear trabajador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/trabajadores-avanzado/:id - Actualizar trabajador
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const trabajadorId = req.params.id;
    const {
      nombre,
      apellido,
      ocupacion,
      email,
      rut,
      departamento, // Ahora recibimos el nombre del departamento
      fecha_contratacion,
      activo
    } = req.body;

    console.log('📝 Actualizando trabajador:', {
      id: trabajadorId,
      nombre,
      apellido,
      ocupacion,
      email,
      rut,
      departamento,
      fecha_contratacion,
      activo
    });

    // Obtener grupo del usuario
    const userGroupQuery = `
      SELECT ug.grupo_id 
      FROM usuarios_grupos ug 
      WHERE ug.usuario_id = ? AND ug.estado = 'activo'
      LIMIT 1
    `;
    const [userGroups] = await db.promise().execute(userGroupQuery, [req.user.id]);
    
    if (!userGroups.length) {
      return res.status(403).json({ error: 'Usuario sin grupo asignado' });
    }
    
    const grupoId = userGroups[0].grupo_id;

    // Verificar que el trabajador existe y pertenece al grupo
    const [existingWorker] = await db.promise().execute(
      'SELECT id FROM trabajadores WHERE id = ? AND grupo_id = ?',
      [trabajadorId, grupoId]
    );

    if (!existingWorker.length) {
      return res.status(404).json({ error: 'Trabajador no encontrado' });
    }

    // Verificar duplicados de email y RUT (excluyendo el actual)
    if (email) {
      // Obtener el usuario_id del trabajador actual
      const [currentWorker] = await db.promise().execute(
        'SELECT usuario_id FROM trabajadores WHERE id = ? AND grupo_id = ?',
        [trabajadorId, grupoId]
      );
      
      if (!currentWorker.length) {
        return res.status(404).json({ error: 'Trabajador no encontrado' });
      }

      const currentUsuarioId = currentWorker[0].usuario_id;

      // Verificar en usuarios (excluyendo el usuario actual)
      const [emailDuplicate] = await db.promise().execute(
        'SELECT id FROM usuarios WHERE email = ? AND id != ?',
        [email, currentUsuarioId]
      );
      if (emailDuplicate.length > 0) {
        return res.status(400).json({ error: 'Ya existe otro usuario registrado con este email' });
      }
    }

    if (rut) {
      // Verificar RUT en usuarios (excluyendo el usuario actual)
      const [rutDuplicate] = await db.promise().execute(
        'SELECT u.id FROM usuarios u INNER JOIN trabajadores t ON u.id = t.usuario_id WHERE u.rut = ? AND t.grupo_id = ? AND t.id != ?',
        [rut, grupoId, trabajadorId]
      );
      if (rutDuplicate.length > 0) {
        return res.status(400).json({ error: 'Ya existe otro trabajador con este RUT en su grupo' });
      }
    }

    // Buscar o crear departamento si se proporcionó
    let departamentoId = null;
    if (departamento && departamento.trim()) {
      // Buscar departamento existente
      const [existingDept] = await db.promise().execute(
        'SELECT id FROM departamentos WHERE nombre = ? AND grupo_id = ?',
        [departamento.trim(), grupoId]
      );

      if (existingDept.length > 0) {
        departamentoId = existingDept[0].id;
      } else {
        // Crear nuevo departamento
        const [newDept] = await db.promise().execute(
          'INSERT INTO departamentos (nombre, grupo_id) VALUES (?, ?)',
          [departamento.trim(), grupoId]
        );
        departamentoId = newDept.insertId;
      }
    }

    // Formatear fecha para MySQL (solo la parte de fecha)
    const fechaContratacionFormatted = fecha_contratacion ? 
      new Date(fecha_contratacion).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0];

    // Obtener el usuario_id del trabajador
    const [workerData] = await db.promise().execute(
      'SELECT usuario_id FROM trabajadores WHERE id = ? AND grupo_id = ?',
      [trabajadorId, grupoId]
    );

    if (!workerData.length) {
      return res.status(404).json({ error: 'Trabajador no encontrado' });
    }

    const usuarioId = workerData[0].usuario_id;

    // Actualizar información del usuario
    await db.promise().execute(
      'UPDATE usuarios SET nombre = ?, apellido = ?, email = ?, rut = ? WHERE id = ?',
      [nombre, apellido, email || null, rut || null, usuarioId]
    );

    // Actualizar trabajador
    const updateQuery = `
      UPDATE trabajadores 
      SET ocupacion = ?, departamento_id = ?, fecha_contratacion = ?, activo = ?
      WHERE id = ? AND grupo_id = ?
    `;

    await db.promise().execute(updateQuery, [
      ocupacion || null,
      departamentoId,
      fechaContratacionFormatted,
      activo ? 1 : 0,
      trabajadorId,
      grupoId
    ]);

    console.log('✅ Trabajador actualizado exitosamente, ID:', trabajadorId);
    res.json({ message: 'Trabajador actualizado exitosamente' });

  } catch (error) {
    console.error('❌ Error al actualizar trabajador:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      sql: error.sql
    });
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/trabajadores-avanzado/:id/crear-usuario - Convertir trabajador en usuario
router.post('/:id/crear-usuario', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const trabajadorId = req.params.id;
    const { password, rol_global = 'trabajador', rol_grupo = 'miembro', permisos_especiales = [] } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Contraseña es requerida' });
    }

    // Obtener grupo del usuario
    const userGroupQuery = `
      SELECT ug.grupo_id 
      FROM usuarios_grupos ug 
      WHERE ug.usuario_id = ? AND ug.estado = 'activo'
      LIMIT 1
    `;
    const [userGroups] = await db.promise().execute(userGroupQuery, [req.user.id]);
    
    if (!userGroups.length) {
      return res.status(403).json({ error: 'Usuario sin grupo asignado' });
    }
    
    const grupoId = userGroups[0].grupo_id;

    // Obtener información del trabajador con datos del usuario
    const [trabajador] = await db.promise().execute(
      `SELECT 
        t.id,
        t.usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        u.rut,
        t.departamento_id,
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
        d.nombre AS departamento_nombre
      FROM trabajadores t
      INNER JOIN usuarios u ON t.usuario_id = u.id
      LEFT JOIN departamentos d ON t.departamento_id = d.id
      WHERE t.id = ? AND t.grupo_id = ?`,
      [trabajadorId, grupoId]
    );

    if (!trabajador.length) {
      return res.status(404).json({ error: 'Trabajador no encontrado' });
    }

    const trabajadorData = trabajador[0];

    // Verificar si ya tiene usuario asociado
    const [existingUser] = await db.promise().execute(
      'SELECT id FROM usuarios WHERE trabajador_id = ?',
      [trabajadorId]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Este trabajador ya tiene una cuenta de usuario' });
    }

    // Verificar si el email ya existe en usuarios
    if (trabajadorData.email) {
      const [emailExists] = await db.promise().execute(
        'SELECT id FROM usuarios WHERE email = ?',
        [trabajadorData.email]
      );
      if (emailExists.length > 0) {
        return res.status(400).json({ error: 'Ya existe un usuario con este email' });
      }
    }

    if (!trabajadorData.email) {
      return res.status(400).json({ error: 'El trabajador debe tener un email para crear cuenta de usuario' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // Crear usuario
      const insertUserQuery = `
        INSERT INTO usuarios (nombre, apellido, email, password, rol_global, trabajador_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [userResult] = await connection.execute(insertUserQuery, [
        trabajadorData.nombre,
        trabajadorData.apellido,
        trabajadorData.email,
        hashedPassword,
        rol_global,
        trabajadorId
      ]);

      const nuevoUsuarioId = userResult.insertId;

      // Obtener rol ID
      const [roles] = await connection.execute(
        'SELECT id FROM roles WHERE nombre = ?',
        [rol_grupo]
      );

      if (!roles.length) {
        throw new Error('Rol no encontrado');
      }

      const rolId = roles[0].id;

      // Asociar usuario al grupo
      await connection.execute(
        'INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol_id, estado) VALUES (?, ?, ?, ?)',
        [nuevoUsuarioId, grupoId, rolId, 'activo']
      );

      // Asignar permisos especiales si se especificaron
      if (permisos_especiales && permisos_especiales.length > 0) {
        console.log('🔑 Asignando permisos especiales:', permisos_especiales);
        
        for (const permisoCodigo of permisos_especiales) {
          // Verificar si el permiso existe
          const [permisoExistente] = await connection.execute(
            'SELECT id FROM permisos_atomicos WHERE codigo = ?',
            [permisoCodigo]
          );
          
          if (permisoExistente.length > 0) {
            const permisoId = permisoExistente[0].id;
            
            // Verificar si el rol ya tiene este permiso
            const [rolTienePermiso] = await connection.execute(
              'SELECT 1 FROM roles_permisos WHERE rol_id = ? AND permiso_id = ?',
              [rolId, permisoId]
            );
            
            // Si el rol no tiene este permiso, agregarlo
            if (rolTienePermiso.length === 0) {
              await connection.execute(
                'INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (?, ?)',
                [rolId, permisoId]
              );
              console.log(`✅ Permiso ${permisoCodigo} agregado al rol ${rol_grupo}`);
            } else {
              console.log(`ℹ️ Permiso ${permisoCodigo} ya existe en el rol ${rol_grupo}`);
            }
          } else {
            console.log(`⚠️ Permiso ${permisoCodigo} no encontrado en la base de datos`);
          }
        }
      }

      await connection.commit();
      connection.release();

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        usuario: {
          id: nuevoUsuarioId,
          email: trabajadorData.email,
          rol_global,
          rol_grupo
        }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/trabajadores-avanzado/:id - Eliminar trabajador
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const trabajadorId = req.params.id;

    // Obtener grupo del usuario
    const userGroupQuery = `
      SELECT ug.grupo_id 
      FROM usuarios_grupos ug 
      WHERE ug.usuario_id = ? AND ug.estado = 'activo'
      LIMIT 1
    `;
    const [userGroups] = await db.promise().execute(userGroupQuery, [req.user.id]);
    
    if (!userGroups.length) {
      return res.status(403).json({ error: 'Usuario sin grupo asignado' });
    }
    
    const grupoId = userGroups[0].grupo_id;

    // Verificar que el trabajador existe y pertenece al grupo
    const [existingWorker] = await db.promise().execute(
      'SELECT id FROM trabajadores WHERE id = ? AND grupo_id = ?',
      [trabajadorId, grupoId]
    );

    if (!existingWorker.length) {
      return res.status(404).json({ error: 'Trabajador no encontrado' });
    }

    // Verificar si tiene asignaciones activas
    const [asignaciones] = await db.promise().execute(
      'SELECT COUNT(*) as count FROM asignaciones WHERE trabajador_id = ? AND fecha_devolucion IS NULL',
      [trabajadorId]
    );

    if (asignaciones[0].count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el trabajador porque tiene asignaciones activas' 
      });
    }

    // Eliminar trabajador (esto también eliminará el usuario asociado por CASCADE)
    await db.promise().execute(
      'DELETE FROM trabajadores WHERE id = ? AND grupo_id = ?',
      [trabajadorId, grupoId]
    );

    res.json({ message: 'Trabajador eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar trabajador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para cambiar estado del trabajador (activo/inactivo)
router.patch('/:id/estado', authenticateToken, async (req, res) => {
  try {
      const trabajadorId = req.params.id;
      const { activo } = req.body;
      
      if (typeof activo !== 'boolean') {
          return res.status(400).json({ 
              error: 'El campo activo debe ser un booleano' 
          });
      }
      
      // Verificar que el trabajador existe y pertenece al grupo del usuario
      const [trabajadorRows] = await db.promise().query(`
          SELECT t.*, u.nombre, u.apellido, u.email 
          FROM trabajadores t
          JOIN usuarios u ON u.id = t.usuario_id
          WHERE t.id = ? AND t.grupo_id IN (
              SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = ?
          )
      `, [trabajadorId, req.user.id]);
      
      if (trabajadorRows.length === 0) {
          return res.status(404).json({ 
              error: 'Trabajador no encontrado o sin permisos' 
          });
      }
      
      // Actualizar estado del trabajador
      await db.promise().query(
          'UPDATE trabajadores SET activo = ? WHERE id = ?',
          [activo, trabajadorId]
      );
      
      const trabajador = trabajadorRows[0];
      console.log(`✅ Estado del trabajador ${trabajadorId} cambiado a: ${activo ? 'activo' : 'inactivo'}`);
      
      res.json({ 
          message: `Trabajador ${activo ? 'activado' : 'desactivado'} exitosamente`,
          trabajador_nombre: `${trabajador.nombre} ${trabajador.apellido}`,
          nuevo_estado: activo
      });
      
  } catch (error) {
      console.error('❌ Error al cambiar estado del trabajador:', error);
      res.status(500).json({ 
          error: 'Error interno del servidor' 
      });
  }
});

// Endpoint para desactivar cuenta de usuario de un trabajador
router.post('/:id/desactivar-cuenta', authenticateToken, async (req, res) => {
  try {
      const trabajadorId = req.params.id;
      
      // Verificar que el trabajador existe y pertenece al grupo del usuario
      const [trabajadorRows] = await db.promise().query(`
          SELECT t.*, u.nombre, u.apellido, u.email, u.password 
          FROM trabajadores t
          JOIN usuarios u ON u.id = t.usuario_id
          WHERE t.id = ? AND t.grupo_id IN (
              SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = ?
          )
      `, [trabajadorId, req.user.id]);
      
      if (trabajadorRows.length === 0) {
          return res.status(404).json({ 
              error: 'Trabajador no encontrado o sin permisos' 
          });
      }
      
      const trabajador = trabajadorRows[0];
      
      // Verificar si el usuario tiene cuenta activa
      if (!trabajador.password || trabajador.password.length === 0) {
          return res.status(400).json({ 
              error: 'El trabajador no tiene una cuenta de usuario activa' 
          });
      }
      
      // Desactivar la cuenta eliminando la contraseña
      await db.promise().query(
          'UPDATE usuarios SET password = NULL WHERE id = ?',
          [trabajador.usuario_id]
      );
      
      console.log(`✅ Cuenta de usuario desactivada para trabajador ${trabajadorId}: ${trabajador.email}`);
      
      res.json({ 
          message: 'Cuenta de usuario desactivada exitosamente',
          email: trabajador.email,
          trabajador_nombre: `${trabajador.nombre} ${trabajador.apellido}`
      });
      
  } catch (error) {
      console.error('❌ Error al desactivar cuenta de usuario:', error);
      res.status(500).json({ 
          error: 'Error interno del servidor' 
      });
  }
});

// Endpoint para crear cuenta de usuario para un trabajador (compatible con frontend)
router.post('/:id/crear-cuenta', authenticateToken, async (req, res) => {
  try {
      const trabajadorId = req.params.id;
      const { password } = req.body;
      
      if (!password) {
          return res.status(400).json({ 
              error: 'Contraseña es requerida' 
          });
      }
      
      // Verificar que el trabajador existe y pertenece al grupo del usuario
      const [trabajadorRows] = await db.promise().query(`
          SELECT t.*, u.nombre, u.apellido, u.email 
          FROM trabajadores t
          JOIN usuarios u ON u.id = t.usuario_id
          WHERE t.id = ? AND t.grupo_id IN (
              SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = ?
          )
      `, [trabajadorId, req.user.id]);
      
      if (trabajadorRows.length === 0) {
          return res.status(404).json({ 
              error: 'Trabajador no encontrado o sin permisos' 
          });
      }
      
      const trabajador = trabajadorRows[0];
      
      // Verificar si el usuario ya tiene contraseña (ya fue activado)
      const [usuarioActual] = await db.promise().query(
          'SELECT password FROM usuarios WHERE id = ?', 
          [trabajador.usuario_id]
      );
      
      if (usuarioActual.length === 0) {
          return res.status(404).json({ 
              error: 'Usuario no encontrado' 
          });
      }
      
      // Verificar si ya tiene contraseña
      if (usuarioActual[0].password && usuarioActual[0].password.length > 0) {
          return res.status(400).json({ 
              error: 'El trabajador ya tiene una cuenta activa' 
          });
      }
      
      // Activar la cuenta asignando contraseña
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await db.promise().query(
          'UPDATE usuarios SET password = ? WHERE id = ?',
          [hashedPassword, trabajador.usuario_id]
      );
      
      console.log(`✅ Cuenta activada para trabajador ${trabajadorId}: ${trabajador.email}`);
      
      res.json({ 
          message: 'Cuenta activada exitosamente para acceso',
          email: trabajador.email,
          trabajador_nombre: `${trabajador.nombre} ${trabajador.apellido}`
      });
      
  } catch (error) {
      console.error('❌ Error al activar cuenta de trabajador:', error);
      res.status(500).json({ 
          error: 'Error interno del servidor' 
      });
  }
});

module.exports = router;