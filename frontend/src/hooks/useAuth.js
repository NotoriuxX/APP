import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3300";

const useAuth = () => {
  const [usuario, setUsuario] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation(); // Para evitar redirecciones innecesarias

  // Función para obtener y refrescar los datos del usuario
  const fetchUser = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("🔹 No hay token, redirigiendo a login...");
      setIsLoading(false);
      if (location.pathname !== "/login") navigate("/login");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/auth/usuario`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || !data.id) {
        console.log("🔹 No se encontró usuario, redirigiendo a login.");
        localStorage.removeItem("token");
        if (location.pathname !== "/login") navigate("/login");
        return;
      }
      setUsuario(data);
      setGrupos(data.grupos || []);
      setPermisos(data.permisos || []);
      console.log("✅ Usuario autenticado:", data);
    } catch (error) {
      console.error("❌ Error al obtener datos del usuario:", error);
      localStorage.removeItem("token");
      if (location.pathname !== "/login") navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("🔹 useAuth iniciado");
    fetchUser();
  }, [navigate, location]);

  const cerrarSesion = () => {
    console.log("🔹 Cierre de sesión iniciado");
    localStorage.removeItem("token");
    setUsuario(null);
    setPermisos([]);
    setGrupos([]);
    navigate("/login");
  };

  return { usuario, permisos, grupos, isLoading, cerrarSesion, refreshUser: fetchUser };
};

export default useAuth;
