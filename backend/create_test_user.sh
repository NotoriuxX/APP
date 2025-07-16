#!/bin/bash

echo "🔧 CREANDO USUARIO DE PRUEBA"
echo "============================="

# Crear usuario de prueba
echo "👤 Registrando usuario de prueba..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3300/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Usuario",
    "apellido": "Prueba", 
    "email": "test@ejemplo.com",
    "password": "123456"
  }')

echo "Respuesta del registro: $REGISTER_RESPONSE"

# Intentar login
echo ""
echo "🔐 Probando login con el nuevo usuario..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3300/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "123456"
  }')

echo "Respuesta del login: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
    echo "✅ Usuario de prueba creado y funcionando correctamente"
else
    echo "❌ Error creando usuario de prueba"
fi
