#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Probando creación de trabajador...${NC}"

# Obtener token de acceso (usando usuario admin)
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3300/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@csma.cl","password":"admin123"}')

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No se pudo obtener el token de autenticación${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Token de autenticación obtenido${NC}"

# Datos del nuevo trabajador
JSON_DATA=$(cat << EOF
{
    "nombres": "Juan Test",
    "apellidos": "Pérez Demo",
    "email": "juan.test@csma.cl",
    "rut": "12.345.678-9",
    "cargo": "Técnico de Prueba",
    "departamento": "Soporte IT",
    "grupo_id": 1,
    "activo": true
}
EOF
)

# Crear trabajador
echo -e "\n${YELLOW}Creando trabajador...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3300/api/trabajadores \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$JSON_DATA")

echo -e "\n${YELLOW}Respuesta del servidor:${NC}"
echo $RESPONSE | json_pp

if echo $RESPONSE | grep -q "error"; then
    echo -e "${RED}❌ Error al crear trabajador${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Trabajador creado exitosamente${NC}"
fi

# Obtener IDs del trabajador y usuario
WORKER_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
USER_ID=$(echo $RESPONSE | grep -o '"usuario_id":[0-9]*' | cut -d':' -f2)

echo -e "\n${YELLOW}IDs obtenidos:${NC}"
echo "Trabajador ID: $WORKER_ID"
echo "Usuario ID: $USER_ID"

# Crear cuenta de usuario
echo -e "\n${YELLOW}Creando cuenta de usuario...${NC}"
ACCOUNT_DATA=$(cat << EOF
{
    "password": "Test123!",
    "rol_grupo": "trabajador",
    "permisos_especiales": [
        "trabajador_leer",
        "inventario_leer"
    ]
}
EOF
)

ACCOUNT_RESPONSE=$(curl -s -X POST "http://localhost:3300/api/trabajadores/$WORKER_ID/crear-cuenta" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$ACCOUNT_DATA")

echo -e "\n${YELLOW}Respuesta de creación de cuenta:${NC}"
echo $ACCOUNT_RESPONSE | json_pp

if echo $ACCOUNT_RESPONSE | grep -q "error"; then
    echo -e "${RED}❌ Error al crear cuenta${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Cuenta creada exitosamente${NC}"
fi

# Verificar permisos asignados
echo -e "\n${YELLOW}Verificando permisos asignados...${NC}"
QUERY="SELECT pa.codigo, upe.estado 
       FROM usuarios_permisos_especiales upe 
       JOIN permisos_atomicos pa ON upe.permiso_id = pa.id 
       JOIN usuarios u ON upe.usuario_id = u.id 
       WHERE u.email = 'juan.test@csma.cl' AND upe.estado = 'activo';"

mysql -u root -p'Gladiadorin12.' inventario -e "$QUERY"
