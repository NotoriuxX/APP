const express = require('express');
const router = express.Router();
const db = require('../db'); // Conexión a la base de datos

// Conversión de valores de activo a 1 o 0
function convertActivo(activo) {
    if (typeof activo === 'string') {
        activo = activo.trim().toLowerCase();
        if (['sí', 'si', 'yes', 'y'].includes(activo)) {
            return 1;
        } else if (['no', 'n'].includes(activo)) {
            return 0;
        }
    }
    return activo;
}

// Validación de los datos del trabajador
function validateWorkerData({ nombres, apellidos, email }) {
    if (!nombres || !apellidos) {
        throw new Error('El nombre y apellido son obligatorios.');
    }
    // Email es opcional, pero si se proporciona debe ser válido
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('El formato del correo electrónico no es válido.');
    }
}

// Obtener todos los departamentos
async function getAllDepartments() {
    const query = 'SELECT * FROM departamentos';
    const [departments] = await db.promise().query(query);
    return departments;
}

// Convertir el nombre del departamento al ID
async function getDepartmentId(departmentInput) {
    const departments = await getAllDepartments();

    // Si el input es un número, devolverlo tal cual
    if (!isNaN(departmentInput)) {
        return parseInt(departmentInput, 10);
    }

    // Verificar que departmentInput no es undefined
    if (departmentInput === undefined || departmentInput === null) {
        throw new Error('El departamento proporcionado es inválido.');
    }

    // Si el input es un nombre, buscar el ID correspondiente
    const normalizedInput = departmentInput.toLowerCase().trim();
    const matchingDepartment = departments.find(dept => 
        dept.nombre.toLowerCase().trim() === normalizedInput
    );

    if (matchingDepartment) {
        return matchingDepartment.id;
    } else {
        throw new Error(`El departamento '${departmentInput}' no fue encontrado.`);
    }
}

// ==============================
// ENDPOINTS ESPECÍFICOS PRIMERO
// ==============================

// Obtener trabajadores por grupo específico (incluye propietario)
router.get('/grupo/:grupo_id', (req, res) => {
    const { grupo_id } = req.params;
    
    const query = `
        SELECT 
            t.id,
            t.usuario_id,
            u.nombres,
            u.apellidos,
            u.email,
            u.rut,
            u.tiene_acceso,
            t.departamento_id,
            d.nombre AS departamento_nombre,
            t.fecha_contratacion,
            t.activo,
            t.ocupacion,
            t.telefono,
            t.direccion,
            t.cargo_especifico,
            t.observaciones,
            t.experiencia_anos,
            t.salario,
            t.fecha_ingreso,
            'trabajador' AS tipo_participante
        FROM trabajadores t
        INNER JOIN usuarios u ON t.usuario_id = u.id
        LEFT JOIN departamentos d ON t.departamento_id = d.id
        INNER JOIN usuarios_grupos ug ON u.id = ug.usuario_id
        WHERE ug.grupo_id = ? AND ug.estado = 'activo'
        
        UNION ALL
        
        SELECT 
            NULL AS id,
            u.id AS usuario_id,
            u.nombres,
            u.apellidos,
            u.email,
            u.rut,
            u.tiene_acceso,
            NULL AS departamento_id,
            'Administración' AS departamento_nombre,
            NULL AS fecha_contratacion,
            1 AS activo,
            'Propietario' AS ocupacion,
            NULL AS telefono,
            NULL AS direccion,
            'Propietario del Grupo' AS cargo_especifico,
            'Usuario propietario del grupo - no modificable desde gestión de trabajadores' AS observaciones,
            NULL AS experiencia_anos,
            NULL AS salario,
            NULL AS fecha_ingreso,
            'propietario' AS tipo_participante
        FROM usuarios u
        INNER JOIN grupos g ON u.id = g.propietario_id
        WHERE g.id = ?
        
        ORDER BY tipo_participante DESC, apellidos, nombres
    `;
    
    db.query(query, [grupo_id, grupo_id], (err, results) => {
        if (err) {
            console.error('Error al obtener trabajadores del grupo:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json(results);
    });
});

// Verificar y corregir estado de grupo
router.get('/verificar-grupo/:grupo_id', (req, res) => {
    const { grupo_id } = req.params;
    
    const query = `
        SELECT 
            g.id,
            g.nombre,
            g.descripcion,
            g.propietario_id,
            g.es_personal,
            u.nombres AS propietario_nombre,
            u.apellidos AS propietario_apellido,
            ug.estado AS estado_propietario
        FROM grupos g
        LEFT JOIN usuarios u ON g.propietario_id = u.id
        LEFT JOIN usuarios_grupos ug ON g.propietario_id = ug.usuario_id AND g.id = ug.grupo_id
        WHERE g.id = ?
    `;
    
    db.query(query, [grupo_id], (err, results) => {
        if (err) {
            console.error('Error al verificar grupo:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Grupo no encontrado' });
        }
        
        const grupo = results[0];
        
        // Si el estado del propietario no es 'activo', corregirlo
        if (grupo.estado_propietario !== 'activo' && grupo.propietario_id) {
            const updateQuery = `
                INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol_id, estado) 
                VALUES (?, ?, (SELECT id FROM roles WHERE nombre = 'propietario'), 'activo')
                ON DUPLICATE KEY UPDATE estado = 'activo'
            `;
            
            db.query(updateQuery, [grupo.propietario_id, grupo_id], (updateErr) => {
                if (updateErr) {
                    console.error('Error al corregir estado del grupo:', updateErr);
                    return res.status(500).json({ error: 'Error al corregir estado del grupo' });
                }
                
                res.json({
                    grupo: grupo,
                    estado_corregido: true,
                    message: 'Estado del grupo corregido exitosamente'
                });
            });
        } else {
            res.json({
                grupo: grupo,
                estado_corregido: false,
                message: 'Estado del grupo está correcto'
            });
        }
    });
});

// Corregir estados de grupos
router.post('/corregir-estados-grupos', (req, res) => {
    const query = `
        INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol_id, estado)
        SELECT 
            g.propietario_id,
            g.id,
            (SELECT id FROM roles WHERE nombre = 'propietario'),
            'activo'
        FROM grupos g
        WHERE g.propietario_id IS NOT NULL
        ON DUPLICATE KEY UPDATE estado = 'activo'
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error al corregir estados de grupos:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: 'Estados de grupos corregidos exitosamente',
            affected_rows: result.affectedRows
        });
    });
});

// Guardar configuración de columnas
router.post('/guardar-configuracion-columnas', async (req, res) => {
    const { usuarioId, configuracion } = req.body;
    try {
        await db.query(
            'INSERT INTO configuracion_columnas (usuario_id, configuracion) VALUES (?, ?) ON DUPLICATE KEY UPDATE configuracion = VALUES(configuracion)',
            [usuarioId, JSON.stringify(configuracion)]
        );
        res.status(200).json({ message: 'Configuración guardada correctamente' });
    } catch (error) {
        console.error('Error al guardar la configuración:', error);
        res.status(500).json({ error: 'Error al guardar la configuración' });
    }
});

// Obtener configuración de columnas
router.get('/obtener-configuracion-columnas', async (req, res) => {
    const { usuarioId } = req.query;
    console.log('Solicitud para obtener configuración de columnas para usuario:', usuarioId);
    try {
        const [rows] = await db.query('SELECT configuracion FROM configuracion_columnas WHERE usuario_id = ?', [usuarioId]);
        if (rows.length > 0) {
            res.status(200).json({ configuracion: rows[0].configuracion });
        } else {
            res.status(404).json({ message: 'No se encontró la configuración' });
        }
    } catch (error) {
        console.error('Error al obtener la configuración:', error);
        res.status(500).json({ error: 'Error al obtener la configuración' });
    }
});

// Carga masiva de trabajadores
router.post('/upload', async (req, res) => {
    console.log('Datos recibidos para carga masiva:', req.body);
    
    const { trabajadores } = req.body;

    if (!Array.isArray(trabajadores) || trabajadores.length === 0) {
        return res.status(400).json({ error: 'Debe proporcionar un array de trabajadores' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < trabajadores.length; i++) {
        const worker = trabajadores[i];
        console.log(`Procesando trabajador ${i + 1}:`, worker);

        try {
            const {
                nombres, apellidos, email, password, rut, 
                departamento, fecha_contratacion, activo, ocupacion, telefono, 
                direccion, cargo_especifico, observaciones, experiencia_anos, 
                salario, fecha_ingreso, grupo_id
            } = worker;

            // Validar datos básicos
            validateWorkerData({ nombres, apellidos, email });

            // Determinar si tiene acceso basado en si tiene email y password
            const tieneAcceso = !!(email && email.trim() && password && password.trim());
            console.log(`Trabajador ${nombres} ${apellidos} - Tiene acceso: ${tieneAcceso}`);

            // Verificar si ya existe un usuario con este email (solo si tiene email)
            if (tieneAcceso) {
                const checkEmailQuery = 'SELECT id FROM usuarios WHERE email = ?';
                const [existingUsers] = await db.promise().query(checkEmailQuery, [email.trim()]);
                
                if (existingUsers.length > 0) {
                    errors.push({ 
                        row: i + 1, 
                        error: `Ya existe un usuario con el email ${email}` 
                    });
                    continue;
                }
            }

            // Convertir departamento a ID
            let departamento_id = null;
            if (departamento) {
                departamento_id = await getDepartmentId(departamento);
            }

            // Convertir activo
            const activoValue = convertActivo(activo);

            // Insertar usuario
            const userQuery = `
                INSERT INTO usuarios (nombres, apellidos, email, password, rut, tiene_acceso)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const [userResult] = await db.promise().query(userQuery, [
                nombres, 
                apellidos, 
                tieneAcceso ? email.trim() : null, 
                tieneAcceso ? password : null, 
                rut,
                tieneAcceso
            ]);

            const usuario_id = userResult.insertId;

            // Insertar trabajador
            const workerQuery = `
                INSERT INTO trabajadores (
                    usuario_id, departamento_id, fecha_contratacion, activo,
                    ocupacion, telefono, direccion, cargo_especifico,
                    observaciones, experiencia_anos, salario, fecha_ingreso
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await db.promise().query(workerQuery, [
                usuario_id, departamento_id, fecha_contratacion, activoValue,
                ocupacion, telefono, direccion, cargo_especifico,
                observaciones, experiencia_anos, salario, fecha_ingreso
            ]);

            // Agregar al grupo si se especifica
            if (grupo_id) {
                const groupQuery = `
                    INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol_id, estado)
                    VALUES (?, ?, (SELECT id FROM roles WHERE nombre = 'trabajador'), 'activo')
                `;
                await db.promise().query(groupQuery, [usuario_id, grupo_id]);
            }

            results.push({ 
                row: i + 1, 
                message: `Trabajador ${nombres} ${apellidos} agregado exitosamente`,
                tiene_acceso: tieneAcceso
            });

        } catch (error) {
            console.error(`Error procesando trabajador ${i + 1}:`, error);
            errors.push({ 
                row: i + 1, 
                error: error.message 
            });
        }
    }

    res.json({
        message: `Proceso completado. ${results.length} trabajadores agregados, ${errors.length} errores.`,
        results,
        errors
    });
});

// ==============================
// ENDPOINTS GENÉRICOS AL FINAL
// ==============================

// Obtener todos los trabajadores (con filtro opcional por grupo)
router.get('/', (req, res) => {
    const { grupo_id } = req.query;
    
    let query = `
        SELECT 
            t.id,
            t.usuario_id,
            u.nombres,
            u.apellidos,
            u.email,
            u.rut,
            u.tiene_acceso,
            t.departamento_id,
            d.nombre AS departamento_nombre,
            t.fecha_contratacion,
            t.activo,
            t.ocupacion,
            t.telefono,
            t.direccion,
            t.cargo_especifico,
            t.observaciones,
            t.experiencia_anos,
            t.salario,
            t.fecha_ingreso
        FROM trabajadores t
        INNER JOIN usuarios u ON t.usuario_id = u.id
        LEFT JOIN departamentos d ON t.departamento_id = d.id
    `;
    
    let params = [];
    
    if (grupo_id) {
        query += `
            INNER JOIN usuarios_grupos ug ON u.id = ug.usuario_id
            WHERE ug.grupo_id = ? AND ug.estado = 'activo'
        `;
        params.push(grupo_id);
    }
    
    query += ' ORDER BY u.apellidos, u.nombres';
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error al obtener trabajadores:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json(results);
    });
});

// Obtener trabajador por ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            t.id,
            t.usuario_id,
            u.nombres,
            u.apellidos,
            u.email,
            u.rut,
            u.tiene_acceso,
            t.departamento_id,
            d.nombre AS departamento_nombre,
            t.fecha_contratacion,
            t.activo,
            t.ocupacion,
            t.telefono,
            t.direccion,
            t.cargo_especifico,
            t.observaciones,
            t.experiencia_anos,
            t.salario,
            t.fecha_ingreso
        FROM trabajadores t
        INNER JOIN usuarios u ON t.usuario_id = u.id
        LEFT JOIN departamentos d ON t.departamento_id = d.id
        WHERE t.id = ?
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error al obtener trabajador:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Trabajador no encontrado' });
        }
        
        res.json(results[0]);
    });
});

// Crear nuevo trabajador
router.post('/', async (req, res) => {
    console.log('Datos recibidos para crear trabajador:', req.body);
    
    try {
        const {
            nombres, apellidos, email, password, rut, 
            departamento_id, fecha_contratacion, activo, ocupacion, telefono, 
            direccion, cargo_especifico, observaciones, experiencia_anos, 
            salario, fecha_ingreso, grupo_id
        } = req.body;

        // Validar datos básicos
        validateWorkerData({ nombres, apellidos, email });

        // Determinar si tiene acceso basado en si tiene email y password
        const tieneAcceso = !!(email && email.trim() && password && password.trim());
        console.log(`Nuevo trabajador ${nombres} ${apellidos} - Tiene acceso: ${tieneAcceso}`);

        // Verificar si ya existe un usuario con este email (solo si tiene email)
        if (tieneAcceso) {
            const checkEmailQuery = 'SELECT id FROM usuarios WHERE email = ?';
            db.query(checkEmailQuery, [email.trim()], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al verificar email existente.' });
                }

                if (results.length > 0) {
                    return res.status(400).json({ error: `Ya existe un usuario con el email ${email}` });
                }

                // Proceder con la inserción
                insertUser();
            });
        } else {
            // Si no tiene acceso, proceder directamente
            insertUser();
        }

        function insertUser() {
            // Convertir activo
            const activoValue = convertActivo(activo);

            // Insertar usuario
            const userQuery = `
                INSERT INTO usuarios (nombres, apellidos, email, password, rut, tiene_acceso)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            db.query(userQuery, [
                nombres, 
                apellidos, 
                tieneAcceso ? email.trim() : null, 
                tieneAcceso ? password : null, 
                rut,
                tieneAcceso
            ], (err, userResult) => {
                if (err) {
                    console.error('Error al insertar usuario:', err);
                    return res.status(500).json({ error: 'Error al crear el usuario.' });
                }

                const usuario_id = userResult.insertId;

                // Insertar trabajador
                const workerQuery = `
                    INSERT INTO trabajadores (
                        usuario_id, departamento_id, fecha_contratacion, activo,
                        ocupacion, telefono, direccion, cargo_especifico,
                        observaciones, experiencia_anos, salario, fecha_ingreso
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(workerQuery, [
                    usuario_id, departamento_id, fecha_contratacion, activoValue,
                    ocupacion, telefono, direccion, cargo_especifico,
                    observaciones, experiencia_anos, salario, fecha_ingreso
                ], (err, workerResult) => {
                    if (err) {
                        console.error('Error al insertar trabajador:', err);
                        return res.status(500).json({ error: 'Error al crear el trabajador.' });
                    }

                    // Agregar al grupo si se especifica
                    if (grupo_id) {
                        const groupQuery = `
                            INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol_id, estado)
                            VALUES (?, ?, (SELECT id FROM roles WHERE nombre = 'trabajador'), 'activo')
                        `;
                        db.query(groupQuery, [usuario_id, grupo_id], (err) => {
                            if (err) {
                                console.error('Error al agregar al grupo:', err);
                                // No fallar aquí, el trabajador ya fue creado
                            }
                        });
                    }

                    console.log('Trabajador creado:', { 
                        id: workerResult.insertId, 
                        usuario_id, 
                        nombres, 
                        apellidos, 
                        email: tieneAcceso ? email : 'Sin acceso', 
                        rut, 
                        tiene_acceso: tieneAcceso 
                    });

                    res.status(201).json({ 
                        message: 'Trabajador creado exitosamente',
                        id: workerResult.insertId,
                        tiene_acceso: tieneAcceso
                    });
                });
            });
        }
    } catch (error) {
        console.error('Error en validación:', error);
        res.status(400).json({ error: error.message });
    }
});

// Actualizar trabajador
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Datos recibidos para actualizar trabajador:', req.body);
    
    try {
        const {
            nombres, apellidos, email, password, rut, 
            departamento_id, fecha_contratacion, activo, ocupacion, telefono, 
            direccion, cargo_especifico, observaciones, experiencia_anos, 
            salario, fecha_ingreso
        } = req.body;

        // Validar datos básicos
        validateWorkerData({ nombres, apellidos, email });

        // Determinar si tiene acceso basado en si tiene email y password
        const tieneAcceso = !!(email && email.trim() && password && password.trim());
        console.log(`Actualizando trabajador ${nombres} ${apellidos} - Tiene acceso: ${tieneAcceso}`);

        // Obtener el usuario_id del trabajador
        const getWorkerQuery = 'SELECT usuario_id FROM trabajadores WHERE id = ?';
        db.query(getWorkerQuery, [id], (err, workerResults) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener datos del trabajador.' });
            }

            if (workerResults.length === 0) {
                return res.status(404).json({ message: 'Trabajador no encontrado' });
            }

            const usuario_id = workerResults[0].usuario_id;

            // Verificar si el email ya existe en otro usuario (solo si tiene email)
            if (tieneAcceso) {
                const checkEmailQuery = 'SELECT id FROM usuarios WHERE email = ? AND id != ?';
                db.query(checkEmailQuery, [email.trim(), usuario_id], (err, emailResults) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error al verificar email existente.' });
                    }

                    if (emailResults.length > 0) {
                        return res.status(400).json({ error: `Ya existe otro usuario con el email ${email}` });
                    }

                    // Proceder con la actualización
                    updateUser();
                });
            } else {
                // Si no tiene acceso, proceder directamente
                updateUser();
            }

            function updateUser() {
                // Convertir activo
                const activoValue = convertActivo(activo);

                // Actualizar usuario
                const updateUserQuery = `
                    UPDATE usuarios 
                    SET nombres = ?, apellidos = ?, email = ?, password = ?, rut = ?, tiene_acceso = ?
                    WHERE id = ?
                `;
                
                db.query(updateUserQuery, [
                    nombres, 
                    apellidos, 
                    tieneAcceso ? email.trim() : null, 
                    tieneAcceso ? password : null, 
                    rut,
                    tieneAcceso,
                    usuario_id
                ], (err, userResult) => {
                    if (err) {
                        console.error('Error al actualizar usuario:', err);
                        return res.status(500).json({ error: 'Error al actualizar el usuario.' });
                    }

                    // Actualizar trabajador
                    const updateWorkerQuery = `
                        UPDATE trabajadores 
                        SET departamento_id = ?, fecha_contratacion = ?, activo = ?,
                            ocupacion = ?, telefono = ?, direccion = ?, cargo_especifico = ?,
                            observaciones = ?, experiencia_anos = ?, salario = ?, fecha_ingreso = ?
                        WHERE id = ?
                    `;
                    db.query(updateWorkerQuery, [
                        departamento_id, fecha_contratacion, activoValue,
                        ocupacion, telefono, direccion, cargo_especifico,
                        observaciones, experiencia_anos, salario, fecha_ingreso, id
                    ], (err, workerResult) => {
                        if (err) {
                            return res.status(500).json({ error: 'Error al actualizar los datos del trabajador.' });
                        }

                        if (workerResult.affectedRows === 0) {
                            return res.status(404).json({ message: 'Trabajador no encontrado' });
                        }

                        console.log('Trabajador modificado:', { 
                            id, usuario_id, nombres, apellidos, email, rut, 
                            departamento_id, fecha_contratacion, activo, tiene_acceso: tieneAcceso
                        });
                        res.json({ message: 'Trabajador actualizado' });
                    });
                });
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Eliminar trabajadores (por ID en URL o múltiples en body)
router.delete('/:id?', async (req, res) => {
    const { id } = req.params; 
    const { ids } = req.body; 

    let workerIds;

    if (id) {
        workerIds = [id];
    } else if (Array.isArray(ids) && ids.length > 0) {
        workerIds = ids;
    } else {
        return res.status(400).json({ error: 'Debes proporcionar un ID o un array de IDs' });
    }

    try {
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

module.exports = router;
