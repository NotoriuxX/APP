# Sistema de Permisos Modulares

## 📋 Descripción
Se ha implementado un nuevo sistema de permisos granulares que permite una gestión más intuitiva y escalable de los permisos de usuario en el módulo de trabajadores.

## 🎯 Características Principales

### 1. **Estructura Modular**
- **Inventario de Trabajadores** 📋
- **Control de Impresiones** 🖨️

### 2. **Permisos por Módulo**
Cada módulo incluye 4 permisos básicos:
- **Ver** 👁️ - Permite visualizar información
- **Agregar** ➕ - Permite crear nuevos registros
- **Editar** ✏️ - Permite modificar registros existentes
- **Eliminar** 🗑️ - Permite eliminar registros

### 3. **Comportamiento Inteligente**
- Al **activar un módulo**: Se activan automáticamente todos sus permisos secundarios
- Al **desactivar un módulo**: Se desactivan todos sus permisos secundarios
- **Granularidad**: Se pueden desactivar permisos específicos manteniendo el módulo activo
- **Auto-desactivación**: Si se desactivan todos los permisos secundarios, el módulo se desactiva automáticamente

## 🔧 Implementación Técnica

### Estado de los Permisos
```javascript
const [modulePermissions, setModulePermissions] = useState({
  inventario_trabajadores: {
    enabled: false,
    permissions: {
      ver: false,
      agregar: false,
      editar: false,
      eliminar: false
    }
  },
  control_impresiones: {
    enabled: false,
    permissions: {
      ver: false,
      agregar: false,
      editar: false,
      eliminar: false
    }
  }
});
```

### Funciones Principales
1. **`handleModuleToggle(moduleName)`**: Activa/desactiva un módulo completo
2. **`handleSubPermissionToggle(moduleName, permissionName)`**: Gestiona permisos individuales
3. **`convertModulePermissionsToSpecial()`**: Convierte a formato de backend

### Conversión a Backend
Los permisos se convierten al formato esperado por el backend:
- `inventario_trabajadores_ver`
- `inventario_trabajadores_agregar`
- `control_impresiones_editar`
- etc.

## 🚀 Escalabilidad

### Agregar Nuevos Módulos
Para agregar un nuevo módulo, simplemente:

1. **Actualizar el estado inicial:**
```javascript
setModulePermissions({
  // ...módulos existentes...
  nuevo_modulo: {
    enabled: false,
    permissions: {
      ver: false,
      agregar: false,
      editar: false,
      eliminar: false
    }
  }
});
```

2. **Agregar en el JSX:**
```jsx
<div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
  <div className="flex items-center space-x-3 mb-3">
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        checked={modulePermissions.nuevo_modulo.enabled}
        onChange={() => handleModuleToggle('nuevo_modulo')}
        className="h-5 w-5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
      />
      <span className="text-sm font-medium text-gray-800">
        🆕 Nuevo Módulo
      </span>
    </label>
  </div>
  
  {modulePermissions.nuevo_modulo.enabled && (
    <div className="ml-7 grid grid-cols-2 gap-2 bg-white p-3 rounded border border-gray-200">
      {/* Sub-permisos */}
    </div>
  )}
</div>
```

## 🎨 Interfaz de Usuario

### Diseño Visual
- **Módulos principales**: Destacados con iconos y colores
- **Sub-permisos**: Organizados en cuadrícula de 2 columnas
- **Indicadores visuales**: Iconos descriptivos para cada acción
- **Colores**: Esquema teal consistente con el diseño general

### Experiencia de Usuario
- **Selección intuitiva**: Click en módulo activa todos los permisos
- **Control granular**: Posibilidad de ajustar permisos específicos
- **Feedback visual**: Estados claros de activación/desactivación
- **Información contextual**: Tooltip explicativo del funcionamiento

## 📝 Notas de Desarrollo

### Archivos Modificados
- `frontend/src/pages/inventory/InventoryWorker.jsx`

### Funciones Añadidas
- `handleModuleToggle()`
- `handleSubPermissionToggle()`
- `convertModulePermissionsToSpecial()`

### Estados Añadidos
- `modulePermissions`

### Compatibilidad
- Mantiene compatibilidad con el sistema anterior
- La función `handlePermissionChange()` se conserva para retrocompatibilidad

## 🔮 Futuras Expansiones

El sistema está diseñado para soportar fácilmente:
- **Más módulos** (Inventario General, Reportes, Configuraciones, etc.)
- **Permisos personalizados** por módulo
- **Jerarquías de permisos** más complejas
- **Roles predefinidos** con conjuntos de permisos

---

*Sistema implementado el 9 de julio de 2025 por GitHub Copilot*
