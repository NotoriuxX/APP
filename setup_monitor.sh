#!/bin/bash

# Script para preparar el entorno del Portal de Monitoreo

echo "===== Preparando entorno para el Portal de Monitoreo ====="

# Verificar si Redis está instalado
if ! command -v redis-server &> /dev/null; then
    echo "Redis no está instalado. Puedes instalarlo con:"
    echo "  - macOS: brew install redis"
    echo "  - Linux (Ubuntu/Debian): sudo apt install redis-server"
    echo "  - Linux (Fedora/CentOS): sudo dnf install redis"
    echo ""
    echo "Una vez instalado, ejecuta de nuevo este script."
    exit 1
fi

# Iniciar Redis si no está en ejecución
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Iniciando Redis..."
    redis-server --daemonize yes
    echo "Redis iniciado en segundo plano."
else
    echo "Redis ya está en ejecución."
fi

# Verificar conexión a Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "Conexión a Redis exitosa."
else
    echo "Error: No se pudo conectar a Redis."
    exit 1
fi

# Generar hash para la contraseña de administrador
echo "Generando hash bcrypt para la contraseña del administrador..."
ADMIN_PASSWORD="Monitor2025!"
ADMIN_HASH=$(node -e "const bcrypt = require('bcrypt'); async function generateHash() { const hash = await bcrypt.hash('$ADMIN_PASSWORD', 10); console.log(hash); } generateHash();")
echo "Hash generado: $ADMIN_HASH"

# Actualizar archivo .env
echo "Actualizando archivo .env..."
cat > .env << EOF
SECRET_KEY=inventarioblack_secret_docker_compose
ADMIN_USER=admin_monitor
ADMIN_PASS_HASH=$ADMIN_HASH
SESSION_SECRET=monitor_secure_session_key_$(date +%Y%m%d)
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGINS=http://localhost:3000
NODE_ENV=development
EOF
echo "Archivo .env actualizado."

# Generar secreto TOTP para 2FA
echo "Generando secreto TOTP para autenticación 2FA..."
mkdir -p backend/.totp
node backend/scripts/gen-totp.js --user admin_monitor
echo "Secreto TOTP generado. Escanea el código QR con Google Authenticator."

echo ""
echo "===== ENTORNO PREPARADO EXITOSAMENTE ====="
echo "Credenciales del Portal de Monitoreo:"
echo "  - Email: admin.monitor@inventario.cl"
echo "  - Contraseña: $ADMIN_PASSWORD"
echo "  - URL: http://localhost:3000/monitor/login"
echo ""
echo "Para iniciar el sistema:"
echo "1. Inicia el backend: cd backend && npm start"
echo "2. Inicia el frontend: cd frontend && npm start"
echo ""
