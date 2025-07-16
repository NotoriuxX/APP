// backend/db.js
const mysql = require('mysql2');
require('dotenv').config();

// Crear pool de conexiones MySQL con configuración estricta
const pool = mysql.createPool({
    host:              process.env.DB_HOST,      // "localhost"
    port:              process.env.DB_PORT || 3306,  // Puerto configurado
    user:              process.env.DB_USER,      // "root" o tu usuario normal
    password:          process.env.DB_PASSWORD,  // "Gladiadorin12."
    database:          process.env.DB_NAME,      // "inventario"
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    charset:           'utf8mb4'                 // Configuración UTF-8 para MySQL
});

// Verificar conexión al inicializar
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ ERROR CRÍTICO: No se pudo conectar a MySQL:', err.message);
        console.error('❌ Verifica que MySQL esté ejecutándose y la configuración sea correcta');
        console.error('❌ Variables de entorno requeridas: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
        process.exit(1); // Terminar proceso si no hay conexión a MySQL
    } else {
        console.log('✅ Conectado exitosamente a MySQL');
        connection.release();
    }
});

// Manejar errores de conexión en tiempo de ejecución
pool.on('connection', (connection) => {
    console.log('🔄 Nueva conexión MySQL establecida: ' + connection.threadId);
});

pool.on('error', (err) => {
    console.error('❌ Error en pool MySQL:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('❌ Conexión MySQL perdida. El servidor intentará reconectar...');
    } else {
        console.error('❌ Error crítico en MySQL:', err);
        process.exit(1);
    }
});

module.exports = pool;
