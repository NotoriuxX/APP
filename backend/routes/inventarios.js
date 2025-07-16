const express = require('express');
const router = express.Router();
const db = require('../db'); // Conexión a la base de datos

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

// Obtener todos los inventarios
router.get('/', (req, res) => {
    const query = `
        SELECT 
            i.id AS item_id,
            t.nombre AS categoria_nombre,
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
        LEFT JOIN tipos_items t ON i.tipo_id = t.id
        LEFT JOIN valores_campos vc ON i.id = vc.item_id
        LEFT JOIN campos c ON vc.campo_id = c.id
        LEFT JOIN secciones s ON i.seccion_id = s.id
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

// Agregar un nuevo inventario
router.post('/', (req, res) => {
    const { tipo_id, estado_id, CCI, seccion_id, trabajador_id, nombre, posicion, valores_campos } = req.body;

    const insertItem = `
        INSERT INTO items (tipo_id, fecha_ingreso, estado_id, CCI, seccion_id, trabajador_id, nombre, posicion)
        VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertItem, [tipo_id, estado_id, CCI, seccion_id, trabajador_id, nombre, posicion], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const itemId = results.insertId;

            // Insertar los campos dinámicos asociados
            if (valores_campos && valores_campos.length > 0) {
                const insertValores = `
                    INSERT INTO valores_campos (item_id, campo_id, valor)
                    VALUES ?
                `;
                const valores = valores_campos.map((campo) => [itemId, campo.campo_id, campo.valor]);

                db.query(insertValores, [valores], (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                    } else {
                        res.status(201).json({ message: 'Item agregado con éxito', item_id: itemId });
                    }
                });
            } else {
                res.status(201).json({ message: 'Item agregado con éxito', item_id: itemId });
            }
        }
    });
});
// Obtener valores únicos para un campo específico de la tabla valores_campos
router.get('/valores-campo', (req, res) => {
    const { campo_id } = req.query;
    
    if (!campo_id) {
      return res.status(400).json({ error: 'El parámetro campo_id es obligatorio' });
    }
  
    // La consulta agrupa por el valor y toma el mínimo de la posición para ordenar
    const query = `
      SELECT valor, MIN(posicion) AS pos
      FROM valores_campos
      WHERE campo_id = ?
      GROUP BY valor
      ORDER BY pos ASC;
    `;
  
    db.query(query, [campo_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
  
      // Se extraen solo los valores únicos en orden según la posición
      const valoresUnicos = results.map(row => row.valor);
      res.json(valoresUnicos);
    });
  });
  
// Obtener valores únicos de una columna
router.get('/valores-unicos', async (req, res) => {
    const { columna } = req.query;

    if (!columna) {
        return res.status(400).json({ error: 'La columna es obligatoria' });
    }

    try {
        const query = `SELECT DISTINCT ?? AS valor FROM items`;
        db.query(query, [columna], (err, resultados) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                const valoresUnicos = resultados.map((row) => row.valor);
                res.json(valoresUnicos);
            }
        });
    } catch (error) {
        console.error('Error al obtener valores únicos:', error);
        res.status(500).json({ error: 'Error al obtener valores únicos' });
    }
});

// Actualizar la sección de un item
router.put('/:id/actualizar-seccion', (req, res) => {
    const { id } = req.params; // ID del item
    const { seccion_id } = req.body; // ID de la nueva sección
  
    if (!seccion_id) {
      return res.status(400).json({ error: 'El ID de la sección es obligatorio' });
    }
  
    const query = `
      UPDATE items
      SET seccion_id = ?
      WHERE id = ?
    `;
  
    db.query(query, [seccion_id, id], (err, result) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (result.affectedRows === 0) {
        res.status(404).json({ message: 'Item no encontrado' });
      } else {
        res.json({ message: 'Sección actualizada con éxito' });
      }
    });
});

// Endpoint para verificar permisos de inventario
router.get('/permissions', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        console.log('🔍 Verificando permisos de inventario para usuario:', usuarioId);
        
        // Verificar si es propietario
        const [propietarioCheck] = await db.promise().query(`
            SELECT es_propietario FROM trabajadores WHERE usuario_id = ?
        `, [usuarioId]);
        
        const esPropietario = propietarioCheck.length > 0 && propietarioCheck[0].es_propietario;
        
        if (esPropietario) {
            console.log('✅ Usuario es propietario - acceso completo a inventario');
            return res.json({
                hasAccess: true,
                permissions: ['inventario_leer', 'inventario_escribir', 'inventario_editar', 'inventario_eliminar'],
                isOwner: true
            });
        }

        // Obtener permisos específicos del usuario
        const [permisos] = await db.promise().query(`
            SELECT DISTINCT pa.codigo
            FROM permisos_atomicos pa
            LEFT JOIN usuarios_permisos_especiales upe ON pa.id = upe.permiso_id AND upe.usuario_id = ? AND upe.estado = 'activo'
            LEFT JOIN usuarios_grupos ug ON ug.usuario_id = ? AND ug.estado = 'activo'
            LEFT JOIN roles_permisos rp ON rp.rol_id = ug.rol_id AND rp.permiso_id = pa.id
            WHERE pa.activo = 1
            AND pa.codigo LIKE 'inventario_%'
            AND (upe.id IS NOT NULL OR rp.rol_id IS NOT NULL)
        `, [usuarioId, usuarioId]);

        console.log('🔍 Permisos de inventario encontrados:', permisos);
        
        // Construir respuesta
        const response = {
            hasAccess: esPropietario || permisos.some(p => p.codigo.startsWith('inventario_')),
            permissions: permisos.map(p => p.codigo),
            isOwner: esPropietario
        };

        console.log('📊 Respuesta de permisos de inventario:', response);
        res.json(response);

    } catch (error) {
        console.error('❌ Error al verificar permisos de inventario:', error);
        res.status(500).json({ 
            hasAccess: false,
            permissions: [],
            error: 'Error interno del servidor' 
        });
    }
});

module.exports = router;