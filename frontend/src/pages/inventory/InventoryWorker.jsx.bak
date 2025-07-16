import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../../hooks/useAuth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300/api';

export default function InventoryWorker() {
  const { usuario, permisos, grupos, isLoading: authLoading } = useAuth();
  const [departamentos, setDepartamentos] = useState([]);
  const [ocupaciones, setOcupaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Estados para formulario
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    ocupacion: '',
    email: '',
    rut: '',
    departamento: '',
    fecha_contratacion: new Date().toISOString().split('T')[0],
    activo: true
  });

  // Estados para autocompletado
  const [departamentoSuggestions, setDepartamentoSuggestions] = useState([]);
  const [ocupacionSuggestions, setOcupacionSuggestions] = useState([]);
  const [showDepartamentoSuggestions, setShowDepartamentoSuggestions] = useState(false);
  const [showOcupacionSuggestions, setShowOcupacionSuggestions] = useState(false);

  // Estados para filtros y búsqueda (ahora en frontend)
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

  // Estados para paginación (ahora en frontend)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Todos los trabajadores (sin filtrar)
  const [allTrabajadores, setAllTrabajadores] = useState([]);

  // Estados para modal de creación de usuario
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    rol_global: 'trabajador',
    rol_grupo: 'miembro',
    permisos_especiales: []  // Nuevos permisos especiales
  });

  // Estados para modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);

  // Estados para modal de gestión de cuenta activa
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedWorkerForAccount, setSelectedWorkerForAccount] = useState(null);

  // Estados para modal de confirmación de desactivación/eliminación de cuenta
  const [showAccountActionModal, setShowAccountActionModal] = useState(false);
  const [accountAction, setAccountAction] = useState(null); // 'disable' o 'delete'
  const [accountActionWorker, setAccountActionWorker] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Función para formatear RUT
  const formatearRUT = (rut) => {
    // Eliminar todo lo que no sean números o K
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    
    if (rutLimpio.length === 0) return '';
    
    // Separar cuerpo y dígito verificador
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    
    if (cuerpo.length === 0) return dv;
    
    // Formatear cuerpo con puntos
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${cuerpoFormateado}-${dv}`;
  };

  // Función para manejar cambio de RUT
  const handleRutChange = (value) => {
    const rutFormateado = formatearRUT(value);
    setFormData(prev => ({
      ...prev,
      rut: rutFormateado
    }));
  };

  // Funciones para autocompletado de departamento
  const handleDepartamentoChange = (value) => {
    setFormData(prev => ({ ...prev, departamento: value }));
    
    if (value.trim() === '') {
      setDepartamentoSuggestions([]);
      setShowDepartamentoSuggestions(false);
      return;
    }

    // Filtrar departamentos existentes que coincidan
    const filteredDepts = departamentos.filter(dept => 
      dept.nombre.toLowerCase().includes(value.toLowerCase())
    );
    
    setDepartamentoSuggestions(filteredDepts);
    setShowDepartamentoSuggestions(true);
  };

  // Funciones para autocompletado de ocupación
  const handleOcupacionChange = (value) => {
    setFormData(prev => ({ ...prev, ocupacion: value }));
    
    if (value.trim() === '') {
      setOcupacionSuggestions([]);
      setShowOcupacionSuggestions(false);
      return;
    }

    // Filtrar ocupaciones existentes
    const filteredOcupaciones = ocupaciones.filter(ocupacion => 
      ocupacion.toLowerCase().includes(value.toLowerCase())
    );
    
    setOcupacionSuggestions(filteredOcupaciones);
    setShowOcupacionSuggestions(true);
  };

  // Función para seleccionar sugerencia
  const selectDepartamento = (dept) => {
    setFormData(prev => ({ ...prev, departamento: dept.nombre }));
    setShowDepartamentoSuggestions(false);
  };

  const selectOcupacion = (ocupacion) => {
    setFormData(prev => ({ ...prev, ocupacion }));
    setShowOcupacionSuggestions(false);
  };

  // Función auxiliar para manejar respuestas HTTP
  const handleResponse = useCallback(async (response) => {
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (response.status === 401) {
      console.log('❌ Error 401: Token inválido o expirado');
      setError('Su sesión ha expirado. Será redirigido al login.');
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 2000);
      return null;
    }
    
    if (response.status === 403) {
      console.log('❌ Error 403: Sin permisos para esta operación');
      const errorText = await response.text();
      console.log('Error details:', errorText);
      
      try {
        const errData = JSON.parse(errorText);
        if (errData.error === 'Usuario sin grupo asignado') {
          setError(`❌ PROBLEMA IDENTIFICADO: Su grupo "${grupos?.[0]?.nombre || 'Personal-1'}" no tiene el estado correcto. El estado actual es "${grupos?.[0]?.estado || 'No definido'}" pero debe ser "activo". Contacte al administrador para corregir el estado del grupo en la base de datos.`);
        } else {
          setError(`Sin permisos: ${errData.error || 'No tiene autorización para acceder a esta funcionalidad'}`);
        }
      } catch (e) {
        setError('No tiene permisos para acceder a esta funcionalidad. Posible problema: estado del grupo incorrecto (debe ser "activo").');
      }
      return null;
    }
    
    if (!response.ok) {
      let errMsg = 'Error en la operación';
      try {
        const errData = await response.json();
        if (errData?.error) errMsg = errData.error;
        console.log('❌ Error en respuesta:', errData);
      } catch (_) {
        console.log('❌ Error al parsear respuesta de error');
      }
      throw new Error(errMsg);
    }
    
    return await response.json();
  }, [grupos, setError]);

  useEffect(() => {
    // Función para cargar departamentos
    const loadDepartamentos = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/trabajadores/departamentos`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const departamentosData = await response.json();
          console.log('✅ Departamentos cargados:', departamentosData);
          setDepartamentos(departamentosData);
        }
      } catch (err) {
        console.error('Error al cargar departamentos:', err);
      }
    };

    // Función para cargar trabajadores
    const loadTrabajadores = async () => {
      console.log('🔄 Iniciando carga de trabajadores...');
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('❌ No hay token disponible');
          throw new Error('No hay token de autenticación');
        }
        
        // Verificar que haya grupos disponibles
        if (!grupos || grupos.length === 0) {
          console.log('❌ No hay grupos disponibles');
          throw new Error('No hay grupos disponibles para cargar trabajadores');
        }
        
        // Usar el primer grupo disponible (o el grupo activo)
        const grupoActivo = grupos[0];
        const grupo_id = grupoActivo.id || grupoActivo.grupo_id;
        
        console.log('✅ Token encontrado, enviando request...');
        console.log('Usuario actual:', usuario);
        console.log('Grupo activo:', grupoActivo);
        console.log('Grupo ID:', grupo_id);
        
        // Cargar TODOS los trabajadores sin filtros pero con grupo_id
        const url = `${API_URL}/trabajadores?grupo_id=${grupo_id}`;
        console.log('🌐 URL:', url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📨 Respuesta recibida:', response.status, response.statusText);
        
        const data = await handleResponse(response);
        if (!data) {
          console.log('❌ No se recibieron datos (problema de autenticación/permisos)');
          return;
        }

        console.log('✅ Datos recibidos:', data);
        // El backend ahora devuelve directamente un array de trabajadores
        setAllTrabajadores(Array.isArray(data) ? data : []);
        
        // Extraer ocupaciones únicas de todos los trabajadores
        const trabajadores = Array.isArray(data) ? data : [];
        const ocupacionesUnicas = [...new Set(
          trabajadores
            ?.filter(t => t.ocupacion)
            .map(t => t.ocupacion)
        )] || [];
        setOcupaciones(ocupacionesUnicas);

      } catch (err) {
        console.error('❌ Error en fetchTrabajadores:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar trabajadores si el usuario está autenticado
    if (usuario && !authLoading) {
      console.log('🔍 Verificando permisos del usuario...');
      console.log('Usuario:', usuario);
      console.log('Permisos:', permisos);
      console.log('Grupos:', grupos);
      
      // Cargar una sola vez todos los trabajadores y departamentos
      console.log('✅ Intentando cargar trabajadores y departamentos...');
      loadTrabajadores();
      loadDepartamentos();
    }
  }, [usuario, authLoading, permisos, grupos, handleResponse]); // Ahora incluimos handleResponse

  // Mantener fetchTrabajadores y fetchDepartamentos como funciones separadas para reutilización
  const fetchTrabajadores = async () => {
    console.log('🔄 Iniciando carga de trabajadores...');
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No hay token disponible');
        throw new Error('No hay token de autenticación');
      }
      
      // Verificar que haya grupos disponibles
      if (!grupos || grupos.length === 0) {
        console.log('❌ No hay grupos disponibles');
        throw new Error('No hay grupos disponibles para cargar trabajadores');
      }
      
      // Usar el primer grupo disponible (o el grupo activo)
      const grupoActivo = grupos[0];
      const grupo_id = grupoActivo.id || grupoActivo.grupo_id;
      
      console.log('✅ Token encontrado, enviando request...');
      console.log('Usuario actual:', usuario);
      console.log('Grupo activo:', grupoActivo);
      console.log('Grupo ID:', grupo_id);
      
      // Cargar TODOS los trabajadores sin filtros pero con grupo_id
      const url = `${API_URL}/trabajadores?grupo_id=${grupo_id}`;
      console.log('🌐 URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📨 Respuesta recibida:', response.status, response.statusText);
      
      const data = await handleResponse(response);
      if (!data) {
        console.log('❌ No se recibieron datos (problema de autenticación/permisos)');
        return;
      }

      console.log('✅ Datos recibidos:', data);
      // El backend ahora devuelve directamente un array de trabajadores
      setAllTrabajadores(Array.isArray(data) ? data : []);
      
      // Extraer ocupaciones únicas de todos los trabajadores
      const trabajadores = Array.isArray(data) ? data : [];
      const ocupacionesUnicas = [...new Set(
        trabajadores
          ?.filter(t => t.ocupacion)
          .map(t => t.ocupacion)
      )] || [];
      setOcupaciones(ocupacionesUnicas);

    } catch (err) {
      console.error('❌ Error en fetchTrabajadores:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Manejar cambios en formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'rut') {
      handleRutChange(value);
    } else if (name === 'departamento') {
      handleDepartamentoChange(value);
    } else if (name === 'ocupacion') {
      handleOcupacionChange(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Manejar cambios en formulario de usuario
  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar cambios en filtros
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset a primera página cuando se cambia filtro
  };

  // Abrir formulario para nuevo trabajador
  const openNewForm = () => {
    setFormData({
      nombres: '',
      apellidos: '',
      ocupacion: '',
      email: '',
      rut: '',
      departamento: '',
      fecha_contratacion: new Date().toISOString().split('T')[0],
      activo: true
    });
    setShowDepartamentoSuggestions(false);
    setShowOcupacionSuggestions(false);
    setEditingId(null);
    setShowForm(true);
  };

  // Abrir formulario para editar trabajador
  const openEditForm = (trabajador) => {
    // Formatear fecha para el input de tipo date
    let fechaContratacion = trabajador.fecha_contratacion;
    if (fechaContratacion) {
      // Si la fecha viene en formato ISO o con hora, extraer solo la fecha
      fechaContratacion = fechaContratacion.split('T')[0];
    } else {
      fechaContratacion = new Date().toISOString().split('T')[0];
    }

    setFormData({
      nombres: trabajador.nombre,
      apellidos: trabajador.apellido,
      ocupacion: trabajador.ocupacion || '',
      email: trabajador.email || '',
      rut: trabajador.rut || '',
      departamento: trabajador.departamento_nombre || '',
      fecha_contratacion: fechaContratacion,
      activo: trabajador.activo
    });
    setEditingId(trabajador.id);
    setSelectedWorker(trabajador); // Para el botón de eliminar
    setShowForm(true);
  };

  // Guardar trabajador
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validaciones del frontend
      if (!formData.nombres.trim() || !formData.apellidos.trim()) {
        throw new Error('El nombre y apellido son obligatorios');
      }
      
      // Departamento es opcional, no validar

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Verificar que haya grupos disponibles
      if (!grupos || grupos.length === 0) {
        throw new Error('No hay grupos disponibles');
      }
      
      // Usar el primer grupo disponible (o el grupo activo)
      const grupoActivo = grupos[0];
      const grupo_id = grupoActivo.id || grupoActivo.grupo_id;
      
      console.log('🚀 Enviando request para crear/editar trabajador');
      console.log('Token preview:', token.substring(0, 20) + '...');
      console.log('Usuario actual:', usuario);
      console.log('Grupo activo:', grupoActivo);
      console.log('Datos del formulario:', formData);
      
      // Agregar grupo_id a los datos del formulario
      const formDataWithGroup = {
        ...formData,
        grupo_id: grupo_id
      };
      
      console.log('Datos del formulario con grupo:', formDataWithGroup);
      
      const url = editingId 
        ? `${API_URL}/trabajadores/${editingId}`
        : `${API_URL}/trabajadores`;
      
      const method = editingId ? 'PUT' : 'POST';

      console.log(`📡 ${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formDataWithGroup)
      });

      console.log('📨 Respuesta recibida:', response.status, response.statusText);

      const data = await handleResponse(response);
      if (!data) return; // Si hubo problema de autenticación

      setSuccess(editingId ? 'Trabajador actualizado exitosamente' : 'Trabajador creado exitosamente');
      setShowForm(false);
      fetchTrabajadores(); // Recargar datos

    } catch (err) {
      console.error('❌ Error en handleSubmit:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de confirmación de eliminación
  const openDeleteModal = (trabajador) => {
    setWorkerToDelete(trabajador);
    setShowDeleteModal(true);
  };

  // Cerrar modal de confirmación de eliminación
  const closeDeleteModal = () => {
    setWorkerToDelete(null);
    setShowDeleteModal(false);
  };

  // Abrir modal de gestión de cuenta activa
  const openAccountModal = (trabajador) => {
    setSelectedWorkerForAccount(trabajador);
    setShowAccountModal(true);
  };

  // Cerrar modal de gestión de cuenta activa
  const closeAccountModal = () => {
    setSelectedWorkerForAccount(null);
    setShowAccountModal(false);
  };

  // Abrir modal de confirmación para acciones de cuenta
  const openAccountActionModal = (action, trabajador) => {
    setAccountAction(action);
    setAccountActionWorker(trabajador);
    setDeleteConfirmation('');
    setShowAccountActionModal(true);
    setShowAccountModal(false); // Cerrar el modal anterior
  };

  // Cerrar modal de confirmación de acciones de cuenta
  const closeAccountActionModal = () => {
    setAccountAction(null);
    setAccountActionWorker(null);
    setDeleteConfirmation('');
    setShowAccountActionModal(false);
  };

  // Deshabilitar cuenta de un trabajador
  const handleDisableAccount = async () => {
    if (!accountActionWorker) return;
    
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_URL}/trabajadores/${accountActionWorker.id}/desactivar-cuenta`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await handleResponse(response);
      if (!data) return;

      setSuccess('Cuenta deshabilitada exitosamente. El trabajador mantiene sus datos pero no podrá acceder al sistema.');
      fetchTrabajadores(); // Recargar datos
      closeAccountActionModal();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar cuenta y datos de un trabajador
  const handleDeleteAccount = async () => {
    if (!accountActionWorker || deleteConfirmation !== 'ELIMINAR') return;
    
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_URL}/trabajadores/${accountActionWorker.id}/eliminar-cuenta`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmacion: 'ELIMINAR'
        })
      });

      const data = await handleResponse(response);
      if (!data) return;

      setSuccess('Cuenta y todos los datos eliminados exitosamente. Esta acción no se puede deshacer.');
      fetchTrabajadores(); // Recargar datos
      closeAccountActionModal();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para ordenar tabla
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Función para filtrar trabajadores en el frontend
  const getFilteredTrabajadores = () => {
    return allTrabajadores.filter(trabajador => {
      // Filtro de búsqueda por texto (nombre, apellido, email, RUT, ocupación, departamento)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          trabajador.nombre?.toLowerCase().includes(searchTerm) ||
          trabajador.apellido?.toLowerCase().includes(searchTerm) ||
          trabajador.email?.toLowerCase().includes(searchTerm) ||
          trabajador.rut?.toLowerCase().includes(searchTerm) ||
          trabajador.ocupacion?.toLowerCase().includes(searchTerm) ||
          trabajador.departamento_nombre?.toLowerCase().includes(searchTerm);
        
        if (!matchesSearch) return false;
      }

      // Filtro por estado (activo/inactivo)
      if (filters.status !== 'all') {
        const isActive = trabajador.activo;
        if (filters.status === 'active' && !isActive) return false;
        if (filters.status === 'inactive' && isActive) return false;
      }

      // Filtro por departamento
      if (filters.department !== 'all') {
        if (trabajador.departamento_id !== parseInt(filters.department)) return false;
      }

      // Filtro por ocupación
      if (filters.ocupacion !== 'all') {
        if (trabajador.ocupacion !== filters.ocupacion) return false;
      }

      return true;
    });
  };

  // Función para obtener trabajadores ordenados
  const getSortedTrabajadores = () => {
    const filteredTrabajadores = getFilteredTrabajadores();
    let sortedTrabajadores = [...filteredTrabajadores];
    
    if (sortConfig.key) {
      sortedTrabajadores.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Manejar casos especiales
        if (sortConfig.key === 'nombre') {
          aValue = `${a.nombre} ${a.apellido}`;
          bValue = `${b.nombre} ${b.apellido}`;
        } else if (sortConfig.key === 'departamento') {
          aValue = a.departamento_nombre || '';
          bValue = b.departamento_nombre || '';
        } else if (sortConfig.key === 'activo') {
          aValue = a.activo ? 1 : 0;
          bValue = b.activo ? 1 : 0;
        }
        
        // Manejar valores null/undefined
        if (!aValue) aValue = '';
        if (!bValue) bValue = '';
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sortedTrabajadores;
  };

  // Función para obtener trabajadores paginados
  const getPaginatedTrabajadores = () => {
    const sortedTrabajadores = getSortedTrabajadores();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedTrabajadores.slice(startIndex, endIndex);
  };

  // Calcular información de paginación
  const getTotalPages = () => {
    const filteredTrabajadores = getFilteredTrabajadores();
    return Math.ceil(filteredTrabajadores.length / itemsPerPage);
  };

  const getTotalItems = () => {
    return getFilteredTrabajadores().length;
  };

  // Los trabajadores a mostrar (filtrados, ordenados y paginados)
  const trabajadores = getPaginatedTrabajadores();
  const totalPages = getTotalPages();
  const totalItems = getTotalItems();

  // Función para renderizar icono de ordenamiento
  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }
    
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };
  const handleDelete = async () => {
    if (!workerToDelete) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`${API_URL}/trabajadores/${workerToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await handleResponse(response);
      if (!data) return; // Si hubo problema de autenticación

      setSuccess('Trabajador eliminado exitosamente');
      closeDeleteModal();
      fetchTrabajadores(); // Recargar datos

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para crear usuario
  const openUserModal = (trabajador) => {
    setSelectedWorker(trabajador);
    setUserFormData({
      email: trabajador.email || '',
      password: '',
      confirmPassword: '',
      rol_global: 'trabajador',
      rol_grupo: 'miembro',
      permisos_especiales: []
    });
    setShowUserModal(true);
  };

  // Función para manejar cambios en permisos especiales
  const handlePermissionChange = (permiso, checked) => {
    setUserFormData(prev => ({
      ...prev,
      permisos_especiales: checked 
        ? [...prev.permisos_especiales, permiso]
        : prev.permisos_especiales.filter(p => p !== permiso)
    }));
  };

  // Crear usuario para trabajador
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!userFormData.email || !userFormData.email.trim()) {
      setError('El email es obligatorio para crear una cuenta');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email)) {
      setError('El formato del correo electrónico no es válido');
      return;
    }
    
    if (userFormData.password !== userFormData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (userFormData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`${API_URL}/trabajadores/${selectedWorker.id}/crear-cuenta`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userFormData.email,
          password: userFormData.password
        })
      });

      const data = await handleResponse(response);
      if (!data) return; // Si hubo problema de autenticación

      setSuccess('Usuario creado exitosamente');
      setShowUserModal(false);
      fetchTrabajadores(); // Recargar datos

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Verificando autenticación...</span>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, no mostrar nada (se redirigirá automáticamente)
  if (!usuario) {
    return null;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Trabajadores
          </h1>
          <p className="text-gray-600">
            Administra el personal de la empresa y crea cuentas de usuario para el sistema
          </p>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Controles superiores */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Buscador */}
            <div className="w-full">
              <input
                type="text"
                placeholder="Buscar por nombre, email, RUT o ocupación..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filtros y botón */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>

                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Todos los departamentos</option>
                  {departamentos.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.nombre}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.ocupacion}
                  onChange={(e) => handleFilterChange('ocupacion', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Todas las ocupaciones</option>
                  {ocupaciones.map((ocupacion, index) => (
                    <option key={index} value={ocupacion}>
                      {ocupacion}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={openNewForm}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden sm:inline">Nuevo Trabajador</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Cargando...</span>
              </div>
            </div>
          ) : trabajadores.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-gray-500">No se encontraron trabajadores</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('nombre')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Trabajador</span>
                          {renderSortIcon('nombre')}
                        </div>
                      </th>
                      <th 
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden sm:table-cell"
                        onClick={() => handleSort('ocupacion')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Ocupación</span>
                          {renderSortIcon('ocupacion')}
                        </div>
                      </th>
                      <th 
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden md:table-cell"
                        onClick={() => handleSort('departamento')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Departamento</span>
                          {renderSortIcon('departamento')}
                        </div>
                      </th>
                      <th 
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('activo')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Estado</span>
                          {renderSortIcon('activo')}
                        </div>
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trabajadores.map((trabajador) => (
                      <tr 
                        key={trabajador.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openEditForm(trabajador)}
                      >
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {trabajador.nombre} {trabajador.apellido}
                            </div>
                            <div className="text-sm text-gray-500">
                              {trabajador.email || 'Sin email'}
                            </div>
                            {trabajador.rut && (
                              <div className="text-sm text-gray-500">
                                RUT: {trabajador.rut}
                              </div>
                            )}
                            {/* Mostrar ocupación y departamento en móviles */}
                            <div className="sm:hidden mt-1">
                              {trabajador.ocupacion && (
                                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mr-1 mb-1">
                                  {trabajador.ocupacion}
                                </div>
                              )}
                              {trabajador.departamento_nombre && (
                                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                                  {trabajador.departamento_nombre}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                          {trabajador.ocupacion || 'No especificado'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                          {trabajador.departamento_nombre || 'Sin departamento'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWorkerStatus(trabajador);
                            }}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors hover:opacity-80 ${
                              trabajador.activo 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {trabajador.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {trabajador.tiene_usuario ? (
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAccountModal(trabajador);
                                }}
                                className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                              >
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden sm:inline">Cuenta activa</span>
                                <span className="sm:hidden">✓</span>
                              </button>
                            </div>
                          ) : (
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openUserModal(trabajador);
                                }}
                                className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="hidden sm:inline">Crear cuenta</span>
                                <span className="sm:hidden">+</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center justify-center sm:justify-start">
                      <p className="text-sm text-gray-700 text-center sm:text-left">
                        Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> a{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, totalItems)}
                        </span> de{' '}
                        <span className="font-medium">{totalItems}</span> resultados
                      </p>
                    </div>
                    <div className="flex justify-center space-x-1">
                      <button
                        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="hidden sm:inline">Anterior</span>
                        <span className="sm:hidden">‹</span>
                      </button>
                      
                      {/* Mostrar números de página en pantallas grandes */}
                      <div className="hidden md:flex space-x-1">
                        {[...Array(totalPages)].map((_, index) => {
                          const pageNum = index + 1;
                          const isCurrentPage = pageNum === currentPage;
                          
                          // Mostrar solo algunas páginas alrededor de la actual
                          if (
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-3 py-2 text-sm border rounded-md ${
                                  isCurrentPage
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if (
                            pageNum === currentPage - 2 ||
                            pageNum === currentPage + 2
                          ) {
                            return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="hidden sm:inline">Siguiente</span>
                        <span className="sm:hidden">›</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingId ? 'Editar Trabajador' : 'Nuevo Trabajador'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellido *
                    </label>
                    <input
                      type="text"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ocupación
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="ocupacion"
                      value={formData.ocupacion}
                      onChange={handleInputChange}
                      onFocus={() => setShowOcupacionSuggestions(ocupaciones.length > 0)}
                      onBlur={() => setTimeout(() => setShowOcupacionSuggestions(false), 200)}
                      placeholder="Ej: Profesor, Conserje, Administrativo..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    {showOcupacionSuggestions && ocupacionSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {ocupacionSuggestions.map((ocupacion, index) => (
                          <div
                            key={index}
                            onClick={() => selectOcupacion(ocupacion)}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          >
                            {ocupacion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT
                  </label>
                  <input
                    type="text"
                    name="rut"
                    value={formData.rut}
                    onChange={handleInputChange}
                    placeholder="Ej: 12345678-9 (se formateará automáticamente)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="departamento"
                      value={formData.departamento}
                      onChange={handleInputChange}
                      onFocus={() => {
                        if (departamentos.length > 0) {
                          setDepartamentoSuggestions(departamentos);
                          setShowDepartamentoSuggestions(true);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowDepartamentoSuggestions(false), 200)}
                      placeholder="Ej: Administración, IT, Recursos Humanos... (opcional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    {showDepartamentoSuggestions && departamentoSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {departamentoSuggestions.map((dept) => (
                          <div
                            key={dept.id}
                            onClick={() => selectDepartamento(dept)}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          >
                            {dept.nombre}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Campo opcional. Escribe para buscar o crear un nuevo departamento.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Contratación
                  </label>
                  <input
                    type="date"
                    name="fecha_contratacion"
                    value={formData.fecha_contratacion}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Trabajador activo
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <div>
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(selectedWorker)}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                      >
                        Eliminar Trabajador
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación de usuario */}
      {showUserModal && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Crear Cuenta de Usuario
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  Crear cuenta para: <strong>{selectedWorker.nombre} {selectedWorker.apellido}</strong>
                </p>
                {selectedWorker.email && (
                  <p className="text-sm text-gray-600">
                    Email actual: <strong>{selectedWorker.email}</strong>
                  </p>
                )}
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={userFormData.email}
                    onChange={handleUserInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Correo electrónico para la cuenta"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedWorker.email ? 'Puedes usar el email actual o cambiarlo' : 'Ingresa un email válido para la cuenta'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={userFormData.password}
                    onChange={handleUserInputChange}
                    required
                    minLength="6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={userFormData.confirmPassword}
                    onChange={handleUserInputChange}
                    required
                    minLength="6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol Global
                  </label>
                  <select
                    name="rol_global"
                    value={userFormData.rol_global}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="trabajador">Trabajador</option>
                    <option value="tecnico">Técnico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol en el Grupo
                  </label>
                  <select
                    name="rol_grupo"
                    value={userFormData.rol_grupo}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="miembro">Miembro</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>

                {/* Permisos Especiales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permisos Especiales
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {[
                      { codigo: 'inventario_leer', nombre: 'Ver inventario' },
                      { codigo: 'inventario_escribir', nombre: 'Modificar inventario' },
                      { codigo: 'inventario_eliminar', nombre: 'Eliminar del inventario' },
                      { codigo: 'trabajadores_leer', nombre: 'Ver trabajadores' },
                      { codigo: 'trabajadores_escribir', nombre: 'Gestionar trabajadores' },
                      { codigo: 'reportes_generar', nombre: 'Generar reportes' },
                      { codigo: 'configuracion_general', nombre: 'Configuración general' }
                    ].map((permiso) => (
                      <label key={permiso.codigo} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={userFormData.permisos_especiales.includes(permiso.codigo)}
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Confirmar Eliminación
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  ¿Está seguro de que desea eliminar este trabajador? Esta acción no se puede deshacer.
                </p>

                <div className="bg-gray-50 rounded-md p-4 mb-4 text-left">
                  <h4 className="font-semibold text-gray-900 mb-2">Datos del trabajador:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Nombre:</span> {workerToDelete.nombre} {workerToDelete.apellido}</p>
                    {workerToDelete.email && (
                      <p><span className="font-medium">Email:</span> {workerToDelete.email}</p>
                    )}
                    {workerToDelete.rut && (
                      <p><span className="font-medium">RUT:</span> {workerToDelete.rut}</p>
                    )}
                    {workerToDelete.ocupacion && (
                      <p><span className="font-medium">Ocupación:</span> {workerToDelete.ocupacion}</p>
                    )}
                    {workerToDelete.departamento_nombre && (
                      <p><span className="font-medium">Departamento:</span> {workerToDelete.departamento_nombre}</p>
                    )}
                    <p>
                      <span className="font-medium">Estado:</span>{' '}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        workerToDelete.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {workerToDelete.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </p>
                    {workerToDelete.tiene_usuario && (
                      <p className="text-amber-600">
                        <span className="font-medium">⚠️ Atención:</span> Este trabajador tiene una cuenta de usuario asociada que también se eliminará.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Eliminando...
                      </>
                    ) : (
                      'Eliminar Trabajador'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
