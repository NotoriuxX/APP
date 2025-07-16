import React from "react";
import { Link } from "react-router-dom";
import { 
  FaUsers, 
  FaBoxes, 
  FaCopy, 
  FaChartBar, 
  FaMapMarkerAlt, 
  FaLock,
  FaUserTie,
  FaCog,
  FaFileAlt
} from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import usePermissions from "../hooks/usePermissions";
import ChatWidget from "../components/ChatWidget";

const Inicio = () => {
  const { usuario, permisos, grupos, isLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Mostrar loader completo mientras carga
  if (isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, hook useAuth se encarga de redirigir
  if (!usuario) {
    return null;
  }

  // Determinar grupo y rol principal
  const grupoPrincipalObj = grupos.length > 0 ? grupos[0] : { nombre: "Sin grupo", rol: usuario.rol };
  const grupoPrincipal = grupoPrincipalObj.nombre;
  const rolPrincipal = grupoPrincipalObj.rol || usuario.rol;

  // Definir módulos del sistema con permisos
  const modules = [
    {
      id: 'trabajadores',
      title: 'Gestión de Trabajadores',
      description: 'Administra usuarios, roles y permisos del sistema',
      icon: FaUsers,
      path: '/workers',
      color: 'from-blue-500 to-blue-600',
      permission: 'trabajadores'
    },
    {
      id: 'inventario',
      title: 'Gestión de Inventario',
      description: 'Controla el inventario de equipos y recursos',
      icon: FaBoxes,
      path: '/inventory',
      color: 'from-green-500 to-green-600',
      permission: 'inventario'
    },
    {
      id: 'fotocopias',
      title: 'Sistema de Fotocopias',
      description: 'Administra solicitudes y costos de fotocopiado',
      icon: FaCopy,
      path: '/photocopy',
      color: 'from-purple-500 to-purple-600',
      permission: 'fotocopias'
    },
    {
      id: 'reportes',
      title: 'Reportes y Gráficos',
      description: 'Visualiza estadísticas y reportes del sistema',
      icon: FaChartBar,
      path: '/charts',
      color: 'from-orange-500 to-orange-600',
      permission: null // Disponible para todos
    },
    {
      id: 'ubicaciones',
      title: 'Gestión de Ubicaciones',
      description: 'Administra las ubicaciones físicas',
      icon: FaMapMarkerAlt,
      path: '/locationmanager',
      color: 'from-red-500 to-red-600',
      permission: null // Disponible para todos
    },
    {
      id: 'configuracion',
      title: 'Configuración',
      description: 'Configuraciones generales del sistema',
      icon: FaCog,
      path: '/settings',
      color: 'from-gray-500 to-gray-600',
      permission: 'configuracion' // Cambiar de 'admin' a 'configuracion' para consistencia
    }
  ];

  const ModuleCard = ({ module }) => {
    const hasAccess = !module.permission || hasPermission(module.permission);
    const isLocked = !hasAccess;

    return (
      <div className={`
        relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 
        ${isLocked 
          ? 'opacity-60 cursor-not-allowed' 
          : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
        }
      `}>
        {/* Gradiente superior */}
        <div className={`h-2 bg-gradient-to-r ${module.color}`}></div>
        
        {/* Contenido */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`
              p-3 rounded-full bg-gradient-to-r ${module.color} text-white
              ${isLocked ? 'opacity-50' : ''}
            `}>
              <module.icon className="h-6 w-6" />
            </div>
            
            {isLocked && (
              <div className="text-gray-400">
                <FaLock className="h-5 w-5" />
              </div>
            )}
          </div>
          
          <h3 className={`text-xl font-bold mb-2 ${isLocked ? 'text-gray-400' : 'text-gray-800'}`}>
            {module.title}
          </h3>
          
          <p className={`text-sm mb-4 ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
            {module.description}
          </p>
          
          {isLocked ? (
            <div className="text-red-500 text-sm font-medium">
              Sin permisos de acceso
            </div>
          ) : (
            <Link
              to={module.path}
              className={`
                inline-flex items-center px-4 py-2 rounded-lg text-white font-medium 
                bg-gradient-to-r ${module.color} hover:opacity-90 transition-opacity
              `}
            >
              Acceder
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Encabezado Profesional */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Bienvenido, {usuario.nombre} 👋
              </h1>
              <p className="text-gray-600 text-lg">
                Sistema de Gestión de Inventario
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg p-6">
              <div className="flex items-center mb-2">
                <FaUserTie className="text-teal-600 mr-2" />
                <span className="text-sm font-medium text-teal-800">Información del Usuario</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Empresa:</span> {grupoPrincipal}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Rol:</span> {rolPrincipal}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Grupos:</span> {grupos.map((g) => g.nombre).join(", ")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Permisos */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <FaFileAlt className="mr-2 text-teal-600" />
            Acceso a Módulos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {modules.map(module => {
              const hasAccess = !module.permission || hasPermission(module.permission);
              return (
                <div key={module.id} className="text-center">
                  <div className={`
                    inline-flex items-center justify-center w-12 h-12 rounded-full mb-2
                    ${hasAccess 
                      ? `bg-gradient-to-r ${module.color} text-white` 
                      : 'bg-gray-200 text-gray-400'
                    }
                  `}>
                    {hasAccess ? <module.icon /> : <FaLock />}
                  </div>
                  <p className={`text-xs font-medium ${hasAccess ? 'text-gray-700' : 'text-gray-400'}`}>
                    {module.title.split(' ')[0]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Módulos del Sistema */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Módulos del Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map(module => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Acceso Rápido</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-teal-600">
                {modules.filter(m => !m.permission || hasPermission(m.permission)).length}
              </div>
              <div className="text-sm text-gray-600">Módulos Disponibles</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{grupos.length}</div>
              <div className="text-sm text-gray-600">Grupos Asignados</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{permisos.length}</div>
              <div className="text-sm text-gray-600">Permisos Activos</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">Fecha Actual</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default Inicio;
