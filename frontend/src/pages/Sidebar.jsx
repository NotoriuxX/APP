import React, { useState } from "react";
import {
  FaHome,
  FaBox,
  FaChartBar,
  FaUserTie,
  FaMapMarkerAlt,
  FaCopy,
  FaCog,
  FaLock,
} from "react-icons/fa";
import usePermissions from "../hooks/usePermissions";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { hasPermission, loading } = usePermissions();

  const routes = [
    { 
      path: "/inicio", 
      name: "Inicio", 
      icon: <FaHome />, 
      permission: null // Inicio siempre accesible
    },
    { 
      path: "/inventory", 
      name: "Inventario", 
      icon: <FaBox />, 
      permission: "inventario" 
    },
    { 
      path: "/admindashboard", 
      name: "Gráficos", 
      icon: <FaChartBar />, 
      permission: "graficos" // TODO: Definir permisos para gráficos
    },
    { 
      path: "/InventoryWorker", 
      name: "Trabajadores", 
      icon: <FaUserTie />, 
      permission: "trabajadores" 
    },
    { 
      path: "/locationmanager", 
      name: "Ubicaciones", 
      icon: <FaMapMarkerAlt />, 
      permission: "ubicaciones" // TODO: Definir permisos para ubicaciones
    },
    { 
      path: "/photocopypage", 
      name: "Fotocopiado", 
      icon: <FaCopy />, 
      permission: "fotocopias" 
    },
    { 
      path: "/settings", 
      name: "Configuración", 
      icon: <FaCog />, 
      permission: "configuracion" // TODO: Definir permisos para configuración
    },
  ];

  // Función para determinar si una ruta es accesible
  const isRouteAccessible = (route) => {
    if (!route.permission) return true; // Sin permiso requerido
    if (loading) return true; // Mientras carga, mostramos todo
    const hasAccess = hasPermission(route.permission);
    console.log(`🔐 Verificando acceso a ${route.name}:`, {
      permission: route.permission,
      hasAccess,
      loading
    });
    return hasAccess;
  };

  // Función para renderizar el enlace o elemento deshabilitado
  const renderRouteItem = (route, index) => {
    const isAccessible = isRouteAccessible(route);
    
    if (isAccessible) {
      return (
        <a
          href={route.path}
          className="flex items-center p-4 text-gray-700 hover:text-[#14B8A6] rounded-lg transition-colors group"
        >
          <span className="text-2xl group-hover:text-[#14B8A6]">
            {route.icon}
          </span>
          {isOpen && (
            <span className="ml-4 text-md group-hover:text-[#14B8A6]">
              {route.name}
            </span>
          )}
        </a>
      );
    } else {
      return (
        <div className="flex items-center p-4 text-gray-400 cursor-not-allowed rounded-lg opacity-60">
          <span className="text-2xl relative">
            {route.icon}
            <FaLock className="absolute -top-1 -right-1 text-xs text-red-500" />
          </span>
          {isOpen && (
            <span className="ml-4 text-md">
              {route.name}
            </span>
          )}
        </div>
      );
    }
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white shadow-md border-r border-gray-300 transition-all duration-300 flex flex-col z-50 ${
          isOpen ? "w-56" : "w-16"
        }`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {/* NAV */}
        <nav className="mt-4 flex-grow">
          <ul className="space-y-2">
            {routes.map((route, index) => (
              <li key={index} className="w-full">
                {renderRouteItem(route, index)}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="flex-grow ml-16 p-4 transition-all duration-300">
        {/* Aquí va el contenido */}
      </main>
    </div>
  );
};

export default Sidebar;