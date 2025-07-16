import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PermissionsSelector({ 
    roles, 
    modulos, 
    selectedRole, 
    selectedPermissions, 
    onRoleChange, 
    onPermissionsChange 
}) {
    const [expandedModules, setExpandedModules] = useState(new Set());

    // Cuando cambia el rol, actualizar los permisos por defecto
    useEffect(() => {
        if (selectedRole) {
            const rol = roles.find(r => r.nombre === selectedRole);
            if (rol) {
                onPermissionsChange(new Set(rol.permisos_default));
            }
        }
    }, [selectedRole]);

    // Toggle de módulo expandido/colapsado
    const toggleModule = (moduleId) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(moduleId)) {
                next.delete(moduleId);
            } else {
                next.add(moduleId);
            }
            return next;
        });
    };

    // Toggle de todos los permisos de un módulo
    const toggleModulePermissions = (modulo, checked) => {
        const nuevosPermisos = new Set(selectedPermissions);
        modulo.permisos.forEach(permiso => {
            if (checked) {
                nuevosPermisos.add(permiso.id);
            } else {
                nuevosPermisos.delete(permiso.id);
            }
        });
        onPermissionsChange(nuevosPermisos);
    };

    // Verificar si todos los permisos de un módulo están seleccionados
    const areAllModulePermissionsSelected = (modulo) => {
        return modulo.permisos.every(permiso => selectedPermissions.has(permiso.id));
    };

    // Verificar si algunos permisos de un módulo están seleccionados
    const areSomeModulePermissionsSelected = (modulo) => {
        return modulo.permisos.some(permiso => selectedPermissions.has(permiso.id));
    };

    return (
        <div className="space-y-6">
            {/* Selector de Rol */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    Rol del Usuario
                </label>
                <select
                    value={selectedRole || ''}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                >
                    <option value="">Selecciona un rol...</option>
                    {roles.map(rol => (
                        <option key={rol.id} value={rol.nombre}>
                            {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Lista de Módulos y Permisos */}
            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                    Permisos del Usuario
                </label>
                <div className="space-y-2">
                    {modulos.map(modulo => (
                        <div key={modulo.modulo_id} className="border rounded-lg overflow-hidden">
                            {/* Cabecera del Módulo */}
                            <button
                                onClick={() => toggleModule(modulo.modulo_id)}
                                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    {/* Checkbox del módulo */}
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleModulePermissions(modulo, !areAllModulePermissionsSelected(modulo));
                                        }}
                                        className="relative"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={areAllModulePermissionsSelected(modulo)}
                                            className={`
                                                h-4 w-4 rounded border-gray-300 text-teal-600 
                                                focus:ring-teal-500 transition-colors
                                                ${areSomeModulePermissionsSelected(modulo) && !areAllModulePermissionsSelected(modulo) ? 'indeterminate' : ''}
                                            `}
                                            onChange={() => {}}
                                        />
                                        {areSomeModulePermissionsSelected(modulo) && !areAllModulePermissionsSelected(modulo) && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-2 h-2 bg-teal-600 rounded-sm"></div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Icono y nombre del módulo */}
                                    <i className={`${modulo.icono} text-gray-500`}></i>
                                    <span className="font-medium">{modulo.modulo_nombre}</span>
                                </div>
                                
                                {/* Icono de expansión */}
                                <svg
                                    className={`w-5 h-5 transform transition-transform ${
                                        expandedModules.has(modulo.modulo_id) ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Lista de Permisos */}
                            <AnimatePresence>
                                {expandedModules.has(modulo.modulo_id) && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 space-y-2 bg-white">
                                            {modulo.permisos.map(permiso => (
                                                <div key={permiso.id} className="flex items-center space-x-3 ml-6">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPermissions.has(permiso.id)}
                                                        onChange={(e) => {
                                                            const nuevosPermisos = new Set(selectedPermissions);
                                                            if (e.target.checked) {
                                                                nuevosPermisos.add(permiso.id);
                                                            } else {
                                                                nuevosPermisos.delete(permiso.id);
                                                            }
                                                            onPermissionsChange(nuevosPermisos);
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                    <span className="text-sm text-gray-700">
                                                        {permiso.nombre.charAt(0).toUpperCase() + permiso.nombre.slice(1)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
