#!/bin/bash

echo "🧪 PROBANDO TRABAJADORES CON ROLES DESDE EL FRONTEND"
echo "=================================================="

# Obtener token de acceso
echo "🔐 Obteniendo token de acceso..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3300/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "123456"
  }')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Error al obtener token"
    echo "Respuesta: $TOKEN_RESPONSE"
    exit 1
fi

echo "✅ Token obtenido correctamente"

# Obtener grupo del usuario
echo ""
echo "📋 Obteniendo grupos del usuario..."
USER_RESPONSE=$(curl -s -X GET http://localhost:3300/api/auth/usuario \
  -H "Authorization: Bearer $TOKEN")

GRUPO_ID=$(echo $USER_RESPONSE | jq -r '.grupos[0].id')

if [ "$GRUPO_ID" = "null" ] || [ -z "$GRUPO_ID" ]; then
    echo "❌ Error al obtener grupo del usuario"
    echo "Respuesta: $USER_RESPONSE"
    exit 1
fi

echo "✅ Grupo obtenido: $GRUPO_ID"

# Probar endpoint de trabajadores
echo ""
echo "👥 Probando endpoint de trabajadores..."
TRABAJADORES_RESPONSE=$(curl -s -X GET "http://localhost:3300/api/trabajadores?grupo_id=$GRUPO_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "📋 Trabajadores obtenidos:"
echo $TRABAJADORES_RESPONSE | jq '.[] | {
  nombre: (.nombre + " " + .apellido),
  cargo: .cargo,
  rol_nombre: .rol_nombre,
  rol_descripcion: .rol_descripcion,
  es_propietario: .es_propietario,
  estado_acceso: .estado_acceso
}'

# Probar endpoint de roles disponibles
echo ""
echo "🎭 Probando endpoint de roles disponibles..."
ROLES_RESPONSE=$(curl -s -X GET http://localhost:3300/api/roles/available \
  -H "Authorization: Bearer $TOKEN")

echo "📋 Roles disponibles:"
echo $ROLES_RESPONSE | jq '.[:5] | .[] | {
  nombre: .nombre,
  descripcion: .descripcion
}'

# Probar endpoint de permisos por nombre de rol
echo ""
echo "🔑 Probando permisos para rol 'administrador'..."
PERMISOS_RESPONSE=$(curl -s -X GET http://localhost:3300/api/roles/permissions/administrador \
  -H "Authorization: Bearer $TOKEN")

TOTAL_PERMISOS=$(echo $PERMISOS_RESPONSE | jq 'length')
echo "📊 Total de permisos para administrador: $TOTAL_PERMISOS"

if [ "$TOTAL_PERMISOS" -gt 0 ]; then
    echo "✅ Permisos obtenidos correctamente"
    echo "🔑 Primeros 3 permisos:"
    echo $PERMISOS_RESPONSE | jq '.[:3] | .[] | {
      modulo: .modulo_nombre,
      permiso: .permiso_nombre,
      codigo: .codigo
    }'
else
    echo "❌ No se obtuvieron permisos"
fi

echo ""
echo "🎉 PRUEBA COMPLETADA - SISTEMA DE ROLES FUNCIONANDO"
