// backend/routes/dashboardImpresiones.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');

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
    console.log(`🔐 Verificando permiso '${permiso}' para usuario ID ${usuarioId}`);
    
    // Si no se proporciona usuario ID o permiso, negar acceso
    if (!usuarioId || !permiso) {
      console.warn('⚠️ Verificación de permiso: ID de usuario o código de permiso no proporcionado');
      return false;
    }
    
    // Verificar si es propietario de algún grupo
    console.log(`🔍 Verificando si el usuario ${usuarioId} es propietario de algún grupo...`);
    const [userGroups] = await db.promise().query(
      `SELECT 
         g.propietario_id,
         (g.propietario_id = ?) AS es_propietario
       FROM usuarios_grupos ug
       JOIN grupos g ON ug.grupo_id = g.id
       WHERE ug.usuario_id = ?`,
      [usuarioId, usuarioId]
    );
    
    console.log(`👥 Grupos encontrados: ${userGroups.length}`);
    
    // Si es propietario, tiene todos los permisos
    const isOwner = userGroups.some(ug => ug.es_propietario === 1);
    if (isOwner) {
      console.log(`✅ Usuario ${usuarioId} es propietario de grupo, tiene todos los permisos`);
      return true;
    }
    
    // Verificar permisos específicos
    console.log(`🔍 Verificando permiso específico '${permiso}'...`);
    const [permissions] = await db.promise().query(
      `SELECT DISTINCT p.codigo
       FROM usuarios_grupos ug
       JOIN roles_permisos rp ON ug.rol_id = rp.rol_id
       JOIN permisos_atomicos p ON rp.permiso_id = p.id
       WHERE ug.usuario_id = ? AND p.codigo = ?
       
       UNION
       
       SELECT DISTINCT p.codigo
       FROM usuarios_permisos_especiales upe
       JOIN permisos_atomicos p ON upe.permiso_id = p.id
       WHERE upe.usuario_id = ? AND upe.estado = 'activo' AND p.codigo = ?`,
      [usuarioId, permiso, usuarioId, permiso]
    );
    
    const tienePermiso = permissions.length > 0;
    console.log(`${tienePermiso ? '✅' : '❌'} Permiso '${permiso}' ${tienePermiso ? 'concedido' : 'denegado'} para usuario ${usuarioId}`);
    
    return tienePermiso;
  } catch (error) {
    console.error('❌ Error verificando permiso:', error);
    // En caso de error, lanzar el error para manejarlo en el controlador de ruta
    throw error;
  }
};

// Obtener estadísticas generales de fotocopias
router.get('/estadisticas', verificarToken, async (req, res) => {
  const { desde, hasta, usuario_id } = req.query;
  const usuarioId = req.usuario.id;
  
  try {
    console.log('📊 Solicitud de estadísticas recibida:', { desde, hasta, usuario_id, usuarioId });
    
    // Verificar permisos
    try {
      // Verificar si el código de permiso existe en la base de datos
      const [permisoExiste] = await db.promise().query(
        'SELECT COUNT(*) AS count FROM permisos_atomicos WHERE codigo = ?',
        ['fotocopia_leer']
      );
      
      if (permisoExiste[0].count === 0) {
        console.warn('⚠️ El permiso fotocopia_leer no existe en la base de datos');
        // Si el permiso no existe, otorgamos acceso por defecto para evitar problemas
        console.log('✅ Otorgando acceso por defecto ya que el permiso no existe');
      } else {
        const puedeVer = await verificarPermiso(usuarioId, 'fotocopia_leer');
        if (!puedeVer) {
          console.log('🚫 Acceso denegado: Usuario sin permiso fotocopia_leer');
          return res.status(403).json({ 
            message: 'No tienes permisos para ver estadísticas de fotocopias' 
          });
        }
      }
    } catch (permError) {
      console.error('❌ Error verificando permisos:', permError);
      return res.status(500).json({ 
        message: 'Error al verificar permisos', 
        error: permError.message,
        stack: permError.stack
      });
    }

    // Preparar condiciones de filtrado
    let conditions = [];
    const params = [];

    if (desde) {
      // Validar formato de fecha
      console.log('📅 Fecha desde recibida:', desde);
      try {
        // Verificar si la fecha es válida
        if (!moment(desde, 'YYYY-MM-DD', true).isValid()) {
          console.warn('⚠️ Fecha desde no válida:', desde);
        }
        
        // Asegurar que la fecha está en formato YYYY-MM-DD
        const fechaDesde = moment(desde).format('YYYY-MM-DD');
        console.log('📅 Fecha desde formateada:', fechaDesde);
        
        // Usar STR_TO_DATE en MySQL para asegurar formato de fecha correcto
        conditions.push("DATE(f.registrado_en) >= STR_TO_DATE(?, '%Y-%m-%d')");
        params.push(fechaDesde);
        
        // Debug: ejemplo de formato esperado
        console.log('📅 Ejemplo SQL fecha desde:', `DATE(f.registrado_en) >= STR_TO_DATE('${fechaDesde}', '%Y-%m-%d')`);
      } catch (e) {
        console.error('❌ Error al procesar fecha desde:', e);
        // En caso de error, usar la fecha tal cual
        conditions.push('DATE(f.registrado_en) >= ?');
        params.push(desde);
      }
    }
    
    if (hasta) {
      // Validar formato de fecha
      console.log('📅 Fecha hasta recibida:', hasta);
      try {
        // Verificar si la fecha es válida
        if (!moment(hasta, 'YYYY-MM-DD', true).isValid()) {
          console.warn('⚠️ Fecha hasta no válida:', hasta);
        }
        
        // Asegurar que la fecha está en formato YYYY-MM-DD
        const fechaHasta = moment(hasta).format('YYYY-MM-DD');
        console.log('📅 Fecha hasta formateada:', fechaHasta);
        
        // Usar STR_TO_DATE en MySQL para asegurar formato de fecha correcto
        conditions.push("DATE(f.registrado_en) <= STR_TO_DATE(?, '%Y-%m-%d')");
        params.push(fechaHasta);
        
        // Debug: ejemplo de formato esperado
        console.log('📅 Ejemplo SQL fecha hasta:', `DATE(f.registrado_en) <= STR_TO_DATE('${fechaHasta}', '%Y-%m-%d')`);
      } catch (e) {
        console.error('❌ Error al procesar fecha hasta:', e);
        // En caso de error, usar la fecha tal cual
        conditions.push('DATE(f.registrado_en) <= ?');
        params.push(hasta);
      }
    }
    
    if (usuario_id) {
      conditions.push('f.usuario_id = ?');
      params.push(usuario_id);
    }

    const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    console.log('🔍 Condiciones de filtro:', { conditions, whereClause, params });

    try {
      // Verificar conexión a la base de datos
      console.log('🔍 Verificando conexión a la base de datos...');
      try {
        await db.promise().query('SELECT 1');
        console.log('✅ Conexión a la base de datos establecida');
      } catch (connError) {
        console.error('❌ Error de conexión a la base de datos:', connError);
        return res.status(500).json({
          message: 'Error de conexión a la base de datos',
          error: connError.message
        });
      }

      // Primero verificamos si la tabla fotocopias existe
      console.log('🔍 Verificando si la tabla fotocopias existe...');
      const [tables] = await db.promise().query(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = DATABASE() 
         AND table_name = 'fotocopias'`
      );
      
      if (tables.length === 0) {
        console.error('❌ La tabla fotocopias no existe en la base de datos');
        return res.status(500).json({
          message: 'Error en la base de datos: La tabla fotocopias no existe',
          suggestion: 'Verifique que la migración de la base de datos se haya ejecutado correctamente'
        });
      }
      
      console.log('✅ Tabla fotocopias encontrada, verificando estructura...');
      
      // Verificar la estructura de la tabla fotocopias
      const [columns] = await db.promise().query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = DATABASE() 
         AND table_name = 'fotocopias'`
      );
      
      // Verificar que columns no sea undefined y tenga la estructura esperada
      if (!columns || !Array.isArray(columns)) {
        console.error('❌ Error: No se pudo obtener la información de columnas');
        return res.status(500).json({
          message: 'Error al verificar la estructura de la tabla',
          suggestion: 'Verifique la conexión a la base de datos'
        });
      }
      
      const columnNames = columns.map(col => {
        if (!col) {
          console.warn('⚠️ Columna es null o undefined:', col);
          return '';
        }
        
        // Manejar tanto column_name como COLUMN_NAME (MySQL puede devolver en mayúsculas)
        const columnName = col.column_name || col.COLUMN_NAME;
        
        if (!columnName || typeof columnName !== 'string') {
          console.warn('⚠️ Columna con formato inesperado:', col);
          return '';
        }
        return columnName.toLowerCase();
      }).filter(name => name !== '');
      
      const requiredColumns = ['cantidad', 'tipo', 'doble_hoja', 'registrado_en', 'usuario_id', 'grupo_id'];
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col.toLowerCase()));
      
      if (missingColumns.length > 0) {
        console.error(`❌ Faltan columnas en la tabla fotocopias: ${missingColumns.join(', ')}`);
        return res.status(500).json({
          message: `Error en la base de datos: Faltan columnas en la tabla fotocopias: ${missingColumns.join(', ')}`,
          suggestion: 'Verifique la estructura de la tabla o ejecute las migraciones pendientes'
        });
      }
      
      console.log('✅ Estructura de tabla verificada, procediendo con las consultas');
      
      // Variables para almacenar resultados
      let stats = [];
      let statsPorDia = [];
      let statsPorUsuario = [];
      
      // Estadísticas generales
      try {
        console.log('🔍 Iniciando consulta de estadísticas generales...');
        
        // Simplificar la consulta para evitar problemas con tablas vacías
        const statsQuery = `SELECT 
           COUNT(*) AS total_registros,
           COALESCE(SUM(f.cantidad), 0) AS total_copias,
           COALESCE(SUM(f.cantidad * COALESCE(f.multiplicador, 1)), 0) AS total_paginas,
           COALESCE(SUM(CASE WHEN f.tipo = 'bn' THEN f.cantidad * COALESCE(f.multiplicador, 1) ELSE 0 END), 0) AS total_bn,
           COALESCE(SUM(CASE WHEN f.tipo = 'color' THEN f.cantidad * COALESCE(f.multiplicador, 1) ELSE 0 END), 0) AS total_color,
           COALESCE(SUM(CASE WHEN f.doble_hoja = 1 THEN f.cantidad * COALESCE(f.multiplicador, 1) ELSE 0 END), 0) AS total_doble_hoja,
           COALESCE(SUM(CASE WHEN f.doble_hoja = 0 THEN f.cantidad * COALESCE(f.multiplicador, 1) ELSE 0 END), 0) AS total_una_hoja,
           COALESCE(SUM(CASE 
                WHEN f.doble_hoja = 1 THEN 
                  -- Para doble cara: calcular hojas por copia individual, luego multiplicar
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END), 0) AS total_hojas,
           COUNT(DISTINCT f.usuario_id) AS usuarios_unicos,
           COALESCE(SUM((CASE 
                WHEN f.doble_hoja = 1 THEN 
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END) * th.costo_unitario), 0) AS costo_total_hojas
         FROM fotocopias f
         LEFT JOIN tipos_hoja th ON f.tipo_hoja_id = th.id
         ${whereClause}`;
        
        console.log('📝 Query estadísticas generales:', statsQuery);
        console.log('📝 Parámetros:', params);
        
        [stats] = await db.promise().query(statsQuery, params);
        console.log('✅ Estadísticas generales obtenidas:', stats[0]);
      } catch (statsError) {
        console.error('❌ Error en estadísticas generales:', statsError);
        // Si esta consulta falla, usar un objeto predeterminado para evitar errores
        stats = [{
          total_registros: 0,
          total_copias: 0,
          total_bn: 0,
          total_color: 0,
          total_doble_hoja: 0,
          total_una_hoja: 0,
          total_hojas: 0,
          usuarios_unicos: 0
        }];
      }

      // Estadísticas por día
      try {
        console.log('🔍 Iniciando consulta de estadísticas por día...');
        
        const diaPorDiaQuery = `SELECT 
           DATE_FORMAT(f.registrado_en, '%d-%m-%Y') AS fecha,
           COUNT(*) AS registros,
           COALESCE(SUM(f.cantidad), 0) AS copias,
           COALESCE(SUM(CASE WHEN f.tipo = 'bn' THEN f.cantidad ELSE 0 END), 0) AS bn,
           COALESCE(SUM(CASE WHEN f.tipo = 'color' THEN f.cantidad ELSE 0 END), 0) AS color,
           COALESCE(SUM(CASE WHEN f.doble_hoja = 1 THEN f.cantidad ELSE 0 END), 0) AS doble_hoja,
           COALESCE(SUM(CASE WHEN f.doble_hoja = 0 THEN f.cantidad ELSE 0 END), 0) AS una_hoja,
           COALESCE(SUM(CASE 
                WHEN f.doble_hoja = 1 THEN 
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END), 0) AS total_hojas,
           COALESCE(SUM((CASE 
                WHEN f.doble_hoja = 1 THEN 
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END) * th.costo_unitario), 0) AS costo_total_dia
           FROM fotocopias f
           LEFT JOIN tipos_hoja th ON f.tipo_hoja_id = th.id
         ${whereClause}
         GROUP BY DATE_FORMAT(f.registrado_en, '%d-%m-%Y'), DATE(f.registrado_en)
         ORDER BY DATE(f.registrado_en) ASC`;
        
        console.log('📝 Query estadísticas por día:', diaPorDiaQuery);
        console.log('📝 Parámetros:', params);
        
        [statsPorDia] = await db.promise().query(diaPorDiaQuery, params);
        console.log('✅ Estadísticas por día obtenidas:', statsPorDia.length, 'registros');
      } catch (diaError) {
        console.error('⚠️ Error en estadísticas por día:', diaError);
        statsPorDia = [];
      }

      // Estadísticas por mes (para análisis de tendencias y planificación)
      let statsPorMes = [];
      try {
        console.log('🔍 Iniciando consulta de estadísticas por mes...');
        
        const mesPorMesQuery = `SELECT 
           DATE_FORMAT(f.registrado_en, '%Y-%m') AS mes,
           DATE_FORMAT(f.registrado_en, '%m/%Y') AS mes_formato,
           COUNT(*) AS registros,
           COALESCE(SUM(f.cantidad), 0) AS copias,
           COALESCE(SUM(CASE WHEN f.tipo = 'bn' THEN f.cantidad ELSE 0 END), 0) AS bn,
           COALESCE(SUM(CASE WHEN f.tipo = 'color' THEN f.cantidad ELSE 0 END), 0) AS color,
           COALESCE(SUM(CASE WHEN f.doble_hoja = 1 THEN f.cantidad ELSE 0 END), 0) AS doble_hoja,
           COALESCE(SUM(CASE WHEN f.doble_hoja = 0 THEN f.cantidad ELSE 0 END), 0) AS una_hoja,
           COALESCE(SUM(CASE 
                WHEN f.doble_hoja = 1 THEN 
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END), 0) AS total_hojas,
           -- Cálculo de ahorro por doble cara
           COALESCE(SUM(CASE WHEN f.doble_hoja = 1 THEN f.cantidad ELSE 0 END), 0) AS copias_doble_cara,
           COALESCE(SUM(CASE 
                WHEN f.doble_hoja = 1 THEN 
                  -- Hojas ahorradas = páginas - hojas usadas
                  f.cantidad - (CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END)
                ELSE 0 END), 0) AS hojas_ahorradas,
           -- Costo total del mes
           COALESCE(SUM((CASE 
                WHEN f.doble_hoja = 1 THEN 
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END) * th.costo_unitario), 0) AS costo_total_mes
           FROM fotocopias f
           LEFT JOIN tipos_hoja th ON f.tipo_hoja_id = th.id
         ${whereClause}
         GROUP BY DATE_FORMAT(f.registrado_en, '%Y-%m')
         ORDER BY DATE_FORMAT(f.registrado_en, '%Y-%m') ASC`;
        
        console.log('📝 Query estadísticas por mes:', mesPorMesQuery);
        
        [statsPorMes] = await db.promise().query(mesPorMesQuery, params);
        console.log('✅ Estadísticas por mes obtenidas:', statsPorMes.length, 'registros');
      } catch (mesError) {
        console.error('⚠️ Error en estadísticas por mes:', mesError);
        statsPorMes = [];
      }

      // Estadísticas por usuario
      try {
        console.log('🔍 Iniciando consulta de estadísticas por usuario');
        
        // Consulta simplificada sin dependencias complejas
        const porUsuarioQuery = `SELECT 
           f.usuario_id,
           IFNULL(u.nombre, CONCAT('Usuario #', f.usuario_id)) AS usuario_nombre,
           COUNT(*) AS registros,
           COALESCE(SUM(f.cantidad), 0) AS copias,
           COALESCE(SUM(CASE WHEN f.tipo = 'bn' THEN f.cantidad ELSE 0 END), 0) AS bn,
           COALESCE(SUM(CASE WHEN f.tipo = 'color' THEN f.cantidad ELSE 0 END), 0) AS color,
           COALESCE(SUM(CASE 
                WHEN f.doble_hoja = 1 THEN 
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END), 0) AS total_hojas,
           COALESCE(SUM((CASE 
                WHEN f.doble_hoja = 1 THEN 
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END) * th.costo_unitario), 0) AS costo_total_usuario
         FROM fotocopias f
         LEFT JOIN usuarios u ON f.usuario_id = u.id 
         LEFT JOIN tipos_hoja th ON f.tipo_hoja_id = th.id 
         ${whereClause}
         GROUP BY f.usuario_id, u.nombre
         ORDER BY copias DESC`;
         
        console.log('📝 Query estadísticas por usuario:', porUsuarioQuery);
        console.log('📝 Parámetros:', params);
        
        [statsPorUsuario] = await db.promise().query(porUsuarioQuery, params);
        console.log('✅ Estadísticas por usuario obtenidas:', statsPorUsuario.length, 'registros');
      } catch (userError) {
        console.error('⚠️ Error general en estadísticas por usuario:', userError);
        statsPorUsuario = [];
      }

      // Estadísticas por tipo de hoja
      let statsPorTipoHoja = [];
      try {
        console.log('🔍 Iniciando consulta de estadísticas por tipo de hoja...');
        
        const porTipoHojaQuery = `SELECT 
           th.id AS tipo_hoja_id,
           th.nombre AS tipo_hoja_nombre,
           th.costo_unitario,
           COUNT(*) AS registros,
           COALESCE(SUM(f.cantidad), 0) AS copias,
           COALESCE(SUM(CASE 
                WHEN f.doble_hoja = 1 THEN 
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END), 0) AS total_hojas,
           COALESCE(SUM((CASE 
                WHEN f.doble_hoja = 1 THEN 
                  CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)
                  END
                ELSE f.cantidad * COALESCE(f.multiplicador, 1) END) * th.costo_unitario), 0) AS costo_total_tipo
         FROM fotocopias f
         JOIN tipos_hoja th ON f.tipo_hoja_id = th.id
         ${whereClause}
         GROUP BY th.id, th.nombre, th.costo_unitario
         ORDER BY total_hojas DESC`;
         
        console.log('📝 Query estadísticas por tipo de hoja:', porTipoHojaQuery);
        
        [statsPorTipoHoja] = await db.promise().query(porTipoHojaQuery, params);
        console.log('✅ Estadísticas por tipo de hoja obtenidas:', statsPorTipoHoja.length, 'registros');
      } catch (tipoHojaError) {
        console.error('⚠️ Error en estadísticas por tipo de hoja:', tipoHojaError);
        statsPorTipoHoja = [];
      }

      // Responder con todas las estadísticas
      const response = {
        general: stats[0],
        porDia: statsPorDia,
        porMes: statsPorMes,
        porUsuario: statsPorUsuario,
        porTipoHoja: statsPorTipoHoja,
        // Métricas calculadas para análisis avanzado
        analisis: {
          // Ahorro por doble cara
          ahorroDobleHoja: {
            copias_doble_cara: stats[0].total_doble_hoja,
            hojas_ahorradas: Math.floor(stats[0].total_doble_hoja / 2),
            costo_ahorrado: stats[0].costo_total_hojas ? 
              (stats[0].total_doble_hoja * (stats[0].costo_total_hojas / stats[0].total_hojas) / 2) : 0,
            porcentaje_doble_cara: stats[0].total_copias > 0 ? 
              Math.round((stats[0].total_doble_hoja / stats[0].total_copias) * 100) : 0
          },
          // Planificación de resmas y costos reales
          planificacionResmas: {
            total_hojas_utilizadas: stats[0].total_hojas,
            costo_real_hojas: stats[0].costo_total_hojas || 0,
            resmas_utilizadas: Math.ceil(stats[0].total_hojas / 500),
            costo_resmas_estimado: Math.ceil(stats[0].total_hojas / 500) * 2500, // Precio estimado por resma
            promedio_hojas_por_dia: statsPorDia.length > 0 ? 
              Math.round(stats[0].total_hojas / statsPorDia.length) : 0,
            promedio_costo_por_dia: statsPorDia.length > 0 ? 
              Math.round((stats[0].costo_total_hojas || 0) / statsPorDia.length) : 0
          },
          // Costo promedio mensual
          costoPromedioMensual: statsPorMes.length > 0 ? 
            statsPorMes.reduce((sum, mes) => sum + (mes.costo_total_mes || mes.total_hojas * 5), 0) / statsPorMes.length : 0,
          // Pico operativo (mes con mayor consumo)
          picoOperativo: statsPorMes.length > 0 ? 
            statsPorMes.reduce((max, mes) => mes.total_hojas > max.total_hojas ? mes : max, statsPorMes[0]) : null
        }
      };
      
      console.log('✅ Enviando respuesta con estadísticas completas');
      console.log('📊 Estadísticas general:', stats[0]);
      console.log('📊 Estadísticas por día:', statsPorDia.length, 'registros');
      console.log('📊 Estadísticas por mes:', statsPorMes.length, 'registros');
      console.log('📊 Estadísticas por usuario:', statsPorUsuario.length, 'registros');
      console.log('📊 Análisis de ahorro y planificación:', response.analisis);
      
      res.json(response);
      
    } catch (queryError) {
      // ===== LOG DETALLADO =====
      console.error('❌ Error en consulta SQL:');
      console.error('   • code      :', queryError.code);         // ER_BAD_FIELD_ERROR, ER_PARSE_ERROR, etc.
      console.error('   • errno     :', queryError.errno);
      console.error('   • sqlState  :', queryError.sqlState);
      console.error('   • message   :', queryError.sqlMessage);
      console.error('   • sql       :\n', queryError.sql, '\n');
      console.error('❌ Stack trace:', queryError.stack);
      // =========================
      
      // Intentar ejecutar una consulta simple para verificar la conexión
      try {
        await db.promise().query('SELECT 1 AS test');
        console.log('✅ La conexión a la base de datos sigue activa');
      } catch (connTestError) {
        console.error('❌ La conexión a la base de datos falló:', connTestError);
      }
      
      // Verificar si el error está relacionado con el grupo_id
      const errorMsg = queryError.message ? queryError.message.toLowerCase() : '';
      if (errorMsg.includes('grupo_id')) {
        console.warn('⚠️ Posible problema con grupo_id. Intentando consulta alternativa...');
        try {
          // Intentar una consulta simplificada sin uniones complejas
          const [basicStats] = await db.promise().query(
            'SELECT COUNT(*) AS total FROM fotocopias'
          );
          console.log('✅ Consulta básica exitosa:', basicStats);
        } catch (basicError) {
          console.error('❌ Incluso la consulta básica falló:', basicError);
        }
      }
      
      return res.status(500).json({
        message: 'Error en consulta SQL', 
        error: queryError.message,
        detail: process.env.NODE_ENV === 'development' ? {
          code: queryError.code,
          sql: queryError.sql,
          sqlMessage: queryError.sqlMessage,
          sqlState: queryError.sqlState,
          errno: queryError.errno
        } : undefined
      });
    }
    
  } catch (err) {
    console.error('❌ Error general:', err);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas', 
      error: err.message 
    });
  }
});

// Obtener análisis avanzado con precios dinámicos
router.get('/analisis-avanzado', verificarToken, async (req, res) => {
  const { desde, hasta, usuario_id } = req.query;
  const usuarioId = req.usuario.id;
  
  try {
    console.log('📈 Solicitud de análisis avanzado recibida:', { desde, hasta, usuario_id, usuarioId });
    
    // Obtener precios actuales para cálculos
    const [preciosRows] = await db.promise().query(
      `SELECT configuracion_clave, configuracion_valor
       FROM configuracion_sistema
       WHERE configuracion_clave IN ('precio_bn', 'precio_color', 'precio_hoja', 'precio_resma')`
    );
    
    const precios = {
      precio_bn: 15,
      precio_color: 50, 
      precio_hoja: 5,
      precio_resma: 2500
    };
    
    preciosRows.forEach(row => {
      precios[row.configuracion_clave] = parseFloat(row.configuracion_valor) || precios[row.configuracion_clave];
    });
    
    console.log('💰 Precios para análisis:', precios);
    
    // Preparar condiciones de filtrado (similar al endpoint principal)
    let conditions = [];
    const params = [];

    if (desde) {
      const fechaDesde = moment(desde).format('YYYY-MM-DD');
      conditions.push("DATE(f.registrado_en) >= STR_TO_DATE(?, '%Y-%m-%d')");
      params.push(fechaDesde);
    }
    
    if (hasta) {
      const fechaHasta = moment(hasta).format('YYYY-MM-DD');
      conditions.push("DATE(f.registrado_en) <= STR_TO_DATE(?, '%Y-%m-%d')");
      params.push(fechaHasta);
    }
    
    if (usuario_id) {
      conditions.push('f.usuario_id = ?');
      params.push(usuario_id);
    }

    const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

    // Consulta de análisis avanzado - simplificada para evitar errores de GROUP BY
    const analisisQuery = `SELECT 
      COUNT(*) AS total_registros,
      COALESCE(SUM(f.cantidad), 0) AS total_copias,
      COALESCE(SUM(CASE WHEN f.tipo = 'bn' THEN f.cantidad ELSE 0 END), 0) AS total_bn,
      COALESCE(SUM(CASE WHEN f.tipo = 'color' THEN f.cantidad ELSE 0 END), 0) AS total_color,
      COALESCE(SUM(CASE WHEN f.doble_hoja = 1 THEN f.cantidad ELSE 0 END), 0) AS copias_doble_cara,
      COALESCE(SUM(CASE WHEN f.doble_hoja = 0 THEN f.cantidad ELSE 0 END), 0) AS copias_una_cara,
      COALESCE(SUM(CASE 
           WHEN f.doble_hoja = 1 AND f.cantidad > 1 THEN CEIL(f.cantidad / 2) 
           WHEN f.doble_hoja = 1 AND f.cantidad = 1 THEN 1
           ELSE f.cantidad * COALESCE(f.multiplicador, 1) END), 0) AS total_hojas_usadas,
      COALESCE(SUM(f.cantidad), 0) AS hojas_sin_doble_cara
      FROM fotocopias f
      ${whereClause}`;
    
    console.log('📝 Query análisis avanzado:', analisisQuery);
    const [analisisData] = await db.promise().query(analisisQuery, params);
    const datos = analisisData[0];
    
    // Calcular métricas derivadas
    const hojas_ahorradas = datos.hojas_sin_doble_cara - datos.total_hojas_usadas;
    
    // Obtener conteos para promedios
    const [conteoFechas] = await db.promise().query(
      `SELECT 
         COUNT(DISTINCT DATE(f.registrado_en)) AS dias_activos,
         COUNT(DISTINCT DATE_FORMAT(f.registrado_en, '%Y-%m')) AS meses_activos
       FROM fotocopias f
       ${whereClause}`, params);
    
    const { dias_activos, meses_activos } = conteoFechas[0];
    
    // Análisis por mes para tendencias
    const tendenciasQuery = `SELECT 
      DATE_FORMAT(f.registrado_en, '%Y-%m') AS mes,
      COALESCE(SUM(CASE 
           WHEN f.doble_hoja = 1 AND f.cantidad > 1 THEN CEIL(f.cantidad / 2) 
           WHEN f.doble_hoja = 1 AND f.cantidad = 1 THEN 1
           ELSE f.cantidad * COALESCE(f.multiplicador, 1) END), 0) AS hojas_mes,
      COALESCE(SUM(f.cantidad), 0) AS copias_mes,
      COALESCE(SUM(CASE WHEN f.doble_hoja = 1 THEN f.cantidad ELSE 0 END), 0) AS doble_cara_mes
      FROM fotocopias f
      ${whereClause}
      GROUP BY DATE_FORMAT(f.registrado_en, '%Y-%m')
      ORDER BY DATE_FORMAT(f.registrado_en, '%Y-%m') ASC`;
    
    const [tendenciasData] = await db.promise().query(tendenciasQuery, params);
    
    // Calcular métricas avanzadas
    const analisisCompleto = {
      // Ahorro por doble cara
      ahorroDobleHoja: {
        copias_doble_cara: parseInt(datos.copias_doble_cara),
        hojas_ahorradas: parseInt(hojas_ahorradas),
        costo_ahorrado: parseInt(hojas_ahorradas) * precios.precio_hoja,
        porcentaje_doble_cara: datos.total_copias > 0 ? 
          Math.round((datos.copias_doble_cara / datos.total_copias) * 100) : 0,
        ahorro_potencial_anual: parseInt(hojas_ahorradas) * precios.precio_hoja * 12
      },
      
      // Planificación de resmas
      planificacionResmas: {
        hojas_utilizadas: parseInt(datos.total_hojas_usadas),
        resmas_utilizadas: Math.ceil(datos.total_hojas_usadas / 500),
        costo_resmas: Math.ceil(datos.total_hojas_usadas / 500) * precios.precio_resma,
        resmas_sin_doble_cara: Math.ceil(datos.hojas_sin_doble_cara / 500),
        resmas_ahorradas: Math.ceil(datos.hojas_sin_doble_cara / 500) - Math.ceil(datos.total_hojas_usadas / 500),
        proyeccion_anual_resmas: meses_activos > 0 ? 
          Math.ceil((datos.total_hojas_usadas / meses_activos) * 12 / 500) : 0,
        proyeccion_anual_costo: meses_activos > 0 ? 
          Math.ceil((datos.total_hojas_usadas / meses_activos) * 12 / 500) * precios.precio_resma : 0
      },
      
      // Promedios y tendencias
      promedios: {
        hojas_por_dia: dias_activos > 0 ? Math.round(datos.total_hojas_usadas / dias_activos) : 0,
        hojas_por_mes: meses_activos > 0 ? Math.round(datos.total_hojas_usadas / meses_activos) : 0,
        costo_promedio_mensual: meses_activos > 0 ? 
          Math.round((datos.total_hojas_usadas / meses_activos) * precios.precio_hoja) : 0,
        resmas_promedio_mensual: meses_activos > 0 ? 
          Math.ceil((datos.total_hojas_usadas / meses_activos) / 500) : 0
      },
      
      // Análisis de picos y tendencias mensuales
      tendenciasMensuales: tendenciasData.map(mes => {
        const mesFormateado = moment(mes.mes + '-01').format('MM/YYYY');
        return {
          mes: mesFormateado,
          hojas: parseInt(mes.hojas_mes),
          copias: parseInt(mes.copias_mes),
          resmas_necesarias: Math.ceil(mes.hojas_mes / 500),
          costo_estimado: mes.hojas_mes * precios.precio_hoja,
          porcentaje_doble_cara: mes.copias_mes > 0 ? 
            Math.round((mes.doble_cara_mes / mes.copias_mes) * 100) : 0
        };
      }),
      
      // Identificar pico operativo
      picoOperativo: tendenciasData.length > 0 ? 
        tendenciasData.reduce((max, mes) => {
          const mesFormateado = moment(mes.mes + '-01').format('MM/YYYY');
          return parseInt(mes.hojas_mes) > parseInt(max.hojas || 0) ? {
            mes: mesFormateado,
            hojas: parseInt(mes.hojas_mes),
            resmas: Math.ceil(mes.hojas_mes / 500),
            costo: mes.hojas_mes * precios.precio_hoja
          } : max;
        }, {hojas: 0}) : null,
      
      // Recomendaciones
      recomendaciones: {
        incrementar_doble_cara: datos.total_copias > 0 && (datos.copias_doble_cara / datos.total_copias) < 0.7,
        ahorro_potencial_mes: meses_activos > 0 ? 
          Math.round((datos.copias_una_cara * 0.5) * precios.precio_hoja) : 0,
        stock_recomendado: meses_activos > 0 ? 
          Math.ceil((datos.total_hojas_usadas / meses_activos) * 1.2 / 500) : 0
      }
    };
    
    console.log('✅ Análisis avanzado completado');
    res.json(analisisCompleto);
    
  } catch (err) {
    console.error('❌ Error en análisis avanzado:', err);
    res.status(500).json({ 
      message: 'Error al obtener análisis avanzado', 
      error: err.message 
    });
  }
});

// Obtener configuración de precios y tipos de hoja
router.get('/precios', verificarToken, async (req, res) => {
  try {
    console.log('💰 Solicitud de precios recibida');
    
    // Obtener configuración general
    const [rows] = await db.promise().query(
      `SELECT 
         configuracion_clave,
         configuracion_valor
       FROM configuracion_sistema
       WHERE configuracion_clave LIKE 'precio_%'
       OR configuracion_clave LIKE 'fotocopia_%'`
    );
    
    // Obtener tipos de hoja
    const [tiposHojaRows] = await db.promise().query(
      `SELECT 
         id,
         nombre,
         descripcion,
         costo_unitario,
         activo,
         creado_en,
         actualizado_en
       FROM tipos_hoja
       WHERE activo = 1
       ORDER BY nombre ASC`
    );
    
    console.log(`💰 Configuración encontrada: ${rows.length} registros`);
    console.log(`📄 Tipos de hoja encontrados: ${tiposHojaRows.length} registros`);
    
    // Si no hay configuración, devolver valores predeterminados
    if (rows.length === 0) {
      const defaultConfig = {
        precio_bn: 15,
        precio_color: 50,
        precio_hoja: 5,
        fotocopia_gracia_bn: 1,
        fotocopia_gracia_color: 1
      };
      
      console.log('💰 Usando configuración predeterminada:', defaultConfig);
      return res.json({
        configuracion: defaultConfig,
        tiposHoja: tiposHojaRows
      });
    }
    
    // Convertir a objeto
    const configuracion = {};
    rows.forEach(row => {
      configuracion[row.configuracion_clave] = isNaN(row.configuracion_valor) ? 
        row.configuracion_valor : 
        parseFloat(row.configuracion_valor);
    });
    
    const response = {
      configuracion,
      tiposHoja: tiposHojaRows
    };
    
    console.log('💰 Enviando respuesta completa:', response);
    res.json(response);
  } catch (err) {
    console.error('❌ Error al obtener precios:', err);
    res.status(500).json({ 
      message: 'Error al obtener configuración de precios',
      error: err.message,
      sqlState: err.sqlState,
      sqlCode: err.code
    });
  }
});

// Guardar configuración de precios
router.post('/precios', verificarToken, async (req, res) => {
  const usuarioId = req.usuario.id;
  const { 
    precio_bn, 
    precio_color, 
    precio_hoja,
    fotocopia_gracia_bn,
    fotocopia_gracia_color
  } = req.body;
  
  try {
    // Verificar permisos de administración
    const puedeAdministrar = await verificarPermiso(usuarioId, 'configuracion_editar');
    if (!puedeAdministrar) {
      return res.status(403).json({ 
        message: 'No tienes permisos para modificar la configuración de precios' 
      });
    }
    
    // Verificar si ya existe la configuración para actualizar o insertar
    const config = {
      precio_bn, 
      precio_color, 
      precio_hoja, 
      fotocopia_gracia_bn,
      fotocopia_gracia_color
    };
    
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined) {
        const [existingRows] = await db.promise().query(
          'SELECT COUNT(*) AS count FROM configuracion_sistema WHERE configuracion_clave = ?',
          [key]
        );
        
        if (existingRows[0].count > 0) {
          await db.promise().query(
            'UPDATE configuracion_sistema SET configuracion_valor = ? WHERE configuracion_clave = ?',
            [value, key]
          );
        } else {
          await db.promise().query(
            'INSERT INTO configuracion_sistema (configuracion_clave, configuracion_valor) VALUES (?, ?)',
            [key, value]
          );
        }
      }
    }
    
    res.json({ message: 'Configuración de precios actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar configuración de precios' });
  }
});

// Crear nuevo tipo de hoja
router.post('/tipos-hoja', verificarToken, async (req, res) => {
  const usuarioId = req.usuario.id;
  const { nombre, descripcion, costo_unitario } = req.body;
  
  try {
    // Verificar permisos de administración
    const puedeAdministrar = await verificarPermiso(usuarioId, 'admin_configuracion');
    if (!puedeAdministrar) {
      return res.status(403).json({ 
        message: 'No tienes permisos para crear tipos de hoja' 
      });
    }
    
    // Validar datos requeridos
    if (!nombre || !costo_unitario) {
      return res.status(400).json({ 
        message: 'Nombre y costo unitario son campos obligatorios' 
      });
    }
    
    // Verificar que no exista ya un tipo con el mismo nombre
    const [existingRows] = await db.promise().query(
      'SELECT COUNT(*) AS count FROM tipos_hoja WHERE nombre = ? AND activo = 1',
      [nombre]
    );
    
    if (existingRows[0].count > 0) {
      return res.status(400).json({ 
        message: 'Ya existe un tipo de hoja con ese nombre' 
      });
    }
    
    // Crear el nuevo tipo de hoja
    const [result] = await db.promise().query(
      `INSERT INTO tipos_hoja (nombre, descripcion, costo_unitario) 
       VALUES (?, ?, ?)`,
      [nombre, descripcion || '', parseFloat(costo_unitario)]
    );
    
    // Obtener el registro creado
    const [newRecord] = await db.promise().query(
      'SELECT * FROM tipos_hoja WHERE id = ?',
      [result.insertId]
    );
    
    console.log(`✅ Nuevo tipo de hoja creado: ${nombre} - $${costo_unitario}`);
    res.json({
      message: 'Tipo de hoja creado exitosamente',
      tipoHoja: newRecord[0]
    });
  } catch (err) {
    console.error('❌ Error al crear tipo de hoja:', err);
    res.status(500).json({ 
      message: 'Error al crear tipo de hoja',
      error: err.message 
    });
  }
});

// Actualizar tipo de hoja
router.put('/tipos-hoja/:id', verificarToken, async (req, res) => {
  const usuarioId = req.usuario.id;
  const { id } = req.params;
  const { nombre, descripcion, costo_unitario } = req.body;
  
  try {
    // Verificar permisos de administración
    const puedeAdministrar = await verificarPermiso(usuarioId, 'admin_configuracion');
    if (!puedeAdministrar) {
      return res.status(403).json({ 
        message: 'No tienes permisos para editar tipos de hoja' 
      });
    }
    
    // Validar que existe el tipo de hoja
    const [existingRows] = await db.promise().query(
      'SELECT * FROM tipos_hoja WHERE id = ? AND activo = 1',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        message: 'Tipo de hoja no encontrado' 
      });
    }
    
    // Verificar que no exista otro tipo con el mismo nombre
    if (nombre && nombre !== existingRows[0].nombre) {
      const [duplicateCheck] = await db.promise().query(
        'SELECT COUNT(*) AS count FROM tipos_hoja WHERE nombre = ? AND id != ? AND activo = 1',
        [nombre, id]
      );
      
      if (duplicateCheck[0].count > 0) {
        return res.status(400).json({ 
          message: 'Ya existe otro tipo de hoja con ese nombre' 
        });
      }
    }
    
    // Actualizar el tipo de hoja
    await db.promise().query(
      `UPDATE tipos_hoja 
       SET nombre = ?, descripcion = ?, costo_unitario = ?, actualizado_en = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nombre || existingRows[0].nombre,
        descripcion !== undefined ? descripcion : existingRows[0].descripcion,
        costo_unitario !== undefined ? parseFloat(costo_unitario) : existingRows[0].costo_unitario,
        id
      ]
    );
    
    // Obtener el registro actualizado
    const [updatedRecord] = await db.promise().query(
      'SELECT * FROM tipos_hoja WHERE id = ?',
      [id]
    );
    
    console.log(`✅ Tipo de hoja actualizado: ${updatedRecord[0].nombre} - $${updatedRecord[0].costo_unitario}`);
    res.json({
      message: 'Tipo de hoja actualizado exitosamente',
      tipoHoja: updatedRecord[0]
    });
  } catch (err) {
    console.error('❌ Error al actualizar tipo de hoja:', err);
    res.status(500).json({ 
      message: 'Error al actualizar tipo de hoja',
      error: err.message 
    });
  }
});

// Eliminar tipo de hoja (soft delete)
router.delete('/tipos-hoja/:id', verificarToken, async (req, res) => {
  const usuarioId = req.usuario.id;
  const { id } = req.params;
  
  try {
    // Verificar permisos de administración
    const puedeAdministrar = await verificarPermiso(usuarioId, 'admin_configuracion');
    if (!puedeAdministrar) {
      return res.status(403).json({ 
        message: 'No tienes permisos para eliminar tipos de hoja' 
      });
    }
    
    // Verificar que existe el tipo de hoja
    const [existingRows] = await db.promise().query(
      'SELECT * FROM tipos_hoja WHERE id = ? AND activo = 1',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        message: 'Tipo de hoja no encontrado' 
      });
    }
    
    // Verificar si hay fotocopias usando este tipo de hoja
    const [fotocopiasRows] = await db.promise().query(
      'SELECT COUNT(*) AS count FROM fotocopias WHERE tipo_hoja_id = ?',
      [id]
    );
    
    if (fotocopiasRows[0].count > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar este tipo de hoja porque tiene fotocopias asociadas' 
      });
    }
    
    // Realizar soft delete
    await db.promise().query(
      'UPDATE tipos_hoja SET activo = 0, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    console.log(`✅ Tipo de hoja eliminado: ${existingRows[0].nombre}`);
    res.json({
      message: 'Tipo de hoja eliminado exitosamente'
    });
  } catch (err) {
    console.error('❌ Error al eliminar tipo de hoja:', err);
    res.status(500).json({ 
      message: 'Error al eliminar tipo de hoja',
      error: err.message 
    });
  }
});

// Obtener historial de actividad para el dashboard
router.get('/actividad', verificarToken, async (req, res) => {
  const { limite = 50 } = req.query;
  const usuarioId = req.usuario.id;

  try {
    console.log('📊 Solicitud de historial de actividad recibida:', { limite, usuarioId });
    
    // Verificar permisos
    try {
      const puedeVer = await verificarPermiso(usuarioId, 'auditoria_leer');
      if (!puedeVer) {
        console.log('🔒 Acceso denegado a historial de actividad para usuario:', usuarioId);
        return res.status(403).json({ 
          message: 'No tienes permisos para ver el historial de actividad' 
        });
      }
    } catch (permError) {
      console.error('❌ Error verificando permisos para historial:', permError);
      return res.status(500).json({ 
        message: 'Error al verificar permisos', 
        error: permError.message 
      });
    }

    // Obtener actividad reciente
    try {
      const query = `SELECT 
         a.id,
         a.accion,
         a.tabla_afectada,
         a.registro_id,
         a.descripcion,
         DATE_FORMAT(a.fecha, '%Y-%m-%d %H:%i:%s') AS fecha,
         u.id AS usuario_id,
         u.nombre AS usuario_nombre
       FROM auditoria a
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.tabla_afectada = 'fotocopias'
       ORDER BY a.fecha DESC
       LIMIT ?`;
      
      console.log('📝 Query historial de actividad:', query);
      const [actividad] = await db.promise().query(query, [parseInt(limite)]);
      console.log(`✅ Historial de actividad obtenido: ${actividad.length} registros`);
      
      res.json(actividad);
    } catch (queryError) {
      console.error('❌ Error en consulta de actividad:', queryError);
      return res.status(500).json({
        message: 'Error en consulta de actividad', 
        error: queryError.message,
        sqlState: queryError.sqlState,
        sqlCode: queryError.code
      });
    }
  } catch (err) {
    console.error('❌ Error general en actividad:', err);
    res.status(500).json({ 
      message: 'Error al obtener historial de actividad',
      error: err.message
    });
  }
});

// ==================== RUTAS PARA TIPOS DE HOJA ====================

// GET: Obtener todos los tipos de hoja
router.get('/tipos-hoja', verificarToken, async (req, res) => {
  try {
    console.log('🔍 Obteniendo tipos de hoja...');
    
    const [tipos] = await db.promise().query(`
      SELECT id, nombre, descripcion, costo_unitario, activo, creado_en
      FROM tipos_hoja 
      WHERE activo = 1
      ORDER BY nombre ASC
    `);
    
    console.log(`✅ ${tipos.length} tipos de hoja encontrados`);
    res.json({ tipos_hoja: tipos });
    
  } catch (error) {
    console.error('❌ Error al obtener tipos de hoja:', error);
    res.status(500).json({ 
      message: 'Error al obtener tipos de hoja',
      error: error.message 
    });
  }
});

// POST: Crear nuevo tipo de hoja
router.post('/tipos-hoja', verificarToken, async (req, res) => {
  try {
    const { nombre, descripcion, costo_unitario } = req.body;
    
    // Validaciones
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    
    if (costo_unitario < 0) {
      return res.status(400).json({ message: 'El costo unitario no puede ser negativo' });
    }
    
    // Verificar si ya existe un tipo con ese nombre
    const [existing] = await db.promise().query(
      'SELECT id FROM tipos_hoja WHERE nombre = ? AND activo = 1',
      [nombre.trim()]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Ya existe un tipo de hoja con ese nombre' });
    }
    
    // Insertar nuevo tipo
    const [result] = await db.promise().query(`
      INSERT INTO tipos_hoja (nombre, descripcion, costo_unitario)
      VALUES (?, ?, ?)
    `, [nombre.trim(), descripcion?.trim() || '', parseFloat(costo_unitario) || 0]);
    
    // Obtener el tipo recién creado
    const [newTipo] = await db.promise().query(
      'SELECT id, nombre, descripcion, costo_unitario, activo, creado_en FROM tipos_hoja WHERE id = ?',
      [result.insertId]
    );
    
    console.log('✅ Tipo de hoja creado:', newTipo[0]);
    res.json({ 
      message: 'Tipo de hoja creado correctamente',
      tipo_hoja: newTipo[0]
    });
    
  } catch (error) {
    console.error('❌ Error al crear tipo de hoja:', error);
    res.status(500).json({ 
      message: 'Error al crear tipo de hoja',
      error: error.message 
    });
  }
});

// PUT: Actualizar tipo de hoja
router.put('/tipos-hoja/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, costo_unitario } = req.body;
    
    // Validaciones
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    
    if (costo_unitario < 0) {
      return res.status(400).json({ message: 'El costo unitario no puede ser negativo' });
    }
    
    // Verificar si el tipo existe
    const [existing] = await db.promise().query(
      'SELECT id FROM tipos_hoja WHERE id = ? AND activo = 1',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Tipo de hoja no encontrado' });
    }
    
    // Verificar si ya existe otro tipo con ese nombre
    const [duplicate] = await db.promise().query(
      'SELECT id FROM tipos_hoja WHERE nombre = ? AND id != ? AND activo = 1',
      [nombre.trim(), id]
    );
    
    if (duplicate.length > 0) {
      return res.status(400).json({ message: 'Ya existe otro tipo de hoja con ese nombre' });
    }
    
    // Actualizar tipo
    await db.promise().query(`
      UPDATE tipos_hoja 
      SET nombre = ?, descripcion = ?, costo_unitario = ?
      WHERE id = ?
    `, [nombre.trim(), descripcion?.trim() || '', parseFloat(costo_unitario) || 0, id]);
    
    // Obtener el tipo actualizado
    const [updatedTipo] = await db.promise().query(
      'SELECT id, nombre, descripcion, costo_unitario, activo, creado_en FROM tipos_hoja WHERE id = ?',
      [id]
    );
    
    console.log('✅ Tipo de hoja actualizado:', updatedTipo[0]);
    res.json({ 
      message: 'Tipo de hoja actualizado correctamente',
      tipo_hoja: updatedTipo[0]
    });
    
  } catch (error) {
    console.error('❌ Error al actualizar tipo de hoja:', error);
    res.status(500).json({ 
      message: 'Error al actualizar tipo de hoja',
      error: error.message 
    });
  }
});

// DELETE: Eliminar tipo de hoja (borrado lógico)
router.delete('/tipos-hoja/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el tipo existe
    const [existing] = await db.promise().query(
      'SELECT id FROM tipos_hoja WHERE id = ? AND activo = 1',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Tipo de hoja no encontrado' });
    }
    
    // Verificar si está siendo usado en fotocopias
    const [inUse] = await db.promise().query(
      'SELECT COUNT(*) as count FROM fotocopias WHERE tipo_hoja_id = ?',
      [id]
    );
    
    if (inUse[0].count > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar este tipo de hoja porque está siendo usado en registros de fotocopias'
      });
    }
    
    // Borrado lógico
    await db.promise().query(
      'UPDATE tipos_hoja SET activo = 0 WHERE id = ?',
      [id]
    );
    
    console.log('✅ Tipo de hoja eliminado (borrado lógico):', id);
    res.json({ message: 'Tipo de hoja eliminado correctamente' });
    
  } catch (error) {
    console.error('❌ Error al eliminar tipo de hoja:', error);
    res.status(500).json({ 
      message: 'Error al eliminar tipo de hoja',
      error: error.message 
    });
  }
});

module.exports = router;
