// backend/routes/auth.js

const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const db      = require('../db');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;
const SALT_ROUNDS = 10;

if (!SECRET_KEY) {
  console.error('❌ ERROR: SECRET_KEY no está definido');
  process.exit(1);
}

// ------ REGISTRO ------
router.post('/register', async (req, res) => {
  const { nombre, apellido, email, password } = req.body;
  if (!nombre || !apellido || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const conn = db.promise();
  const trx  = await conn.getConnection();

  try {
    await trx.beginTransaction();

    const [existe] = await trx.query(
      'SELECT id FROM usuarios WHERE email = ?', [email]
    );
    if (existe.length) {
      await trx.rollback();
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const [uRes] = await trx.query(
      'INSERT INTO usuarios (nombre, apellido, email, password, rol_global, tiene_acceso) VALUES (?,?,?,?,?,?)',
      [nombre, apellido, email, hashed, 'propietario', 1]
    );
    const userId = uRes.insertId;

    const grpName = `Personal-${userId}`;
    const [gRes] = await trx.query(
      'INSERT INTO grupos (nombre, descripcion, propietario_id, es_personal) VALUES (?,?,?,1)',
      [grpName, 'Grupo personal', userId]
    );
    const grpId = gRes.insertId;

    await trx.query(
      `INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol_id, estado)
       VALUES (?, ?, (SELECT id FROM roles WHERE nombre = 'propietario'), 'activo')`,
      [userId, grpId]
    );

    // Crear automáticamente un trabajador para el propietario
    await trx.query(
      `INSERT INTO trabajadores (usuario_id, grupo_id, cargo, activo, es_propietario)
       VALUES (?, ?, 'Propietario', 1, 1)`,
      [userId, grpId]
    );

    await trx.commit();
    res.status(201).json({ message: 'Cuenta y grupo personal creados como propietario' });

  } catch (err) {
    await trx.rollback();
    console.error('❌ Error al registrar:', err);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    trx.release();
  }
});

// ------ ACTUALIZAR PERFIL ------
router.put('/auth/usuario', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No autorizado' });

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET_KEY);
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }

  const { nombre, apellido, rut, password_nueva, password_actual } = req.body;
  if (!nombre && !apellido && !rut && !password_nueva) {
    return res.status(400).json({ message: 'Nada para actualizar' });
  }
  if (!password_actual) {
    return res.status(400).json({ message: 'Contraseña actual requerida' });
  }

  // Verificar contraseña actual
  const [[user]] = await db.promise().query(
    'SELECT password FROM usuarios WHERE id = ?', [decoded.id]
  );
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

  const match = await bcrypt.compare(password_actual, user.password);
  if (!match) {
    return res.status(401).json({ message: 'Contraseña actual incorrecta' });
  }

  // Preparar campos a actualizar
  const campos = [];
  const valores = [];
  if (nombre) {
    campos.push('nombre = ?');
    valores.push(nombre);
  }
  if (apellido) {
    campos.push('apellido = ?');
    valores.push(apellido);
  }
  if (rut !== undefined) { // Permitir establecer RUT vacío
    campos.push('rut = ?');
    valores.push(rut || null);
  }
  if (password_nueva) {
    const hashedNew = await bcrypt.hash(password_nueva, SALT_ROUNDS);
    campos.push('password = ?');
    valores.push(hashedNew);
  }
  valores.push(decoded.id);

  const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
  try {
    const [result] = await db.promise().query(sql, valores);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ message: 'Perfil actualizado' });
  } catch (err) {
    console.error('❌ Error actualizando perfil:', err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// ------ LOGIN ------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
  }

  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM usuarios WHERE email = ?', [email]
    );
    if (!rows.length) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }
    const usuario = rows[0];

    const match = await bcrypt.compare(password, usuario.password);
    if (!match) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const [grupos] = await db.promise().query(
      `SELECT g.id, g.nombre, r.nombre AS rol, ug.estado
         FROM usuarios_grupos ug
         JOIN grupos g ON g.id = ug.grupo_id
         JOIN roles  r ON r.id = ug.rol_id
        WHERE ug.usuario_id = ?`,
      [usuario.id]
    );

    // Determinar el rol global del usuario (propietario si tiene al menos un grupo como propietario)
    const esPropietario = grupos.some(grupo => grupo.rol === 'propietario');
    const rol_global = esPropietario ? 'propietario' : 'miembro';

    // Obtener permisos del usuario
    const [perms] = await db.promise().query(
      `SELECT DISTINCT pa.codigo
         FROM usuarios_grupos ug
         JOIN roles_permisos rp ON rp.rol_id = ug.rol_id
         JOIN permisos_atomicos pa ON pa.id = rp.permiso_id
        WHERE ug.usuario_id = ?`,
      [usuario.id]
    );

    const permisos = perms.map(p => p.codigo);

    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        rol_global: rol_global 
      },
      SECRET_KEY,
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      usuario: { 
        id: usuario.id, 
        nombre: usuario.nombre, 
        apellido: usuario.apellido, 
        email: usuario.email, 
        rol_global: rol_global,
        grupos,
        permisos
      }
    });
  } catch (err) {
    console.error('❌ Error en login:', err);
    res.status(500).json({ message: 'Error en el servidor. Intente nuevamente.' });
  }
});

// ------ OBTENER PERFIL ------
router.get('/usuario', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No autorizado: Token faltante' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);

    const [[usuario]] = await db.promise().query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rut, u.rol_global,
              COALESCE(t.es_propietario, 0) as es_propietario
       FROM usuarios u
       LEFT JOIN trabajadores t ON t.usuario_id = u.id AND t.activo = 1
       WHERE u.id = ?`,
      [decoded.id]
    );
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    const [grupos] = await db.promise().query(
      `SELECT g.id, g.nombre, r.nombre AS rol, ug.estado
         FROM usuarios_grupos ug
         JOIN grupos g ON g.id = ug.grupo_id
         JOIN roles  r ON r.id = ug.rol_id
        WHERE ug.usuario_id = ?`,
      [usuario.id]
    );

    const [perms] = await db.promise().query(
      `SELECT DISTINCT pa.codigo
         FROM usuarios_grupos ug
         JOIN roles_permisos rp ON rp.rol_id = ug.rol_id
         JOIN permisos_atomicos pa ON pa.id = rp.permiso_id
        WHERE ug.usuario_id = ?`,
      [usuario.id]
    );

    res.json({ ...usuario, grupos, permisos: perms.map(p => p.codigo) });
  } catch (err) {
    console.error('❌ Error autenticando:', err);
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
});

// ------ ENDPOINT TEMPORAL PARA CORREGIR ESTADOS ------
router.post('/fix-user-states', async (req, res) => {
  try {
    // Actualizar todos los registros en usuarios_grupos que no tengan estado o sea NULL a 'activo'
    const [result] = await db.promise().query(
      `UPDATE usuarios_grupos 
       SET estado = 'activo' 
       WHERE estado IS NULL OR estado = '' OR estado = 'No definido'`
    );

    console.log(`✅ Se actualizaron ${result.affectedRows} registros a estado 'activo'`);
    
    res.json({ 
      message: `Se corrigieron ${result.affectedRows} registros. Los usuarios ahora tienen estado 'activo'.`,
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('❌ Error corrigiendo estados:', error);
    res.status(500).json({ error: 'Error al corregir estados de usuarios' });
  }
});

module.exports = router;