const express = require('express');
const router = express.Router();
const db = require('../db'); // Conexión a la base de datos
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

// Obtener todas las secciones
router.get('/', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        
        // Verificar permisos de lectura
        const puedeVer = await verificarPermiso(usuarioId, 'seccion_leer') || 
                        await verificarPermiso(usuarioId, 'ubicaciones_leer');
        if (!puedeVer) {
            return res.status(403).json({ 
                message: 'No tienes permisos para ver secciones' 
            });
        }
        
        const [results] = await db.promise().query('SELECT id, nombre FROM secciones');
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener secciones', error: err.message });
    }
});

module.exports = router;
