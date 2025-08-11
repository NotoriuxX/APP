import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaCopy, FaPlus, FaPrint, FaEdit, FaTrash,
  FaFileAlt, FaPalette, FaClipboardList, FaSearch,
  FaCheckCircle, FaTimes,
  FaSort, FaSortUp, FaSortDown
} from 'react-icons/fa';
import { useToast } from '../../../components/ToastContext';

// Definir API_URL al inicio
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300';

// Función helper para calcular hojas necesarias correctamente
const calcularHojasNecesarias = (cantidad, multiplicador, dobleHoja) => {
  // Asegurar valores por defecto para prevenir NaN
  const cantidadNum = parseInt(cantidad) || 0;
  const multiplicadorNum = parseInt(multiplicador) || 1;
  
  if (cantidadNum === 0) return 0;
  
  let hojasPorCopia;
  
  if (!dobleHoja) {
    // Si no es doble cara, cada página necesita una hoja por copia
    hojasPorCopia = cantidadNum;
  } else {
    // Para doble cara: calcular hojas necesarias para UNA copia del documento
    if (cantidadNum % 2 === 0) {
      // Páginas pares en el documento: se pueden dividir exactamente
      hojasPorCopia = cantidadNum / 2;
    } else {
      // Páginas impares en el documento: la última página queda sola
      hojasPorCopia = Math.floor(cantidadNum / 2) + 1;
    }
  }
  
  // Total = hojas por copia × número de copias
  return hojasPorCopia * multiplicadorNum;
};

const PhotocopyPage = () => {
  // Usar el hook de toast global primero
  const toast = useToast();
  
  // Definir showToastMessage al principio
  const showToastMessage = (message, type = 'success') => {
    toast[type](message, 4000);
  };

  // 1. Estado para el orden
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [photocopies, setPhotocopies] = useState([]);
  const [filteredPhotocopies, setFilteredPhotocopies] = useState([]);
  const [editingPhotocopy, setEditingPhotocopy] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAnimating, setModalAnimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('hoy');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);  // Agregando el estado itemsPerPage
  const [stats, setStats] = useState({
    totalCopies: 0,
    totalSheets: 0,
    totalBN: 0,
    totalColor: 0,
    costoTotal: 0
  });
  // Estados para el modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalAnimating, setDeleteModalAnimating] = useState(false);
  const [photocopieToDelete, setPhotocopieToDelete] = useState(null);
  
  const [photocopyData, setPhotocopyData] = useState({
    cantidad: '',
    multiplicador: '',
    tipo: 'bn',
    doble_hoja: false,
    comentario: '',
    tipo_hoja_id: ''  // Agregando el campo tipo_hoja_id
  });

  // Estado para los tipos de hoja
  const [tiposHoja, setTiposHoja] = useState([]);

  // Función para cargar los tipos de hoja
  const fetchTiposHoja = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/photocopies/tipos-hoja`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar tipos de hoja');
      }
      
      const data = await response.json();
      setTiposHoja(data);
      
      // Si hay tipos de hoja, seleccionar el primero por defecto
      if (data.length > 0) {
        setPhotocopyData(prev => ({
          ...prev,
          tipo_hoja_id: data[0].id
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      showToastMessage('Error al cargar los tipos de hoja', 'error');
    }
  }, []); // Eliminamos las dependencias para evitar el bucle

  // Cargar tipos de hoja solo cuando el componente se monta
  useEffect(() => {
    let isMounted = true;
    
    const loadTiposHoja = async () => {
      try {
        await fetchTiposHoja();
      } catch (error) {
        if (isMounted) {
          console.error('Error loading tipos hoja:', error);
        }
      }
    };

    loadTiposHoja();

    return () => {
      isMounted = false;
    };
  }, []); // Solo se ejecuta al montar el componente

  // Estado para controlar las animaciones CRUD
  const [animatedRows, setAnimatedRows] = useState(new Set());
  const [lastOperation, setLastOperation] = useState(null); // 'add', 'update', 'delete'

  const itemsPerPageOptions = [5, 10, 25, 50];

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
      
      let url = `${API_URL}/api/photocopies`;
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
    let filtered = [...photocopies];

    // Filtro por término de búsqueda
    if (searchTerm && searchTerm.trim() !== '') {
      const searchTermLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(photocopy => {
        // Solo buscar en campos que existen y tienen valor
        const commentMatch = photocopy.comentario ? 
          photocopy.comentario.toLowerCase().includes(searchTermLower) : false;
        const userMatch = photocopy.usuario_nombre ? 
          photocopy.usuario_nombre.toLowerCase().includes(searchTermLower) : false;
        const groupMatch = photocopy.grupo_nombre ? 
          photocopy.grupo_nombre.toLowerCase().includes(searchTermLower) : false;
        
        // Buscar por tipo (bn/color)
        const tipoMatch = 
          (searchTermLower === 'bn' && photocopy.tipo === 'bn') ||
          (searchTermLower === 'color' && photocopy.tipo === 'color') ||
          (photocopy.tipo && photocopy.tipo.toLowerCase().includes(searchTermLower));
        
        // Buscar por doble hoja (sí/no)
        const doubleSheetMatch = 
          ((searchTermLower === 'si' || searchTermLower === 'sí') && photocopy.doble_hoja) ||
          (searchTermLower === 'no' && !photocopy.doble_hoja);
        
        // Buscar por cantidad
        const cantidadMatch = photocopy.cantidad && 
          photocopy.cantidad.toString().includes(searchTermLower);
        
        return commentMatch || userMatch || groupMatch || tipoMatch || doubleSheetMatch || cantidadMatch;
      });
    }

    setFilteredPhotocopies(filtered);
    setCurrentPage(1); // Resetear a la primera página cuando se filtra
  }, [photocopies, searchTerm]);

  const calculateStats = useCallback(() => {
    // Total de páginas impresas (cantidad × multiplicador de todos los registros)
    const totalPagesImpressed = photocopies.reduce((sum, p) => {
      const cantidad = p.cantidad || 0;
      const multiplicador = p.multiplicador || 1;
      return sum + (cantidad * multiplicador);
    }, 0);
    
    // Total de hojas físicas gastadas
    const totalSheets = photocopies.reduce((sum, p) => {
      const cantidad = p.cantidad || 0;
      const multiplicador = p.multiplicador || 1;
      const sheets = calcularHojasNecesarias(cantidad, multiplicador, p.doble_hoja);
      return sum + sheets;
    }, 0);
    
    // Total de páginas B/N
    const totalBN = photocopies.filter(p => p.tipo === 'bn').reduce((sum, p) => {
      const cantidad = p.cantidad || 0;
      const multiplicador = p.multiplicador || 1;
      return sum + (cantidad * multiplicador);
    }, 0);
    
    // Total de páginas Color
    const totalColor = photocopies.filter(p => p.tipo === 'color').reduce((sum, p) => {
      const cantidad = p.cantidad || 0;
      const multiplicador = p.multiplicador || 1;
      return sum + (cantidad * multiplicador);
    }, 0);

    setStats({
      totalCopies: totalPagesImpressed,  // Total de páginas impresas
      totalSheets: totalSheets,          // Total de hojas físicas gastadas
      totalBN: totalBN,                  // Total de páginas B/N
      totalColor: totalColor,            // Total de páginas Color
      costoTotal: 0
    });
  }, [photocopies]);

  // Función para manejar la apertura del modal con animación
  const handleRowClick = useCallback((photocopy) => {
    console.log('Row clicked:', photocopy); // Debug
    console.log('multiplicador en el click:', photocopy.multiplicador); // Debug específico
    setEditingPhotocopy(photocopy);
    setShowModal(true);
    setTimeout(() => {
      setModalAnimating(true);
    }, 50);
  }, []);

  // Función para cerrar el modal con animación
  const handleCloseModal = useCallback(() => {
    setModalAnimating(false);
    setTimeout(() => {
      setShowModal(false);
      setEditingPhotocopy(null);
    }, 300); // Duración de la animación
  }, []);

  // Efectos para cargar datos y reactividad
  // 2. Función para solicitar orden
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
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
      alert('La cantidad debe ser mayor a 0');
      return false;
    }
    if (!photocopyData.multiplicador || photocopyData.multiplicador <= 0) {
      alert('El número de copias debe ser mayor a 0');
      return false;
    }
    if (!photocopyData.comentario.trim()) {
      alert('La descripción es obligatoria');
      return false;
    }
    return true;
  };

  // Función para manejar las animaciones de las filas
  const handleRowAnimation = (id, operation) => {
    setAnimatedRows(prev => new Set([...prev, id]));
    setLastOperation(operation);
    setTimeout(() => {
      setAnimatedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = editingPhotocopy 
        ? `${API_URL}/api/photocopies/${editingPhotocopy.id}`
        : `${API_URL}/api/photocopies`;
      
      const method = editingPhotocopy ? 'PUT' : 'POST';
      const payload = {
        cantidad: parseInt(photocopyData.cantidad),
        multiplicador: parseInt(photocopyData.multiplicador),
        tipo: photocopyData.tipo,
        tipo_hoja_id: parseInt(photocopyData.tipo_hoja_id),
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
        throw new Error('Error al guardar');
      }

      const data = await response.json();
      await fetchPhotocopies();
      resetForm();
      handleRowAnimation(data.id, editingPhotocopy ? 'update' : 'add');
      
      // Mostramos el mensaje después de completar todas las operaciones
      setTimeout(() => {
        showToastMessage(editingPhotocopy ? 'Registro actualizado correctamente' : 'Registro creado correctamente');
      }, 100);
    } catch (error) {
      console.error('Error:', error);
      showToastMessage(error.message || 'Error al guardar el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPhotocopy) return;
    
    console.log('🔍 FRONTEND - Estado editingPhotocopy completo:', editingPhotocopy);
    console.log('🔍 FRONTEND - multiplicador específicamente:', editingPhotocopy.multiplicador, typeof editingPhotocopy.multiplicador);
    
    const payload = {
      cantidad: editingPhotocopy.cantidad,
      multiplicador: editingPhotocopy.multiplicador,
      tipo: editingPhotocopy.tipo,
      tipo_hoja_id: editingPhotocopy.tipo_hoja_id,
      doble_hoja: editingPhotocopy.doble_hoja,
      comentario: editingPhotocopy.comentario
    };
    
    console.log('🔍 FRONTEND - Payload a enviar:', payload);
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/photocopies/${editingPhotocopy.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el registro');
      }

      await fetchPhotocopies();
      handleCloseModal();
      
      // Mostramos el mensaje de éxito después de un pequeño delay para que el modal se cierre completamente
      setTimeout(() => {
        showToastMessage('Registro actualizado correctamente', 'success');
      }, 400);
    } catch (error) {
      console.error('Error:', error);
      showToastMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Función para mostrar el modal de confirmación de eliminación
  const showDeleteConfirmation = (id) => {
    setPhotocopieToDelete(id);
    setShowDeleteModal(true);
    setTimeout(() => {
      setDeleteModalAnimating(true);
    }, 10);
  };

  // Función para cerrar el modal de confirmación
  const closeDeleteModal = () => {
    setDeleteModalAnimating(false);
    setTimeout(() => {
      setShowDeleteModal(false);
      setPhotocopieToDelete(null);
    }, 300);
  };

  const handleDelete = async (id) => {
    // En lugar de window.confirm, ahora mostramos un modal personalizado
    showDeleteConfirmation(id);
  };

  // Nueva función que se ejecuta cuando se confirma la eliminación
  const confirmDelete = async () => {
    if (!photocopieToDelete) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      handleRowAnimation(photocopieToDelete, 'delete');
      
      const response = await fetch(`${API_URL}/api/photocopies/${photocopieToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      // Cerramos todos los modales antes de mostrar el mensaje de éxito
      closeDeleteModal();  // Cerramos el modal de confirmación
      handleCloseModal();  // Si el modal de edición está abierto, también lo cerramos
      
      // Actualizamos la data
      await fetchPhotocopies();
      
      // Mostramos el mensaje de éxito después de un pequeño delay para que el modal se cierre completamente
      setTimeout(() => {
        showToastMessage('Registro eliminado exitosamente', 'success');
      }, 400);
    } catch (error) {
      console.error('Error:', error);
      showToastMessage(error.message || 'Error al eliminar el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (photocopy) => {
    setEditingPhotocopy(photocopy);
    setPhotocopyData({
      cantidad: photocopy.cantidad.toString(),
      multiplicador: (photocopy.multiplicador || 1).toString(),
      tipo: photocopy.tipo,
      doble_hoja: photocopy.doble_hoja === 1,
      comentario: photocopy.comentario,
      tipo_hoja_id: photocopy.tipo_hoja_id
    });
  };

  const cancelEdit = () => {
    setEditingPhotocopy(null);
    resetForm();
  };

  const resetForm = () => {
    setPhotocopyData({
      cantidad: '',
      multiplicador: '',
      tipo: 'bn',
      doble_hoja: false,
      comentario: '',
      tipo_hoja_id: tiposHoja.length > 0 ? tiposHoja[0].id : ''
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
  // 3. Generar datos ordenados
  const sortedPhotocopies = React.useMemo(() => {
    if (!sortConfig.key) return filteredPhotocopies;
    return [...filteredPhotocopies].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPhotocopies, sortConfig]);

  // 4. Reemplazar fuente de la tabla
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedPhotocopies.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedPhotocopies.length / itemsPerPage);

  // Estilos CSS para animaciones
  const styles = {
    '@keyframes fadeInTableRow': {
      from: {
        opacity: 0,
        transform: 'translateY(10px)'
      },
      to: {
        opacity: 1,
        transform: 'translateY(0)'
      }
    },
    '@keyframes fadeInTableRowStaggered': {
      '0%': {
        opacity: 0,
        transform: 'translateY(10px)'
      },
      '100%': {
        opacity: 1,
        transform: 'translateY(0)'
      }
    },
    '@keyframes fadeOutTableRow': {
      from: {
        opacity: 1,
        transform: 'translateY(0)'
      },
      to: {
        opacity: 0,
        transform: 'translateY(-10px)'
      }
    },
    '@keyframes scaleInRow': {
      from: {
        opacity: 0,
        transform: 'scale(0.95)'
      },
      to: {
        opacity: 1,
        transform: 'scale(1)'
      }
    },
    'animateTableRowIn': {
      animationName: 'fadeInTableRow',
      animationDuration: '0.5s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards'
    },
    'animateTableRowStaggered': {
      animationName: 'fadeInTableRowStaggered',
      animationDuration: '0.4s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards'
    },
    'animateTableRowOut': {
      animationName: 'fadeOutTableRow',
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards'
    },
    'animateTableRowUpdate': {
      animationName: 'scaleInRow',
      animationDuration: '0.4s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
      backgroundColor: 'rgba(20, 184, 166, 0.1)'
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="max-w-7xl mx-auto p-6 w-full">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center">
            <FaCopy className="mr-3" />
            Gestión de Fotocopias
          </h1>
          <p className="text-teal-100 mt-2">Registro y control de impresiones y fotocopias</p>
        </div>

        {/* Formulario para Agregar/Editar Fotocopia */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 relative z-10">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            {editingPhotocopy ? (
              <>
                <FaEdit className="mr-2 text-teal-600" />
                Editar Registro
              </>
            ) : (
              <>
                
              </>
            )}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Páginas del Documento *
                </label>
                <input
                  type="number"
                  min="1"
                  value={photocopyData.cantidad}
                  onChange={(e) => setPhotocopyData(prev => ({ ...prev, cantidad: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Ej: 9"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  ¿Cuántas páginas tiene tu documento original?
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Copias *
                </label>
                <input
                  type="number"
                  min="1"
                  value={photocopyData.multiplicador}
                  onChange={(e) => setPhotocopyData(prev => ({ ...prev, multiplicador: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Ej: 10"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  ¿Cuántas copias completas necesitas?
                </p>
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
                  <option value="color">Color</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Hoja *
                </label>
                <select
                  value={photocopyData.tipoHojaId}
                  onChange={(e) => setPhotocopyData(prev => ({ ...prev, tipoHojaId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {tiposHoja.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <div className="bg-gray-50 rounded-lg p-4 w-full">
                  <div className="text-sm text-gray-600">
                    <p>Total páginas a imprimir: <span className="font-medium">{(parseInt(photocopyData.cantidad) || 0) * (parseInt(photocopyData.multiplicador) || 1)}</span></p>
                    <p>Hojas físicas a gastar: <span className="font-medium">
                      {calcularHojasNecesarias(
                        parseInt(photocopyData.cantidad) || 0, 
                        parseInt(photocopyData.multiplicador) || 1, 
                        photocopyData.doble_hoja
                      )}
                    </span></p>
                  </div>
                </div>
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
                  Doble cara 
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 relative z-10">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-teal-100 rounded-full">
                <FaClipboardList className="text-teal-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Páginas</p>
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
                <p className="text-sm font-medium text-gray-600">Páginas B/N</p>
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
                <p className="text-sm font-medium text-gray-600">Páginas Color</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalColor}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y Controles */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 relative z-10">
          {/* Filtros de período - Botones centrados */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Filtrar por Período</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
              <button
                onClick={() => setFilterPeriod('hoy')}
                className={`px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-colors duration-200 ${
                  filterPeriod === 'hoy'
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                HOY
              </button>
              <button
                onClick={() => setFilterPeriod('semana')}
                className={`px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-colors duration-200 ${
                  filterPeriod === 'semana'
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                SEMANA
              </button>
              <button
                onClick={() => setFilterPeriod('mes')}
                className={`px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-colors duration-200 ${
                  filterPeriod === 'mes'
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                MES
              </button>
              <button
                onClick={() => setFilterPeriod('personalizado')}
                className={`px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-colors duration-200 group relative ${
                  filterPeriod === 'personalizado'
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="hidden lg:inline">PERSONALIZADO</span>
                <span className="lg:hidden md:inline">PERS.</span>
                <span className="absolute left-1/2 transform -translate-x-1/2 -top-8 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none lg:hidden">
                  PERSONALIZADO
                </span>
              </button>
            </div>

            {/* Campos de fecha personalizada */}
            <div 
              className={`grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto overflow-hidden transition-all duration-300 ease-in-out ${
                filterPeriod === 'personalizado'
                  ? 'max-h-[200px] opacity-100 mt-4'
                  : 'max-h-0 opacity-0 -mt-4'
              }`}
            >
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
            
          </div>

          {/* Barra de búsqueda */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por descripción, Tipo, Cantidad o Fechas ..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  setSearchTerm(value);
                  // El filtrado se maneja automáticamente por el useEffect
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Fotocopias */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden relative z-10">
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
                      {/* 5. Cabeceras clicables con iconos */}
                      <th
                        onClick={() => requestSort('registrado_en')}
                        className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-teal-600"
                      >
                        Fecha
                        {sortConfig.key === 'registrado_en'
                          ? (sortConfig.direction === 'asc'
                              ? <FaSortUp className="inline ml-1"/>
                              : <FaSortDown className="inline ml-1"/>)
                          : <FaSort className="inline ml-1 text-gray-400"/>}
                      </th>
                      <th
                        onClick={() => requestSort('usuario_nombre')}
                        className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:text-teal-600"
                      >
                        Usuario
                        {sortConfig.key === 'usuario_nombre'
                          ? (sortConfig.direction === 'asc'
                              ? <FaSortUp className="inline ml-1"/>
                              : <FaSortDown className="inline ml-1"/>)
                          : <FaSort className="inline ml-1 text-gray-400"/>}
                      </th>
                      <th
                        onClick={() => requestSort('cantidad')}
                        className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-teal-600"
                      >
                        <span className="hidden sm:inline">Páginas × Copias</span>
                        <span className="sm:hidden">P×C</span>
                        {sortConfig.key === 'cantidad'
                          ? (sortConfig.direction === 'asc'
                              ? <FaSortUp className="inline ml-1"/>
                              : <FaSortDown className="inline ml-1"/>)
                          : <FaSort className="inline ml-1 text-gray-400"/>}
                      </th>
                      <th
                        onClick={() => requestSort('tipo')}
                        className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-teal-600"
                      >
                        Tipo
                        {sortConfig.key === 'tipo'
                          ? (sortConfig.direction === 'asc'
                              ? <FaSortUp className="inline ml-1"/>
                              : <FaSortDown className="inline ml-1"/>)
                          : <FaSort className="inline ml-1 text-gray-400"/>}
                      </th>
                      <th
                        onClick={() => requestSort('doble_hoja')}
                        className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:text-teal-600"
                      >
                        Doble
                        {sortConfig.key === 'doble_hoja'
                          ? (sortConfig.direction === 'asc'
                              ? <FaSortUp className="inline ml-1"/>
                              : <FaSortDown className="inline ml-1"/>)
                          : <FaSort className="inline ml-1 text-gray-400"/>}
                      </th>
                      <th
                        onClick={() => requestSort('comentario')}
                        className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-teal-600"
                      >
                        Desc.
                        {sortConfig.key === 'comentario'
                          ? (sortConfig.direction === 'asc'
                              ? <FaSortUp className="inline ml-1"/>
                              : <FaSortDown className="inline ml-1"/>)
                          : <FaSort className="inline ml-1 text-gray-400"/>}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-2 sm:px-6 py-4 sm:py-8 text-center">
                          <div className="text-gray-500">
                            <FaClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p>No hay registros de fotocopias para mostrar</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((photocopy, index) => (
                        <tr 
                          key={photocopy.id} 
                          onClick={() => handleRowClick(photocopy)}
                          className="hover:bg-teal-50/70 transition-all duration-150 cursor-pointer"
                          style={{
                            ...animatedRows.has(photocopy.id) 
                              ? lastOperation === 'delete' 
                                ? styles.animateTableRowOut
                                : lastOperation === 'update'
                                  ? styles.animateTableRowUpdate
                                  : styles.animateTableRowIn
                              : index % 2 === 0 
                                ? styles.animateTableRowIn 
                                : styles.animateTableRowStaggered,
                            animationDelay: `${index * 0.05}s`
                          }}
                        >
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {formatDate(photocopy.registrado_en)}
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                            <div className="flex flex-col">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">
                                {photocopy.usuario_nombre}
                              </div>
                              <div className="text-xs text-gray-500">
                                {photocopy.grupo_nombre}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-900 font-medium">
                              {photocopy.cantidad} págs × {photocopy.multiplicador || 1} copias
                            </div>
                            <div className="text-xs text-gray-500 hidden sm:block">
                              <div>Total páginas: {(photocopy.cantidad || 0) * (photocopy.multiplicador || 1)}</div>
                              <div>Hojas gastadas: {calcularHojasNecesarias(photocopy.cantidad, photocopy.multiplicador || 1, photocopy.doble_hoja)}</div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              photocopy.tipo === 'bn' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {photocopy.tipo === 'bn' ? (
                                <>
                                  <FaPrint className="mr-1" />
                                  <span className="hidden sm:inline">B/N</span>
                                  <span className="sm:hidden">B</span>
                                </>
                              ) : (
                                <>
                                  <FaPalette className="mr-1" />
                                  <span className="hidden sm:inline">Color</span>
                                  <span className="sm:hidden">C</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                            {photocopy.doble_hoja ? (
                              <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <FaCheckCircle className="mr-1" />
                                Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <FaTimes className="mr-1" />
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-2 sm:px-6 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 max-w-[100px] sm:max-w-xs truncate" title={photocopy.comentario}>
                              {photocopy.comentario}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="bg-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="itemsPerPage" className="text-sm text-gray-700">
                      Mostrar:
                    </label>
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="text-sm border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {itemsPerPageOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  
                  <span className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                    <span className="font-medium">{Math.min(indexOfLastItem, filteredPhotocopies.length)}</span> de{' '}
                    <span className="font-medium">{filteredPhotocopies.length}</span> registros
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex rounded-md shadow-sm">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Primera página</span>
                      ««
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 border-t border-b border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Anterior</span>
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 border-t border-b border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Siguiente</span>
                      »
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Última página</span>
                      »»
                    </button>
                  </div>
                  <span className="text-sm text-gray-700 whitespace-nowrap">
                    Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal de edición */}
        {showModal && (
          <div className={`fixed inset-0 z-50 overflow-y-auto`}>
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className={`fixed inset-0 bg-gray-500 transition-opacity duration-300 ease-out ${
                  modalAnimating ? 'bg-opacity-75' : 'bg-opacity-0'
                }`} 
                onClick={handleCloseModal}
              />

              <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-out sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
                modalAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Editar Registro de Fotocopia
                      </h3>
                      <div className="mt-2 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Páginas del Documento
                          </label>
                          <input
                            type="number"
                            value={editingPhotocopy?.cantidad || ''}
                            onChange={(e) => setEditingPhotocopy({
                              ...editingPhotocopy,
                              cantidad: parseInt(e.target.value)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número de Copias
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editingPhotocopy?.multiplicador || 1}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              const parsedValue = parseInt(inputValue);
                              console.log('🔍 MODAL INPUT - inputValue:', inputValue, 'parsedValue:', parsedValue);
                              
                              setEditingPhotocopy({
                                ...editingPhotocopy,
                                multiplicador: parsedValue || 1
                              });
                              
                              console.log('🔍 MODAL INPUT - Nuevo estado multiplicador:', parsedValue || 1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo
                          </label>
                          <div className="flex space-x-4">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                checked={editingPhotocopy?.tipo === 'bn'}
                                onChange={() => setEditingPhotocopy({
                                  ...editingPhotocopy,
                                  tipo: 'bn'
                                })}
                                className="form-radio h-4 w-4 text-teal-600"
                              />
                              <span className="ml-2">B/N</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                checked={editingPhotocopy?.tipo === 'color'}
                                onChange={() => setEditingPhotocopy({
                                  ...editingPhotocopy,
                                  tipo: 'color'
                                })}
                                className="form-radio h-4 w-4 text-teal-600"
                              />
                              <span className="ml-2">Color</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Doble Cara
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={editingPhotocopy?.doble_hoja || false}
                              onChange={(e) => setEditingPhotocopy({
                                ...editingPhotocopy,
                                doble_hoja: e.target.checked
                              })}
                              className="form-checkbox h-4 w-4 text-teal-600"
                            />
                            <span className="ml-2">Impresión a doble cara</span>
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción
                          </label>
                          <textarea
                            value={editingPhotocopy?.comentario || ''}
                            onChange={(e) => setEditingPhotocopy({
                              ...editingPhotocopy,
                              comentario: e.target.value
                            })}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>

                        {/* Fecha - Solo visible */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Registro
                          </label>
                          <p className="text-sm text-gray-600">
                            {formatDate(editingPhotocopy?.registrado_en)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(editingPhotocopy.id)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteModal && (
          <div className={`fixed inset-0 z-50 overflow-y-auto`}>
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className={`fixed inset-0 bg-gray-500 transition-opacity duration-300 ease-out ${
                  deleteModalAnimating ? 'bg-opacity-75' : 'bg-opacity-0'
                }`} 
                onClick={closeDeleteModal}
              />

              <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-out sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
                deleteModalAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <FaTrash className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Eliminar Registro
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          ¿Estás seguro de que deseas eliminar este registro de fotocopia? Esta acción no se puede deshacer.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Eliminando...
                      </>
                    ) : (
                      'Eliminar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Los toast ahora se manejan a través del ToastContext */}
      </div>
    </div>
  );
};

export default PhotocopyPage;
