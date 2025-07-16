# 06. EXTENSIÓN DE LA PALETA TEAL A OTROS MÓDULOS

## 📋 OBJETIVO
Documentar cómo replicar y aplicar la paleta de colores teal de PhotocopyPage.jsx en otros módulos del sistema, como InventoryWorker.jsx.

## 🎨 PALETA DE COLORES TEAL COMPLETA

### Colores Base Teal
```css
/* Palette Teal (#14B8A6) */
teal-50:  #F0FDFA  /* Fondos suaves, contenedores de info */
teal-100: #CCFBF1  /* Botones secundarios, badges informativos */
teal-200: #99F6E4  /* Bordes suaves */
teal-500: #14B8A6  /* Focus rings, bordes activos */
teal-600: #0D9488  /* Botones primarios, iconos de orden */
teal-700: #0F766E  /* Hover de botones principales */
teal-800: #115E59  /* Texto en contenedores teal-100/200 */
teal-900: #134E4A  /* Textos de encabezados importantes */
```

## 🔧 APLICACIÓN PRÁCTICA IMPLEMENTADA

### 1. Elementos Principales

#### Botones Primarios
```jsx
// ✅ ANTES (azul)
className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"

// ✅ DESPUÉS (teal)
className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
```

#### Estados de Focus
```jsx
// ✅ ANTES (azul)
className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

// ✅ DESPUÉS (teal)
className="focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
```

#### Indicadores de Carga
```jsx
// ✅ ANTES (azul)
className="border-2 border-blue-600 border-t-transparent rounded-full"

// ✅ DESPUÉS (teal)
className="border-2 border-teal-600 border-t-transparent rounded-full"
```

### 2. Componentes de UI

#### Iconos de Ordenamiento
```jsx
// ✅ ANTES (azul)
<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor">

// ✅ DESPUÉS (teal)
<svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor">
```

#### Paginación Activa
```jsx
// ✅ ANTES (azul)
className="bg-blue-600 text-white border-blue-600"

// ✅ DESPUÉS (teal)
className="bg-teal-600 text-white border-teal-600"
```

#### Badges/Pills
```jsx
// ✅ ANTES (amarillo/azul)
className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
className="bg-blue-100 text-blue-800 hover:bg-blue-200"

// ✅ DESPUÉS (teal)
className="bg-teal-100 text-teal-800 hover:bg-teal-200"
```

### 3. Contenedores de Información

#### Header con Información
```jsx
// ✅ IMPLEMENTADO - Contenedor informativo
<div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
  <p className="text-teal-800 text-sm">
    📋 Administra el personal de la empresa y crea cuentas de usuario para el sistema
  </p>
</div>
```

#### Títulos Principales
```jsx
// ✅ ANTES (gris)
<h1 className="text-3xl font-bold text-gray-900 mb-2">

// ✅ DESPUÉS (teal)
<h1 className="text-3xl font-bold text-teal-900 mb-2">
```

## 📝 CHECKLIST DE CONVERSIÓN

### ✅ Elementos Convertidos en InventoryWorker.jsx

- [x] **Botón "Nuevo Trabajador"**: `bg-blue-600` → `bg-teal-600`
- [x] **Indicador de carga**: `border-blue-600` → `border-teal-600`
- [x] **Campos de entrada**: `focus:ring-blue-500` → `focus:ring-teal-500`
- [x] **Selectores**: `focus:ring-blue-500` → `focus:ring-teal-500`
- [x] **Botones de formulario**: `bg-blue-600` → `bg-teal-600`
- [x] **Botón modal usuario**: `bg-blue-600` → `bg-teal-600`
- [x] **Paginación activa**: `bg-blue-600` → `bg-teal-600`
- [x] **Iconos de ordenamiento**: `text-blue-600` → `text-teal-600`
- [x] **Badge "Crear cuenta"**: `bg-yellow-100` → `bg-teal-100`
- [x] **Badge "Reactivar"**: `bg-blue-100` → `bg-teal-100`
- [x] **Título principal**: `text-gray-900` → `text-teal-900`
- [x] **Contenedor informativo**: Nuevo con `bg-teal-50 border-teal-200`

### 🎯 Patrones de Reemplazo Comunes

```javascript
// Script de reemplazo automático
const tealReplacements = [
  // Botones primarios
  { from: 'bg-blue-600', to: 'bg-teal-600' },
  { from: 'hover:bg-blue-700', to: 'hover:bg-teal-700' },
  { from: 'border-blue-600', to: 'border-teal-600' },
  
  // Focus states
  { from: 'focus:ring-blue-500', to: 'focus:ring-teal-500' },
  { from: 'focus:border-blue-500', to: 'focus:border-teal-500' },
  
  // Text colors para iconos activos
  { from: 'text-blue-600', to: 'text-teal-600' },
  
  // Badges secundarios
  { from: 'bg-blue-100', to: 'bg-teal-100' },
  { from: 'text-blue-800', to: 'text-teal-800' },
  { from: 'hover:bg-blue-200', to: 'hover:bg-teal-200' },
  
  // Títulos importantes
  { from: 'text-gray-900', to: 'text-teal-900' } // Solo para h1, h2 principales
];
```

## 🚀 GUÍA PASO A PASO PARA OTROS MÓDULOS

### Paso 1: Identificar Elementos
1. Buscar todos los `bg-blue-*` en el archivo
2. Buscar todos los `focus:ring-blue-*`
3. Buscar todos los `text-blue-*` en iconos activos
4. Buscar todos los `border-blue-*`

### Paso 2: Aplicar Reemplazos
```bash
# Ejemplo con sed (Linux/Mac)
sed -i 's/bg-blue-600/bg-teal-600/g' archivo.jsx
sed -i 's/hover:bg-blue-700/hover:bg-teal-700/g' archivo.jsx
sed -i 's/focus:ring-blue-500/focus:ring-teal-500/g' archivo.jsx
```

### Paso 3: Mejorar con Elementos Teal
```jsx
// Agregar contenedores informativos
<div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
  <p className="text-teal-800">Información importante</p>
</div>

// Actualizar títulos principales
<h1 className="text-teal-900 font-bold">Título</h1>
```

### Paso 4: Validar Consistencia
- Verificar que todos los elementos principales usen teal
- Mantener rojo para errores/eliminación
- Mantener verde para éxito
- Mantener gris para elementos neutros

## 🎨 EJEMPLOS DE USO AVANZADO

### Gradientes Teal
```jsx
className="bg-gradient-to-r from-teal-600 to-teal-700"
```

### Efectos Hover Complejos
```jsx
className="bg-teal-600 hover:bg-teal-700 transition-all duration-200 transform hover:scale-105"
```

### Badges con Estados Múltiples
```jsx
// Estado activo
className="bg-teal-100 text-teal-800 border border-teal-200"

// Estado inactivo
className="bg-gray-100 text-gray-800 border border-gray-200"

// Estado de advertencia (mantener amarillo)
className="bg-yellow-100 text-yellow-800 border border-yellow-200"
```

## 🔍 RESULTADO FINAL

La aplicación de la paleta teal en InventoryWorker.jsx logra:

✅ **Consistencia visual** con PhotocopyPage.jsx  
✅ **Mejor jerarquía visual** con teal-900 en títulos  
✅ **Estados de focus** coherentes con teal-500  
✅ **Botones primarios** unificados con teal-600/700  
✅ **Elementos informativos** destacados con teal-50/200  
✅ **Iconos activos** con teal-600  
✅ **Mantenimiento** de colores semánticos (rojo=error, verde=éxito)  

## 🚀 PRÓXIMOS PASOS

1. Aplicar esta paleta a otros módulos del sistema
2. Crear un sistema de tokens CSS para facilitar mantenimiento
3. Documentar excepciones (cuándo no usar teal)
4. Establecer guías de contraste y accesibilidad

---

# 6. Extensión de Paleta Teal

## Patrones de Reemplazo de Colores

### Conversión Sistemática de Blue → Teal
- `bg-blue-50` → `bg-teal-50`
- `bg-blue-100` → `bg-teal-100`
- `bg-blue-500` → `bg-teal-500`
- `bg-blue-600` → `bg-teal-600`
- `bg-blue-700` → `bg-teal-700`
- `text-blue-600` → `text-teal-600`
- `text-blue-800` → `text-teal-800`
- `text-blue-900` → `text-teal-900`
- `border-blue-200` → `border-teal-200`
- `hover:bg-blue-700` → `hover:bg-teal-700`
- `focus:ring-blue-500` → `focus:ring-teal-500`
- `focus:border-blue-500` → `focus:border-teal-500`

## Módulo CSS Personalizado

### Solución para Dropdowns Nativos
Para solucionar el problema de los selects nativos que muestran colores azules por defecto del navegador, se creó un módulo CSS específico:

### Componentes de Select Personalizados
Se reemplazaron los `<select>` nativos con componentes personalizados que usan:
- Botones clickeables con estilos teal
- Dropdowns con opciones estilizadas 
- Estados hover y selected con colores teal
- Iconos de flecha personalizados

### Fix de Sincronización de Departamentos
**Problema identificado**: Al crear un nuevo trabajador con un departamento nuevo, el filtro de departamentos no se actualizaba inmediatamente.

**Solución aplicada**:
1. Extraer `fetchDepartamentos()` como función reutilizable
2. Llamar a `fetchDepartamentos()` después de crear/editar trabajadores en `handleSubmit()`
3. Mantener `fetchTrabajadores()` para recargar la lista de trabajadores

```jsx
// En handleSubmit después de crear/editar trabajador:
fetchTrabajadores(); // Recargar datos
fetchDepartamentos(); // Recargar departamentos para actualizar los filtros
```

### Módulo CSS para Selects Personalizados
```css
/* InventoryWorker.module.css */
.customSelect {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

.customSelect:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px rgb(20 184 166 / 0.5) !important;
  border-color: rgb(20 184 166) !important;
}

.customInput:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px rgb(20 184 166 / 0.5) !important;
  border-color: rgb(20 184 166) !important;
}
```

### Aplicación del Módulo
```jsx
import styles from './InventoryWorker.module.css';

// En los elementos de formulario:
className={`base-tailwind-classes ${styles.customSelect}`}
className={`base-tailwind-classes ${styles.customInput}`}
```

### Forzar Outline Teal
Para evitar outlines azules por defecto del navegador, siempre incluir:
```css
focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
```

## Elementos Críticos de Revisión

### Filtros y Dropdowns
- ✅ Input de búsqueda: `focus:ring-teal-500 focus:border-teal-500 focus:outline-none`
- ✅ Select de estado: `focus:ring-teal-500 focus:border-teal-500 focus:outline-none`
- ✅ Select de departamento: `focus:ring-teal-500 focus:border-teal-500 focus:outline-none`
- ✅ Select de ocupación: `focus:ring-teal-500 focus:border-teal-500 focus:outline-none`
- ✅ Módulo CSS aplicado para forzar colores teal en focus/hover

### Autocompletados
- ✅ Dropdown de departamentos: `hover:bg-teal-50` con módulo CSS
- ✅ Dropdown de ocupaciones: `hover:bg-teal-50` con módulo CSS
- ✅ Clases personalizadas aplicadas: `${styles.autocompleteDropdown}` y `${styles.autocompleteOption}`

### Formularios
- ✅ Todos los inputs del formulario principal con módulo CSS
- ✅ Todos los selects del modal de usuario con módulo CSS
- ✅ Select de paginación con módulo CSS

## Checklist Final

### Pre-aplicación
- [ ] Identificar todos los elementos con colores blue
- [ ] Crear módulo CSS personalizado si es necesario
- [ ] Importar módulo CSS en el componente

### Durante aplicación
- [ ] Reemplazar sistemáticamente blue → teal
- [ ] Agregar `focus:outline-none` a todos los elementos de formulario
- [ ] Aplicar clases del módulo CSS a selects e inputs
- [ ] Revisar autocompletados y dropdowns

### Post-aplicación
- [ ] Verificar visualmente todos los estados: normal, hover, focus, active
- [ ] Probar navegadores diferentes (Chrome, Firefox, Safari)
- [ ] Validar que no queden bordes/sombras azules
- [ ] Documentar soluciones especiales en la guía
