import React from 'react';
import usePermissions from '../hooks/usePermissions';
import useAuth from '../hooks/useAuth';
import AccessDenied from './AccessDenied';

const ProtectedRoute = ({ 
  children, 
  permission, 
  requiredPermission, // Mantener compatibilidad hacia atrás
  moduleName, 
  fallbackMessage,
  showContactAdmin = true 
}) => {
  const { hasPermission, loading, error } = usePermissions();
  const { usuario } = useAuth();

  // Usar permission o requiredPermission para compatibilidad
  const permissionToCheck = permission || requiredPermission;

  console.log('🛡️ ProtectedRoute verificando:', {
    permissionToCheck,
    usuario: usuario ? { ...usuario, password: undefined } : null,
    loading,
    error
  });

  // Mientras se cargan los permisos, mostrar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si hay error, mostrar mensaje de error
  if (error) {
    return (
      <AccessDenied 
        moduleName={moduleName || "este módulo"}
        message="Error al verificar permisos. Por favor, intenta nuevamente."
        showContactAdmin={showContactAdmin}
      />
    );
  }

  // Si no hay permiso requerido, mostrar el contenido
  if (!permissionToCheck) {
    return children;
  }

  // Si tiene el permiso requerido, mostrar el contenido
  if (hasPermission(permissionToCheck)) {
    console.log(`✅ Acceso concedido al módulo: ${moduleName || permissionToCheck}`);
    return children;
  }

  // Si no tiene permisos, mostrar el componente de acceso denegado
  console.log(`🚫 Acceso denegado al módulo: ${moduleName || permissionToCheck}`);
  return (
    <AccessDenied 
      moduleName={moduleName || "este módulo"}
      message={fallbackMessage}
      showContactAdmin={showContactAdmin}
    />
  );
};

export default ProtectedRoute;
