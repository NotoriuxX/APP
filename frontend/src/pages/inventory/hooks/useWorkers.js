import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils';

export const useWorkers = () => {
  const [allTrabajadores, setAllTrabajadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Estados para filtros y búsqueda
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    department: 'all',
    ocupacion: 'all'
  });

  // Estados para ordenamiento
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Cargar trabajadores
  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/trabajadores`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar trabajadores');
      }

      const data = await response.json();
      setAllTrabajadores(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear trabajador
  const createWorker = useCallback(async (workerData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/trabajadores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(workerData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear trabajador');
      }

      const newWorker = await response.json();
      setAllTrabajadores(prev => [...prev, newWorker]);
      setSuccess('Trabajador creado exitosamente');
      setError(null);
      return newWorker;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar trabajador
  const updateWorker = useCallback(async (id, workerData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/trabajadores/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(workerData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar trabajador');
      }

      const updatedWorker = await response.json();
      setAllTrabajadores(prev => 
        prev.map(worker => worker.id === id ? updatedWorker : worker)
      );
      setSuccess('Trabajador actualizado exitosamente');
      setError(null);
      return updatedWorker;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Eliminar trabajador
  const deleteWorker = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/trabajadores/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar trabajador');
      }

      setAllTrabajadores(prev => prev.filter(worker => worker.id !== id));
      setSuccess('Trabajador eliminado exitosamente');
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cambiar estado del trabajador
  const toggleWorkerStatus = useCallback(async (id, newStatus) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/trabajadores/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ activo: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cambiar estado del trabajador');
      }

      const updatedWorker = await response.json();
      setAllTrabajadores(prev => 
        prev.map(worker => worker.id === id ? { ...worker, activo: newStatus } : worker)
      );
      setSuccess(`Trabajador ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
      setError(null);
      return updatedWorker;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrar y ordenar trabajadores
  const getFilteredAndSortedWorkers = useCallback(() => {
    let filtered = [...allTrabajadores];

    // Aplicar filtros
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(worker => 
        worker.nombres?.toLowerCase().includes(searchLower) ||
        worker.apellidos?.toLowerCase().includes(searchLower) ||
        worker.email?.toLowerCase().includes(searchLower) ||
        worker.ropera?.toString().includes(searchLower)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(worker => {
        if (filters.status === 'active') return worker.activo;
        if (filters.status === 'inactive') return !worker.activo;
        return true;
      });
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(worker => worker.departamento === filters.department);
    }

    if (filters.ocupacion !== 'all') {
      filtered = filtered.filter(worker => worker.ocupacion === filters.ocupacion);
    }

    // Aplicar ordenamiento
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [allTrabajadores, filters, sortConfig]);

  // Obtener trabajadores paginados
  const getPaginatedWorkers = useCallback(() => {
    const filtered = getFilteredAndSortedWorkers();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      workers: filtered.slice(startIndex, endIndex),
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      currentPage,
      itemsPerPage
    };
  }, [getFilteredAndSortedWorkers, currentPage, itemsPerPage]);

  // Limpiar mensajes
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Cargar trabajadores al montar el componente
  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  return {
    // Datos
    allTrabajadores,
    getFilteredAndSortedWorkers,
    getPaginatedWorkers,
    
    // Estados
    loading,
    error,
    success,
    filters,
    sortConfig,
    currentPage,
    itemsPerPage,
    
    // Acciones
    fetchWorkers,
    createWorker,
    updateWorker,
    deleteWorker,
    toggleWorkerStatus,
    clearMessages,
    
    // Setters
    setFilters,
    setSortConfig,
    setCurrentPage,
    setItemsPerPage
  };
};
