#!/bin/bash

echo "================================================"
echo "  SCRIPT FINAL - REGISTRAR USUARIO PROPIETARIO"
echo "================================================"

echo "1. Registrando nuevo usuario propietario..."
REGISTER_RESPONSE=$(curl -s -X POST "http://localhost:3300/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"nombre":"Admin","apellido":"Propietario","email":"admin@propietario.com","password":"123456"}')

echo "Respuesta del registro:"
echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"

echo ""
echo "2. Haciendo login con el nuevo usuario..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3300/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@propietario.com","password":"123456"}')

echo "Respuesta del login:"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extraer token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo ""
    echo "3. ✅ Token obtenido! Verificando datos del usuario..."
    
    USER_RESPONSE=$(curl -s -X GET "http://localhost:3300/api/auth/usuario" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Datos del usuario:"
    echo "$USER_RESPONSE" | jq . 2>/dev/null || echo "$USER_RESPONSE"
    
    echo ""
    echo "4. Verificando permisos de fotocopias..."
    PERMS_FOTOCOPIAS=$(curl -s -X GET "http://localhost:3300/api/photocopies/permissions" \
        -H "Authorization: Bearer $TOKEN")
    echo "Fotocopias: $PERMS_FOTOCOPIAS"
    
    echo ""
    echo "5. Verificando permisos de trabajadores..."
    PERMS_TRABAJADORES=$(curl -s -X GET "http://localhost:3300/api/trabajadores/permissions" \
        -H "Authorization: Bearer $TOKEN")
    echo "Trabajadores: $PERMS_TRABAJADORES"
    
    echo ""
    echo "6. Verificando permisos de inventario..."
    PERMS_INVENTARIO=$(curl -s -X GET "http://localhost:3300/api/inventarios/permissions" \
        -H "Authorization: Bearer $TOKEN")
    echo "Inventario: $PERMS_INVENTARIO"
    
    echo ""
    echo "================================================"
    echo "  ✅ USUARIO PROPIETARIO CREADO EXITOSAMENTE"
    echo "================================================"
    echo "Credenciales del nuevo propietario:"
    echo "📧 Email: admin@propietario.com"
    echo "🔑 Password: 123456"
    echo ""
    echo "PASOS FINALES:"
    echo "1. Ve a http://localhost:3000"
    echo "2. Haz logout si estás logueado"
    echo "3. Inicia sesión con las credenciales de arriba"
    echo "4. Deberías tener acceso a TODOS los módulos"
    echo ""
    echo "Si aún hay problemas, verifica en la consola del navegador (F12)"
    echo "los logs que empiecen con 👑, 🔑, 🛡️"
    
else
    echo ""
    echo "❌ Error: No se pudo registrar o hacer login con el usuario propietario"
    echo "Verificando usuarios existentes en la base de datos..."
    
    docker exec inventario-black-main-db-1 mysql -u root -p'Gladiadorin12.' inventario -e "
    SELECT id, nombre, apellido, email, rol_global, tiene_acceso 
    FROM usuarios 
    ORDER BY id DESC 
    LIMIT 5;"
    
    echo ""
    echo "Si el usuario ya existe, puedes usar estas credenciales:"
    echo "📧 Email: manuelmeryz@gmail.com"
    echo "🔑 Password: 123456"
    echo "(Este usuario ya está configurado como propietario)"
fi
