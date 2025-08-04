-- Crear tabla de auditoría para registrar cambios en el sistema
CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  accion ENUM('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'LOGIN', 'LOGOUT', 'ERROR', 'OTRO') NOT NULL,
  tabla_afectada VARCHAR(100) NOT NULL,
  registro_id INT NULL,
  descripcion TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  detalles_json JSON NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_auditoria_usuario (usuario_id),
  INDEX idx_auditoria_tabla (tabla_afectada),
  INDEX idx_auditoria_fecha (fecha),
  INDEX idx_auditoria_accion (accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertamos trigger para registrar cambios en la tabla fotocopias
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS after_fotocopia_insert
AFTER INSERT ON fotocopias
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, descripcion)
  VALUES (NEW.usuario_id, 'CREAR', 'fotocopias', NEW.id, 
    CONCAT('Nuevo registro de fotocopia: ', NEW.cantidad, ' ', 
      CASE WHEN NEW.tipo = 'bn' THEN 'B/N' ELSE 'Color' END, 
      CASE WHEN NEW.doble_hoja = 1 THEN ' (doble hoja)' ELSE '' END));
END$$

CREATE TRIGGER IF NOT EXISTS after_fotocopia_update
AFTER UPDATE ON fotocopias
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, descripcion)
  VALUES (NEW.usuario_id, 'ACTUALIZAR', 'fotocopias', NEW.id, 
    CONCAT('Actualización de registro: ', NEW.cantidad, ' ', 
      CASE WHEN NEW.tipo = 'bn' THEN 'B/N' ELSE 'Color' END, 
      CASE WHEN NEW.doble_hoja = 1 THEN ' (doble hoja)' ELSE '' END));
END$$

CREATE TRIGGER IF NOT EXISTS after_fotocopia_delete
AFTER DELETE ON fotocopias
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, descripcion)
  VALUES (OLD.usuario_id, 'ELIMINAR', 'fotocopias', OLD.id, 
    CONCAT('Eliminación de registro: ', OLD.cantidad, ' ', 
      CASE WHEN OLD.tipo = 'bn' THEN 'B/N' ELSE 'Color' END, 
      CASE WHEN OLD.doble_hoja = 1 THEN ' (doble hoja)' ELSE '' END));
END$$

DELIMITER ;

-- Insertamos algunos registros iniciales de prueba en auditoría
INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, descripcion) 
SELECT id, 'OTRO', 'sistema', NULL, 'Inicialización del sistema de auditoría' FROM usuarios WHERE rol_global = 'propietario' LIMIT 1;
