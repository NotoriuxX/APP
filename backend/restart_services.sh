#!/bin/bash

# Script de reinicio completo del sistema de inventario
echo "🚀 Iniciando reinicio completo del sistema..."

# Detener procesos existentes
echo "⏹️  Deteniendo procesos existentes..."
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true

# Cambiar al directorio backend
cd "$(dirname "$0")"
echo "📁 Directorio actual: $(pwd)"

# Verificar y crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env..."
    cat > .env << EOF
# Configuración de la base de datos local
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=inventario

# Clave secreta para JWT
SECRET_KEY=inventario-secret-key-2024-production-secure

# Configuración del servidor
PORT=3300
NODE_ENV=development

# Debug de fotocopias (opcional)
PHOTOCOPIES_DEBUG=false
EOF
else
    echo "✅ Archivo .env ya existe"
fi

# Instalar dependencias si es necesario
echo "📦 Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "⬇️  Instalando dependencias..."
    npm install
else
    echo "✅ Dependencias ya instaladas"
fi

# Usar base de datos SQLite local
echo "🗄️  Configurando base de datos SQLite local..."
if [ -f "inventarios.db" ]; then
    echo "📋 Respaldando base de datos actual..."
    cp inventarios.db inventarios.db.backup.$(date +%Y%m%d_%H%M%S)
fi

# Crear/actualizar esquema de base de datos SQLite
echo "🔧 Inicializando esquema de base de datos..."
node -e "
const db = require('./db-local');
const fs = require('fs');

// Ejecutar el schema principal
if (fs.existsSync('../db/init/schema.sql')) {
    const schema = fs.readFileSync('../db/init/schema.sql', 'utf8');
    // Adaptar SQL de MySQL a SQLite
    const sqliteSchema = schema
        .replace(/ENGINE=InnoDB/g, '')
        .replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT')
        .replace(/TINYINT\(1\)/g, 'INTEGER')
        .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
        .replace(/VARCHAR\(\d+\)/g, 'TEXT')
        .replace(/TEXT/g, 'TEXT')
        .replace(/INT/g, 'INTEGER')
        .replace(/DECIMAL\(\d+,\d+\)/g, 'REAL');
    
    console.log('📊 Ejecutando schema adaptado para SQLite...');
    // Para SQLite, ejecutar comandos uno por uno
    const commands = sqliteSchema.split(';').filter(cmd => cmd.trim());
    commands.forEach(cmd => {
        try {
            if (cmd.trim()) {
                db.prepare(cmd.trim()).run();
            }
        } catch (err) {
            if (!err.message.includes('already exists')) {
                console.warn('⚠️ Warning:', err.message);
            }
        }
    });
}

console.log('✅ Base de datos SQLite inicializada');
process.exit(0);
" || echo "⚠️  Usando base de datos existente"

# Ejecutar test del servidor
echo "🧪 Ejecutando diagnóstico del servidor..."
node test_server.js

# Iniciar el servidor
echo "🌐 Iniciando servidor backend..."
echo "📡 El servidor estará disponible en http://localhost:3300"
echo "🔍 Para ver logs en tiempo real: tail -f server.log"
echo ""
echo "🎉 ¡Sistema reiniciado exitosamente!"
echo "💡 Para detener el servidor usa: pkill -f 'node.*server'"
echo ""

# Iniciar servidor en background y capturar logs
nohup npm start > server.log 2>&1 &
SERVER_PID=$!

echo "🚀 Servidor iniciado con PID: $SERVER_PID"
echo "📋 Logs guardados en: server.log"

# Esperar un momento y verificar que el servidor esté respondiendo
sleep 3
if curl -s http://localhost:3300/api/photocopies/permissions > /dev/null 2>&1; then
    echo "✅ Servidor respondiendo correctamente"
else
    echo "⚠️  Servidor iniciado, pero aún no responde (esto es normal, puede tardar unos segundos)"
fi

echo ""
echo "📊 Para verificar el estado del servidor:"
echo "   curl http://localhost:3300/api/photocopies/permissions"
echo ""
echo "🏁 Reinicio completado. Verifica tu aplicación frontend."
