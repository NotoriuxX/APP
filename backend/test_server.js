#!/usr/bin/env node

// Script de prueba para verificar que el servidor funciona correctamente
console.log('🚀 Iniciando prueba del servidor...');

try {
  // Verificar que las dependencias están disponibles
  console.log('📦 Verificando dependencias...');
  require('express');
  require('mysql2');
  require('jsonwebtoken');
  require('moment-timezone');
  require('ntp-client');
  console.log('✅ Todas las dependencias están disponibles');
  
  // Cargar variables de entorno
  require('dotenv').config();
  
  // Verificar variables de entorno críticas
  const requiredEnvVars = ['SECRET_KEY', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️  Variables de entorno faltantes:', missingVars);
  } else {
    console.log('✅ Variables de entorno configuradas correctamente');
  }
  
  // Intentar conectar a la base de datos
  console.log('🔌 Probando conexión a base de datos...');
  const db = require('./db');
  
  db.promise().query('SELECT 1 as test')
    .then(() => {
      console.log('✅ Conexión a base de datos exitosa');
      
      // Verificar si tabla fotocopias existe
      return db.promise().query('DESCRIBE fotocopias');
    })
    .then(([structure]) => {
      console.log('📊 Estructura de tabla fotocopias:');
      const columns = structure.map(col => `  - ${col.Field} (${col.Type})`);
      console.log(columns.join('\n'));
      
      // Verificar si las rutas cargan correctamente
      console.log('📝 Probando rutas de photocopies...');
      const photocopyRoutes = require('./routes/photocopies');
      console.log('✅ Rutas de photocopies cargadas correctamente');
      
      console.log('\n🎉 ¡Servidor listo para funcionar!');
      console.log('💡 Para iniciar el servidor ejecuta: npm start');
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error.message);
      
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('💡 Solución: La tabla fotocopias no existe. Ejecuta el schema SQL primero.');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('💡 Solución: La base de datos no está ejecutándose. Inicia MySQL/MariaDB.');
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('💡 Solución: Credenciales de base de datos incorrectas. Revisa el archivo .env');
      }
      
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Error crítico:', error.message);
  console.log('💡 Instala las dependencias con: npm install');
  process.exit(1);
}
