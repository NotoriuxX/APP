/* =============================================================
   BASE DE DATOS · INVENTARIO
   ============================================================= */
CREATE DATABASE IF NOT EXISTS inventario
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE inventario;

/* =============================================================
   0) USUARIOS (global)
   ============================================================= */
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(255)       NOT NULL,
  apellido     VARCHAR(255)       NOT NULL,
  email        VARCHAR(255)       NULL,        -- Email opcional para trabajadores sin acceso
  rut          VARCHAR(20)        NULL,        -- RUT del usuario (opcional)
  password     VARCHAR(255)       NULL,        -- Password opcional (solo para usuarios con acceso)
  password_backup VARCHAR(255)    NULL,        -- Backup del password cuando se desactiva (encriptado)
  rol_global   ENUM('propietario','administrador','tecnico','trabajador') DEFAULT 'trabajador',
  tiene_acceso BOOLEAN DEFAULT FALSE,          -- Indica si puede acceder al sistema actualmente
  estado_acceso ENUM('nunca_tuvo', 'tuvo_pero_desactivado', 'activo') DEFAULT 'nunca_tuvo', -- Estado histórico de acceso
  primer_acceso TIMESTAMP NULL,               -- Fecha del primer acceso al sistema
  ultimo_acceso TIMESTAMP NULL,               -- Fecha del último acceso al sistema
  total_inicios_sesion INT DEFAULT 0,         -- Contador total de inicios de sesión
  fecha_desactivacion TIMESTAMP NULL,         -- Cuándo se desactivó el acceso (si aplica)
  motivo_desactivacion VARCHAR(255) NULL,     -- Razón por la cual se desactivó
  trabajador_id INT UNIQUE NULL,
  creado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_usuarios_email (email),        -- Email único solo si no es NULL
  INDEX idx_usuarios_email (email),
  INDEX idx_usuarios_rut (rut),
  INDEX idx_usuarios_acceso (tiene_acceso),
  INDEX idx_usuarios_estado_acceso (estado_acceso),
  INDEX idx_usuarios_ultimo_acceso (ultimo_acceso),
  INDEX idx_usuarios_primer_acceso (primer_acceso)
) ENGINE=InnoDB;

/* =============================================================
   0.1) HISTORIAL DE INICIOS DE SESIÓN
   ============================================================= */
DROP TABLE IF EXISTS historial_inicios_sesion;
CREATE TABLE historial_inicios_sesion (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address   VARCHAR(45) NULL,               -- Soporte para IPv4 e IPv6
  user_agent   TEXT NULL,                      -- Información del navegador/dispositivo
  estado       ENUM('exitoso', 'fallido', 'logout') DEFAULT 'exitoso',
  motivo_fallo VARCHAR(255) NULL,              -- Si falló, razón del fallo
  duracion_sesion INT NULL,                    -- Duración en minutos (se actualiza al cerrar sesión)
  fecha_cierre TIMESTAMP NULL,                -- Cuándo cerró sesión
  es_primer_acceso BOOLEAN DEFAULT FALSE,     -- Indica si es el primer acceso del usuario
  dispositivo_tipo ENUM('web', 'mobile', 'tablet', 'desktop') DEFAULT 'web', -- Tipo de dispositivo
  ubicacion_aproximada VARCHAR(255) NULL,     -- Ciudad/país si se puede determinar
  sesion_activa BOOLEAN DEFAULT TRUE,         -- Si la sesión sigue activa
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_historial_usuario (usuario_id),
  INDEX idx_historial_fecha (fecha_inicio),
  INDEX idx_historial_estado (estado),
  INDEX idx_historial_activa (sesion_activa),
  INDEX idx_historial_primer_acceso (es_primer_acceso)
) ENGINE=InnoDB;

/* =============================================================
   0.2) HISTORIAL DE CAMBIOS DE ESTADO DE ACCESO
   ============================================================= */
DROP TABLE IF EXISTS historial_estados_acceso;
CREATE TABLE historial_estados_acceso (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id        INT NOT NULL,
  estado_anterior   ENUM('nunca_tuvo', 'tuvo_pero_desactivado', 'activo') NULL,
  estado_nuevo      ENUM('nunca_tuvo', 'tuvo_pero_desactivado', 'activo') NOT NULL,
  motivo_cambio     VARCHAR(255) NULL,          -- Razón del cambio de estado
  realizado_por     INT NULL,                   -- Quién hizo el cambio
  fecha_cambio      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  observaciones     TEXT NULL,                  -- Notas adicionales
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (realizado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_historial_estados_usuario (usuario_id),
  INDEX idx_historial_estados_fecha (fecha_cambio),
  INDEX idx_historial_estados_nuevo (estado_nuevo)
) ENGINE=InnoDB;



/* =============================================================
   1) ROLES Y PERMISOS (RBAC) - Sistema Jerárquico
   ============================================================= */
DROP TABLE IF EXISTS roles_permisos;
DROP TABLE IF EXISTS permisos_modulos;
DROP TABLE IF EXISTS modulos_sistema;
DROP TABLE IF EXISTS roles;

-- Tabla de roles del sistema
CREATE TABLE roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  es_activo   BOOLEAN DEFAULT TRUE,
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla de módulos principales del sistema
CREATE TABLE modulos_sistema (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(50) UNIQUE NOT NULL,
  nombre       VARCHAR(100) NOT NULL,
  descripcion  TEXT,
  icono        VARCHAR(50),           -- Clase de icono (ej: 'fa-users')
  orden        INT DEFAULT 0,         -- Para ordenar en el UI
  es_activo    BOOLEAN DEFAULT TRUE,
  creado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla de permisos específicos por módulo
CREATE TABLE permisos_modulos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  modulo_id    INT NOT NULL,
  codigo       VARCHAR(50) NOT NULL,  -- ej: 'ver', 'editar', etc.
  nombre       VARCHAR(100) NOT NULL,
  descripcion  TEXT,
  es_activo    BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (modulo_id) REFERENCES modulos_sistema(id) ON DELETE CASCADE,
  UNIQUE KEY ux_modulo_permiso (modulo_id, codigo)
) ENGINE=InnoDB;

-- Tabla de asignación de permisos a roles
CREATE TABLE roles_permisos (
  rol_id       INT NOT NULL,
  permiso_id   INT NOT NULL,
  asignado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  asignado_por INT,
  PRIMARY KEY (rol_id, permiso_id),
  FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permiso_id) REFERENCES permisos_modulos(id) ON DELETE CASCADE,
  FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

/* -------------------------------------------------------------
   Datos iniciales: Roles
   ------------------------------------------------------------- */
INSERT INTO roles (nombre, descripcion) VALUES
('propietario', 'Propietario - Máximo nivel de autoridad y control total'),
('administrador', 'Control total del sistema y configuración'),
('supervisor', 'Supervisión de departamentos y reportes'),
('tecnico', 'Gestión técnica y mantenimiento'),
('trabajador', 'Acceso básico a funciones asignadas'),
('inspector', 'Revisión y auditoría de procesos'),
('encargado_impresiones', 'Gestión del sistema de impresiones');

/* -------------------------------------------------------------
   Datos iniciales: Módulos del Sistema
   ------------------------------------------------------------- */
INSERT INTO modulos_sistema (codigo, nombre, descripcion, icono, orden) VALUES
('impresiones', 'Sistema de Impresiones', 'Gestión completa del sistema de impresiones', 'fa-print', 10),
('trabajadores', 'Gestión de Trabajadores', 'Administración de personal y permisos', 'fa-users', 20),
('departamentos', 'Departamentos', 'Gestión de departamentos y áreas', 'fa-building', 30),
('reportes', 'Reportes y Estadísticas', 'Generación y visualización de reportes', 'fa-chart-bar', 40),
('configuracion', 'Configuración', 'Configuración general del sistema', 'fa-cog', 50);

/* -------------------------------------------------------------
   Datos iniciales: Permisos por Módulo
   ------------------------------------------------------------- */
INSERT INTO permisos_modulos (modulo_id, codigo, nombre, descripcion) 
SELECT 
  m.id,
  'ver',
  'Ver',
  CONCAT('Permiso para ver ', m.nombre)
FROM modulos_sistema m
UNION ALL
SELECT 
  m.id,
  'crear',
  'Crear',
  CONCAT('Permiso para crear en ', m.nombre)
FROM modulos_sistema m
UNION ALL
SELECT 
  m.id,
  'editar',
  'Editar',
  CONCAT('Permiso para editar en ', m.nombre)
FROM modulos_sistema m
UNION ALL
SELECT 
  m.id,
  'eliminar',
  'Eliminar',
  CONCAT('Permiso para eliminar en ', m.nombre)
FROM modulos_sistema m;

/* -------------------------------------------------------------
   Asignación inicial de permisos a roles
   ------------------------------------------------------------- */
-- Asignar todos los permisos al administrador
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'administrador'),
  pm.id
FROM permisos_modulos pm;

/* =============================================================
   ROLES EMPRESARIALES COMPLETOS
   ============================================================= */
-- Agregar todos los roles que existen en una empresa real
INSERT INTO roles (nombre, descripcion) VALUES
('trabajador', 'Trabajador - Acceso básico a funciones asignadas'),
('operario', 'Operario - Operación de equipos y procesos básicos'),
('asistente', 'Asistente - Apoyo administrativo y tareas específicas'),
('tecnico', 'Técnico - Gestión técnica y mantenimiento'),
('especialista', 'Especialista - Conocimiento técnico especializado'),
('analista', 'Analista - Análisis de datos y procesos'),
('coordinador', 'Coordinador - Coordinación de actividades entre equipos'),
('supervisor', 'Supervisor - Supervisión de departamentos y reportes'),
('encargado', 'Encargado - Responsable de una sección específica'),
('jefe_seccion', 'Jefe de Sección - Liderazgo de sección específica'),
('jefe_departamento', 'Jefe de Departamento - Liderazgo departamental completo'),
('subgerente', 'Subgerente - Apoyo en la gestión gerencial'),
('gerente', 'Gerente - Supervisión completa de su área y toma de decisiones'),
('director', 'Director - Dirección estratégica y supervisión general'),
('administrador', 'Administrador - Control total del sistema'),
('secretario', 'Secretario - Apoyo administrativo y documentación'),
('recepcionista', 'Recepcionista - Atención y registro de visitas'),
('contador', 'Contador - Gestión financiera y contable'),
('auditor', 'Auditor - Revisión y auditoría de procesos'),
('inspector', 'Inspector - Inspección y control de calidad'),
('vendedor', 'Vendedor - Gestión de ventas y atención al cliente'),
('encargado_ventas', 'Encargado de Ventas - Supervisión del área comercial'),
('encargado_compras', 'Encargado de Compras - Gestión de adquisiciones'),
('encargado_logistica', 'Encargado de Logística - Gestión de distribución'),
('encargado_inventario', 'Encargado de Inventario - Gestión de stock y materiales'),
('encargado_mantenimiento', 'Encargado de Mantenimiento - Mantenimiento de instalaciones'),
('encargado_recursos_humanos', 'Encargado de RRHH - Gestión del personal'),
('encargado_sistemas', 'Encargado de Sistemas - Gestión de TI y sistemas'),
('encargado_seguridad', 'Encargado de Seguridad - Gestión de seguridad laboral'),
('encargado_calidad', 'Encargado de Calidad - Control y aseguramiento de calidad'),
('practicante', 'Practicante - Estudiante en práctica profesional'),
('temporal', 'Trabajador Temporal - Contrato por tiempo determinado'),
('externo', 'Trabajador Externo - Colaborador externo o consultor')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

/* -------------------------------------------------------------
   Asignación de permisos por roles empresariales
   ------------------------------------------------------------- */
-- ADMINISTRADOR: Todos los permisos (ya está configurado arriba)

-- DIRECTOR: Todos los permisos excepto configuración crítica
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'director'),
  pm.id
FROM permisos_modulos pm;

-- GERENTE: Permisos amplios sin configuración del sistema
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'gerente'),
  pm.id
FROM permisos_modulos pm
JOIN modulos_sistema ms ON pm.modulo_id = ms.id
WHERE ms.codigo != 'configuracion' OR pm.codigo = 'ver';

-- SUBGERENTE: Similar a gerente pero sin eliminar
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'subgerente'),
  pm.id
FROM permisos_modulos pm
JOIN modulos_sistema ms ON pm.modulo_id = ms.id
WHERE (ms.codigo != 'configuracion' AND pm.codigo != 'eliminar') OR pm.codigo = 'ver';

-- JEFE DE DEPARTAMENTO: Permisos departamentales completos
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'jefe_departamento'),
  pm.id
FROM permisos_modulos pm
JOIN modulos_sistema ms ON pm.modulo_id = ms.id
WHERE ms.codigo IN ('trabajadores', 'departamentos', 'reportes');

-- JEFE DE SECCIÓN: Permisos limitados a su sección
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'jefe_seccion'),
  pm.id
FROM permisos_modulos pm
JOIN modulos_sistema ms ON pm.modulo_id = ms.id
WHERE ms.codigo IN ('trabajadores', 'departamentos') AND pm.codigo IN ('ver', 'editar');

-- SUPERVISOR: Ver, crear y editar (sin eliminar)
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'supervisor'),
  pm.id
FROM permisos_modulos pm
WHERE pm.codigo IN ('ver', 'crear', 'editar');

-- ENCARGADO: Permisos específicos según área
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'encargado'),
  pm.id
FROM permisos_modulos pm
JOIN modulos_sistema ms ON pm.modulo_id = ms.id
WHERE ms.codigo IN ('trabajadores', 'departamentos') AND pm.codigo IN ('ver', 'crear', 'editar');

-- COORDINADOR: Ver y editar para coordinación
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'coordinador'),
  pm.id
FROM permisos_modulos pm
WHERE pm.codigo IN ('ver', 'editar');

-- ESPECIALISTA: Ver, crear y editar técnico
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'especialista'),
  pm.id
FROM permisos_modulos pm
WHERE pm.codigo IN ('ver', 'crear', 'editar');

-- TÉCNICO: Ver y editar básico
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'tecnico'),
  pm.id
FROM permisos_modulos pm
WHERE pm.codigo IN ('ver', 'editar');

-- ANALISTA: Ver y crear reportes principalmente
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'analista'),
  pm.id
FROM permisos_modulos pm
JOIN modulos_sistema ms ON pm.modulo_id = ms.id
WHERE (ms.codigo = 'reportes' AND pm.codigo IN ('ver', 'crear')) 
   OR (ms.codigo != 'reportes' AND pm.codigo = 'ver');

-- ASISTENTE: Solo ver y editar básico
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'asistente'),
  pm.id
FROM permisos_modulos pm
JOIN modulos_sistema ms ON pm.modulo_id = ms.id
WHERE ms.codigo IN ('trabajadores', 'departamentos') AND pm.codigo IN ('ver', 'editar');

-- OPERARIO: Solo ver
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'operario'),
  pm.id
FROM permisos_modulos pm
WHERE pm.codigo = 'ver';

-- TRABAJADOR: Solo ver
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'trabajador'),
  pm.id
FROM permisos_modulos pm
WHERE pm.codigo = 'ver';

-- ROLES ADMINISTRATIVOS ESPECÍFICOS
-- SECRETARIO: Ver y editar administrativo
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'secretario'),
  pm.id
FROM permisos_modulos pm
JOIN modulos_sistema ms ON pm.modulo_id = ms.id
WHERE ms.codigo IN ('trabajadores', 'departamentos') AND pm.codigo IN ('ver', 'editar');

-- RECEPCIONISTA: Solo ver básico
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'recepcionista'),
  pm.id
FROM permisos_modulos pm
JOIN modulos_sistema ms ON pm.modulo_id = ms.id
WHERE ms.codigo = 'trabajadores' AND pm.codigo = 'ver';

-- ROLES DE CONTROL Y AUDITORÍA
-- AUDITOR: Ver todos los módulos para auditoría
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'auditor'),
  pm.id
FROM permisos_modulos pm
WHERE pm.codigo = 'ver';

-- INSPECTOR: Ver para inspección
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'inspector'),
  pm.id
FROM permisos_modulos pm
WHERE pm.codigo = 'ver';

-- ROLES ESPECIALIZADOS POR ÁREA (Permisos básicos, se pueden expandir)
-- Todos los encargados especializados: ver y editar básico
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  r.id,
  pm.id
FROM roles r
CROSS JOIN permisos_modulos pm
WHERE r.nombre IN (
  'encargado_ventas', 'encargado_compras', 'encargado_logistica', 
  'encargado_inventario', 'encargado_mantenimiento', 'encargado_recursos_humanos', 
  'encargado_sistemas', 'encargado_seguridad', 'encargado_calidad',
  'contador', 'vendedor'
) AND pm.codigo IN ('ver', 'editar');

-- ROLES TEMPORALES: Solo ver
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT 
  r.id,
  pm.id
FROM roles r
CROSS JOIN permisos_modulos pm
WHERE r.nombre IN ('practicante', 'temporal', 'externo') AND pm.codigo = 'ver';

/* =============================================================
   TABLAS FALTANTES PARA EL SISTEMA DE GRUPOS Y PERMISOS
   ============================================================= */

/* =============================================================
   TABLA GRUPOS
   ============================================================= */
DROP TABLE IF EXISTS grupos;
CREATE TABLE grupos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(255)       NOT NULL,
  descripcion   TEXT               NULL,
  propietario_id INT               NOT NULL,
  es_personal   BOOLEAN            DEFAULT FALSE,
  activo        BOOLEAN            DEFAULT TRUE,
  creado_en     TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_grupos_propietario (propietario_id),
  INDEX idx_grupos_activo (activo),
  FOREIGN KEY (propietario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

/* =============================================================
   TABLA USUARIOS_GRUPOS (relación muchos a muchos)
   ============================================================= */
DROP TABLE IF EXISTS usuarios_grupos;
CREATE TABLE usuarios_grupos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT                NOT NULL,
  grupo_id      INT                NOT NULL,
  rol_id        INT                NOT NULL,
  estado        ENUM('activo', 'inactivo', 'pendiente') DEFAULT 'activo',
  fecha_union   TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  fecha_salida  TIMESTAMP          NULL,
  creado_en     TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_usuario_grupo (usuario_id, grupo_id),
  INDEX idx_usuarios_grupos_usuario (usuario_id),
  INDEX idx_usuarios_grupos_grupo (grupo_id),
  INDEX idx_usuarios_grupos_rol (rol_id),
  INDEX idx_usuarios_grupos_estado (estado),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
  FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

/* =============================================================
   TIPOS DE HOJA Y FOTOCOPIAS
   ============================================================= */
CREATE TABLE IF NOT EXISTS tipos_hoja (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  costo_unitario DECIMAL(10,2) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_tipos_hoja_nombre (nombre)
) ENGINE=InnoDB;

-- Insertar tipos de hoja básicos (usar IGNORE para evitar errores si ya existen)
INSERT IGNORE INTO tipos_hoja (nombre, descripcion, costo_unitario) VALUES
('Carta', 'Papel tamaño carta estándar', 50.00),
('Oficio', 'Papel tamaño oficio', 60.00),
('Couche', 'Papel couche para impresiones especiales', 100.00),
('A4', 'Papel tamaño A4 internacional', 55.00),
('Legal', 'Papel tamaño legal', 65.00),
('Adhesivo', 'Papel adhesivo para etiquetas', 120.00),
('Transparencia', 'Papel transparencia para proyecciones', 150.00);

-- Tabla de fotocopias
DROP TABLE IF EXISTS fotocopias;
CREATE TABLE fotocopias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cantidad INT NOT NULL,
  multiplicador INT NOT NULL DEFAULT 1,
  tipo ENUM('bn', 'color') NOT NULL,
  tipo_hoja_id INT NOT NULL,
  doble_hoja BOOLEAN DEFAULT FALSE,
  comentario TEXT,
  total_hojas INT NOT NULL,
  usuario_id INT NOT NULL,
  grupo_id INT,
  registrado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (grupo_id) REFERENCES grupos(id),
  FOREIGN KEY (tipo_hoja_id) REFERENCES tipos_hoja(id),
  INDEX idx_fotocopias_tipo (tipo),
  INDEX idx_fotocopias_fecha (registrado_en)
) ENGINE=InnoDB;

-- Tabla de auditoría de fotocopias
DROP TABLE IF EXISTS auditoria_fotocopias;
CREATE TABLE auditoria_fotocopias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fotocopia_id INT,
  usuario_id INT NOT NULL,
  accion ENUM('crear', 'actualizar', 'eliminar') NOT NULL,
  cantidad INT NOT NULL,
  multiplicador INT NOT NULL,
  tipo ENUM('bn', 'color') NOT NULL,
  tipo_hoja_id INT NOT NULL,
  doble_hoja BOOLEAN NOT NULL,
  comentario TEXT,
  total_hojas INT NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_auditoria_fotocopia (fotocopia_id),
  INDEX idx_auditoria_fecha (fecha)
) ENGINE=InnoDB;

/* =============================================================
   TABLA DEPARTAMENTOS
   ============================================================= */
DROP TABLE IF EXISTS departamentos;
CREATE TABLE departamentos (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(255)       NOT NULL,
  grupo_id  INT                NOT NULL,
  descripcion TEXT             NULL,
  activo    BOOLEAN            DEFAULT TRUE,
  creado_en TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_departamento_nombre_grupo (nombre, grupo_id),
  INDEX idx_departamentos_grupo (grupo_id),
  INDEX idx_departamentos_activo (activo),
  FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

/* =============================================================
   TABLA TRABAJADORES
   ============================================================= */
DROP TABLE IF EXISTS trabajadores;
CREATE TABLE trabajadores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT                NOT NULL,
  grupo_id      INT                NOT NULL,
  cargo         VARCHAR(255)       NULL,
  departamento  VARCHAR(255)       NULL,
  departamento_id INT              NULL,
  activo        BOOLEAN            DEFAULT TRUE,
  es_propietario BOOLEAN           DEFAULT FALSE,
  solo_lectura  BOOLEAN            DEFAULT FALSE,
  puede_gestionar_cuenta BOOLEAN   DEFAULT TRUE,
  creado_en     TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_trabajador_usuario_grupo (usuario_id, grupo_id),
  INDEX idx_trabajadores_usuario (usuario_id),
  INDEX idx_trabajadores_grupo (grupo_id),
  INDEX idx_trabajadores_departamento (departamento_id),
  INDEX idx_trabajadores_activo (activo),
  INDEX idx_trabajadores_propietario (es_propietario),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

/* =============================================================
   TABLA PERMISOS_ATOMICOS (permisos granulares)
   ============================================================= */
DROP TABLE IF EXISTS permisos_atomicos;
CREATE TABLE permisos_atomicos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(100)       NOT NULL UNIQUE,
  nombre        VARCHAR(255)       NOT NULL,
  descripcion   TEXT               NULL,
  modulo        VARCHAR(100)       NOT NULL,
  activo        BOOLEAN            DEFAULT TRUE,
  creado_en     TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_permisos_atomicos_codigo (codigo),
  INDEX idx_permisos_atomicos_modulo (modulo),
  INDEX idx_permisos_atomicos_activo (activo)
) ENGINE=InnoDB;

/* =============================================================
   INSERTAR DATOS INICIALES PARA NUEVAS TABLAS
   ============================================================= */

-- Insertar permisos atómicos básicos
INSERT IGNORE INTO permisos_atomicos (codigo, nombre, descripcion, modulo) VALUES 
-- Módulo Trabajadores
('trabajador_leer', 'Ver trabajadores', 'Permite ver la lista de trabajadores', 'trabajadores'),
('trabajador_escribir', 'Crear trabajadores', 'Permite crear nuevos trabajadores', 'trabajadores'),
('trabajador_editar', 'Editar trabajadores', 'Permite editar información de trabajadores', 'trabajadores'),
('trabajador_eliminar', 'Eliminar trabajadores', 'Permite eliminar trabajadores', 'trabajadores'),

-- Módulo Inventario
('inventario_leer', 'Ver inventario', 'Permite ver elementos del inventario', 'inventario'),
('inventario_escribir', 'Crear inventario', 'Permite crear nuevos elementos en inventario', 'inventario'),
('inventario_editar', 'Editar inventario', 'Permite editar elementos del inventario', 'inventario'),
('inventario_eliminar', 'Eliminar inventario', 'Permite eliminar elementos del inventario', 'inventario'),

-- Módulo Fotocopias
('fotocopia_leer', 'Ver fotocopias', 'Permite ver registros de fotocopias', 'fotocopias'),
('fotocopia_escribir', 'Crear fotocopias', 'Permite crear nuevos registros de fotocopias', 'fotocopias'),
('fotocopia_editar', 'Editar fotocopias', 'Permite editar registros de fotocopias', 'fotocopias'),
('fotocopia_eliminar', 'Eliminar fotocopias', 'Permite eliminar registros de fotocopias', 'fotocopias'),

-- Módulo Administración
('admin_usuarios', 'Gestionar usuarios', 'Permite gestionar cuentas de usuario', 'administracion'),
('admin_permisos', 'Gestionar permisos', 'Permite asignar y modificar permisos', 'administracion'),
('admin_configuracion', 'Configuración del sistema', 'Permite modificar configuración general', 'administracion');

-- Asignar permisos básicos al rol de trabajador
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id) 
SELECT r.id, p.id 
FROM roles r, permisos_atomicos p 
WHERE r.nombre = 'trabajador' 
AND p.codigo IN ('trabajador_leer', 'inventario_leer', 'fotocopia_leer');

-- Asignar permisos completos al rol de propietario
INSERT IGNORE INTO roles_permisos (rol_id, permiso_id) 
SELECT r.id, p.id 
FROM roles r, permisos_atomicos p 
WHERE r.nombre = 'propietario';

/* =============================================================
   TABLA USUARIOS_PERMISOS_ESPECIALES (permisos específicos por usuario)
   ============================================================= */
DROP TABLE IF EXISTS usuarios_permisos_especiales;
CREATE TABLE usuarios_permisos_especiales (
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

/* =============================================================
   INSERTAR DATOS DE PRUEBA PARA FOTOCOPIAS (opcional)
   ============================================================= */
-- Se puede agregar datos de prueba aquí si es necesario
-- NOTA: La tabla fotocopias se define en la línea 112 con todas las columnas necesarias

/* =============================================================
   TABLA AUDITORIA (registro de cambios y acciones)
   ============================================================= */
DROP TABLE IF EXISTS auditoria;
CREATE TABLE auditoria (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT NULL,
  accion          VARCHAR(50) NOT NULL,           -- CREAR, EDITAR, ELIMINAR, LOGIN, etc.
  tabla_afectada  VARCHAR(100) NULL,              -- Nombre de la tabla afectada
  registro_id     INT NULL,                       -- ID del registro afectado
  descripcion     TEXT NULL,                      -- Descripción detallada de la acción
  datos_anteriores JSON NULL,                     -- Datos antes del cambio (para EDITAR/ELIMINAR)
  datos_nuevos    JSON NULL,                      -- Datos después del cambio (para CREAR/EDITAR)
  ip_address      VARCHAR(45) NULL,               -- IP desde donde se realizó la acción
  user_agent      TEXT NULL,                      -- Información del navegador
  fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_auditoria_usuario (usuario_id),
  INDEX idx_auditoria_fecha (fecha),
  INDEX idx_auditoria_accion (accion),
  INDEX idx_auditoria_tabla (tabla_afectada),
  INDEX idx_auditoria_registro (registro_id),
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;