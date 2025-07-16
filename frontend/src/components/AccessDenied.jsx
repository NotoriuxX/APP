import React from 'react';
import { FaLock, FaUserShield } from 'react-icons/fa';

const AccessDenied = ({ moduleName = "este módulo", message, showContactAdmin = true }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Icono */}
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
          <FaLock className="w-8 h-8 text-red-500" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Acceso Denegado
        </h1>

        {/* Mensaje personalizado o por defecto */}
        <p className="text-gray-600 mb-6">
          {message || `No tienes permisos para acceder a ${moduleName}.`}
        </p>

        {/* Mensaje de contacto con administrador */}
        {showContactAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <FaUserShield className="w-5 h-5 text-blue-500 mr-2" />
              <span className="text-blue-700 font-medium">¿Necesitas acceso?</span>
            </div>
            <p className="text-sm text-blue-600">
              Contacta a tu administrador para solicitar los permisos necesarios.
            </p>
          </div>
        )}

        {/* Botón para volver */}
        <button
          onClick={() => window.history.back()}
          className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors duration-200 font-medium"
        >
          Volver
        </button>

        {/* Enlace a inicio */}
        <div className="mt-4">
          <a
            href="/inicio"
            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            Ir a página de inicio
          </a>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
