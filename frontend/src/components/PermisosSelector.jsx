import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PermisosSelector = ({ permisos, onChange }) => {
  const [modulosExpandidos, setModulosExpandidos] = useState({});

  // Definición de módulos y sus acciones
  const modulos = {
    gestion_trabajadores: {
      nombre: 'Gestión de Trabajadores',
      acciones: ['ver', 'agregar', 'editar', 'eliminar']
    },
    gestion_fotocopiado: {
      nombre: 'Gestión de Fotocopias',
      acciones: ['ver', 'agregar', 'editar', 'eliminar']
    }
  };

  const toggleModulo = (modulo) => {
    setModulosExpandidos(prev => ({
      ...prev,
      [modulo]: !prev[modulo]
    }));
  };

  const toggleAccion = (modulo, accion) => {
    const nuevosPermisos = { ...permisos };
    if (!nuevosPermisos[modulo]) {
      nuevosPermisos[modulo] = [];
    }

    const index = nuevosPermisos[modulo].indexOf(accion);
    if (index === -1) {
      nuevosPermisos[modulo] = [...nuevosPermisos[modulo], accion];
    } else {
      nuevosPermisos[modulo] = nuevosPermisos[modulo].filter(a => a !== accion);
    }

    onChange(nuevosPermisos);
  };

  const toggleTodasAcciones = (modulo) => {
    const nuevosPermisos = { ...permisos };
    const todasLasAcciones = modulos[modulo].acciones;

    if (!nuevosPermisos[modulo] || nuevosPermisos[modulo].length < todasLasAcciones.length) {
      nuevosPermisos[modulo] = [...todasLasAcciones];
    } else {
      nuevosPermisos[modulo] = [];
    }

    onChange(nuevosPermisos);
  };

  return (
    <div className="space-y-4">
      {Object.entries(modulos).map(([moduloKey, modulo]) => (
        <div key={moduloKey} className="border border-teal-200 rounded-lg overflow-hidden">
          <motion.button
            className="w-full px-4 py-3 flex justify-between items-center bg-teal-50 hover:bg-teal-100 transition-colors"
            onClick={() => {
              toggleModulo(moduloKey);
              toggleTodasAcciones(moduloKey);
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="font-medium text-teal-900">{modulo.nombre}</span>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="w-4 h-4 text-teal-600 rounded border-teal-300 focus:ring-teal-500"
                checked={permisos[moduloKey]?.length === modulo.acciones.length}
                onChange={() => toggleTodasAcciones(moduloKey)}
              />
              <motion.svg
                className="w-5 h-5 text-teal-600"
                animate={{ rotate: modulosExpandidos[moduloKey] ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 9l-7 7-7-7" />
              </motion.svg>
            </div>
          </motion.button>

          <AnimatePresence>
            {modulosExpandidos[moduloKey] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-teal-200"
              >
                <div className="p-4 bg-white space-y-2">
                  {modulo.acciones.map(accion => (
                    <motion.div
                      key={accion}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-teal-600 rounded border-teal-300 focus:ring-teal-500"
                        checked={permisos[moduloKey]?.includes(accion) || false}
                        onChange={() => toggleAccion(moduloKey, accion)}
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {accion}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default PermisosSelector;
