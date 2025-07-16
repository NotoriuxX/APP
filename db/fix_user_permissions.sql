-- =============================================================
-- SOLUCIÓN: PERMISOS ESPECÍFICOS POR USUARIO
-- =============================================================
-- Este script crea la tabla necesaria para asignar permisos
-- específicos a usuarios individuales, separándolos de los 
-- permisos del rol base.
-- =============================================================

USE inventario;

-- Crear tabla para permisos específicos de usuarios
CREATE TABLE IF NOT EXISTS usuarios_permisos_especiales (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  grupo_id     INT NOT NULL,
  permiso_id   INT NOT NULL,
  concedido_por INT NULL,                      -- Quién otorgó este permiso
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  motivo       VARCHAR(255) NULL,              -- Razón por la cual se otorgó
  estado       ENUM('activo', 'revocado') DEFAULT 'activo',
  fecha_revocacion TIMESTAMP NULL,
  revocado_por INT NULL,
  
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

-- Agregar comentario a la tabla
ALTER TABLE usuarios_permisos_especiales 
COMMENT = 'Permisos específicos asignados a usuarios individuales, independientes de sus roles';

-- Verificar que la tabla fue creada correctamente
SELECT 
  TABLE_NAME,
  TABLE_COMMENT,
  CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'inventario' 
  AND TABLE_NAME = 'usuarios_permisos_especiales';

-- Mostrar estructura de la tabla
DESCRIBE usuarios_permisos_especiales;

-- Verificar permisos atómicos disponibles
SELECT 
  id,
  codigo,
  nombre,
  modulo,
  activo
FROM permisos_atomicos 
WHERE activo = 1
ORDER BY modulo, codigo;

DELIMITER $$

-- Crear procedimiento para asignar permiso específico a usuario
CREATE PROCEDURE IF NOT EXISTS sp_asignar_permiso_usuario(
  IN p_usuario_id INT,
  IN p_grupo_id INT,
  IN p_permiso_codigo VARCHAR(100),
  IN p_concedido_por INT,
  IN p_motivo VARCHAR(255)
)
BEGIN
  DECLARE v_permiso_id INT DEFAULT NULL;
  DECLARE v_existe INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION 
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Buscar el ID del permiso por código
  SELECT id INTO v_permiso_id 
  FROM permisos_atomicos 
  WHERE codigo = p_permiso_codigo AND activo = 1;

  IF v_permiso_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permiso no encontrado o inactivo';
  END IF;

  -- Verificar si ya existe este permiso para el usuario
  SELECT COUNT(*) INTO v_existe
  FROM usuarios_permisos_especiales
  WHERE usuario_id = p_usuario_id 
    AND grupo_id = p_grupo_id 
    AND permiso_id = v_permiso_id
    AND estado = 'activo';

  IF v_existe = 0 THEN
    -- Insertar el nuevo permiso
    INSERT INTO usuarios_permisos_especiales (
      usuario_id, grupo_id, permiso_id, concedido_por, motivo
    ) VALUES (
      p_usuario_id, p_grupo_id, v_permiso_id, p_concedido_por, p_motivo
    );
    
    SELECT CONCAT('Permiso ', p_permiso_codigo, ' asignado correctamente') AS resultado;
  ELSE
    SELECT CONCAT('El usuario ya tiene el permiso ', p_permiso_codigo) AS resultado;
  END IF;

  COMMIT;
END$$

-- Crear procedimiento para revocar permiso específico de usuario
CREATE PROCEDURE IF NOT EXISTS sp_revocar_permiso_usuario(
  IN p_usuario_id INT,
  IN p_grupo_id INT,
  IN p_permiso_codigo VARCHAR(100),
  IN p_revocado_por INT
)
BEGIN
  DECLARE v_permiso_id INT DEFAULT NULL;
  DECLARE v_existe INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION 
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Buscar el ID del permiso por código
  SELECT id INTO v_permiso_id 
  FROM permisos_atomicos 
  WHERE codigo = p_permiso_codigo AND activo = 1;

  IF v_permiso_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permiso no encontrado';
  END IF;

  -- Verificar si existe este permiso activo para el usuario
  SELECT COUNT(*) INTO v_existe
  FROM usuarios_permisos_especiales
  WHERE usuario_id = p_usuario_id 
    AND grupo_id = p_grupo_id 
    AND permiso_id = v_permiso_id
    AND estado = 'activo';

  IF v_existe > 0 THEN
    -- Marcar como revocado
    UPDATE usuarios_permisos_especiales 
    SET estado = 'revocado',
        fecha_revocacion = CURRENT_TIMESTAMP,
        revocado_por = p_revocado_por
    WHERE usuario_id = p_usuario_id 
      AND grupo_id = p_grupo_id 
      AND permiso_id = v_permiso_id
      AND estado = 'activo';
    
    SELECT CONCAT('Permiso ', p_permiso_codigo, ' revocado correctamente') AS resultado;
  ELSE
    SELECT CONCAT('El usuario no tiene el permiso ', p_permiso_codigo, ' activo') AS resultado;
  END IF;

  COMMIT;
END$$

-- Crear función para verificar si un usuario tiene un permiso específico
CREATE FUNCTION IF NOT EXISTS fn_usuario_tiene_permiso(
  p_usuario_id INT,
  p_grupo_id INT,
  p_permiso_codigo VARCHAR(100)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE v_tiene_rol INT DEFAULT 0;
  DECLARE v_tiene_especial INT DEFAULT 0;
  
  -- Verificar si el usuario tiene el permiso a través de su rol
  SELECT COUNT(*) INTO v_tiene_rol
  FROM usuarios_grupos ug
  JOIN roles_permisos rp ON rp.rol_id = ug.rol_id
  JOIN permisos_atomicos pa ON pa.id = rp.permiso_id
  WHERE ug.usuario_id = p_usuario_id 
    AND ug.grupo_id = p_grupo_id
    AND ug.estado = 'activo'
    AND pa.codigo = p_permiso_codigo
    AND pa.activo = 1;

  -- Verificar si el usuario tiene el permiso asignado específicamente
  SELECT COUNT(*) INTO v_tiene_especial
  FROM usuarios_permisos_especiales upe
  JOIN permisos_atomicos pa ON pa.id = upe.permiso_id
  WHERE upe.usuario_id = p_usuario_id 
    AND upe.grupo_id = p_grupo_id
    AND upe.estado = 'activo'
    AND pa.codigo = p_permiso_codigo
    AND pa.activo = 1;

  RETURN (v_tiene_rol > 0 OR v_tiene_especial > 0);
END$$

DELIMITER ;

-- Crear vista para facilitar consultas de permisos de usuarios
CREATE OR REPLACE VIEW v_permisos_usuarios_completo AS
SELECT 
  u.id as usuario_id,
  u.nombre,
  u.apellido,
  u.email,
  g.id as grupo_id,
  g.nombre as grupo_nombre,
  pa.codigo as permiso_codigo,
  pa.nombre as permiso_nombre,
  pa.modulo,
  'rol' as origen_permiso,
  r.nombre as rol_nombre,
  NULL as fecha_asignacion_especial,
  NULL as concedido_por
FROM usuarios u
JOIN usuarios_grupos ug ON u.id = ug.usuario_id
JOIN grupos g ON g.id = ug.grupo_id
JOIN roles r ON r.id = ug.rol_id
JOIN roles_permisos rp ON rp.rol_id = r.id
JOIN permisos_atomicos pa ON pa.id = rp.permiso_id
WHERE ug.estado = 'activo'
  AND pa.activo = 1

UNION ALL

SELECT 
  u.id as usuario_id,
  u.nombre,
  u.apellido,
  u.email,
  g.id as grupo_id,
  g.nombre as grupo_nombre,
  pa.codigo as permiso_codigo,
  pa.nombre as permiso_nombre,
  pa.modulo,
  'especial' as origen_permiso,
  NULL as rol_nombre,
  upe.fecha_asignacion as fecha_asignacion_especial,
  upe.concedido_por
FROM usuarios u
JOIN usuarios_permisos_especiales upe ON u.id = upe.usuario_id
JOIN grupos g ON g.id = upe.grupo_id
JOIN permisos_atomicos pa ON pa.id = upe.permiso_id
WHERE upe.estado = 'activo'
  AND pa.activo = 1;

-- Mostrar información del sistema de permisos
SELECT 'Sistema de permisos específicos por usuario instalado correctamente' AS status;

-- Ejemplos de uso:
-- Para asignar un permiso específico:
-- CALL sp_asignar_permiso_usuario(123, 1, 'trabajadores.editar', 1, 'Permiso adicional para gestión');

-- Para revocar un permiso específico:
-- CALL sp_revocar_permiso_usuario(123, 1, 'trabajadores.editar', 1);

-- Para verificar si un usuario tiene un permiso:
-- SELECT fn_usuario_tiene_permiso(123, 1, 'trabajadores.editar') AS tiene_permiso;

-- Para ver todos los permisos de un usuario:
-- SELECT * FROM v_permisos_usuarios_completo WHERE usuario_id = 123 AND grupo_id = 1;
