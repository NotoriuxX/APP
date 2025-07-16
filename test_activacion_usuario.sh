#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Probando activación de usuario soporte@csma.cl...${NC}"

# Primero, obtener el ID del trabajador para soporte@csma.cl
QUERY="SELECT t.id FROM trabajadores t JOIN usuarios u ON t.usuario_id = u.id WHERE u.email = 'soporte@csma.cl';"
WORKER_ID=$(mysql -u root -p'Gladiadorin12.' inventario -e "$QUERY" -sN)

if [ -z "$WORKER_ID" ]; then
    echo -e "${RED}❌ No se encontró el trabajador para soporte@csma.cl${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ID del trabajador encontrado: $WORKER_ID${NC}"

# Datos para la activación
JSON_DATA=$(cat << EOF
{
    "password": "Gladiadorin12",
    "rol_grupo": "soporte",
    "permisos_especiales": [
        "trabajadores.ver",
        "trabajadores.editar",
        "trabajadores.crear",
        "trabajadores.eliminar",
        "inventario.ver",
        "inventario.editar"
    ]
}
EOF
)

# Obtener un token de acceso (necesitamos un usuario admin)
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3300/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@csma.cl","password":"admin123"}')

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No se pudo obtener el token de autenticación${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Token de autenticación obtenido${NC}"

# Activar la cuenta
RESPONSE=$(curl -s -X POST http://localhost:3300/api/trabajadores/$WORKER_ID/crear-cuenta \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$JSON_DATA")

echo -e "${YELLOW}Respuesta del servidor:${NC}"
echo $RESPONSE | json_pp

# Verificar que los permisos se asignaron correctamente
echo -e "\n${YELLOW}Verificando permisos asignados...${NC}"
QUERY="SELECT pa.codigo, upe.estado 
       FROM usuarios_permisos_especiales upe 
       JOIN permisos_atomicos pa ON upe.permiso_id = pa.id 
       JOIN usuarios u ON upe.usuario_id = u.id 
       WHERE u.email = 'soporte@csma.cl' AND upe.estado = 'activo';"

mysql -u root -p'Gladiadorin12.' inventario -e "$QUERY"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Prueba completada${NC}"
else
    echo -e "${RED}❌ Error al verificar permisos${NC}"
fi
