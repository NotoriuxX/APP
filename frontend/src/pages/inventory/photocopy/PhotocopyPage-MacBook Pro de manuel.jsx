import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaCopy, FaPlus, FaPrint, FaEdit, FaTrash,
  FaFileAlt, FaPalette, FaClipboardList, FaSearch,
  FaCheckCircle, FaTimes
} from 'react-icons/fa';

const PhotocopyPage = () => {
  const [photocopies, setPhotocopies] = useState([]);
  const [filteredPhotocopies, setFilteredPhotocopies] = useState([]);
  const [editingPhotocopy, setEditingPhotocopy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('hoy');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    totalCopies: 0,
    totalSheets: 0,
    totalBN: 0,
    totalColor: 0
  });
  
  const [photocopyData, setPhotocopyData] = useState({
    cantidad: '',
    tipo: 'bn',
    doble_hoja: false,
    comentario: ''
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' o 'error'

  const itemsPerPage = 10;
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300/api';

  // Función para obtener fecha actual para filtros
  const getDateForFilter = useCallback((period) => {
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0];
    
    switch (period) {
      case 'hoy':
        return { desde: currentDate, hasta: currentDate };
      case 'semana':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
        return {
          desde: startOfWeek.toISOString().split('T')[0],
          hasta: endOfWeek.toISOString().split('T')[0]
        };
      case 'mes':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          desde: startOfMonth.toISOString().split('T')[0],
          hasta: endOfMonth.toISOString().split('T')[0]
        };
      case 'personalizado':
        return {
          desde: customDateFrom,
          hasta: customDateTo
        };
      default:
        return { desde: null, hasta: null };
    }
  }, [customDateFrom, customDateTo]);

  const fetchPhotocopies = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { desde, hasta } = getDateForFilter(filterPeriod);
      
      let url = `${API_URL}/photocopies`;
      const params = new URLSearchParams();
      
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPhotocopies(data);
    } catch (error) {
      console.error('Error fetching photocopies:', error);
      alert('Error al cargar las fotocopias');
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, getDateForFilter, API_URL]);

  const filterPhotocopies = useCallback(() => {
    let filtered = photocopies;

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(photocopy =>
        photocopy.comentario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photocopy.usuario_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photocopy.grupo_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPhotocopies(filtered);
    setCurrentPage(1);
  }, [photocopies, searchTerm]);

  const calculateStats = useCallback(() => {
    const totalCopies = photocopies.reduce((sum, p) => sum + p.cantidad, 0);
    const totalSheets = photocopies.reduce((sum, p) => {
      // Si es doble cara, se usa la mitad de hojas por cantidad de impresiones
      const sheets = p.doble_hoja ? Math.ceil(p.cantidad / 2) : p.cantidad;
      return sum + sheets;
    }, 0);
    const totalBN = photocopies.filter(p => p.tipo === 'bn').reduce((sum, p) => sum + p.cantidad, 0);
    const totalColor = photocopies.filter(p => p.tipo === 'color').reduce((sum, p) => sum + p.cantidad, 0);

    setStats({
      totalCopies,
      totalSheets,
      totalBN,
      totalColor
    });
  }, [photocopies]);

  // Función para mostrar toast
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    // Ocultar el toast después de 2 segundos
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  // Efectos para cargar datos y reactividad
  useEffect(() => {
    fetchPhotocopies();
  }, [fetchPhotocopies]);

  useEffect(() => {
    filterPhotocopies();
  }, [filterPhotocopies]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Efecto para recargar datos cuando cambia el filtro de período
  useEffect(() => {
    fetchPhotocopies();
  }, [filterPeriod, customDateFrom, customDateTo]);

  const validateForm = () => {
    if (!photocopyData.cantidad || photocopyData.cantidad <= 0) {
      showToastMessage('La cantidad debe ser mayor a 0', 'error');
      return false;
    }
    if (!photocopyData.comentario.trim()) {
      showToastMessage('La descripción es obligatoria', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = editingPhotocopy 
        ? `${API_URL}/photocopies/${editingPhotocopy.id}`
        : `${API_URL}/photocopies`;
      
      const method = editingPhotocopy ? 'PUT' : 'POST';
      const payload = {
        cantidad: parseInt(photocopyData.cantidad),
        tipo: photocopyData.tipo,
        doble_hoja: photocopyData.doble_hoja,
        comentario: photocopyData.comentario.trim()
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchPhotocopies();
      resetForm();
      showToastMessage(editingPhotocopy ? 'Registro actualizado correctamente' : 'Registro creado correctamente', 'success');
    } catch (error) {
      console.error('Error:', error);
      showToastMessage('Error al guardar el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este registro?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/photocopies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchPhotocopies();
      showToastMessage('Registro eliminado correctamente', 'success');
    } catch (error) {
      console.error('Error:', error);
      showToastMessage('Error al eliminar el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (photocopy) => {
    setEditingPhotocopy(photocopy);
    setPhotocopyData({
      cantidad: photocopy.cantidad.toString(),
      tipo: photocopy.tipo,
      doble_hoja: photocopy.doble_hoja === 1,
      comentario: photocopy.comentario
    });
  };

  const cancelEdit = () => {
    setEditingPhotocopy(null);
    resetForm();
  };

  const resetForm = () => {
    setPhotocopyData({
      cantidad: '',
      tipo: 'bn',
      doble_hoja: false,
      comentario: ''
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPhotocopies.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPhotocopies.length / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <FaCopy className="mr-3" />
          Gestión de Fotocopias
        </h1>
        <p className="text-teal-100 mt-2">Registro y control de impresiones y fotocopias</p>
      </div>

      {/* Formulario para Agregar/Editar Fotocopia */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          {editingPhotocopy ? (
            <>
              <FaEdit className="mr-2 text-teal-600" />
              Editar Registro
            </>
          ) : (
            <>
              <FaPlus className="mr-2 text-teal-600" />
              Nuevo Registro de Fotocopia
            </>
          )}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad (Copias/Impresiones) *
              </label>
              <input
                type="number"
                min="1"
                value={photocopyData.cantidad}
                onChange={(e) => setPhotocopyData(prev => ({ ...prev, cantidad: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: 10"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Impresión *
              </label>
              <select
                value={photocopyData.tipo}
                onChange={(e) => setPhotocopyData(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="bn">Blanco y Negro</option>
                <option value="color">A Color</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={photocopyData.doble_hoja}
                onChange={(e) => setPhotocopyData(prev => ({ ...prev, doble_hoja: e.target.checked }))}
                className="rounded border-gray-300 text-teal-600 shadow-sm focus:border-teal-300 focus:ring focus:ring-teal-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Doble cara (utiliza más hojas)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              value={photocopyData.comentario}
              onChange={(e) => setPhotocopyData(prev => ({ ...prev, comentario: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows="3"
              placeholder="Ej: Lenguaje, Diagnóstico..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Describe qué se está imprimiendo o fotocopiando
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            {editingPhotocopy && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancelar Edición
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors duration-200 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : editingPhotocopy ? (
                <>
                  <FaEdit className="mr-2" />
                  Actualizar
                </>
              ) : (
                <>
                  <FaPlus className="mr-2" />
                  Agregar Registro
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-teal-100 rounded-full">
              <FaClipboardList className="text-teal-600 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Impresiones</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCopies}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <FaFileAlt className="text-blue-600 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hojas Gastadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSheets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 rounded-full">
              <FaPrint className="text-gray-600 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Impresiones B/N</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBN}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <FaPalette className="text-red-600 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Impresiones Color</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalColor}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y Controles */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Filtros de período - Botones centrados */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Filtrar por Período</h3>
          <div className="flex justify-center space-x-4 mb-4">
            <button
              onClick={() => setFilterPeriod('hoy')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                filterPeriod === 'hoy'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              HOY
            </button>
            <button
              onClick={() => setFilterPeriod('semana')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                filterPeriod === 'semana'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              SEMANA
            </button>
            <button
              onClick={() => setFilterPeriod('mes')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                filterPeriod === 'mes'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              MES
            </button>
            <button
              onClick={() => setFilterPeriod('personalizado')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                filterPeriod === 'personalizado'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              PERSONALIZADO
            </button>
          </div>

          {/* Campos de fecha personalizada - Solo se muestran cuando se selecciona "personalizado" */}
          {filterPeriod === 'personalizado' && (
            <div className="flex justify-center space-x-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Desde</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  max={customDateTo || undefined}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Hasta</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  min={customDateFrom || undefined}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Barra de búsqueda */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descripción o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Fotocopias */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doble Cara
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center">
                        <div className="text-gray-500">
                          <FaClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p>No hay registros de fotocopias para mostrar</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((photocopy) => (
                      <tr key={photocopy.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(photocopy.registrado_en)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">
                              {photocopy.usuario_nombre}
                            </div>
                            <div className="text-xs text-gray-500">
                              {photocopy.grupo_nombre}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {photocopy.cantidad}
                          </div>
                          <div className="text-xs text-gray-500">
                            {photocopy.doble_hoja ? `${Math.ceil(photocopy.cantidad / 2)} hojas` : `${photocopy.cantidad} hojas`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            photocopy.tipo === 'bn' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {photocopy.tipo === 'bn' ? (
                              <>
                                <FaPrint className="mr-1" />
                                B/N
                              </>
                            ) : (
                              <>
                                <FaPalette className="mr-1" />
                                Color
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {photocopy.doble_hoja ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FaCheckCircle className="mr-1" />
                              Sí
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <FaTimes className="mr-1" />
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={photocopy.comentario}>
                            {photocopy.comentario}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => startEdit(photocopy)}
                              className="text-teal-600 hover:text-teal-900 transition-colors duration-200"
                              title="Editar"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(photocopy.id)}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                              title="Eliminar"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(indexOfLastItem, filteredPhotocopies.length)}</span> de{' '}
                      <span className="font-medium">{filteredPhotocopies.length}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-teal-50 border-teal-500 text-teal-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast para mensajes */}
      {showToast && (
        <div className={`fixed top-5 right-5 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 ${
          toastType === 'success' ? 'border-green-500' : 'border-red-500'
        } p-4 transition-all duration-300 transform ${
          showToast ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${
              toastType === 'success' ? 'text-green-500' : 'text-red-500'
            }`}>
              {toastType === 'success' ? (
                <FaCheckCircle className="h-5 w-5" />
              ) : (
                <FaTimes className="h-5 w-5" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                toastType === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {toastMessage}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotocopyPage;
