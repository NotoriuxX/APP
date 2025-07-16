-- ===============================================================
-- MIGRACIÓN: HISTORIAL DE SESIONES Y ESTADOS DE ACCESO
-- ===============================================================
-- Este script actualiza la base de datos existente para agregar
-- el nuevo sistema de historial de sesiones y estados de acceso
-- ===============================================================

-- 1. Agregar nuevas columnas a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN estado_acceso ENUM('nunca_tuvo', 'tuvo_pero_desactivado', 'activo') DEFAULT 'nunca_tuvo' AFTER tiene_acceso,
ADD COLUMN primer_acceso TIMESTAMP NULL AFTER estado_acceso,
ADD COLUMN ultimo_acceso TIMESTAMP NULL AFTER primer_acceso;

-- 2. Agregar índices para las nuevas columnas
ALTER TABLE usuarios 
ADD INDEX idx_usuarios_estado_acceso (estado_acceso),
ADD INDEX idx_usuarios_ultimo_acceso (ultimo_acceso);

-- 3. Crear tabla de historial de inicios de sesión
CREATE TABLE IF NOT EXISTS historial_inicios_sesion (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address   VARCHAR(45) NULL,               -- Soporte para IPv4 e IPv6
  user_agent   TEXT NULL,                      -- Información del navegador/dispositivo
  estado       ENUM('exitoso', 'fallido') DEFAULT 'exitoso',
  motivo_fallo VARCHAR(255) NULL,              -- Si falló, razón del fallo
  duracion_sesion INT NULL,                    -- Duración en minutos (se actualiza al cerrar sesión)
  fecha_cierre TIMESTAMP NULL,                -- Cuándo cerró sesión
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_historial_usuario (usuario_id),
  INDEX idx_historial_fecha (fecha_inicio),
  INDEX idx_historial_estado (estado)
) ENGINE=InnoDB;

-- 4. Actualizar estados de acceso existentes basados en los datos actuales
-- Usuarios que tienen acceso actualmente
UPDATE usuarios 
SET estado_acceso = 'activo' 
WHERE tiene_acceso = TRUE;

-- Usuarios que tienen password pero no acceso (fueron desactivados)
UPDATE usuarios 
SET estado_acceso = 'tuvo_pero_desactivado' 
WHERE tiene_acceso = FALSE AND password IS NOT NULL AND password != '';

-- Usuarios que nunca tuvieron acceso (sin password)
UPDATE usuarios 
SET estado_acceso = 'nunca_tuvo' 
WHERE tiene_acceso = FALSE AND (password IS NULL OR password = '');

-- 5. Mensaje de finalización
SELECT 'Migración completada exitosamente' as mensaje;

-- 6. Verificación de la migración
SELECT 
    estado_acceso,
    COUNT(*) as cantidad_usuarios,
    COUNT(CASE WHEN tiene_acceso = TRUE THEN 1 END) as con_acceso_activo,
    COUNT(CASE WHEN tiene_acceso = FALSE THEN 1 END) as sin_acceso
FROM usuarios 
GROUP BY estado_acceso;
