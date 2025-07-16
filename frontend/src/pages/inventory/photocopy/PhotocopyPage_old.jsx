import React, { useState, useEffect } from 'react';
import { 
  FaCopy, FaPlus, FaPrint, FaCalendarAlt, FaFilter, FaEye, FaEdit, FaTrash,
  FaFileAlt, FaPalette, FaLayerGroup, FaClipboardList, FaClock, FaSearch,
  FaCheckCircle, FaTimes, FaChartBar, FaUser, FaCalendarDay, FaWeek, FaCalendarWeek
} from 'react-icons/fa';

const PhotocopyPage = () => {
  const [photocopies, setPhotocopies] = useState([]);
  const [filteredPhotocopies, setFilteredPhotocopies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPhotocopy, setEditingPhotocopy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('todas');
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

  const itemsPerPage = 10;
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300/api';

  // Tipos de filtros de fecha
  const periodOptions = [
    { value: 'todas', label: 'Todas las fechas' },
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta semana' },
    { value: 'mes', label: 'Este mes' },
    { value: 'personalizado', label: 'Personalizado' }
  ];

  useEffect(() => {
    fetchPhotocopies();
  }, []);

  useEffect(() => {
    filterPhotocopies();
    calculateStats();
  }, [photocopies, filterPeriod, customDateFrom, customDateTo, searchTerm]);

  // Obtener fecha actual para filtros
  const getDateForFilter = (period) => {
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
  };

  const fetchPhotocopies = async () => {
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
  };

  const filterPhotocopies = () => {
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
  };

  const calculateStats = () => {
    const totalCopies = photocopies.length;
    const totalSheets = photocopies.reduce((sum, p) => {
      const sheets = p.doble_hoja ? p.cantidad * 2 : p.cantidad;
      return sum + sheets;
    }, 0);
    const totalBN = photocopies.filter(p => p.tipo === 'bn').length;
    const totalColor = photocopies.filter(p => p.tipo === 'color').length;

    setStats({
      totalCopies,
      totalSheets,
      totalBN,
      totalColor
    });
  };

  const validateForm = () => {
    if (!photocopyData.cantidad || photocopyData.cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return false;
    }
    if (!photocopyData.comentario.trim()) {
      alert('La descripción es obligatoria');
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
      closeModal();
      alert(editingPhotocopy ? 'Registro actualizado correctamente' : 'Registro creado correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el registro');
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
      alert('Registro eliminado correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el registro');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (photocopy = null) => {
    if (photocopy) {
      setEditingPhotocopy(photocopy);
      setPhotocopyData({
        cantidad: photocopy.cantidad.toString(),
        tipo: photocopy.tipo,
        doble_hoja: photocopy.doble_hoja === 1,
        comentario: photocopy.comentario
      });
    } else {
      setEditingPhotocopy(null);
      setPhotocopyData({
        cantidad: '',
        tipo: 'bn',
        doble_hoja: false,
        comentario: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPhotocopy(null);
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
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(photocopyData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert(editingPhotocopy ? 'Fotocopia actualizada exitosamente' : 'Fotocopia creada exitosamente');
      handleCloseModal();
      fetchPhotocopies();
    } catch (error) {
      console.error('Error saving photocopy:', error);
      alert('Error al guardar la fotocopia');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (photocopy) => {
    setEditingPhotocopy(photocopy);
    setPhotocopyData({
      department: photocopy.department || '',
      worker_id: photocopy.worker_id || '',
      description: photocopy.description || '',
      quantity: photocopy.quantity || 1,
      cost_per_copy: photocopy.cost_per_copy || 0.1,
      total_cost: photocopy.total_cost || 0.1,
      status: photocopy.status || 'Pendiente'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta fotocopia?')) {
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
      
      alert('Fotocopia eliminada exitosamente');
      fetchPhotocopies();
    } catch (error) {
      console.error('Error deleting photocopy:', error);
      alert('Error al eliminar la fotocopia');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPhotocopy(null);
    setPhotocopyData({
      department: '',
      worker_id: '',
      description: '',
      quantity: 1,
      cost_per_copy: 0.1,
      total_cost: 0.1,
      status: 'Pendiente'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendiente': return 'text-yellow-600 bg-yellow-100';
      case 'En Proceso': return 'text-blue-600 bg-blue-100';
      case 'Completado': return 'text-green-600 bg-green-100';
      case 'Cancelado': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pendiente': return <FaCopy className="inline mr-1" />;
      case 'En Proceso': return <FaPrint className="inline mr-1" />;
      case 'Completado': return <FaCheck className="inline mr-1" />;
      case 'Cancelado': return <FaTimes className="inline mr-1" />;
      default: return null;
    }
  };

  // Paginación
  const totalPages = Math.ceil(filteredPhotocopies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPhotocopies = filteredPhotocopies.slice(startIndex, endIndex);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <FaCopy className="mr-3" />
          Gestión de Fotocopias
        </h1>
        <p className="text-teal-100 mt-2">Administra las solicitudes de fotocopias del sistema</p>
      </div>

      {/* Controles y Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Barra de búsqueda */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descripción, trabajador o departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos los departamentos</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.nombre}>{dept.nombre}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos los estados</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <button
              onClick={() => setShowModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center"
            >
              <FaPlus className="mr-2" />
              Nueva Fotocopia
            </button>
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
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Departamento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trabajador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costo Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPhotocopies.map((photocopy) => (
                    <tr key={photocopy.id} className={`hover:bg-gray-50 transition-colors duration-150 ${styles.fadeIn}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {photocopy.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {photocopy.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {photocopy.worker_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {photocopy.quantity}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${photocopy.total_cost?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(photocopy.status)}`}>
                          {getStatusIcon(photocopy.status)}
                          {photocopy.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(photocopy.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(photocopy)}
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
                  ))}
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
                      Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredPhotocopies.length)}</span> de{' '}
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

      {/* Modal para Crear/Editar Fotocopia */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPhotocopy ? 'Editar Fotocopia' : 'Nueva Fotocopia'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departamento *
                    </label>
                    <select
                      value={photocopyData.department}
                      onChange={(e) => setPhotocopyData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">Seleccionar departamento</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.nombre}>{dept.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trabajador *
                    </label>
                    <select
                      value={photocopyData.worker_id}
                      onChange={(e) => setPhotocopyData(prev => ({ ...prev, worker_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    >
                      <option value="">Seleccionar trabajador</option>
                      {workers
                        .filter(worker => !photocopyData.department || worker.departamento === photocopyData.department)
                        .map(worker => (
                          <option key={worker.id} value={worker.id}>
                            {worker.nombre} {worker.apellido}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <textarea
                    value={photocopyData.description}
                    onChange={(e) => setPhotocopyData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows="3"
                    placeholder="Descripción de la fotocopia..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={photocopyData.quantity}
                      onChange={(e) => setPhotocopyData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo por copia
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={photocopyData.cost_per_copy}
                      onChange={(e) => setPhotocopyData(prev => ({ ...prev, cost_per_copy: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo Total
                    </label>
                    <input
                      type="text"
                      value={`$${photocopyData.total_cost.toFixed(2)}`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={photocopyData.status}
                    onChange={(e) => setPhotocopyData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors duration-200"
                  >
                    {loading ? 'Guardando...' : editingPhotocopy ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotocopyPage;
