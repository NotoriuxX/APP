import React from 'react';
import { FaCog, FaUser, FaDatabase, FaShieldAlt, FaBell, FaPalette } from 'react-icons/fa';

const Settings = () => {
  const settingsCategories = [
    {
      id: 'profile',
      title: 'Perfil de Usuario',
      description: 'Gestiona tu información personal y preferencias',
      icon: FaUser,
      color: 'from-blue-500 to-blue-600',
      items: [
        'Información personal',
        'Cambiar contraseña',
        'Preferencias de idioma',
        'Zona horaria'
      ]
    },
    {
      id: 'system',
      title: 'Configuración del Sistema',
      description: 'Ajustes generales del sistema de inventario',
      icon: FaCog,
      color: 'from-teal-500 to-teal-600',
      items: [
        'Configuración general',
        'Parámetros del sistema',
        'Configuración de módulos',
        'Límites y validaciones'
      ]
    },
    {
      id: 'database',
      title: 'Base de Datos',
      description: 'Gestión y mantenimiento de la base de datos',
      icon: FaDatabase,
      color: 'from-green-500 to-green-600',
      items: [
        'Respaldo de datos',
        'Restauración de datos',
        'Limpieza de registros',
        'Estadísticas de uso'
      ]
    },
    {
      id: 'security',
      title: 'Seguridad',
      description: 'Configuración de seguridad y permisos',
      icon: FaShieldAlt,
      color: 'from-red-500 to-red-600',
      items: [
        'Gestión de permisos',
        'Auditoría de accesos',
        'Configuración de roles',
        'Políticas de seguridad'
      ]
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      description: 'Configuración de alertas y notificaciones',
      icon: FaBell,
      color: 'from-yellow-500 to-yellow-600',
      items: [
        'Alertas de inventario',
        'Notificaciones por email',
        'Recordatorios automáticos',
        'Configuración de frecuencia'
      ]
    },
    {
      id: 'appearance',
      title: 'Apariencia',
      description: 'Personalización de la interfaz de usuario',
      icon: FaPalette,
      color: 'from-purple-500 to-purple-600',
      items: [
        'Tema de la aplicación',
        'Colores personalizados',
        'Diseño del dashboard',
        'Elementos de la interfaz'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
              <FaCog className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
              <p className="text-gray-600">Gestiona las configuraciones del sistema y tu perfil</p>
            </div>
          </div>
        </div>

        {/* Grid de categorías de configuración */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {settingsCategories.map((category) => {
            const IconComponent = category.icon;
            
            return (
              <div
                key={category.id}
                className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* Cabecera de la tarjeta */}
                <div className={`p-6 bg-gradient-to-br ${category.color} text-white`}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                      <IconComponent className="text-2xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">{category.title}</h3>
                      <p className="text-white/90 text-sm">{category.description}</p>
                    </div>
                  </div>
                </div>

                {/* Contenido de la tarjeta */}
                <div className="p-6">
                  <ul className="space-y-2">
                    {category.items.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-3 text-gray-700 hover:text-teal-600 transition-colors cursor-pointer"
                      >
                        <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button className="w-full bg-gray-50 hover:bg-teal-50 hover:text-teal-700 text-gray-600 py-2 px-4 rounded-lg transition-colors text-sm font-medium">
                      Configurar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FaCog className="text-blue-600 text-xl" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Configuración del Sistema
              </h3>
              <p className="text-gray-600 mb-4">
                Esta página te permite acceder a todas las configuraciones del sistema de inventario. 
                Como propietario, tienes acceso completo a todas las funcionalidades de configuración.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <strong className="text-gray-900">Funcionalidades disponibles:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• Gestión de usuarios y permisos</li>
                    <li>• Configuración de módulos</li>
                    <li>• Parámetros del sistema</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-gray-900">Próximamente:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• Configuración avanzada de reportes</li>
                    <li>• Personalización de la interfaz</li>
                    <li>• Integraciones externas</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
