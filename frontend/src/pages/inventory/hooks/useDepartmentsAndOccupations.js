import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils';

export const useDepartmentsAndOccupations = () => {
  const [departamentos, setDepartamentos] = useState([]);
  const [ocupaciones, setOcupaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar departamentos
  const fetchDepartamentos = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/departamentos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar departamentos');
      }

      const data = await response.json();
      setDepartamentos(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Cargar ocupaciones
  const fetchOcupaciones = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/trabajadores/ocupaciones`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar ocupaciones');
      }

      const data = await response.json();
      setOcupaciones(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Crear departamento
  const createDepartamento = useCallback(async (nombre) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/departamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nombre })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear departamento');
      }

      await fetchDepartamentos();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchDepartamentos]);

  // Actualizar departamento
  const updateDepartamento = useCallback(async (id, nombre) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/departamentos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nombre })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar departamento');
      }

      await fetchDepartamentos();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchDepartamentos]);

  // Eliminar departamento
  const deleteDepartamento = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/departamentos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar departamento');
      }

      await fetchDepartamentos();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchDepartamentos]);

  // Crear ocupación (solo se almacena en la tabla trabajadores)
  const createOcupacion = useCallback(async (nombre) => {
    // Las ocupaciones se crean automáticamente cuando se crea un trabajador
    // Aquí podríamos hacer una validación o simplemente refrescar la lista
    await fetchOcupaciones();
    return true;
  }, [fetchOcupaciones]);

  // Obtener sugerencias de departamentos
  const getDepartamentoSuggestions = useCallback((input) => {
    if (!input) return [];
    return departamentos
      .filter(dept => dept.nombre.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 5);
  }, [departamentos]);

  // Obtener sugerencias de ocupaciones
  const getOcupacionSuggestions = useCallback((input) => {
    if (!input) return [];
    return ocupaciones
      .filter(occ => occ.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 5);
  }, [ocupaciones]);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchDepartamentos();
    fetchOcupaciones();
  }, [fetchDepartamentos, fetchOcupaciones]);

  return {
    // Datos
    departamentos,
    ocupaciones,
    
    // Estados
    loading,
    error,
    
    // Acciones
    fetchDepartamentos,
    fetchOcupaciones,
    createDepartamento,
    updateDepartamento,
    deleteDepartamento,
    createOcupacion,
    getDepartamentoSuggestions,
    getOcupacionSuggestions,
    
    // Limpiar error
    clearError: () => setError(null)
  };
};
