-- Limpiar departamentos con problemas de codificación
-- 1. Primero actualizar trabajadores que apuntan al departamento problemático
UPDATE trabajadores 
SET departamento_id = 1 
WHERE departamento_id = 3;

-- 2. Eliminar el departamento problemático
DELETE FROM departamentos WHERE id = 3;

-- 3. Actualizar departamentos con acentos
UPDATE departamentos SET nombre = 'Informatica' WHERE nombre = 'Informática';
UPDATE departamentos SET nombre = 'Mantencion' WHERE nombre = 'Mantención';

-- 4. Verificar el resultado
SELECT * FROM departamentos ORDER BY nombre;
