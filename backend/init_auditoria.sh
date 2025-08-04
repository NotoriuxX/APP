#!/bin/bash

# Script para inicializar tabla de auditoría y triggers
echo "Inicializando tabla de auditoría y triggers..."

# Obtener la ruta del directorio actual
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Importar variables de entorno si existe .env
if [ -f "$DIR/../.env" ]; then
  export $(cat "$DIR/../.env" | grep -v '^#' | xargs)
fi

# Variables de conexión
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-inventario}

# Ejecutar el script SQL
mysql -h $DB_HOST -u $DB_USER ${DB_PASSWORD:+-p$DB_PASSWORD} $DB_NAME < "$DIR/../db/auditoria.sql"

# Verificar resultado
if [ $? -eq 0 ]; then
  echo "✅ Tabla de auditoría inicializada correctamente"
else
  echo "❌ Error al inicializar tabla de auditoría"
  exit 1
fi

echo "Proceso completado."
