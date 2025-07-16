import { useState, useEffect } from 'react';
import useAuth from './useAuth';

const usePermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { usuario } = useAuth();

  // Función helper para verificar si es propietario
  const isUserOwner = (user) => {
    if (!user) return false;
    return (
      user.rol_global === 'propietario' || 
      user.rol === 'propietario' || 
      user.es_propietario === true ||
      user.es_propietario === 1
    );
  };

  // Función para asignar permisos de propietario
  const assignOwnerPermissions = () => {
    const allPermissions = [
      'trabajadores', 'trabajadores_crear', 'trabajadores_editar', 'trabajadores_eliminar',
      'inventario', 'inventario_crear', 'inventario_editar', 'inventario_eliminar',
      'fotocopias', 'fotocopias_crear', 'fotocopias_editar', 'fotocopias_eliminar',
      'admin', 'configuracion', 'graficos', 'ubicaciones'
    ];
    console.log('👑 Asignando permisos de propietario:', allPermissions);
    setPermissions(allPermissions);
    setLoading(false);
    return true;
  };

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
        
        if (!token) {
          setLoading(false);
          return;
        }

        // Si no hay usuario aún, esperar
        if (!usuario) {
          console.log('⏳ Esperando información del usuario...');
          return;
        }

        // Verificar si es propietario PRIMERO
        console.log('� Verificando usuario:', {
          id: usuario.id,
          nombre: usuario.nombre,
          rol_global: usuario.rol_global,
          rol: usuario.rol,
          es_propietario: usuario.es_propietario
        });

        if (isUserOwner(usuario)) {
          console.log('👑 Usuario identificado como PROPIETARIO - asignando todos los permisos');
          assignOwnerPermissions();
          return;
        }

        console.log('👤 Usuario NO es propietario, consultando permisos específicos...');

        // Obtener permisos de todos los módulos
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300/api';
        console.log('🌐 API URL:', API_URL);
        
        const responses = await Promise.all([
          fetch(`${API_URL}/photocopies/permissions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/trabajadores/permissions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/inventarios/permissions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
        ]);

        console.log('📡 Respuestas de API:', responses.map(r => ({ status: r.status, ok: r.ok })));

        const permissionsData = [];

        // Procesar permisos de fotocopias
        if (responses[0].ok) {
          try {
            const photocopyData = await responses[0].json();
            console.log('📋 Datos de fotocopias:', photocopyData);
            if (photocopyData && photocopyData.hasAccess) {
              permissionsData.push('fotocopias');
              // Verificar que permissions existe y es un array antes de usar includes()
              const photocopyPermissions = Array.isArray(photocopyData.permissions) ? photocopyData.permissions : [];
              if (photocopyPermissions.includes('fotocopia_escribir')) {
                permissionsData.push('fotocopias_crear');
              }
              if (photocopyPermissions.includes('fotocopia_editar')) {
                permissionsData.push('fotocopias_editar');
              }
              if (photocopyPermissions.includes('fotocopia_eliminar')) {
                permissionsData.push('fotocopias_eliminar');
              }
            }
          } catch (error) {
            console.error('❌ Error parsing fotocopias response:', error);
          }
        } else {
          console.log('❌ Error en fotocopias:', responses[0].status);
        }

        // Procesar permisos de trabajadores
        if (responses[1].ok) {
          try {
            const workersData = await responses[1].json();
            console.log('👥 Datos de trabajadores:', workersData);
            if (workersData && workersData.hasAccess) {
              permissionsData.push('trabajadores');
              // Verificar que permissions existe y es un array antes de usar includes()
              const workersPermissions = Array.isArray(workersData.permissions) ? workersData.permissions : [];
              if (workersPermissions.includes('trabajador_escribir')) {
                permissionsData.push('trabajadores_crear');
              }
              if (workersPermissions.includes('trabajador_editar')) {
                permissionsData.push('trabajadores_editar');
              }
              if (workersPermissions.includes('trabajador_eliminar')) {
                permissionsData.push('trabajadores_eliminar');
              }
            }
          } catch (error) {
            console.error('❌ Error parsing trabajadores response:', error);
          }
        } else {
          console.log('❌ Error en trabajadores:', responses[1].status);
        }

        // Procesar permisos de inventario
        if (responses[2].ok) {
          try {
            const inventoryData = await responses[2].json();
            console.log('📦 Datos de inventario:', inventoryData);
            if (inventoryData && inventoryData.hasAccess) {
              permissionsData.push('inventario');
              // Verificar que permissions existe y es un array antes de usar includes()
              const inventoryPermissions = Array.isArray(inventoryData.permissions) ? inventoryData.permissions : [];
              if (inventoryPermissions.includes('inventario_escribir')) {
                permissionsData.push('inventario_crear');
              }
              if (inventoryPermissions.includes('inventario_editar')) {
                permissionsData.push('inventario_editar');
              }
              if (inventoryPermissions.includes('inventario_eliminar')) {
                permissionsData.push('inventario_eliminar');
              }
            }
          } catch (error) {
            console.error('❌ Error parsing inventario response:', error);
          }
        } else {
          console.log('❌ Error en inventario:', responses[2].status);
        }

        // Por ahora, gráficos y ubicaciones están disponibles para todos los usuarios logueados
        // TODO: Implementar endpoints específicos para estos módulos
        permissionsData.push('graficos', 'ubicaciones');

        // Verificación final: si llegamos aquí y el usuario es propietario, asignar todos los permisos
        if (isUserOwner(usuario)) {
          console.log('👑 Verificación final: Usuario es propietario, asignando permisos completos');
          assignOwnerPermissions();
          return;
        }

        console.log('✅ Permisos finales procesados para usuario regular:', permissionsData);
        setPermissions(permissionsData);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching permissions:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [usuario]);

  // UseEffect adicional para detectar propietarios inmediatamente
  useEffect(() => {
    if (usuario && isUserOwner(usuario) && loading) {
      console.log('🚀 Detección inmediata de propietario - asignando permisos');
      assignOwnerPermissions();
    }
  }, [usuario, loading]);

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission
  };
};

export default usePermissions;
