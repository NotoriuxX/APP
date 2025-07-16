-- =============================================================
-- MIGRACIÓN: Agregar tabla de permisos específicos por usuario
-- =============================================================
-- Este script agrega la tabla usuarios_permisos_especiales
-- sin afectar los datos existentes en la base de datos
-- =============================================================

USE inventario;

-- Verificar si la tabla ya existe
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'La tabla usuarios_permisos_especiales ya existe'
    ELSE 'Creando tabla usuarios_permisos_especiales...'
  END AS status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'inventario' 
  AND TABLE_NAME = 'usuarios_permisos_especiales';

-- Crear tabla solo si no existe
CREATE TABLE IF NOT EXISTS usuarios_permisos_especiales (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT NOT NULL,
  grupo_id         INT NOT NULL,
  permiso_id       INT NOT NULL,
  concedido_por    INT NULL,                    -- Quién otorgó este permiso
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  motivo           VARCHAR(255) NULL,           -- Razón por la cual se otorgó
  estado           ENUM('activo', 'revocado') DEFAULT 'activo',
  fecha_revocacion TIMESTAMP NULL,
  revocado_por     INT NULL,
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
  FOREIGN KEY (permiso_id) REFERENCES permisos_atomicos(id) ON DELETE CASCADE,
  FOREIGN KEY (concedido_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (revocado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  
  -- Evitar duplicados: un usuario no puede tener el mismo permiso dos veces en el mismo grupo
  UNIQUE KEY ux_usuario_permiso_grupo (usuario_id, grupo_id, permiso_id),
  
  INDEX idx_usuarios_permisos_usuario (usuario_id),
  INDEX idx_usuarios_permisos_grupo (grupo_id),
  INDEX idx_usuarios_permisos_permiso (permiso_id),
  INDEX idx_usuarios_permisos_estado (estado),
  INDEX idx_usuarios_permisos_fecha (fecha_asignacion)
) ENGINE=InnoDB;

-- Verificar que la tabla fue creada
SELECT 
  'Tabla usuarios_permisos_especiales creada correctamente' AS resultado,
  COUNT(*) as registros_existentes
FROM usuarios_permisos_especiales;

-- Mostrar estructura de la tabla
DESCRIBE usuarios_permisos_especiales;
