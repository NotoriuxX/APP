# 🎨 SISTEMA COMPLETO DE CSS Y ANIMACIONES
## Guía Detallada de Estilos

## 🎯 FILOSOFÍA DE ESTILOS

### 🏗️ ESTRATEGIA HÍBRIDA IMPLEMENTADA

```
📊 DISTRIBUCIÓN DE ESTILOS
├── 🎨 Tailwind CSS (90%)
│   ├── Layout & Grid Systems
│   ├── Spacing & Sizing
│   ├── Colors & Typography
│   ├── Responsive Design
│   └── Utility Classes
│
├── 📦 CSS Module (10%)
│   ├── Animaciones Complejas
│   ├── Keyframes Personalizadas
│   ├── Efectos Únicos
│   └── Delays Escalonados
│
└── ⚡ Inline Styles (<1%)
    └── Estilos Dinámicos/Condicionales
```

## 📦 CSS MODULE COMPLETO

### 📁 PhotocopyAnimations.module.css

```css
/* =================================================================
 * PHOTOCOPY ANIMATIONS - CSS MODULE
 * Animaciones específicas para PhotocopyPage.jsx
 * =================================================================
 */

/* 🔄 ANIMACIÓN DE SPINNER PRINCIPAL */
@keyframes photocopy-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.photocopy-animate-spin {
  animation: photocopy-spin 1s linear infinite;
}

/* ⬆️ ANIMACIÓN FADE-IN-UP (Entrada suave desde abajo) */
@keyframes photocopy-fade-in-up {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.photocopy-animate-fade-in-up {
  animation: photocopy-fade-in-up 0.6s ease-out forwards;
}

/* ➡️ ANIMACIÓN SLIDE-IN-RIGHT (Indicador lateral) */
@keyframes photocopy-slide-in-right {
  0% {
    opacity: 0;
    transform: translateX(100px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.photocopy-animate-slide-in-right {
  animation: photocopy-slide-in-right 0.4s ease-out forwards;
}

/* 🔍 ANIMACIÓN SCALE-IN (Para modales) */
@keyframes photocopy-scale-in {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.photocopy-animate-scale-in {
  animation: photocopy-scale-in 0.3s ease-out forwards;
}

/* ⏱️ DELAYS ESCALONADOS PARA FILAS DE TABLA */
.photocopy-delay-100 {
  animation-delay: 100ms;
}

.photocopy-delay-200 {
  animation-delay: 200ms;
}

.photocopy-delay-300 {
  animation-delay: 300ms;
}

.photocopy-delay-400 {
  animation-delay: 400ms;
}

.photocopy-delay-500 {
  animation-delay: 500ms;
}

/* ✨ EFECTO SHIMMER DURANTE CARGA */
@keyframes photocopy-shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.photocopy-shimmer-effect::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  background-size: 200px 100%;
  animation: photocopy-shimmer 1.5s infinite;
  border-radius: inherit;
  pointer-events: none;
}

/* 🎭 ANIMACIONES DE HOVER AVANZADAS */
.photocopy-hover-lift {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.photocopy-hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* 🌊 ANIMACIÓN DE PULSE SUAVE */
@keyframes photocopy-pulse-soft {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.photocopy-animate-pulse-soft {
  animation: photocopy-pulse-soft 2s ease-in-out infinite;
}

/* 🔄 ANIMACIÓN DE BOUNCE SUAVE */
@keyframes photocopy-bounce-soft {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-5px);
  }
  60% {
    transform: translateY(-3px);
  }
}

.photocopy-animate-bounce-soft {
  animation: photocopy-bounce-soft 1s ease-in-out;
}
```

## 🌈 SISTEMA DE COLORES TEAL

### 🎨 PALETA COMPLETA DOCUMENTADA

```css
/* =================================================================
 * PALETA DE COLORES TEAL - TOKENS CSS
 * =================================================================
 */

:root {
  /* 🏷️ COLORES PRINCIPALES - TEAL */
  --color-teal-50: #F0FDFA;   /* Fondos suaves, contenedores de info */
  --color-teal-100: #CCFBF1;  /* Fondos muy suaves */
  --color-teal-200: #99F6E4;  /* Bordes suaves */
  --color-teal-300: #5EEAD4;  /* Bordes intermedios */
  --color-teal-400: #2DD4BF;  /* Bordes activos */
  --color-teal-500: #14B8A6;  /* Focus rings, bordes principales */
  --color-teal-600: #0D9488;  /* Botones primarios, iconos de orden */
  --color-teal-700: #0F766E;  /* Hover de botones principales */
  --color-teal-800: #115E59;  /* Estados pressed */
  --color-teal-900: #134E4A;  /* Textos de encabezados importantes */
  
  /* 🔘 COLORES NEUTROS - GRAY */
  --color-gray-50: #F9FAFB;   /* Fondos neutros */
  --color-gray-100: #F3F4F6;  /* Fondos de cards */
  --color-gray-200: #E5E7EB;  /* Bordes suaves */
  --color-gray-300: #D1D5DB;  /* Bordes normales */
  --color-gray-400: #9CA3AF;  /* Iconos secundarios */
  --color-gray-500: #6B7280;  /* Textos secundarios */
  --color-gray-600: #4B5563;  /* Textos principales */
  --color-gray-700: #374151;  /* Textos importantes */
  --color-gray-800: #1F2937;  /* Textos muy importantes */
  --color-gray-900: #111827;  /* Textos principales oscuros */
  
  /* 🚨 COLORES DE ESTADO */
  --color-red-50: #FEF2F2;    /* Fondos de error suaves */
  --color-red-100: #FEE2E2;   /* Fondos de error */
  --color-red-600: #DC2626;   /* Errores, botones destructivos */
  --color-red-700: #B91C1C;   /* Hover de botones destructivos */
  --color-red-800: #991B1B;   /* Textos de error */
  
  /* ✅ COLORES DE ÉXITO */
  --color-green-50: #F0FDF4;  /* Fondos de éxito suaves */
  --color-green-100: #DCFCE7; /* Fondos de éxito */
  --color-green-600: #16A34A; /* Indicadores positivos */
  --color-green-700: #15803D; /* Hover de elementos positivos */
  --color-green-800: #166534; /* Textos de éxito */
}
```

### 🎯 APLICACIÓN PRÁCTICA DE COLORES

```javascript
// MAPEO DE COLORES EN TAILWIND
const COLOR_MAPPING = {
  // Botones Primarios
  primary: 'bg-teal-600 hover:bg-teal-700 text-white',
  
  // Focus States
  focus: 'focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
  
  // Bordes
  border: 'border-gray-300 hover:border-gray-400',
  
  // Fondos de Cards
  cardBg: 'bg-white',
  
  // Fondos de Información
  infoBg: 'bg-teal-50 border-teal-200',
  
  // Estados de Error
  error: 'bg-red-50 text-red-800 border-red-200',
  
  // Estados de Éxito
  success: 'bg-green-100 text-green-800',
  
  // Texto Principal
  textPrimary: 'text-gray-900',
  
  // Texto Secundario
  textSecondary: 'text-gray-600'
};
```

## 🎭 SISTEMA DE ANIMACIONES

### ⚡ CONFIGURACIÓN DE TRANSICIONES

```css
/* =================================================================
 * CONFIGURACIÓN GLOBAL DE TRANSICIONES
 * =================================================================
 */

/* 🎯 TRANSICIONES BASE */
.transition-base {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-slow {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 🔄 EASING FUNCTIONS PERSONALIZADAS */
.ease-out-back {
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ease-in-out-back {
  transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 🎪 EFECTOS HOVER AVANZADOS

```css
/* =================================================================
 * EFECTOS HOVER PARA ELEMENTOS INTERACTIVOS
 * =================================================================
 */

/* 📄 HOVER PARA CARDS */
.card-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-hover:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 10px 25px rgba(20, 184, 166, 0.15);
}

/* 🔘 HOVER PARA BOTONES */
.button-hover {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.button-hover:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
}

.button-hover:active {
  transform: translateY(0) scale(0.98);
}

/* 📋 HOVER PARA FILAS DE TABLA */
.row-hover {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.row-hover:hover {
  transform: scale(1.01);
  background-color: rgba(20, 184, 166, 0.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## 📱 SISTEMA RESPONSIVE

### 📐 BREAKPOINTS Y ESTRATEGIA MOBILE-FIRST

```css
/* =================================================================
 * BREAKPOINTS PERSONALIZADOS
 * =================================================================
 */

/* 📱 Mobile First Strategy */
.responsive-grid {
  /* Mobile (0-639px) */
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  /* Tablet Small (640px+) */
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 768px) {
  /* Tablet (768px+) */
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}

@media (min-width: 1024px) {
  /* Desktop (1024px+) */
  .responsive-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }
}
```

### 🎯 UTILIDADES RESPONSIVE PERSONALIZADAS

```css
/* =================================================================
 * UTILIDADES RESPONSIVE ESPECÍFICAS
 * =================================================================
 */

/* 📊 Stats Grid Responsive */
.stats-responsive {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 640px) {
  .stats-responsive {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 📝 Form Responsive */
.form-responsive {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .form-responsive {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 📋 Table Responsive */
.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 768px) {
  .table-responsive {
    overflow-x: visible;
  }
}
```

## 🎪 EFECTOS ESPECIALES

### ✨ EFECTO SHIMMER DETALLADO

```css
/* =================================================================
 * EFECTO SHIMMER PARA ESTADOS DE CARGA
 * =================================================================
 */

.shimmer-container {
  position: relative;
  overflow: hidden;
  background-color: #f3f4f6;
}

.shimmer-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.6),
    transparent
  );
  animation: shimmer-move 1.5s infinite;
}

@keyframes shimmer-move {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
```

### 🌊 ONDAS DE CLIC (RIPPLE EFFECT)

```css
/* =================================================================
 * EFECTO RIPPLE PARA BOTONES
 * =================================================================
 */

.ripple-effect {
  position: relative;
  overflow: hidden;
}

.ripple-effect::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.ripple-effect:active::after {
  width: 300px;
  height: 300px;
}
```

## 🚀 OPTIMIZACIONES DE RENDIMIENTO

### ⚡ CSS PERFORMANCE BEST PRACTICES

```css
/* =================================================================
 * OPTIMIZACIONES DE RENDIMIENTO
 * =================================================================
 */

/* 🎯 WILL-CHANGE PARA ANIMACIONES */
.animate-optimized {
  will-change: transform, opacity;
}

.animate-optimized.finished {
  will-change: auto;
}

/* 🔄 TRANSFORM3D PARA ACELERACIÓN DE HARDWARE */
.hardware-accelerated {
  transform: translate3d(0, 0, 0);
}

/* 📱 PREVENT PAINT ON SCROLL */
.scroll-optimized {
  backface-visibility: hidden;
  perspective: 1000px;
}

/* 🎭 CONTAIN LAYOUT PARA MEJOR RENDIMIENTO */
.layout-contained {
  contain: layout style paint;
}
```

## 🎯 APLICACIÓN EN COMPONENTES

### 📄 EJEMPLO: Aplicación en PhotocopyPage

```jsx
// Importar el CSS Module
import styles from './PhotocopyAnimations.module.css';

// Aplicación en JSX
<div className={`
  bg-white p-4 rounded-lg shadow 
  transform transition-all duration-200 
  hover:scale-105 hover:shadow-lg
  ${styles['photocopy-animate-fade-in-up']}
  ${!isTransitioning ? styles['photocopy-delay-100'] : ''}
`}>
  <div className={`
    w-4 h-4 border-2 border-teal-300 border-t-teal-600 rounded-full
    ${styles['photocopy-animate-spin']}
  `}></div>
</div>
```

## 🚀 SIGUIENTE PASO

**Continuar con**: `05_JSX_STRUCTURE_DETAILED.md` para la estructura detallada del JSX.
