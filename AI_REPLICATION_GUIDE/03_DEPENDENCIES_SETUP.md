# ⚙️ DEPENDENCIAS Y CONFIGURACIÓN INICIAL
## Setup Completo del Entorno de Desarrollo

## 🎯 CONFIGURACIÓN DEL PROYECTO

### 📦 CREAR PROYECTO BASE

```bash
# Crear proyecto React con Create React App
npx create-react-app inventario-photocopy
cd inventario-photocopy

# Instalar dependencias específicas
npm install tailwindcss@^3.4.16 postcss@^8.4.49 autoprefixer@^10.4.20

# Configurar Tailwind CSS
npx tailwindcss init -p
```

### 📋 PACKAGE.JSON COMPLETO

```json
{
  "name": "inventario-photocopy",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-scripts": "5.0.1",
    "react-router-dom": "^7.0.2",
    "web-vitals": "^4.2.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "@babel/plugin-proposal-private-property-in-object": "^7.21.11",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16"
  }
}
```

## 🎨 CONFIGURACIÓN DE TAILWIND CSS

### 📁 tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Teal personalizada
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A'
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
```

### 📁 postcss.config.js

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## 🎨 CONFIGURACIÓN CSS BASE

### 📁 src/index.css

```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Reset básico y configuraciones globales */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Utilidades personalizadas para el proyecto */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Mejoras de accesibilidad */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2;
}

/* Transiciones suaves globales */
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 📁 ESTRUCTURA DE CARPETAS

### 🏗️ ORGANIZACIÓN RECOMENDADA

```
src/
├── components/               # Componentes reutilizables
│   ├── ui/                  # Componentes básicos de UI
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Spinner.jsx
│   └── common/              # Componentes comunes
│       ├── Header.jsx
│       ├── Footer.jsx
│       └── Layout.jsx
├── pages/                   # Páginas principales
│   └── inventory/           # Módulo de inventario
│       └── photocopy/       # Submódulo de fotocopias
│           ├── PhotocopyPage.jsx
│           └── PhotocopyAnimations.module.css
├── hooks/                   # Custom hooks
│   ├── useAuth.js
│   ├── useApi.js
│   └── useLocalStorage.js
├── utils/                   # Utilidades y helpers
│   ├── api.js
│   ├── constants.js
│   ├── formatters.js
│   └── validators.js
├── styles/                  # Estilos globales
│   ├── globals.css
│   └── components.css
├── App.js                   # Componente principal
├── App.css                  # Estilos del App
├── index.js                 # Punto de entrada
└── index.css                # Estilos base
```

## 🔧 CONFIGURACIONES ADICIONALES

### 📁 .env (Variables de Entorno)

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3300/api
REACT_APP_ENV=development

# App Configuration
REACT_APP_NAME=Sistema de Control de Impresiones
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_ENABLE_DEBUG=true
REACT_APP_ENABLE_ANALYTICS=false
```

### 📁 .gitignore (Actualizado)

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db
.DS_Store

# Custom
/docs/build
.env
```

## 🚀 SCRIPTS DE DESARROLLO

### 📁 scripts/setup.sh

```bash
#!/bin/bash

echo "🚀 Configurando proyecto PhotocopyPage..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Configurar Tailwind si no existe
if [ ! -f "tailwind.config.js" ]; then
    echo "🎨 Configurando Tailwind CSS..."
    npx tailwindcss init -p
fi

# Crear estructura de carpetas
echo "📁 Creando estructura de carpetas..."
mkdir -p src/components/ui
mkdir -p src/components/common
mkdir -p src/pages/inventory/photocopy
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p src/styles

echo "✅ Configuración completa!"
echo "🎯 Ejecuta 'npm start' para comenzar"
```

### 📁 scripts/build-production.sh

```bash
#!/bin/bash

echo "🏗️ Construyendo para producción..."

# Limpiar build anterior
rm -rf build/

# Actualizar dependencias
npm audit fix

# Construir proyecto
npm run build

# Verificar build
if [ -d "build" ]; then
    echo "✅ Build exitoso!"
    echo "📊 Tamaño del build:"
    du -sh build/
else
    echo "❌ Error en build"
    exit 1
fi
```

## 🧪 CONFIGURACIÓN DE TESTING

### 📁 src/setupTests.js

```javascript
// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Mock de fetch para tests
global.fetch = jest.fn();

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Setup global para tests
beforeEach(() => {
  fetch.mockClear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});
```

## 🌐 CONFIGURACIÓN DE API

### 📁 src/utils/api.js

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300/api';

// Configuración base para fetch
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// Helper para incluir token de autorización
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Función base para llamadas API
export const apiCall = async (endpoint, options = {}) => {
  try {
    const url = `${API_URL}${endpoint}`;
    const config = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...getAuthHeaders(),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Métodos específicos
export const api = {
  get: (endpoint) => apiCall(endpoint),
  post: (endpoint, data) => apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (endpoint, data) => apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (endpoint) => apiCall(endpoint, {
    method: 'DELETE',
  }),
};
```

## 🔧 UTILIDADES ESENCIALES

### 📁 src/utils/constants.js

```javascript
// Configuración de la aplicación
export const APP_CONFIG = {
  NAME: 'Sistema de Control de Impresiones',
  VERSION: '1.0.0',
  API_TIMEOUT: 10000,
  ITEMS_PER_PAGE: [5, 10, 20, 50, 100],
  DEFAULT_ITEMS_PER_PAGE: 10,
};

// URLs de API
export const API_ENDPOINTS = {
  PERMISSIONS: '/photocopies/permissions',
  PHOTOCOPIES: '/photocopies',
  PHOTOCOPY_BY_ID: (id) => `/photocopies/${id}`,
};

// Colores del sistema
export const COLORS = {
  primary: 'teal',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
};

// Mensajes de error
export const ERROR_MESSAGES = {
  400: 'Solicitud inválida',
  401: 'No autorizado',
  403: 'Acceso denegado',
  404: 'Recurso no encontrado',
  500: 'Error interno del servidor',
  DEFAULT: 'Error inesperado. Intenta nuevamente.',
};

// Períodos de filtro
export const FILTER_PERIODS = {
  TODAY: 'hoy',
  WEEK: 'semana',
  MONTH: 'mes',
  CUSTOM: 'personalizado',
};
```

## ✅ CHECKLIST DE CONFIGURACIÓN

### 🎯 VERIFICACIONES ESENCIALES

```markdown
- [ ] ✅ Node.js 16+ instalado
- [ ] ✅ npm o yarn configurado
- [ ] ✅ Create React App creado
- [ ] ✅ Tailwind CSS instalado y configurado
- [ ] ✅ PostCSS configurado
- [ ] ✅ Estructura de carpetas creada
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ API utils configurados
- [ ] ✅ Constants definidas
- [ ] ✅ Testing setup configurado
- [ ] ✅ Scripts de desarrollo creados
- [ ] ✅ .gitignore actualizado
- [ ] ✅ Build de prueba exitoso
```

## 🚀 COMANDOS DE INICIO RÁPIDO

```bash
# Instalación completa
chmod +x scripts/setup.sh
./scripts/setup.sh

# Desarrollo
npm start

# Build para producción
npm run build

# Tests
npm test

# Análisis de bundle
npm run build && npx serve -s build
```

## 🚀 SIGUIENTE PASO

**Continuar con**: `05_JSX_STRUCTURE_DETAILED.md` para la estructura JSX detallada.
