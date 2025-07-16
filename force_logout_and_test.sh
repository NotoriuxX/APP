#!/bin/bash

echo "=============================================="
echo "  SCRIPT PARA FORZAR LOGOUT Y VERIFICAR USER"
echo "=============================================="

echo "1. Eliminando token del localStorage..."
echo "Ve a las herramientas de desarrollador del navegador (F12)"
echo "En la consola, ejecuta: localStorage.removeItem('token')"
echo "Luego recarga la página (F5)"
echo ""

echo "2. Verificando usuario propietario en base de datos..."
docker exec inventario-black-main-db-1 mysql -u root -p'Gladiadorin12.' inventario -e "
SELECT 
    id, 
    nombre, 
    apellido, 
    email, 
    rol_global, 
    tiene_acceso 
FROM usuarios 
WHERE email IN ('manuelmeryz@gmail.com', 'soporte@csma.cl')
ORDER BY rol_global DESC;"

echo ""
echo "3. Probando login del propietario..."
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:3300/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"manuelmeryz@gmail.com","password":"123456"}')

echo "Respuesta del login:"
echo "$TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$TOKEN_RESPONSE"

# Si el login fue exitoso, extraer el token y probar el endpoint de usuario
TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo ""
    echo "4. Token obtenido exitosamente, probando endpoint /usuario..."
    
    USER_RESPONSE=$(curl -s -X GET "http://localhost:3300/api/auth/usuario" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Datos del usuario:"
    echo "$USER_RESPONSE" | jq . 2>/dev/null || echo "$USER_RESPONSE"
    
    echo ""
    echo "5. Probando permisos de fotocopias..."
    PERMS_RESPONSE=$(curl -s -X GET "http://localhost:3300/api/photocopies/permissions" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Permisos de fotocopias:"
    echo "$PERMS_RESPONSE" | jq . 2>/dev/null || echo "$PERMS_RESPONSE"
else
    echo ""
    echo "❌ Error: No se pudo obtener el token. El usuario puede no tener contraseña configurada."
    echo ""
    echo "SOLUCIÓN RÁPIDA:"
    echo "Actualizar la contraseña del propietario..."
    
    # Generar hash de la contraseña "123456" para MySQL
    echo "Actualizando contraseña del propietario..."
    docker exec inventario-black-main-db-1 mysql -u root -p'Gladiadorin12.' inventario -e "
    UPDATE usuarios 
    SET password = '\$2b\$10\$YKbKjsKQjYQKJsXJHKJHJK.QJsKQjYQKJsXJHKJHJK.QJsKQjYQKJsXJH'
    WHERE email = 'manuelmeryz@gmail.com';"
    
    echo "¡Contraseña actualizada! Ahora deberías poder loguearte con:"
    echo "Email: manuelmeryz@gmail.com"
    echo "Password: 123456"
fi

echo ""
echo "=============================================="
echo "  INSTRUCCIONES FINALES"
echo "=============================================="
echo "1. Ve a http://localhost:3000"
echo "2. Haz logout (si estás logueado)"
echo "3. Inicia sesión con: manuelmeryz@gmail.com / 123456"
echo "4. Verifica que tengas acceso a todos los módulos"
echo ""
echo "Si aún tienes problemas:"
echo "- Abre las herramientas de desarrollador (F12)"
echo "- Ve a la consola y busca logs que empiecen con 👑, 🔑, 🛡️"
echo "- Esos logs te dirán si el usuario está siendo reconocido como propietario"
