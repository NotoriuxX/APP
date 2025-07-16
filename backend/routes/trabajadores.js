const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

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

// Función helper para verificar permisos granulares
const verificarPermiso = async (usuarioId, permisoRequerido) => {
    try {
        // Verificar permisos a través del sistema de roles
        const [permisoRol] = await db.promise().query(`
            SELECT DISTINCT pa.codigo
            FROM usuarios_grupos ug
            JOIN roles_permisos rp ON rp.rol_id = ug.rol_id
            JOIN permisos_atomicos pa ON pa.id = rp.permiso_id
            WHERE ug.usuario_id = ? AND ug.estado = 'activo' AND pa.codigo = ?
        `, [usuarioId, permisoRequerido]);
        
        // Verificar permisos específicos del usuario
        const [permisoEspecial] = await db.promise().query(`
            SELECT DISTINCT pa.codigo
            FROM usuarios_permisos_especiales upe
            JOIN permisos_atomicos pa ON pa.id = upe.permiso_id
            WHERE upe.usuario_id = ? AND upe.estado = 'activo' AND pa.codigo = ?
        `, [usuarioId, permisoRequerido]);
        
        return permisoRol.length > 0 || permisoEspecial.length > 0;
    } catch (error) {
        console.error('Error al verificar permiso:', error);
        return false;
    }
};

// Endpoint para obtener permisos granulares del usuario
router.get('/permissions', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        // Verificar si es propietario (tiene todos los permisos automáticamente)
        const esPropietario = req.usuario.rol_global === 'propietario';
        
        let permisosMap = {};
        
        if (esPropietario) {
            // Si es propietario, tiene todos los permisos
            permisosMap = {
                'trabajadores.ver': true,
                'trabajadores.crear': true,
                'trabajadores.editar': true,
                'trabajadores.eliminar': true
            };
        } else {
            // Verificar permisos específicos a través del sistema de roles
            const [permisos] = await db.promise().query(`
                SELECT DISTINCT pa.codigo
                FROM usuarios_grupos ug
                JOIN roles_permisos rp ON rp.rol_id = ug.rol_id
                JOIN permisos_atomicos pa ON pa.id = rp.permiso_id
                WHERE ug.usuario_id = ?
                AND pa.codigo IN ('trabajadores.ver', 'trabajadores.crear', 'trabajadores.editar', 'trabajadores.eliminar')
            `, [usuarioId]);
            
            permisos.forEach(p => {
                permisosMap[p.codigo] = true;
            });
        }
        
        // Construir respuesta con permisos granulares
        const response = {
            hasAccess: permisosMap['trabajadores.ver'] || esPropietario,
            isOwner: esPropietario,
            canView: permisosMap['trabajadores.ver'] || esPropietario,
            canCreate: permisosMap['trabajadores.crear'] || esPropietario,
            canEdit: permisosMap['trabajadores.editar'] || esPropietario,
            canDelete: permisosMap['trabajadores.eliminar'] || esPropietario
        };
        
        console.log('🔐 Permisos del usuario en trabajadores:', response);
        console.log('👤 Usuario ID:', usuarioId, 'Es propietario:', esPropietario);
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error al obtener permisos:', error);
        res.status(500).json({ 
            hasAccess: false,
            isOwner: false,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false
        });
    }
});

// Obtener trabajadores (con verificación de permisos)
router.get('/', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        // Verificar permisos de visualización (propietario tiene acceso automático)
        const esPropietario = req.usuario.rol_global === 'propietario';
        const puedeVer = esPropietario || await verificarPermiso(usuarioId, 'trabajadores.ver');
        
        if (!puedeVer) {
            return res.status(403).json({ 
                message: 'No tienes permisos para ver trabajadores' 
            });
        }

        const { grupo_id } = req.query;
        
        if (!grupo_id) {
            return res.status(400).json({ error: 'grupo_id es requerido' });
        }

        console.log('📋 Obteniendo trabajadores para grupo:', grupo_id);

        const query = `
            SELECT 
                t.id,
                u.nombre as nombres,
                u.apellido as apellidos,
                u.rut,
                u.email,
                t.cargo,
                t.activo,
                t.grupo_id,
                t.usuario_id,
                COALESCE(d.nombre, 'Sin departamento') as departamento_nombre,
                COALESCE(r.nombre, 'Sin cuenta') as rol_nombre,
                COALESCE(r.descripcion, 'Sin cuenta') as rol_descripcion,
                CASE 
                    WHEN u.password IS NOT NULL AND u.password != '' THEN 'con_acceso'
                    ELSE 'sin_acceso'
                END as estado_acceso,
                CASE 
                    WHEN u.password IS NOT NULL AND u.password != '' THEN true
                    ELSE false
                END as tiene_usuario,
                CASE 
                    WHEN u.password IS NOT NULL AND u.password != '' THEN true
                    ELSE false
                END as tiene_acceso,
                NULL as ultimo_acceso,
                NULL as primer_acceso,
                CASE 
                    WHEN r.nombre = 'propietario' THEN true
                    ELSE false
                END as es_propietario,
                CASE 
                    WHEN r.nombre = 'propietario' THEN true
                    ELSE false
                END as solo_lectura
            FROM trabajadores t
            INNER JOIN usuarios u ON t.usuario_id = u.id
            LEFT JOIN departamentos d ON t.departamento_id = d.id
            LEFT JOIN usuarios_grupos ug ON u.id = ug.usuario_id AND ug.grupo_id = t.grupo_id
            LEFT JOIN roles r ON ug.rol_id = r.id
            WHERE t.grupo_id = ?
            ORDER BY u.nombre, u.apellido
        `;

        const [trabajadores] = await db.promise().query(query, [grupo_id]);
        
        console.log(`✅ ${trabajadores.length} trabajadores encontrados`);
        res.json(trabajadores);

    } catch (error) {
        console.error('Error al obtener trabajadores:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear trabajador (con verificación de permisos)
router.post('/', verificarToken, async (req, res) => {
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();
        
        const usuarioId = req.usuario.id;
        const esPropietario = req.usuario.rol_global === 'propietario';
        const puedeCrear = esPropietario || await verificarPermiso(usuarioId, 'trabajadores.crear');
        
        if (!puedeCrear) {
            return res.status(403).json({ 
                message: 'No tienes permisos para crear trabajadores' 
            });
        }

        const { nombres, apellidos, cargo, email, rut, departamento, fecha_contratacion, activo, grupo_id } = req.body;

        // Validaciones básicas
        if (!nombres || !apellidos || !grupo_id) {
            return res.status(400).json({ 
                error: 'Nombres, apellidos y grupo_id son requeridos',
                fields: {
                    nombres: !nombres,
                    apellidos: !apellidos,
                    grupo_id: !grupo_id
                }
            });
        }

        console.log('🆕 Creando nuevo trabajador con datos:', {
            nombres, apellidos, email, rut, cargo, departamento, grupo_id
        });

        // 1. Crear usuario
        const [userResult] = await connection.query(
            'INSERT INTO usuarios (nombre, apellido, email, rut, rol_global) VALUES (?, ?, ?, ?, ?)',
            [nombres, apellidos, email || null, rut || null, 'trabajador']
        );

        const usuario_id = userResult.insertId;
        console.log('✅ Usuario creado con ID:', usuario_id);

        // 2. Procesar departamento
        let departamento_id = null;
        if (departamento && departamento.trim()) {
            const [deptResult] = await connection.query(
                'SELECT id FROM departamentos WHERE nombre = ? AND grupo_id = ?',
                [departamento.trim(), grupo_id]
            );
            
            if (deptResult.length > 0) {
                departamento_id = deptResult[0].id;
                console.log('✅ Departamento existente encontrado:', departamento_id);
            } else {
                const [newDeptResult] = await connection.query(
                    'INSERT INTO departamentos (nombre, grupo_id) VALUES (?, ?)',
                    [departamento.trim(), grupo_id]
                );
                departamento_id = newDeptResult.insertId;
                console.log('✅ Nuevo departamento creado:', departamento_id);
            }
        }

        // 3. Crear trabajador
        const [workerResult] = await connection.query(
            'INSERT INTO trabajadores (usuario_id, cargo, departamento_id, activo, grupo_id) VALUES (?, ?, ?, ?, ?)',
            [usuario_id, cargo || null, departamento_id, activo !== false, grupo_id]
        );

        console.log('✅ Trabajador creado con ID:', workerResult.insertId);

        // 4. Asignar al grupo con rol trabajador
        const [roleResult] = await connection.query(
            'SELECT id FROM roles WHERE nombre = ? AND es_activo = 1',
            ['trabajador']
        );

        if (roleResult.length === 0) {
            throw new Error('No se encontró el rol de trabajador');
        }

        await connection.query(
            'INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol_id, estado) VALUES (?, ?, ?, ?)',
            [usuario_id, grupo_id, roleResult[0].id, 'activo']
        );

        console.log('✅ Usuario asignado al grupo con rol trabajador');

        await connection.commit();
        
        res.json({ 
            message: 'Trabajador creado exitosamente',
            id: workerResult.insertId,
            usuario_id: usuario_id
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error al crear trabajador:', error);
        
        let errorMessage = 'Error interno del servidor';
        let statusCode = 500;
        
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('usuarios.ux_usuarios_email')) {
                statusCode = 400;
                errorMessage = 'El email ya está registrado';
            } else if (error.message.includes('usuarios.ux_usuarios_rut')) {
                statusCode = 400;
                errorMessage = 'El RUT ya está registrado';
            }
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// Actualizar trabajador (con verificación de permisos)
router.put('/:id', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        // Verificar permisos de edición (propietario tiene acceso automático)
        const esPropietario = req.usuario.rol_global === 'propietario';
        const puedeEditar = esPropietario || await verificarPermiso(usuarioId, 'trabajadores.editar');
        if (!puedeEditar) {
            return res.status(403).json({ 
                message: 'No tienes permisos para editar trabajadores' 
            });
        }

        const { id } = req.params;
        const { nombres, apellidos, cargo, email, ropera, departamento, fecha_contratacion, activo, grupo_id } = req.body;

        // Validar que el trabajador existe
        const [existingWorker] = await db.promise().query(
            'SELECT * FROM trabajadores WHERE id = ?', [id]
        );

        if (existingWorker.length === 0) {
            return res.status(404).json({ message: 'Trabajador no encontrado' });
        }

        // Obtener o crear departamento
        let departamento_id = null;
        if (departamento && departamento.trim()) {
            const [deptResult] = await db.promise().query(
                'SELECT id FROM departamentos WHERE nombre = ? AND grupo_id = ?',
                [departamento.trim(), grupo_id]
            );
            
            if (deptResult.length > 0) {
                departamento_id = deptResult[0].id;
            } else {
                const [newDeptResult] = await db.promise().query(
                    'INSERT INTO departamentos (nombre, grupo_id) VALUES (?, ?)',
                    [departamento.trim(), grupo_id]
                );
                departamento_id = newDeptResult.insertId;
            }
        }

        // Primero actualizar datos del usuario
        await db.promise().query(
            'UPDATE usuarios SET nombre = ?, apellido = ?, rut = ?, email = ? WHERE id = (SELECT usuario_id FROM trabajadores WHERE id = ?)',
            [nombres, apellidos, ropera || null, email || null, id]
        );

        // Luego actualizar datos del trabajador
        const [result] = await db.promise().query(
            'UPDATE trabajadores SET cargo = ?, activo = ?, departamento_id = ? WHERE id = ?',
            [cargo || null, activo !== false, departamento_id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Trabajador no encontrado' });
        }

        console.log(`✅ Trabajador ${id} actualizado exitosamente`);
        res.json({ message: 'Trabajador actualizado exitosamente' });

    } catch (error) {
        console.error('Error al actualizar trabajador:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar trabajadores (con verificación de permisos)
router.delete('/:id?', verificarToken, async (req, res) => {
    const { id } = req.params; 
    const { ids } = req.body; 
    const usuarioId = req.usuario.id;

    try {
        // Verificar permisos de eliminación (propietario tiene acceso automático)
        const esPropietario = req.usuario.rol_global === 'propietario';
        const puedeEliminar = esPropietario || await verificarPermiso(usuarioId, 'trabajadores.eliminar');
        if (!puedeEliminar) {
            return res.status(403).json({ 
                message: 'No tienes permisos para eliminar trabajadores' 
            });
        }

        let workerIds;

        if (id) {
            workerIds = [id];
        } else if (Array.isArray(ids) && ids.length > 0) {
            workerIds = ids;
        } else {
            return res.status(400).json({ error: 'Debes proporcionar un ID o un array de IDs' });
        }

        // Obtener los usuario_ids de los trabajadores a eliminar
        const placeholders = workerIds.map(() => '?').join(',');
        const getUserIdsQuery = `SELECT usuario_id FROM trabajadores WHERE id IN (${placeholders})`;
        
        db.query(getUserIdsQuery, workerIds, (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener los datos de los trabajadores' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'Trabajadores no encontrados' });
            }

            const usuarioIds = results.map(row => row.usuario_id);

            // Eliminar trabajadores (esto también eliminará los usuarios debido a CASCADE)
            const deleteWorkersQuery = `DELETE FROM trabajadores WHERE id IN (${placeholders})`;
            
            db.query(deleteWorkersQuery, workerIds, (err, workerResult) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al eliminar trabajadores' });
                }

                if (workerResult.affectedRows === 0) {
                    return res.status(404).json({ message: 'Trabajadores no encontrados' });
                }

                console.log('Trabajadores eliminados:', workerIds);
                console.log('Usuarios relacionados:', usuarioIds);
                res.json({ message: `Eliminados ${workerResult.affectedRows} trabajadores.` });
            });
        });
    } catch (error) {
        console.error('Error en eliminación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener departamentos
router.get('/departamentos', verificarToken, async (req, res) => {
    try {
        const { grupo_id } = req.query;
        
        let query = 'SELECT DISTINCT nombre FROM departamentos WHERE 1=1';
        let params = [];
        
        if (grupo_id) {
            query += ' AND (grupo_id = ? OR grupo_id IS NULL)';
            params.push(grupo_id);
        }
        
        query += ' ORDER BY nombre';
        
        const [departamentos] = await db.promise().query(query, params);
        res.json(departamentos.map(d => d.nombre));
        
    } catch (error) {
        console.error('Error al obtener departamentos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener ocupaciones
router.get('/ocupaciones', verificarToken, async (req, res) => {
    try {
        const { grupo_id } = req.query;
        
        // Ocupaciones predeterminadas
        const ocupacionesPredeterminadas = [
            'Administrador/a',
            'Analista',
            'Asistente',
            'Auxiliar',
            'Coordinador/a',
            'Director/a',
            'Encargado/a',
            'Especialista',
            'Gerente',
            'Jefe/a',
            'Operador/a',
            'Supervisor/a',
            'Técnico/a'
        ];
        
        let ocupacionesPersonalizadas = [];
        
        if (grupo_id) {
            const [result] = await db.promise().query(
                'SELECT DISTINCT cargo FROM trabajadores WHERE grupo_id = ? AND cargo IS NOT NULL AND cargo != ""',
                [grupo_id]
            );
            ocupacionesPersonalizadas = result.map(r => r.cargo);
        }
        
        // Combinar y eliminar duplicados
        const todasLasOcupaciones = [...new Set([...ocupacionesPredeterminadas, ...ocupacionesPersonalizadas])];
        
        res.json(todasLasOcupaciones.sort());
        
    } catch (error) {
        console.error('Error al obtener ocupaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear ocupación personalizada
router.post('/ocupaciones', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        // Verificar permisos de creación (propietario tiene acceso automático)
        const esPropietario = req.usuario.rol_global === 'propietario';
        const puedeCrear = esPropietario || await verificarPermiso(usuarioId, 'trabajadores.crear');
        if (!puedeCrear) {
            return res.status(403).json({ 
                message: 'No tienes permisos para crear ocupaciones' 
            });
        }

        const { nombre, grupo_id } = req.body;

        // Validaciones básicas
        if (!nombre || !grupo_id) {
            return res.status(400).json({ error: 'Nombre y grupo_id son requeridos' });
        }

        console.log('🆕 Creando nueva ocupación personalizada...');

        // Verificar si ya existe una ocupación con ese nombre en el grupo
        const [existingOcupacion] = await db.promise().query(
            'SELECT id FROM ocupaciones_personalizadas WHERE nombre = ? AND grupo_id = ?',
            [nombre, grupo_id]
        );

        if (existingOcupacion.length > 0) {
            return res.status(400).json({ error: 'Ya existe una ocupación con ese nombre en el grupo' });
        }

        // Crear ocupación personalizada
        const [result] = await db.promise().query(
            'INSERT INTO ocupaciones_personalizadas (nombre, grupo_id) VALUES (?, ?)',
            [nombre, grupo_id]
        );

        console.log(`✅ Ocupación personalizada creada con ID: ${result.insertId}`);
        res.json({ 
            message: 'Ocupación personalizada creada exitosamente',
            id: result.insertId
        });

    } catch (error) {
        console.error('Error al crear ocupación personalizada:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar ocupación personalizada
router.put('/ocupaciones/:id', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        // Verificar permisos de edición (propietario tiene acceso automático)
        const esPropietario = req.usuario.rol_global === 'propietario';
        const puedeEditar = esPropietario || await verificarPermiso(usuarioId, 'trabajadores.editar');
        if (!puedeEditar) {
            return res.status(403).json({ 
                message: 'No tienes permisos para editar ocupaciones' 
            });
        }

        const { id } = req.params;
        const { nombre, grupo_id } = req.body;

        // Validar que la ocupación existe
        const [existingOcupacion] = await db.promise().query(
            'SELECT * FROM ocupaciones_personalizadas WHERE id = ?', [id]
        );

        if (existingOcupacion.length === 0) {
            return res.status(404).json({ message: 'Ocupación no encontrada' });
        }

        // Verificar si el nombre ya está en uso por otra ocupación en el mismo grupo
        const [nombreEnUso] = await db.promise().query(
            'SELECT id FROM ocupaciones_personalizadas WHERE nombre = ? AND grupo_id = ? AND id != ?',
            [nombre, grupo_id, id]
        );

        if (nombreEnUso.length > 0) {
            return res.status(400).json({ error: 'El nombre ya está en uso por otra ocupación en el grupo' });
        }

        // Actualizar ocupación personalizada
        await db.promise().query(
            'UPDATE ocupaciones_personalizadas SET nombre = ?, grupo_id = ? WHERE id = ?',
            [nombre, grupo_id, id]
        );

        console.log(`✅ Ocupación personalizada ${id} actualizada exitosamente`);
        res.json({ message: 'Ocupación personalizada actualizada exitosamente' });

    } catch (error) {
        console.error('Error al actualizar ocupación personalizada:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar ocupación personalizada
router.delete('/ocupaciones/:nombre', async (req, res) => {
    try {
        const { nombre } = req.params;
        const { grupo_id } = req.query;
        
        if (!grupo_id) {
            return res.status(400).json({ error: 'grupo_id es requerido' });
        }

        // Decodificar el nombre de la ocupación (por si tiene caracteres especiales)
        const nombreDecodificado = decodeURIComponent(nombre);

        // Verificar si la ocupación es protegida
        const ocupacionesProtegidas = ['Propietario de Grupo', 'propietario de grupo', 'propietario'];
        if (ocupacionesProtegidas.some(ocupacion => 
            ocupacion.toLowerCase() === nombreDecodificado.toLowerCase()
        )) {
            return res.status(400).json({ error: 'No se pueden eliminar ocupaciones protegidas' });
        }

        console.log(`🗑️ Eliminando ocupación personalizada "${nombreDecodificado}" del grupo ${grupo_id}`);

        // Verificar si la ocupación está siendo usada por algún trabajador
        const [trabajadoresUsando] = await db.promise().query(
            'SELECT COUNT(*) as count FROM trabajadores WHERE grupo_id = ? AND cargo = ?',
            [grupo_id, nombreDecodificado]
        );

        if (trabajadoresUsando[0].count > 0) {
            return res.status(400).json({ 
                error: `No se puede eliminar la ocupación "${nombreDecodificado}" porque está siendo usada por ${trabajadoresUsando[0].count} trabajador(es)` 
            });
        }

        // Eliminar de la tabla de ocupaciones personalizadas
        const [result] = await db.promise().query(
            'DELETE FROM ocupaciones_personalizadas WHERE nombre = ? AND grupo_id = ?',
            [nombreDecodificado, grupo_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Ocupación no encontrada o no se puede eliminar' });
        }

        console.log(`✅ Ocupación "${nombreDecodificado}" eliminada exitosamente`);

        res.json({
            message: 'Ocupación eliminada exitosamente',
            ocupacion: nombreDecodificado
        });

    } catch (error) {
        console.error('Error al eliminar ocupación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==============================
// HISTORIAL DE INICIOS DE SESIÓN
// ==============================

// Registrar inicio de sesión
router.post('/historial-sesion/inicio', async (req, res) => {
    try {
        const { usuario_id, ip_address, user_agent, estado = 'exitoso', motivo_fallo } = req.body;
        
        if (!usuario_id) {
            return res.status(400).json({ error: 'usuario_id es requerido' });
        }
        
        // Registrar el inicio de sesión
        const [result] = await db.promise().query(
            'INSERT INTO historial_inicios_sesion (usuario_id, ip_address, user_agent, estado, motivo_fallo) VALUES (?, ?, ?, ?, ?)',
            [usuario_id, ip_address, user_agent, estado, motivo_fallo]
        );
        
        // Si es exitoso, actualizar ultimo_acceso del usuario
        if (estado === 'exitoso') {
            const ahora = new Date();
            
            // Verificar si es el primer acceso
            const [userCheck] = await db.promise().query(
                'SELECT primer_acceso FROM usuarios WHERE id = ?',
                [usuario_id]
            );
            
            if (userCheck.length > 0 && !userCheck[0].primer_acceso) {
                // Es el primer acceso, actualizar primer_acceso también
                await db.promise().query(
                    'UPDATE usuarios SET ultimo_acceso = ?, primer_acceso = ? WHERE id = ?',
                    [ahora, ahora, usuario_id]
                );
            } else {
                // No es el primer acceso, solo actualizar ultimo_acceso
                await db.promise().query(
                    'UPDATE usuarios SET ultimo_acceso = ? WHERE id = ?',
                    [ahora, usuario_id]
                );
            }
        }
        
        console.log(`Inicio de sesión registrado para usuario ${usuario_id}: ${estado}`);
        res.json({ 
            message: 'Inicio de sesión registrado exitosamente',
            sesion_id: result.insertId,
            es_primer_acceso: userCheck.length > 0 && !userCheck[0].primer_acceso
        });
        
    } catch (error) {
        console.error('Error al registrar inicio de sesión:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Registrar cierre de sesión
router.post('/historial-sesion/cierre', async (req, res) => {
    try {
        const { sesion_id, duracion_minutos } = req.body;
        
        if (!sesion_id) {
            return res.status(400).json({ error: 'sesion_id es requerido' });
        }
        
        const ahora = new Date();
        await db.promise().query(
            'UPDATE historial_inicios_sesion SET fecha_cierre = ?, duracion_sesion = ? WHERE id = ?',
            [ahora, duracion_minutos, sesion_id]
        );
        
        console.log(`Cierre de sesión registrado para sesión ${sesion_id}`);
        res.json({ message: 'Cierre de sesión registrado exitosamente' });
        
    } catch (error) {
        console.error('Error al registrar cierre de sesión:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener historial de inicios de sesión de un usuario
router.get('/historial-sesion/:usuario_id', async (req, res) => {
    try {
        const { usuario_id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const [historial] = await db.promise().query(
            `SELECT 
                h.id,
                h.fecha_inicio,
                h.ip_address,
                h.user_agent,
                h.estado,
                h.motivo_fallo,
                h.duracion_sesion,
                h.fecha_cierre,
                u.nombre,
                u.apellido,
                u.email
            FROM historial_inicios_sesion h
            JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.usuario_id = ?
            ORDER BY h.fecha_inicio DESC
            LIMIT ? OFFSET ?`,
            [usuario_id, parseInt(limit), parseInt(offset)]
        );
        
        // Obtener estadísticas adicionales
        const [stats] = await db.promise().query(
            `SELECT 
                COUNT(*) as total_inicios,
                COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as inicios_exitosos,
                COUNT(CASE WHEN estado = 'fallido' THEN 1 END) as inicios_fallidos,
                AVG(duracion_sesion) as duracion_promedio_minutos,
                MAX(fecha_inicio) as ultimo_acceso,
                MIN(fecha_inicio) as primer_registro
            FROM historial_inicios_sesion 
            WHERE usuario_id = ?`,
            [usuario_id]
        );
        
        res.json({
            historial,
            estadisticas: stats[0] || {},
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: stats[0]?.total_inicios || 0
            }
        });
        
    } catch (error) {
        console.error('Error al obtener historial de sesión:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para crear cuenta de usuario para un trabajador
router.post('/:id/crear-cuenta', verificarToken, async (req, res) => {
    try {
        const trabajadorId = req.params.id;
        
        // Debug: Ver qué se está recibiendo
        console.log('🔍 Body completo recibido:', req.body);
        console.log('🔍 Trabajador ID:', trabajadorId);
        
        const { password, rol_grupo = 'trabajador' } = req.body;
        let permisos_especiales = req.body.permisos_especiales || [];
        
        if (!password || !rol_grupo || rol_grupo.trim() === '') {
            return res.status(400).json({ 
                error: 'Contraseña y rol son requeridos' 
            });
        }

        // Verificar que el trabajador existe y obtener sus datos
        const [trabajadorRows] = await db.promise().query(`
            SELECT t.*, t.grupo_id, u.nombre, u.apellido, u.email 
            FROM trabajadores t
            JOIN usuarios u ON u.id = t.usuario_id
            WHERE t.id = ? AND t.grupo_id IN (
                SELECT grupo_id FROM usuarios_grupos WHERE usuario_id = ?
            )
        `, [trabajadorId, req.usuario.id]);
        
        if (trabajadorRows.length === 0) {
            return res.status(404).json({ 
                error: 'Trabajador no encontrado o sin permisos' 
            });
        }
        
        const trabajador = trabajadorRows[0];
        const grupo_id = trabajador.grupo_id;

        // Verificar si la cuenta ya está activada
        const [usuarioActual] = await db.promise().query(
            'SELECT password FROM usuarios WHERE id = ?', 
            [trabajador.usuario_id]
        );
        
        if (usuarioActual.length === 0 || (usuarioActual[0].password && usuarioActual[0].password.length > 0)) {
            return res.status(400).json({ 
                error: 'Esta cuenta ya está activada o no existe' 
            });
        }

        // Buscar el rol y sus permisos predeterminados
        const [rolRows] = await db.promise().query(
            'SELECT id FROM roles WHERE nombre = ? AND es_activo = 1',
            [rol_grupo]
        );
        
        if (rolRows.length === 0) {
            return res.status(400).json({ 
                error: 'Rol no encontrado o inactivo' 
            });
        }

        const rolId = rolRows[0].id;
        console.log(`✅ Rol encontrado: ${rol_grupo} (ID: ${rolId})`);

        // Validar permisos según el rol
        if (rol_grupo === 'encargado_impresiones') {
            const permisosInvalidos = permisos_especiales.filter(permiso => 
                permiso.startsWith('inventario_') || 
                (permiso.startsWith('trabajador_') && permiso !== 'trabajador_leer')
            );
            
            if (permisosInvalidos.length > 0) {
                return res.status(400).json({
                    error: 'Permisos inválidos para el rol encargado_impresiones',
                    permisos_invalidos: permisosInvalidos,
                    mensaje: 'Este rol solo debe tener permisos de fotocopias y opcionalmente trabajador_leer'
                });
            }
        }

        // Obtener permisos predeterminados del rol
        const [permisosDefault] = await db.promise().query(`
            SELECT pa.id, pa.codigo
            FROM roles_permisos rp
            JOIN permisos_atomicos pa ON rp.permiso_id = pa.id
            WHERE rp.rol_id = ? AND pa.activo = 1
        `, [rolId]);

        // Combinar permisos predeterminados con permisos especiales
        const todosLosPermisos = new Set([
            ...permisosDefault.map(p => p.codigo),
            ...permisos_especiales
        ]);

        // Obtener IDs de todos los permisos
        const [permisosInfo] = await db.promise().query(
            'SELECT id, codigo FROM permisos_atomicos WHERE codigo IN (?) AND activo = 1',
            [Array.from(todosLosPermisos)]
        );

        // Activar la cuenta
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.promise().query(
            'UPDATE usuarios SET password = ? WHERE id = ?',
            [hashedPassword, trabajador.usuario_id]
        );

        // Actualizar rol
        await db.promise().query(`
            UPDATE usuarios_grupos 
            SET rol_id = ? 
            WHERE usuario_id = ? AND grupo_id = ? AND estado = 'activo'
        `, [rolId, trabajador.usuario_id, grupo_id]);

        // Asignar permisos
        for (const permiso of permisosInfo) {
            try {
                // Verificar si el permiso ya está asignado
                const [existente] = await db.promise().query(
                    'SELECT id FROM usuarios_permisos_especiales WHERE usuario_id = ? AND grupo_id = ? AND permiso_id = ? AND estado = ?',
                    [trabajador.usuario_id, grupo_id, permiso.id, 'activo']
                );

                if (existente.length === 0) {
                    await db.promise().query(
                        'INSERT INTO usuarios_permisos_especiales (usuario_id, grupo_id, permiso_id, concedido_por, motivo, estado) VALUES (?, ?, ?, ?, ?, ?)',
                        [trabajador.usuario_id, grupo_id, permiso.id, req.usuario.id, 'Permiso asignado al crear cuenta', 'activo']
                    );
                    console.log(`✅ Permiso asignado: ${permiso.codigo}`);
                }
            } catch (error) {
                console.error(`❌ Error al asignar permiso ${permiso.codigo}:`, error);
            }
        }

        console.log(`✅ Cuenta activada para: ${trabajador.email}`);
        res.json({ 
            message: 'Cuenta activada exitosamente',
            email: trabajador.email,
            trabajador_nombre: `${trabajador.nombre} ${trabajador.apellido}`
        });
        
    } catch (error) {
        console.error('❌ Error al activar cuenta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para cambiar estado del trabajador (activo/inactivo)
router.patch('/:id/estado', verificarToken, async (req, res) => {
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
        `, [trabajadorId, req.usuario.id]);
        
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
router.post('/:id/desactivar-cuenta', verificarToken, async (req, res) => {
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
        `, [trabajadorId, req.usuario.id]);
        
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

// Endpoint para verificar permisos de trabajadores
router.get('/permissions', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        console.log('🔍 Verificando permisos de trabajadores para usuario:', usuarioId);
        
        // Verificar si es propietario
        const [propietarioCheck] = await db.promise().query(`
            SELECT es_propietario FROM trabajadores WHERE usuario_id = ?
        `, [usuarioId]);
        
        const esPropietario = propietarioCheck.length > 0 && propietarioCheck[0].es_propietario;
        
        if (esPropietario) {
            console.log('✅ Usuario es propietario - acceso completo');
            return res.json({
                hasAccess: true,
                permissions: ['trabajador_leer', 'trabajador_escribir', 'trabajador_editar', 'trabajador_eliminar'],
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
            AND (
                pa.codigo LIKE 'trabajador_%'
                OR pa.codigo = 'admin_usuarios'
            )
            AND (upe.id IS NOT NULL OR rp.rol_id IS NOT NULL)
        `, [usuarioId, usuarioId]);

        console.log('🔍 Permisos de trabajadores encontrados:', permisos);
        
        // Construir respuesta
        const response = {
            hasAccess: esPropietario || permisos.some(p => 
                p.codigo.startsWith('trabajador_') || p.codigo === 'admin_usuarios'
            ),
            permissions: permisos.map(p => p.codigo),
            isOwner: esPropietario
        };

        console.log('📊 Respuesta de permisos de trabajadores:', response);
        res.json(response);

    } catch (error) {
        console.error('❌ Error al verificar permisos de trabajadores:', error);
        res.status(500).json({ 
            hasAccess: false,
            permissions: [],
            error: 'Error interno del servidor' 
        });
    }
});

module.exports = router;