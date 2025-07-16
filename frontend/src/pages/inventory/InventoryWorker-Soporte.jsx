import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import styles from './InventoryWorker.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300/api';

// Estilos CSS personalizados para animaciones suaves
const customStyles = `
  @keyframes gentle-bounce {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  @keyframes fadeInSlideLeft {
    0% { 
      opacity: 0; 
      transform: translateX(-20px) scale(0.9); 
    }
    100% { 
      opacity: 1; 
      transform: translateX(0) scale(1); 
    }
  }
  
  @keyframes fadeInSlideRight {
    0% { 
      opacity: 0; 
      transform: translateX(20px) scale(0.9); 
    }
    100% { 
      opacity: 1; 
      transform: translateX(0) scale(1); 
    }
  }
  
  @keyframes fadeInSlideUp {
    0% { 
      opacity: 0; 
      transform: translateY(10px) scale(0.95); 
    }
    100% { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
  }
  
  @keyframes fadeOutSlideDown {
    0% { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
    100% { 
      opacity: 0; 
      transform: translateY(10px) scale(0.95); 
    }
  }
  
  @keyframes fadeInTableRow {
    0% { 
      opacity: 0; 
      transform: translateY(-10px) scale(0.98); 
    }
    100% { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
  }
  
  @keyframes fadeInTableRowStaggered {
    0% { 
      opacity: 0; 
      transform: translateY(-8px) scale(0.99); 
    }
    100% { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
  }
  
  .animate-fade-in-slide-left {
    animation: fadeInSlideLeft 0.5s ease-out forwards;
  }
  
  .animate-fade-in-slide-right {
    animation: fadeInSlideRight 0.6s ease-out 0.1s both;
  }
  
  .animate-fade-in-slide-up {
    animation: fadeInSlideUp 0.4s ease-out forwards;
  }
  
  .animate-fade-out-slide-down {
    animation: fadeOutSlideDown 0.3s ease-in forwards;
  }
  
  .animate-gentle-bounce {
    animation: gentle-bounce 0.5s ease-out;
  }
  
  .animate-table-row-in {
    animation: fadeInTableRow 0.5s ease-out forwards;
  }
  
  .animate-table-row-staggered {
    animation: fadeInTableRowStaggered 0.4s ease-out forwards;
  }
`;

// Agregar los estilos al documento
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = customStyles;
  if (!document.head.querySelector('[data-component="inventory-worker-animations"]')) {
    styleSheet.setAttribute('data-component', 'inventory-worker-animations');
    document.head.appendChild(styleSheet);
  }
}

/**
 * =================================================================
 * INVENTORY WORKER PAGE - PALETA TEAL APLICADA
 * =================================================================
 * 
 * PALETA DE COLORES PRINCIPAL - TEAL (#14B8A6):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ teal-50:  #F0FDFA (Fondos suaves, contenedores de info)    │
 * │ teal-200: #99F6E4 (Bordes suaves)                          │
 * │ teal-500: #14B8A6 (Focus rings, bordes activos)            │
 * │ teal-600: #0D9488 (Botones primarios, iconos de orden)     │
 * │ teal-700: #0F766E (Hover de botones principales)           │
 * │ teal-900: #134E4A (Textos de encabezados importantes)      │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * APLICACIÓN PRÁCTICA:
 * • Botones primarios:    bg-teal-600 hover:bg-teal-700
 * • Focus states:         focus:ring-teal-500 focus:border-teal-500
 * • Contenedores info:    bg-teal-50 border-teal-200
 * • Texto destacado:      text-teal-900
 * • Iconos activos:       text-teal-600
 * =================================================================
 */

export default function InventoryWorker() {
  const { usuario, permisos, grupos, isLoading: authLoading } = useAuth();
  const [departamentos, setDepartamentos] = useState([]);
  const [ocupaciones, setOcupaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // Para efectos de transición
  const [isFiltering, setIsFiltering] = useState(false); // Para indicar cuando se está filtrando
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Estados para formulario
  const [showForm, setShowForm] = useState(false);
  const [formAnimating, setFormAnimating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    ocupacion: '',
    email: '',
    ropera: '',
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

  // Estado separado para el input de búsqueda con debounce
  const [searchInput, setSearchInput] = useState('');

  // Estados para ordenamiento
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  // Estados para paginación (ahora en frontend)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Todos los trabajadores (sin filtrar)
  const [allTrabajadores, setAllTrabajadores] = useState([]);

  // Estados para modal de creación de usuario
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [userModalAnimating, setUserModalAnimating] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    rol_global: 'trabajador',
    permisos: []  // Permisos específicos del usuario
  });

  // Estados para módulos y permisos disponibles
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState({});

  // Estados para modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);

  // Estados para eliminación masiva
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Estados para modal de confirmación de cambio de estado
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState(null);
  const [statusModalAnimating, setStatusModalAnimating] = useState(false);

  // Estados para dropdowns personalizados de filtros
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showOcupacionDropdown, setShowOcupacionDropdown] = useState(false);

  // Estados para recordar valores originales al editar trabajador
  const [originalWorkerData, setOriginalWorkerData] = useState({});

  // Estados para gestión simplificada de departamentos y ocupaciones
  const [showExternalManageModal, setShowExternalManageModal] = useState(false);
  const [externalManageAnimating, setExternalManageAnimating] = useState(false);
  const [externalManageType, setExternalManageType] = useState(''); // 'departamento' o 'ocupacion'
  const [newItemValue, setNewItemValue] = useState(''); // Para agregar nuevos items
  const [editingItemIndex, setEditingItemIndex] = useState(null); // Para editar items existentes
  const [editingItemValue, setEditingItemValue] = useState('');

  // Estados para modal de confirmación de cambios globales
  const [showGlobalChangeModal, setShowGlobalChangeModal] = useState(false);
  const [globalChangeData, setGlobalChangeData] = useState({
    type: '',
    oldValue: '',
    newValue: '',
    callback: null
  });

  // Estados para modal de desactivación de cuenta
  const [showDeactivateAccountModal, setShowDeactivateAccountModal] = useState(false);
  const [deactivateAccountAnimating, setDeactivateAccountAnimating] = useState(false);
  const [deactivateAccountData, setDeactivateAccountData] = useState(null);

  // ========================================
  // FUNCIONES DE PROTECCIÓN Y FILTRADO
  // ========================================
  
  // Función para verificar si un departamento está protegido
  const isDepartamentoProtegido = (nombreDepartamento) => {
    const departamentosProtegidos = ['Administración'];
    return departamentosProtegidos.includes(nombreDepartamento);
  };

  // Función para verificar si una ocupación está protegida
  const isOcupacionProtegida = (nombreOcupacion) => {
    const ocupacionesProtegidas = ['Propietario de Grupo', 'propietario de grupo', 'propietario'];
    return ocupacionesProtegidas.some(ocupacion => 
      nombreOcupacion.toLowerCase().includes(ocupacion.toLowerCase())
    );
  };

  // Función para filtrar ocupaciones protegidas
  const filtrarOcupacionesProtegidas = (ocupaciones) => {
    return ocupaciones.filter(ocupacion => !isOcupacionProtegida(ocupacion));
  };

  // Función para capitalizar solo la primera letra del texto completo (más flexible)
  const capitalizeFirstLetterOnly = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Función para capitalizar solo la primera letra de cada palabra, manteniendo el resto del texto como lo escriba el usuario (para nombres y apellidos)
  const capitalizeFirstLetter = (str) => {
    if (!str) return str;
    return str.split(' ').map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  // Función para convertir email a minúsculas
  const processEmail = (str) => {
    if (!str) return str;
    return str.toLowerCase();
  };

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
      ropera: rutFormateado
    }));
  };

  // Función para confirmar cambios globales o individuales (SIN prompt automático)
  const confirmGlobalChange = async (type, oldValue, newValue) => {
    if (!oldValue || oldValue.trim() === '' || oldValue === newValue) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      if (!grupos || grupos.length === 0) {
        throw new Error('No hay grupos disponibles');
      }

      const grupoActivo = grupos[0];
      const grupo_id = grupoActivo.id || grupoActivo.grupo_id;

      if (type === 'departamento') {
        // Actualizar departamento globalmente en backend
        const response = await fetch(`${API_URL}/trabajadores/departamentos/update`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            oldName: oldValue,
            newName: newValue,
            grupo_id: grupo_id
          })
        });

        const data = await handleResponse(response);
        if (!data) return;

        // Actualizar estado local inmediatamente
        setAllTrabajadores(prev => prev.map(worker => 
          worker.departamento_nombre === oldValue 
            ? { ...worker, departamento_nombre: newValue } 
            : worker
        ));

        // Actualizar departamentos
        setDepartamentos(prev => prev.map(dept => 
          dept.nombre === oldValue ? { ...dept, nombre: newValue } : dept
        ));

        setSuccess(`✅ Departamento actualizado globalmente: "${oldValue}" → "${newValue}"`);

      } else if (type === 'ocupacion') {
        // Actualizar ocupación globalmente en backend
        const response = await fetch(`${API_URL}/trabajadores/ocupaciones/update`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            oldName: oldValue,
            newName: newValue,
            grupo_id: grupo_id
          })
        });

        const data = await handleResponse(response);
        if (!data) return;

        // Actualizar estado local inmediatamente
        setOcupaciones(prev => prev.map(ocup => ocup === oldValue ? newValue : ocup));
        setAllTrabajadores(prev => prev.map(worker => 
          worker.ocupacion === oldValue 
            ? { ...worker, ocupacion: newValue } 
            : worker
        ));

        setSuccess(`✅ Ocupación actualizada globalmente: "${oldValue}" → "${newValue}"`);
      }

    } catch (err) {
      console.error('❌ Error en cambio global:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para cambio individual (solo el trabajador actual)
  const confirmIndividualChange = async (type, newValue, workerId) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Obtener los datos completos del trabajador
      const workerData = allTrabajadores.find(w => w.id === workerId);
      if (!workerData) {
        throw new Error(`No se encontraron datos del trabajador ${workerId}`);
      }

      // Construir el objeto completo con todos los campos requeridos
      const updatedFormData = {
        nombres: workerData.nombres || workerData.nombre || '',
        apellidos: workerData.apellidos || workerData.apellido || '',
        email: workerData.email || '',
        rut: workerData.rut || '',
        departamento: type === 'departamento' ? newValue : (workerData.departamento_nombre || ''),
        fecha_contratacion: workerData.fecha_contratacion || null,
        activo: workerData.activo !== undefined ? workerData.activo : 1,
        ocupacion: type === 'ocupacion' ? newValue : (workerData.ocupacion || ''),
        telefono: workerData.telefono || '',
        direccion: workerData.direccion || '',
        cargo_especifico: workerData.cargo_especifico || '',
        observaciones: workerData.observaciones || '',
        experiencia_anos: workerData.experiencia_anos || null,
        salario: workerData.salario || null,
        fecha_ingreso: workerData.fecha_ingreso || null
      };

      // Actualizar solo el trabajador específico en el backend
      if (type === 'ocupacion') {
        // Usar endpoint PATCH específico para ocupaciones
        const response = await fetch(`${API_URL}/trabajadores/${workerId}/ocupacion`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ocupacion: newValue
          })
        });

        const data = await handleResponse(response);
        if (!data) return;
      } else {
        // Para otros campos, usar el PUT completo (esto sería para departamentos, etc.)
        const updatedFormData = {
          nombres: workerData.nombres || workerData.nombre || '',
          apellidos: workerData.apellidos || workerData.apellido || '',
          email: workerData.email || '',
          rut: workerData.rut || '',
          departamento: type === 'departamento' ? newValue : (workerData.departamento_nombre || ''),
          fecha_contratacion: workerData.fecha_contratacion || null,
          activo: workerData.activo !== undefined ? workerData.activo : 1,
          ocupacion: workerData.ocupacion || '',
          telefono: workerData.telefono || '',
          direccion: workerData.direccion || '',
          cargo_especifico: workerData.cargo_especifico || '',
          observaciones: workerData.observaciones || '',
          experiencia_anos: workerData.experiencia_anos || null,
          salario: workerData.salario || null,
          fecha_ingreso: workerData.fecha_ingreso || null
        };

        const response = await fetch(`${API_URL}/trabajadores/${workerId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedFormData)
        });

        const data = await handleResponse(response);
        if (!data) return;
      }

      // Actualizar solo el trabajador específico en el estado local
      setAllTrabajadores(prev => prev.map(worker => 
        worker.id === workerId 
          ? { 
              ...worker, 
              [type === 'departamento' ? 'departamento_nombre' : 'ocupacion']: newValue 
            } 
          : worker
      ));

      setSuccess(`✅ ${type === 'departamento' ? 'Departamento' : 'Ocupación'} actualizado solo para este trabajador: "${newValue}"`);

    } catch (err) {
      console.error('❌ Error en cambio individual:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para mostrar modal de confirmación personalizado
  const showGlobalChangeConfirmation = (type, oldValue, newValue, callback) => {
    setGlobalChangeData({
      type,
      oldValue,
      newValue,
      callback
    });
    setShowGlobalChangeModal(true);
  };

  // Función para manejar la decisión del modal
  const handleGlobalChangeDecision = async (decision) => {
    setShowGlobalChangeModal(false);
    
    const { type, oldValue, newValue, callback } = globalChangeData;
    
    if (decision === 'global') {
      await confirmGlobalChange(type, oldValue, newValue);
    } else if (decision === 'individual') {
      await confirmIndividualChange(type, newValue, editingId);
    }
    // Si es 'cancel', no hacer nada
    
    // Continuar con el callback original (guardar trabajador)
    if (callback && decision !== 'cancel') {
      await callback();
    }
  };

  // ========================================
  // FUNCIONES SIMPLIFICADAS PARA GESTIÓN DE DEPARTAMENTOS Y OCUPACIONES
  // ========================================
  // FUNCIONES SIMPLIFICADAS PARA GESTIÓN DE DEPARTAMENTOS Y OCUPACIONES
  // ========================================

  // Función para cargar ocupaciones (reutilizable)
  const fetchOcupaciones = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !grupos || grupos.length === 0) return;

      const grupoActivo = grupos[0];
      const grupo_id = grupoActivo.id || grupoActivo.grupo_id;

      // Obtener ocupaciones desde el endpoint específico
      const response = await fetch(`${API_URL}/trabajadores/ocupaciones?grupo_id=${grupo_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const ocupacionesArray = await response.json();
        
        // SIEMPRE incluir "Propietario de Grupo" como ocupación predeterminada
        const ocupacionesPredeterminadas = ['Propietario de Grupo'];
        
        // Combinar ocupaciones predeterminadas con TODAS las obtenidas del servidor
        // No filtrar aquí - solo marcar cuáles son protegidas para mostrar/ocultar botones
        const todasLasOcupaciones = [...new Set([...ocupacionesPredeterminadas, ...ocupacionesArray])];
        
        console.log('✅ Ocupaciones cargadas desde servidor:', ocupacionesArray);
        console.log('📋 Todas las ocupaciones (sin filtrar):', todasLasOcupaciones);
        setOcupaciones(todasLasOcupaciones);
      } else {
        console.log('⚠️ Error al cargar ocupaciones:', response.status);
        // Si hay error, al menos mantener las ocupaciones predeterminadas
        setOcupaciones(['Propietario de Grupo']);
      }
    } catch (err) {
      console.error('Error al cargar ocupaciones:', err);
      // Si hay error, al menos mantener las ocupaciones predeterminadas
      setOcupaciones(['Propietario de Grupo']);
    }
  };

  // Función para abrir modal de gestión simplificado
  const openExternalManageModal = async (type) => {
    setExternalManageType(type);
    setNewItemValue('');
    setEditingItemIndex(null);
    setEditingItemValue('');
    setShowExternalManageModal(true);
    setTimeout(() => setExternalManageAnimating(true), 10);
    
    // Recargar datos frescos del backend
    if (type === 'departamento') {
      await fetchDepartamentos();
    } else if (type === 'ocupacion') {
      await fetchOcupaciones();
      // También refrescar trabajadores para asegurar sincronización
      await fetchTrabajadores();
    }
  };

  // Función para agregar nuevo item (INTUITIVA Y DIRECTA)
  const addNewItem = async () => {
    const trimmedValue = newItemValue.trim();
    if (!trimmedValue) {
      setError('Por favor ingrese un nombre válido');
      return;
    }

    // Capitalizar solo la primera letra, manteniendo el resto exactamente como el usuario lo escribió
    const capitalizedValue = trimmedValue.charAt(0).toUpperCase() + trimmedValue.slice(1);

    // Verificar si se intenta crear algo protegido
    if (externalManageType === 'ocupacion' && isOcupacionProtegida(capitalizedValue)) {
      setError(`No se puede crear "${capitalizedValue}": es una ocupación protegida del sistema`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const grupoActivo = grupos[0];
      const grupo_id = grupoActivo.id || grupoActivo.grupo_id;

      // Verificar duplicados (comparación case-insensitive)
      const existingItems = externalManageType === 'departamento' ? departamentos : ocupaciones;
      const isDuplicate = existingItems.some(item => {
        const itemName = typeof item === 'string' ? item : item.nombre;
        return itemName.toLowerCase().trim() === capitalizedValue.toLowerCase();
      });

      if (isDuplicate) {
        setError(`Ya existe un ${externalManageType} con el nombre "${capitalizedValue}"`);
        setLoading(false);
        return;
      }

      if (externalManageType === 'departamento') {
        // Crear nuevo departamento
        const response = await fetch(`${API_URL}/trabajadores/departamentos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre: capitalizedValue,
            grupo_id: grupo_id
          })
        });

        const data = await handleResponse(response);
        if (data) {
          setDepartamentos(prev => [...prev, data]);
          setSuccess(`✅ Departamento "${data.nombre}" creado exitosamente`);
          setNewItemValue('');
        }

      } else if (externalManageType === 'ocupacion') {
        // Crear nueva ocupación usando el endpoint
        const response = await fetch(`${API_URL}/trabajadores/ocupaciones`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre: capitalizedValue,
            grupo_id: grupo_id
          })
        });

        const data = await handleResponse(response);
        if (data) {
          // Recargar todas las ocupaciones desde el backend para asegurar sincronización
          await fetchOcupaciones();
          // También recargar trabajadores para asegurar que la tabla se actualice correctamente
          await fetchTrabajadores();
          setSuccess(`✅ Ocupación "${data.ocupacion}" creada exitosamente`);
          setNewItemValue('');
        }
      }

    } catch (err) {
      console.error('Error al agregar nuevo item:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar edición de item existente
  const startEditingItem = (index, currentValue) => {
    // Verificar si es un departamento protegido
    if (externalManageType === 'departamento' && isDepartamentoProtegido(currentValue)) {
      setError(`El departamento "${currentValue}" está protegido y no se puede editar`);
      return;
    }
    
    // Verificar si es una ocupación protegida
    if (externalManageType === 'ocupacion' && isOcupacionProtegida(currentValue)) {
      setError(`La ocupación "${currentValue}" está protegida y no se puede editar`);
      return;
    }
    
    setEditingItemIndex(index);
    setEditingItemValue(currentValue);
  };

  // Función para guardar edición
  const saveItemEdit = async () => {
    const trimmedValue = editingItemValue.trim();
    if (!trimmedValue) {
      setError('Por favor ingrese un nombre válido');
      return;
    }

    const currentItems = externalManageType === 'departamento' ? departamentos : ocupaciones;
    const currentItem = currentItems[editingItemIndex];
    const oldValue = typeof currentItem === 'string' ? currentItem : currentItem.nombre;
    
    if (oldValue === trimmedValue) {
      // No hay cambios
      setEditingItemIndex(null);
      setEditingItemValue('');
      return;
    }

    // Verificar duplicados
    const isDuplicate = currentItems.some((item, index) => {
      if (index === editingItemIndex) return false; // Ignorar el item actual
      const itemName = typeof item === 'string' ? item : item.nombre;
      return itemName.toLowerCase().trim() === trimmedValue.toLowerCase();
    });

    if (isDuplicate) {
      setError(`Ya existe un ${externalManageType} con el nombre "${trimmedValue}"`);
      return;
    }

    // Ejecutar cambio global
    await confirmGlobalChange(externalManageType, oldValue, trimmedValue);
    
    setEditingItemIndex(null);
    setEditingItemValue('');
  };

  // Función para cancelar edición
  const cancelItemEdit = () => {
    setEditingItemIndex(null);
    setEditingItemValue('');
  };

  // Función para eliminar item con confirmación simple
  const deleteItem = async (index) => {
    const currentItems = externalManageType === 'departamento' ? departamentos : ocupaciones;
    const itemToDelete = currentItems[index];
    const itemName = typeof itemToDelete === 'string' ? itemToDelete : itemToDelete.nombre;
    
    // Verificar si es un departamento protegido
    if (externalManageType === 'departamento' && isDepartamentoProtegido(itemName)) {
      setError(`El departamento "${itemName}" está protegido y no se puede eliminar`);
      return;
    }
    
    if (!window.confirm(`¿Eliminar "${itemName}"?\n\nSi está siendo usada por trabajadores, se les quitará esta asignación.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      const grupoActivo = grupos[0];
      const grupo_id = grupoActivo.id || grupoActivo.grupo_id;

      console.log(`🗑️ Intentando eliminar ${externalManageType}: "${itemName}" (índice: ${index})`);
      console.log('Grupos disponibles:', grupos);
      console.log('Grupo activo:', grupoActivo);
      console.log('Grupo ID:', grupo_id);

      if (externalManageType === 'departamento') {
        const response = await fetch(`${API_URL}/trabajadores/departamentos/delete`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: itemName,
            grupo_id: grupo_id
          })
        });

        console.log(`📨 Respuesta del servidor:`, response.status, response.statusText);

        if (response.status === 404) {
          // Ya no existe en el backend, recargar datos para sincronizar
          console.log(`⚠️ Departamento "${itemName}" no encontrado en el backend (404), recargando datos`);
          await fetchDepartamentos();
          setAllTrabajadores(prev => prev.map(worker => 
            worker.departamento_nombre === itemName 
              ? { ...worker, departamento_nombre: '' } 
              : worker
          ));
          setSuccess(`✅ "${itemName}" limpiado del estado local (ya no existía en el backend)`);
        } else if (response.ok) {
          // Eliminación exitosa
          const data = await response.json();
          console.log(`✅ Departamento "${itemName}" eliminado exitosamente:`, data);
          
          // Recargar departamentos desde el backend para asegurar sincronización
          await fetchDepartamentos();
          
          // Actualizar trabajadores que tenían este departamento
          setAllTrabajadores(prev => prev.map(worker => 
            worker.departamento_nombre === itemName 
              ? { ...worker, departamento_nombre: '' } 
              : worker
          ));
          setSuccess(`✅ "${itemName}" eliminado exitosamente (${data.affected_workers || 0} trabajadores actualizados)`);
        } else {
          // Error del servidor
          const errorData = await handleResponse(response);
          if (!errorData) {
            console.log(`❌ Error del servidor al eliminar "${itemName}"`);
            return;
          }
        }

      } else if (externalManageType === 'ocupacion') {
        console.log(`🗑️ Eliminando ocupación "${itemName}"`);
        
        // Verificar si la ocupación es protegida
        if (isOcupacionProtegida(itemName)) {
          setError('No se pueden eliminar ocupaciones protegidas');
          return;
        }

        const grupoActivo = grupos[0];
        const grupo_id = grupoActivo.id || grupoActivo.grupo_id;
        
        console.log(`🔍 Verificando si la ocupación "${itemName}" está en uso...`);
        
        // PASO 1: Verificar si está en uso consultando trabajadores del backend
        const trabajadoresResponse = await fetch(`${API_URL}/trabajadores?grupo_id=${grupo_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!trabajadoresResponse.ok) {
          setError('Error al consultar trabajadores. Inténtelo de nuevo.');
          return;
        }
        
        const trabajadoresData = await trabajadoresResponse.json();
        const trabajadoresConOcupacion = trabajadoresData.filter(trabajador => 
          trabajador.ocupacion === itemName
        );
        
        const numTrabajadores = trabajadoresConOcupacion.length;
        console.log(`📊 Encontrados ${numTrabajadores} trabajadores con ocupación "${itemName}"`);
        
        if (numTrabajadores === 0) {
          // PASO 2: No está en uso, simplemente quitarla del frontend
          console.log(`✅ Ocupación "${itemName}" no está en uso. Eliminando del frontend...`);
          
          // Quitar del estado local inmediatamente
          setOcupaciones(prev => prev.filter(ocup => ocup !== itemName));
          
          // También actualizar trabajadores para asegurar sincronización
          await fetchTrabajadores();
          
          setSuccess(`✅ Ocupación "${itemName}" eliminada exitosamente (no estaba en uso).`);
        } else {
          // PASO 3: Está en uso, preguntar qué hacer
          const nombresAMostrar = trabajadoresConOcupacion
            .slice(0, 5) // Mostrar solo los primeros 5
            .map(t => `• ${t.nombre} ${t.apellido}`)
            .join('\n');
          
          const masTexto = numTrabajadores > 5 ? `\n... y ${numTrabajadores - 5} más` : '';
          
          const confirmMessage = `⚠️ La ocupación "${itemName}" está siendo usada por ${numTrabajadores} trabajador(es):\n\n${nombresAMostrar}${masTexto}\n\n¿Desea eliminarla de todos modos?\n\nSe quitará la ocupación a estos trabajadores y luego se eliminará del sistema.`;
          
          if (window.confirm(confirmMessage)) {
            console.log(`🔄 Usuario confirmó eliminación. Desasignando ocupación de ${numTrabajadores} trabajador(es)...`);
            
            // PASO 4: Actualizar todos los trabajadores para quitar la ocupación
            let trabajadoresActualizados = 0;
            let erroresActualizacion = 0;
            
            for (const trabajador of trabajadoresConOcupacion) {
              try {
                console.log(`📝 Quitando ocupación "${itemName}" a ${trabajador.nombre} ${trabajador.apellido} (ID: ${trabajador.id})`);
                
                // Usar el nuevo endpoint PATCH específico para actualizar solo la ocupación
                const updateResponse = await fetch(`${API_URL}/trabajadores/${trabajador.id}/ocupacion`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    ocupacion: '' // Quitar la ocupación
                  })
                });

                if (updateResponse.ok) {
                  trabajadoresActualizados++;
                  console.log(`✅ Ocupación quitada a ${trabajador.nombre} ${trabajador.apellido}`);
                } else {
                  erroresActualizacion++;
                  console.log(`❌ Error al actualizar ${trabajador.nombre} ${trabajador.apellido}:`, updateResponse.status);
                  const errorText = await updateResponse.text();
                  console.log('Error details:', errorText);
                }
              } catch (updateErr) {
                erroresActualizacion++;
                console.error(`❌ Error al actualizar trabajador ${trabajador.id}:`, updateErr);
              }
            }

            console.log(`📊 Actualización completada: ${trabajadoresActualizados} exitosos, ${erroresActualizacion} errores`);

            if (erroresActualizacion > 0) {
              setError(`⚠️ Se actualizaron ${trabajadoresActualizados} trabajadores, pero ${erroresActualizacion} tuvieron errores. Revise la consola y reinténtelo.`);
              return;
            }

            // PASO 5: Todos los trabajadores actualizados exitosamente, quitar del frontend
            console.log(`✅ Todos los trabajadores actualizados. Eliminando ocupación "${itemName}" del frontend...`);
            
            // Quitar del estado local
            setOcupaciones(prev => prev.filter(ocup => ocup !== itemName));
            
            // Recargar datos para asegurar sincronización
            await fetchTrabajadores();
            
            setSuccess(`✅ Ocupación "${itemName}" eliminada exitosamente. Se actualizaron ${trabajadoresActualizados} trabajador(es).`);
          } else {
            // Usuario canceló
            console.log(`⏹️ Usuario canceló eliminación de "${itemName}"`);
          }
        }
      }

    } catch (err) {
      console.error(`❌ Error al eliminar ${externalManageType}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar modal
  const closeExternalManageModal = () => {
    setExternalManageAnimating(false);
    setTimeout(() => {
      setShowExternalManageModal(false);
      setNewItemValue('');
      setEditingItemIndex(null);
      setEditingItemValue('');
    }, 300);
  };

  // Funciones para autocompletado de departamento
  const handleDepartamentoChange = (value) => {
    // Capitalizar SOLO la primera letra, manteniendo el resto exactamente como el usuario lo escribe
    const capitalizedValue = value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
    
    // Aplicar trim solo al guardar, mantener el valor original en el input
    setFormData(prev => ({ ...prev, departamento: capitalizedValue }));

    const trimmedValue = capitalizedValue.trim();
    if (trimmedValue === '') {
      setDepartamentoSuggestions([]);
      setShowDepartamentoSuggestions(false);
      return;
    }

    // Filtrar departamentos existentes que coincidan
    const filteredDepts = departamentos.filter(dept => 
      dept.nombre.toLowerCase().includes(trimmedValue.toLowerCase())
    );
    
    setDepartamentoSuggestions(filteredDepts);
    setShowDepartamentoSuggestions(true);
  };

  // Funciones para autocompletado de ocupación
  const handleOcupacionChange = (value) => {
    // Capitalizar SOLO la primera letra, manteniendo el resto exactamente como el usuario lo escribe
    const capitalizedValue = value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
    
    // Aplicar trim solo al guardar, mantener el valor original en el input
    setFormData(prev => ({ ...prev, ocupacion: capitalizedValue }));

    const trimmedValue = capitalizedValue.trim();
    if (trimmedValue === '') {
      setOcupacionSuggestions([]);
      setShowOcupacionSuggestions(false);
      return;
    }

    // Filtrar ocupaciones existentes que coincidan
    const filteredOcupaciones = ocupaciones.filter(ocupacion => 
      ocupacion.toLowerCase().includes(trimmedValue.toLowerCase())
    );
    
    // NO filtrar ocupaciones protegidas aquí porque sí queremos que aparezcan en autocompletado
    // (por ejemplo, "Propietario de Grupo" debe estar disponible para asignación)
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
        
        // Cargar ocupaciones usando la función dedicada (incluye todas las registradas)
        await fetchOcupaciones();

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
      fetchDepartamentos();
      fetchAvailableModules(); // Cargar módulos disponibles
    }
  }, [usuario, authLoading, permisos, grupos, handleResponse]); // Ahora incluimos handleResponse

  // Función para cargar departamentos (reutilizable)
  const fetchDepartamentos = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Construir URL con filtro por grupo si está disponible
      let url = `${API_URL}/trabajadores/departamentos`;
      if (grupos && grupos.length > 0) {
        const grupoActivo = grupos[0];
        const grupo_id = grupoActivo.id || grupoActivo.grupo_id;
        url += `?grupo_id=${grupo_id}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const departamentosData = await response.json();
        console.log('✅ Departamentos cargados:', departamentosData);
        setDepartamentos(departamentosData);
      } else {
        console.log('⚠️ Error al cargar departamentos:', response.status);
        // Si hay error, limpiar la lista para evitar mostrar datos obsoletos
        setDepartamentos([]);
      }
    } catch (err) {
      console.error('Error al cargar departamentos:', err);
      setDepartamentos([]);
    }
  };

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
      
      // Cargar ocupaciones usando la función dedicada (incluye predeterminadas)
      await fetchOcupaciones();

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

  // Debounce para el search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Manejar cambios en formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'ropera') {
      handleRutChange(value);
    } else if (name === 'departamento') {
      handleDepartamentoChange(value);
    } else if (name === 'ocupacion') {
      handleOcupacionChange(value);
    } else {
      let processedValue = type === 'checkbox' ? checked : value;
      
      // Aplicar diferentes tipos de procesamiento según el campo
      if (typeof processedValue === 'string') {
        switch (name) {
          case 'nombres':
          case 'apellidos':
            // Capitalizar primera letra de cada palabra, resto mantiene como escribe el usuario
            processedValue = capitalizeFirstLetter(processedValue);
            break;
          case 'email':
            // Convertir todo a minúsculas
            processedValue = processEmail(processedValue);
            break;
          // ocupacion y departamento se manejan en sus funciones específicas
          default:
            // Otros campos no se modifican
            break;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
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
    // Activar efectos de transición si hay datos previos
    if (allTrabajadores.length > 0) {
      setIsTransitioning(true);
      setIsFiltering(true);
    }

    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset a primera página cuando se cambia filtro

    // Finalizar transición después de un breve momento
    setTimeout(() => {
      setIsTransitioning(false);
      setIsFiltering(false);
    }, 300);
  };

  // Funciones para manejar dropdowns personalizados
  const toggleStatusDropdown = () => {
    setShowStatusDropdown(!showStatusDropdown);
    setShowDepartmentDropdown(false);
    setShowOcupacionDropdown(false);
  };

  const toggleDepartmentDropdown = () => {
    setShowDepartmentDropdown(!showDepartmentDropdown);
    setShowStatusDropdown(false);
    setShowOcupacionDropdown(false);
  };

  const toggleOcupacionDropdown = () => {
    setShowOcupacionDropdown(!showOcupacionDropdown);
    setShowStatusDropdown(false);
    setShowDepartmentDropdown(false);
  };

  const selectStatusOption = (value) => {
    handleFilterChange('status', value);
    setShowStatusDropdown(false);
  };

  const selectDepartmentOption = (value) => {
    handleFilterChange('department', value);
    setShowDepartmentDropdown(false);
  };

  const selectOcupacionOption = (value) => {
    handleFilterChange('ocupacion', value);
    setShowOcupacionDropdown(false);
  };

  // Cerrar dropdowns cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-select-wrapper')) {
        setShowStatusDropdown(false);
        setShowDepartmentDropdown(false);
        setShowOcupacionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Obtener texto de display para los filtros
  const getStatusDisplayText = () => {
    switch (filters.status) {
      case 'active': return 'Activos';
      case 'inactive': return 'Inactivos';
      default: return 'Todos los estados';
    }
  };

  const getDepartmentDisplayText = () => {
    if (filters.department === 'all') return 'Todos los departamentos';
    const dept = departamentos.find(d => d.id.toString() === filters.department);
    return dept ? dept.nombre : 'Todos los departamentos';
  };

  const getOcupacionDisplayText = () => {
    if (filters.ocupacion === 'all') return 'Todas las ocupaciones';
    return filters.ocupacion;
  };

  // Abrir formulario para nuevo trabajador
  const openNewForm = () => {
    setFormData({
      nombres: '',
      apellidos: '',
      ocupacion: '',
      email: '',
      ropera: '',
      departamento: '',
      fecha_contratacion: new Date().toISOString().split('T')[0],
      activo: true
    });
    setShowDepartamentoSuggestions(false);
    setShowOcupacionSuggestions(false);
    setEditingId(null);
    setOriginalWorkerData({}); // Limpiar datos originales
    setShowForm(true);
    // Activar animación después de un pequeño delay
    setTimeout(() => setFormAnimating(true), 10);
  };

  // Abrir formulario para editar trabajador
  const openEditForm = (trabajador) => {
    // No permitir editar el propietario
    if (trabajador.es_propietario || trabajador.solo_lectura || trabajador.puede_editar === false) {
      setError('No se puede editar este trabajador: permisos insuficientes o es el propietario del grupo');
      return;
    }

    // Formatear fecha para el input de tipo date
    let fechaContratacion = trabajador.fecha_contratacion;
    if (fechaContratacion) {
      // Si la fecha viene en formato ISO o con hora, extraer solo la fecha
      fechaContratacion = fechaContratacion.split('T')[0];
    } else {
      fechaContratacion = new Date().toISOString().split('T')[0];
    }

    const formDataToSet = {
      nombres: trabajador.nombre,
      apellidos: trabajador.apellido,
      ocupacion: trabajador.ocupacion || '',
      email: trabajador.email || '',
      ropera: trabajador.rut || '',
      departamento: trabajador.departamento_nombre || '',
      fecha_contratacion: fechaContratacion,
      activo: trabajador.activo
    };

    setFormData(formDataToSet);
    // Guardar valores originales para comparar al enviar
    setOriginalWorkerData({
      departamento: trabajador.departamento_nombre || '',
      ocupacion: trabajador.ocupacion || ''
    });
    setEditingId(trabajador.id);
    setSelectedWorker(trabajador); // Para el botón de eliminar
    setShowForm(true);
    // Activar animación después de un pequeño delay
    setTimeout(() => setFormAnimating(true), 10);
  };

  // Función para cerrar formulario con animación suave y rápida
  const closeForm = () => {
    // Iniciar animación de cierre
    setFormAnimating(false);
    
    // Cierre más rápido que la apertura (250ms vs 300ms)
    setTimeout(() => {
      setShowForm(false);
      setEditingId(null);
      setSelectedWorker(null);
      // Limpiar sugerencias de autocompletado
      setShowDepartamentoSuggestions(false);
      setShowOcupacionSuggestions(false);
    }, 250);
  };

  // Manejar cierre del modal con tecla Escape
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showForm) {
        closeForm();
      }
    };

    // Agregar listener solo cuando el modal esté abierto
    if (showForm) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showForm]);

  // Guardar trabajador
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Función para continuar con el guardado después de las confirmaciones
    const continueWithSave = async () => {
      setLoading(true);
      setError(null);

      try {
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
        
        // Agregar grupo_id a los datos del formulario y aplicar trim
        const formDataWithGroup = {
          nombres: formData.nombres.trim(),
          apellidos: formData.apellidos.trim(),
          email: formData.email.trim(),
          departamento: formData.departamento.trim(),
          ocupacion: formData.ocupacion.trim(),
          rut: formData.ropera.trim(), // Mapear ropera a rut
          fecha_contratacion: formData.fecha_contratacion,
          activo: formData.activo,
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
        
        // Usar la función closeForm para animación consistente y más rápida
        closeForm();
        
        // Recargar datos después de cerrar el modal (un poco más de tiempo para asegurar que el modal se cerró)
        setTimeout(() => {
          fetchTrabajadores(); // Recargar datos
          fetchDepartamentos(); // Recargar departamentos para actualizar los filtros
        }, 300);

      } catch (err) {
        console.error('❌ Error en handleSubmit:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    try {
      // Validaciones del frontend
      if (!formData.nombres.trim() || !formData.apellidos.trim()) {
        throw new Error('El nombre y apellido son obligatorios');
      }
      
      // Si estamos editando, verificar si departamento o ocupación cambió
      if (editingId && originalWorkerData) {
        let needsConfirmation = false;
        
        // Verificar departamento
        if (originalWorkerData.departamento && 
            originalWorkerData.departamento !== formData.departamento.trim() && 
            formData.departamento.trim() !== '') {
          
          // Verificar si el nuevo departamento ya existe
          const departamentoExiste = departamentos.some(dept => 
            dept.nombre.toLowerCase().trim() === formData.departamento.toLowerCase().trim()
          );
          
          if (departamentoExiste) {
            // Si existe, simplemente actualizar sin preguntar
            await continueWithSave();
            return;
          } else {
            // Si no existe, preguntar si quiere cambiar globalmente o solo este trabajador
            showGlobalChangeConfirmation(
              'departamento', 
              originalWorkerData.departamento, 
              formData.departamento.trim(), 
              continueWithSave
            );
            needsConfirmation = true;
            return;
          }
        }
        
        // Verificar ocupación (solo si no hay confirmación de departamento pendiente)
        if (!needsConfirmation && 
            originalWorkerData.ocupacion && 
            originalWorkerData.ocupacion !== formData.ocupacion.trim() && 
            formData.ocupacion.trim() !== '') {
          
          // Verificar si la nueva ocupación ya existe
          const ocupacionExiste = ocupaciones.some(ocup => 
            ocup.toLowerCase().trim() === formData.ocupacion.toLowerCase().trim()
          );
          
          if (ocupacionExiste) {
            // Si existe, simplemente actualizar sin preguntar
            await continueWithSave();
            return;
          } else {
            // Si no existe, preguntar si quiere cambiar globalmente o solo este trabajador
            showGlobalChangeConfirmation(
              'ocupacion', 
              originalWorkerData.ocupacion, 
              formData.ocupacion.trim(), 
              continueWithSave
            );
            needsConfirmation = true;
            return;
          }
        }
      }

      // Si no hay confirmaciones pendientes, continuar con el guardado
      await continueWithSave();

    } catch (err) {
      console.error('❌ Error en handleSubmit:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Abrir modal de confirmación de eliminación
  const openDeleteModal = (trabajador) => {
    // No permitir eliminar el propietario
    if (trabajador.es_propietario || trabajador.solo_lectura || trabajador.puede_eliminar === false) {
      setError('No se puede eliminar este trabajador: permisos insuficientes o es el propietario del grupo');
      return;
    }
    
    setWorkerToDelete(trabajador);
    setShowDeleteModal(true);
  };

  // Cerrar modal de confirmación de eliminación
  const closeDeleteModal = () => {
    setWorkerToDelete(null);
    setShowDeleteModal(false);
  };

  // Cambiar estado de trabajador (activo/inactivo)
  const toggleWorkerStatus = async (trabajador) => {
    // No permitir cambiar estado del propietario
    if (trabajador.es_propietario || trabajador.solo_lectura) {
      setError('No se puede cambiar el estado del propietario del grupo');
      return;
    }

    // Siempre mostrar modal de confirmación para cambios de estado
    setStatusChangeData(trabajador);
    setShowStatusChangeModal(true);
    // Activar animación después de un pequeño delay
    setTimeout(() => setStatusModalAnimating(true), 10);
  };

  // Función para ejecutar el cambio de estado
  const executeStatusChange = async (trabajador) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log('Cambiando estado del trabajador:', {
        id: trabajador.id,
        de: trabajador.activo ? 'activo' : 'inactivo',
        a: !trabajador.activo ? 'activo' : 'inactivo',
        tieneUsuario: trabajador.tiene_usuario
      });

      // Si se desactiva y tiene usuario, también desactivar la cuenta
      if (trabajador.activo && trabajador.tiene_usuario) {
        // Primero desactivar la cuenta de usuario
        try {
          const userResponse = await fetch(`${API_URL}/trabajadores/${trabajador.id}/desactivar-cuenta`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          await handleResponse(userResponse);
          console.log('✅ Cuenta de usuario desactivada');
        } catch (userErr) {
          console.error('❌ Error al desactivar cuenta de usuario:', userErr);
          // Continuar con el cambio de estado aunque falle la desactivación de usuario
        }
      }

      // Cambiar estado del trabajador
      const response = await fetch(`${API_URL}/trabajadores/${trabajador.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activo: !trabajador.activo })
      });

      const data = await handleResponse(response);
      console.log('✅ Estado del trabajador cambiado:', data);

      // Recargar la lista de trabajadores usando fetchTrabajadores
      await fetchTrabajadores();

      if (trabajador.activo && trabajador.tiene_usuario) {
        setSuccess('Trabajador desactivado exitosamente');
      } else {
        setSuccess(`Trabajador ${!trabajador.activo ? 'activado' : 'desactivado'} exitosamente`);
      }
      setError(null);
    } catch (err) {
      console.error('❌ Error al cambiar estado del trabajador:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para confirmar cambio de estado desde el modal
  const confirmStatusChange = async () => {
    // Iniciar animación de cierre
    setStatusModalAnimating(false);
    setTimeout(() => {
      setShowStatusChangeModal(false);
      if (statusChangeData) {
        executeStatusChange(statusChangeData);
        setStatusChangeData(null);
      }
    }, 300);
  };

  // Función para cancelar cambio de estado
  const cancelStatusChange = () => {
    // Iniciar animación de cierre
    setStatusModalAnimating(false);
    setTimeout(() => {
      setShowStatusChangeModal(false);
      setStatusChangeData(null);
    }, 300);
  };

  // ========================================
  // FUNCIONES PARA ELIMINACIÓN MASIVA
  // ========================================

  // Función para alternar selección de trabajador
  const toggleWorkerSelection = (workerId) => {
    setSelectedWorkers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workerId)) {
        newSet.delete(workerId);
      } else {
        newSet.add(workerId);
      }
      
      // Si no hay selecciones, salir del modo selección
      if (newSet.size === 0) {
        setIsSelectMode(false);
      }
      
      return newSet;
    });
  };

  // Función para seleccionar todos los trabajadores visibles
  const toggleSelectAll = () => {
    const visibleWorkers = getPaginatedTrabajadores();
    const allVisible = visibleWorkers.every(w => selectedWorkers.has(w.id) || w.es_propietario || w.solo_lectura);
    
    setSelectedWorkers(prev => {
      const newSet = new Set(prev);
      visibleWorkers.forEach(worker => {
        if (!worker.es_propietario && !worker.solo_lectura) {
          if (allVisible) {
            newSet.delete(worker.id);
          } else {
            newSet.add(worker.id);
          }
        }
      });
      return newSet;
    });
  };

  // Función para iniciar modo de selección
  const startSelectMode = () => {
    setIsSelectMode(true);
  };

  // Función para cancelar selección
  const cancelSelection = () => {
    setSelectedWorkers(new Set());
    setIsSelectMode(false);
  };

  // Función para abrir modal de eliminación masiva
  const openBulkDeleteModal = () => {
    setShowBulkDeleteModal(true);
  };

  // Función para eliminar trabajadores seleccionados
  const handleBulkDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Convertir Set a Array para iterar
      const workerIds = Array.from(selectedWorkers);
      
      // Eliminar uno por uno
      for (const workerId of workerIds) {
        const response = await fetch(`${API_URL}/trabajadores/${workerId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`Error eliminando trabajador ${workerId}`);
        }
      }

      setSuccess(`${workerIds.length} trabajador(es) eliminado(s) exitosamente`);
      setShowBulkDeleteModal(false);
      setSelectedWorkers(new Set());
      setIsSelectMode(false);
      fetchTrabajadores(); // Recargar datos

    } catch (err) {
      console.error('❌ Error en eliminación masiva:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener nombres de trabajadores seleccionados
  const getSelectedWorkerNames = () => {
    return allTrabajadores
      .filter(worker => selectedWorkers.has(worker.id))
      .map(worker => `${worker.nombre} ${worker.apellido}`);
  };

  // Función para ordenar tabla
  const handleSort = (key) => {
    // Activar efectos de transición si hay datos
    if (allTrabajadores.length > 0) {
      setIsTransitioning(true);
      setIsFiltering(true);
    }

    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    // Finalizar transición después de un breve momento
    setTimeout(() => {
      setIsTransitioning(false);
      setIsFiltering(false);
    }, 300);
  };

  // Función para cambiar página
  const handlePageChange = (page) => {
    // Activar efectos de transición si hay datos
    if (allTrabajadores.length > 0) {
      setIsTransitioning(true);
      setIsFiltering(true);
    }

    setCurrentPage(page);

    // Finalizar transición después de un breve momento
    setTimeout(() => {
      setIsTransitioning(false);
      setIsFiltering(false);
    }, 300);
  };

  // Función para cambiar items por página
  const handleItemsPerPageChange = (newItemsPerPage) => {
    // Activar efectos de transición si hay datos
    if (allTrabajadores.length > 0) {
      setIsTransitioning(true);
      setIsFiltering(true);
    }

    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Resetear a la primera página

    // Finalizar transición después de un breve momento
    setTimeout(() => {
      setIsTransitioning(false);
      setIsFiltering(false);
    }, 300);
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
      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    // No permitir gestionar cuenta del propietario
    if (trabajador.es_propietario || trabajador.solo_lectura || trabajador.puede_gestionar_cuenta === false) {
      setError('No se puede gestionar la cuenta de este trabajador: permisos insuficientes o es el propietario del grupo');
      return;
    }

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
    // Activar animación después de un pequeño delay
    setTimeout(() => setUserModalAnimating(true), 10);
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
      // Iniciar animación de cierre
      setUserModalAnimating(false);
      setTimeout(() => {
        setShowUserModal(false);
        fetchTrabajadores(); // Recargar datos
      }, 300);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar modal de usuario con animación
  const closeUserModal = () => {
    setUserModalAnimating(false);
    setTimeout(() => {
      setShowUserModal(false);
      setSelectedWorker(null);
    }, 300);
  };

  // Desactivar cuenta de usuario
  const handleDeactivateUser = async (trabajador) => {
    // No permitir desactivar cuenta del propietario
    if (trabajador.es_propietario || trabajador.solo_lectura || trabajador.puede_gestionar_cuenta === false) {
      setError('No se puede desactivar la cuenta del propietario del grupo');
      return;
    }

    // Mostrar modal de confirmación
    setDeactivateAccountData(trabajador);
    setShowDeactivateAccountModal(true);
    setTimeout(() => setDeactivateAccountAnimating(true), 10);
  };

  // Función para confirmar desactivación de cuenta
  const confirmDeactivateAccount = async () => {
    if (!deactivateAccountData) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`${API_URL}/trabajadores/${deactivateAccountData.id}/desactivar-cuenta`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await handleResponse(response);
      if (!data) return; // Si hubo problema de autenticación

      setSuccess('Cuenta desactivada exitosamente');
      fetchTrabajadores(); // Recargar datos
      
      // Cerrar modal con animación
      closeDeactivateAccountModal();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar modal de desactivación con animación
  const closeDeactivateAccountModal = () => {
    setDeactivateAccountAnimating(false);
    setTimeout(() => {
      setShowDeactivateAccountModal(false);
      setDeactivateAccountData(null);
    }, 300);
  };

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
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
          <h1 className="text-3xl font-bold text-teal-900 mb-2">
            Gestión de Trabajadores
          </h1>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
            <p className="text-teal-800 text-sm">
              📋 Administra el personal de la empresa y crea cuentas de usuario para el sistema
            </p>
          </div>
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
        <div className={`bg-white rounded-lg shadow p-4 sm:p-6 mb-6 transition-all duration-300 ${
          isFiltering ? 'opacity-70 pointer-events-none' : 'opacity-100'
        }`}>
          <div className="flex flex-col gap-4">
            {/* Buscador */}
            <div className="w-full">
              <input
                type="text"
                placeholder="Buscar por nombre, email, RUT o ocupación..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                disabled={isFiltering}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none ${styles.customInput}`}
              />
            </div>

            {/* Filtros reorganizados de manera armónica */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
              {/* Grupo de filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                {/* Select personalizado de Estado */}
                <div className={`relative custom-select-wrapper ${styles.customSelectWrapper}`}>
                  <div className="flex items-center justify-between mb-1 h-6">
                    <span className="text-xs text-gray-500 font-medium">Estado</span>
                    {/* Espacio vacío para alineación con otros filtros */}
                    <div className="w-6 h-6"></div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleStatusDropdown}
                    disabled={isFiltering}
                    className={`${styles.customSelectButton} ${isFiltering ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{getStatusDisplayText()}</span>
                    <svg 
                      className={`w-4 h-4 ${styles.customSelectIcon} ${showStatusDropdown ? styles.open : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showStatusDropdown && (
                    <div className={styles.customSelectDropdown}>
                      <div
                        onClick={() => selectStatusOption('all')}
                        className={`${styles.customSelectOption} ${filters.status === 'all' ? styles.selected : ''}`}
                      >
                        Todos los estados
                      </div>
                      <div
                        onClick={() => selectStatusOption('active')}
                        className={`${styles.customSelectOption} ${filters.status === 'active' ? styles.selected : ''}`}
                      >
                        Activos
                      </div>
                      <div
                        onClick={() => selectStatusOption('inactive')}
                        className={`${styles.customSelectOption} ${filters.status === 'inactive' ? styles.selected : ''}`}
                      >
                        Inactivos
                      </div>
                    </div>
                  )}
                </div>

                

                {/* Select personalizado de Ocupación con gestión */}
                <div className={`relative custom-select-wrapper ${styles.customSelectWrapper}`}>
                  <div className="flex items-center justify-between mb-1 h-6">
                    <span className="text-xs text-gray-500 font-medium">Ocupaciones</span>
                    <button
                      onClick={() => openExternalManageModal('ocupacion')}
                      disabled={isFiltering}
                      className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      title="Gestionar ocupaciones"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={toggleOcupacionDropdown}
                    disabled={isFiltering}
                    className={`${styles.customSelectButton} ${isFiltering ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{getOcupacionDisplayText()}</span>
                    <svg 
                      className={`w-4 h-4 ${styles.customSelectIcon} ${showOcupacionDropdown ? styles.open : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showOcupacionDropdown && (
                    <div className={styles.customSelectDropdown}>
                      <div
                        onClick={() => selectOcupacionOption('all')}
                        className={`${styles.customSelectOption} ${filters.ocupacion === 'all' ? styles.selected : ''}`}
                      >
                        Todas las ocupaciones
                      </div>
                      {ocupaciones.map((ocupacion, index) => (
                        <div
                          key={index}
                          onClick={() => selectOcupacionOption(ocupacion)}
                          className={`${styles.customSelectOption} ${filters.ocupacion === ocupacion ? styles.selected : ''}`}
                        >
                          {ocupacion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Select personalizado de Departamento con gestión */}
                <div className={`relative custom-select-wrapper ${styles.customSelectWrapper}`}>
                  <div className="flex items-center justify-between mb-1 h-6">
                    <span className="text-xs text-gray-500 font-medium">Departamentos</span>
                    <button
                      onClick={() => openExternalManageModal('departamento')}
                      disabled={isFiltering}
                      className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      title="Gestionar departamentos"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={toggleDepartmentDropdown}
                    disabled={isFiltering}
                    className={`${styles.customSelectButton} ${isFiltering ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{getDepartmentDisplayText()}</span>
                    <svg 
                      className={`w-4 h-4 ${styles.customSelectIcon} ${showDepartmentDropdown ? styles.open : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDepartmentDropdown && (
                    <div className={styles.customSelectDropdown}>
                      <div
                        onClick={() => selectDepartmentOption('all')}
                        className={`${styles.customSelectOption} ${filters.department === 'all' ? styles.selected : ''}`}
                      >
                        Todos los departamentos
                      </div>
                      {departamentos.map(dept => (
                        <div
                          key={dept.id}
                          onClick={() => selectDepartmentOption(dept.id.toString())}
                          className={`${styles.customSelectOption} ${filters.department === dept.id.toString() ? styles.selected : ''}`}
                        >
                          {dept.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de nuevo trabajador y controles de selección */}
              <div className="flex flex-col justify-center min-h-[60px] w-40">
                {/* Espacio para el contador de seleccionados */}
                <div className="flex items-center justify-center h-6 mb-1">
                  {/* Contador de seleccionados (solo visible cuando hay selección) */}
                  {selectedWorkers.size > 0 && (
                    <div className="text-xs text-teal-600 text-center animate-fade-in">
                      {selectedWorkers.size} seleccionado{selectedWorkers.size > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 items-center justify-center h-10">
                  {/* Botones de selección múltiple y borrado - Con animación de entrada suave */}
                  {isSelectMode && (
                    <div className="flex gap-1 animate-fade-in-slide-left">
                      <div className="relative group transform transition-all duration-500 ease-out hover:scale-105">
                        <button
                          onClick={openBulkDeleteModal}
                          disabled={isFiltering || selectedWorkers.size === 0}
                          className={`p-2 h-10 rounded-lg transition-all duration-500 ease-out flex items-center justify-center disabled:cursor-not-allowed transform hover:scale-105 ${
                            selectedWorkers.size === 0 
                              ? 'bg-gray-300 text-gray-500 opacity-50 scale-95' 
                              : 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg'
                          }`}
                          onMouseEnter={(e) => {
                            if (selectedWorkers.size > 0) {
                              e.target.closest('button').classList.add('animate-gentle-bounce');
                              setTimeout(() => {
                                e.target.closest('button')?.classList.remove('animate-gentle-bounce');
                              }, 500);
                            }
                          }}
                        >
                          <svg className={`w-4 h-4 transition-all duration-500 ease-out ${selectedWorkers.size > 0 ? 'scale-110' : 'scale-100'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        {/* Tooltip personalizado */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none z-50 scale-95 group-hover:scale-100">
                          {selectedWorkers.size === 0 ? 'Selecciona trabajadores' : 'Borrado masivo'}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                      <div className="relative group transform transition-all duration-500 ease-out hover:scale-105 animate-fade-in-slide-right">
                        <button
                          onClick={cancelSelection}
                          disabled={isFiltering}
                          className="bg-gray-400 text-white p-2 h-10 rounded-lg hover:bg-gray-500 transition-all duration-500 ease-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
                        >
                          <svg className="w-4 h-4 transition-all duration-500 ease-out hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {/* Tooltip personalizado */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none z-50 scale-95 group-hover:scale-100">
                          Cancelar
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Botón discreto para iniciar selección múltiple - Con animación de entrada suave */}
                  {!isSelectMode && (
                    <div className="relative group transform transition-all duration-500 animate-fade-in-slide-up">
                      <button
                        onClick={startSelectMode}
                        disabled={isFiltering}
                        className="bg-gray-100 text-gray-600 p-2 h-10 rounded-lg hover:bg-gray-200 transition-all duration-500 ease-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed opacity-60 hover:opacity-100 transform hover:scale-105 hover:shadow-md"
                      >
                        <svg className="w-4 h-4 transition-all duration-500 ease-out hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      {/* Tooltip personalizado */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none z-50 scale-95 group-hover:scale-100">
                        Borrado múltiple
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  )}

                  {/* Botón de nuevo trabajador - Con transición ultra suave cuando se deshabilita */}
                  <div className="relative group transform transition-all duration-700 ease-out">
                    <button
                      onClick={openNewForm}
                      disabled={isFiltering || isSelectMode}
                      className={`p-2 h-10 w-10 rounded-lg transition-all duration-700 ease-out flex items-center justify-center disabled:cursor-not-allowed transform hover:scale-105 ${
                        isSelectMode 
                          ? 'bg-gray-300 text-gray-500 scale-95 shadow-none opacity-60' 
                          : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md hover:shadow-lg scale-100 opacity-100'
                      }`}
                    >
                      <svg className={`w-5 h-5 transition-all duration-700 ease-out ${isSelectMode ? 'scale-90 opacity-60' : 'scale-100 opacity-100 hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    {/* Tooltip personalizado */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none z-50 scale-95 group-hover:scale-100">
                      {isSelectMode ? 'Deshabilitado en modo selección' : 'Nuevo Trabajador'}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden relative transition-all duration-500 ease-out animate-fade-in-slide-up">
          {/* Indicador de filtrado */}
          {isFiltering && (
            <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-lg transition-all duration-300 ease-out">
              <div className="flex items-center space-x-3 bg-white px-4 py-3 rounded-lg shadow-lg border animate-fade-in-slide-up">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700 font-medium">Actualizando datos...</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Cargando...</span>
              </div>
            </div>
          ) : trabajadores.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-gray-500">No se encontraron trabajadores</p>
            </div>
          ) : (
            <>
              <div className={`overflow-x-auto transition-all duration-300 ease-in-out ${
                isTransitioning ? 'opacity-60' : 'opacity-100'
              } ${isFiltering ? 'pointer-events-none' : ''}`}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Checkbox para selección masiva (solo visible en modo selección) */}
                      {(isSelectMode || selectedWorkers.size > 0) && (
                        <th className="px-3 py-3 text-left w-12">
                          <input
                            type="checkbox"
                            onChange={toggleSelectAll}
                            checked={getPaginatedTrabajadores().filter(w => !w.es_propietario && !w.solo_lectura).length > 0 && 
                                    getPaginatedTrabajadores().filter(w => !w.es_propietario && !w.solo_lectura).every(w => selectedWorkers.has(w.id))}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            title="Seleccionar/deseleccionar todo"
                          />
                        </th>
                      )}
                      
                      <th 
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-teal-50 transition-colors"
                        onClick={() => handleSort('nombre')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Trabajador</span>
                          {renderSortIcon('nombre')}
                        </div>
                      </th>
                      <th 
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-teal-50 transition-colors hidden sm:table-cell"
                        onClick={() => handleSort('ocupacion')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Ocupación</span>
                          {renderSortIcon('ocupacion')}
                        </div>
                      </th>
                      <th 
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-teal-50 transition-colors hidden md:table-cell"
                        onClick={() => handleSort('departamento')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Departamento</span>
                          {renderSortIcon('departamento')}
                        </div>
                      </th>
                      <th 
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-teal-50 transition-colors"
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
                    {trabajadores.map((trabajador, index) => (
                      <tr 
                        key={trabajador.id} 
                        className={`animate-table-row-staggered transition-all duration-500 ease-out ${
                          trabajador.es_propietario || trabajador.solo_lectura
                            ? 'bg-blue-50 cursor-default' 
                            : selectedWorkers.has(trabajador.id)
                              ? 'bg-teal-50 border-l-4 border-teal-400'
                              : 'hover:bg-teal-50 cursor-pointer'
                        }`}
                        style={{
                          animationDelay: `${index * 50}ms`
                        }}
                        onClick={(e) => {
                          // Si estamos en modo selección y hacemos click en checkbox, no abrir formulario
                          if (isSelectMode || selectedWorkers.size > 0) {
                            if (!trabajador.es_propietario && !trabajador.solo_lectura) {
                              e.preventDefault();
                              toggleWorkerSelection(trabajador.id);
                            }
                            return;
                          }
                          
                          // Solo permitir abrir formulario si no es propietario y se puede editar
                          if (!trabajador.es_propietario && !trabajador.solo_lectura && trabajador.puede_editar !== false) {
                            openEditForm(trabajador);
                          }
                        }}
                      >
                        {/* Checkbox para selección individual (solo visible en modo selección) */}
                        {(isSelectMode || selectedWorkers.size > 0) && (
                          <td className="px-3 py-4 w-12">
                            {!trabajador.es_propietario && !trabajador.solo_lectura ? (
                              <input
                                type="checkbox"
                                checked={selectedWorkers.has(trabajador.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleWorkerSelection(trabajador.id);
                                }}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              />
                            ) : (
                              <div className="w-4 h-4 bg-gray-200 rounded opacity-30"></div>
                            )}
                          </td>
                        )}
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            {/* Línea 1: Nombre completo + badges */}
                            <div className="text-sm font-medium text-gray-900 flex items-center mb-1">
                              {trabajador.nombre} {trabajador.apellido}
                              {trabajador.es_propietario === true && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                                  </svg>
                                  Propietario
                                </span>
                              )}
                              {trabajador.solo_lectura === true && trabajador.es_propietario !== true ? (
                                <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                  Solo lectura
                                </span>
                              ) : null}
                            </div>
                            
                            {/* Línea 2: RUT */}
                            <div className="text-sm text-gray-500 mb-1">
                              {trabajador.rut ? `RUT: ${trabajador.rut}` : <span className="text-gray-400 italic">Sin RUT</span>}
                            </div>
                            
                            {/* Línea 3: Email */}
                            <div className="text-sm text-gray-500">
                              {trabajador.email || <span className="text-gray-400 italic">Sin email</span>}
                            </div>
                            
                            {/* Información adicional para propietario */}
                            {trabajador.es_propietario === true && (
                              <div className="text-xs text-amber-600 font-medium mt-1">
                                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                                </svg>
                                No se puede modificar
                              </div>
                            )}
                            
                            {/* Mostrar ocupación y departamento en móviles */}
                            <div className="sm:hidden mt-2">
                              {trabajador.ocupacion && (
                                <div className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded inline-block mr-1 mb-1">
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
                          {trabajador.ocupacion || <span className="text-gray-400 italic">Sin ocupación</span>}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                          {trabajador.departamento_nombre || <span className="text-gray-400 italic">Sin departamento</span>}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {trabajador.es_propietario || trabajador.solo_lectura ? (
                            // Para el propietario: solo mostrar estado sin botón
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              trabajador.activo 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {trabajador.activo ? 'Activo' : 'Inactivo'}
                              {trabajador.es_propietario && (
                                <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                          ) : (
                            // Para trabajadores regulares: botón clickeable con tooltip
                            <div className="relative group">
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
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none z-50 scale-95 group-hover:scale-100">
                                {trabajador.activo 
                                  ? 'Desactivar trabajador'
                                  : 'Activar trabajador'
                                }
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {(trabajador.es_propietario || trabajador.solo_lectura || trabajador.puede_gestionar_cuenta === false) ? (
                            // Para propietario: solo mostrar estado sin opciones
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full max-w-fit ${
                                trabajador.tiene_acceso 
                                  ? 'bg-green-100 text-green-800' 
                                  : trabajador.es_propietario 
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}>
                                <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden sm:inline truncate">
                                  {trabajador.tiene_acceso ? 'Cuenta activa' : (trabajador.es_propietario ? 'Admin' : 'Sin cuenta')}
                                </span>
                                <span className="sm:hidden">
                                  {trabajador.tiene_acceso ? '✓' : (trabajador.es_propietario ? 'ADM' : '✗')}
                                </span>
                                {trabajador.es_propietario && (
                                  <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                              {trabajador.es_propietario && (
                                <span className="text-xs text-amber-600 font-medium text-center block">
                                  
                                </span>
                              )}
                            </div>
                          ) : trabajador.tiene_usuario ? (
                            <div className="flex flex-col space-y-1">
                              <div className="relative group">
                                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                                  trabajador.tiene_acceso 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                                  </svg>
                                  <span className="hidden sm:inline">
                                    {trabajador.tiene_acceso ? 'Cuenta activa' : 'Cuenta inactiva'}
                                  </span>
                                  <span className="sm:hidden">
                                    {trabajador.tiene_acceso ? '✓' : '✗'}
                                  </span>
                                </span>
                                <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                  Estado del trabajador
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                              
                              {trabajador.tiene_acceso ? (
                                <div className="relative group">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeactivateUser(trabajador);
                                    }}
                                    className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                                  >
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                                    </svg>
                                    <span className="hidden sm:inline">Desactivar cuenta</span>
                                    <span className="sm:hidden">✗</span>
                                  </button>
                                  <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                    Desactivar cuenta
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative group">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openUserModal(trabajador);
                                    }}
                                    className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 hover:bg-teal-200 transition-colors"
                                  >
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 01-2 2m2-2h.01M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="hidden sm:inline">Reactivar cuenta</span>
                                    <span className="sm:hidden">↻</span>
                                  </button>
                                  <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                    Reactivar cuenta
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : trabajador.email && trabajador.email.trim() ? (
                            /* Trabajador con email pero sin usuario - mostrar como "Activar" */
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openUserModal(trabajador);
                                }}
                                className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 01-2 2m2-2h.01M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="hidden sm:inline">Activar cuenta</span>
                                <span className="sm:hidden">↻</span>
                              </button>
                              {/* Tooltip que explica la situación */}
                              <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                Activar cuenta
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          ) : (
                            /* Trabajador sin email - crear cuenta nueva */
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openUserModal(trabajador);
                                }}
                                className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 hover:bg-teal-200 transition-colors"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="hidden sm:inline">Crear cuenta</span>
                                <span className="sm:hidden">+</span>
                              </button>
                              <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                Crear cuenta
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación - Siempre visible en la parte inferior */}
              <div className={`bg-white px-4 py-3 border-t border-gray-200 sm:px-6 transition-all duration-300 ${
                isFiltering ? 'opacity-70 pointer-events-none' : 'opacity-100'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className="text-sm text-gray-600">
                      Mostrando {totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} trabajadores
                    </span>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Trabajadores por página:</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                        disabled={isFiltering}
                        className={`text-sm focus:outline-none disabled:opacity-50 ${styles.paginationSelect}`}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={1000}>1000</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Controles de paginación - Solo mostrar si hay más de 1 página */}
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1 || isFiltering}
                        className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ««
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isFiltering}
                        className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ‹
                      </button>
                      
                      {/* Páginas */}
                      {[...Array(Math.min(5, totalPages))].map((_, index) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = index + 1;
                        } else if (currentPage <= 3) {
                          pageNum = index + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + index;
                        } else {
                          pageNum = currentPage - 2 + index;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={isFiltering}
                            className={`px-3 py-1 text-sm border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              currentPage === pageNum
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isFiltering}
                        className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ›
                      </button>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages || isFiltering}
                        className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        »»
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div 
          className={`fixed inset-0 flex items-center justify-center z-50 p-4 bg-black
            transition-all ease-in-out
            ${formAnimating ? 'duration-300 bg-opacity-50' : 'duration-250 bg-opacity-0'}`}
          onClick={(e) => {
            // Cerrar modal si se hace clic en el fondo
            if (e.target === e.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto
            transform transition-all ease-in-out
            ${formAnimating 
              ? 'duration-300 scale-100 opacity-100 translate-y-0' 
              : 'duration-250 scale-95 opacity-0 translate-y-4'
            }`}>
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-teal-900">
                  {editingId ? 'Editar Trabajador' : 'Nuevo Trabajador'}
                </h3>
                <button
                  onClick={closeForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:scale-110 transform"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mensajes de error y éxito dentro del modal */}
              {error && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg animate-fade-in-slide-up">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg animate-fade-in-slide-up">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">{success}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombres *
                    </label>
                    <input
                      type="text"
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleInputChange}
                      placeholder="Alejandra Francisca"
                      required
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleInputChange}
                      placeholder="González Martínez"
                      required
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Ocupación
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setExternalManageType('ocupacion');
                        setShowExternalManageModal(true);
                        setTimeout(() => setExternalManageAnimating(true), 10);
                      }}
                      className="text-xs text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1 transition-colors duration-200"
                      title="Gestionar ocupaciones existentes"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="ocupacion"
                      value={formData.ocupacion}
                      onChange={handleInputChange}
                      onFocus={() => setShowOcupacionSuggestions(ocupaciones.length > 0)}
                      onBlur={() => setTimeout(() => setShowOcupacionSuggestions(false), 200)}
                      placeholder="Ej: Profesor, Conserje, Administrativo..."
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
                    />
                    {showOcupacionSuggestions && ocupacionSuggestions.length > 0 && (
                      <div className={`absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto ${styles.autocompleteDropdown}`}>
                        {ocupacionSuggestions.map((ocupacion, index) => (
                          <div
                            key={index}
                            onClick={() => selectOcupacion(ocupacion)}
                            className={`px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm ${styles.autocompleteOption}`}
                          >
                            {ocupacion}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Campo opcional. Escribe para buscar o crear una nueva ocupación.
                    </p>
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
                    placeholder="alejandra.gonzalez@empresa.cl"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT
                  </label>
                  <input
                    type="text"
                    name="ropera"
                    value={formData.ropera}
                    onChange={handleInputChange}
                    placeholder="Ej: 123456789 (se formateará automáticamente)"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Departamento
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setExternalManageType('departamento');
                        setShowExternalManageModal(true);
                        setTimeout(() => setExternalManageAnimating(true), 10);
                      }}
                      className="text-xs text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1 transition-colors duration-200"
                      title="Gestionar departamentos existentes"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      
                    </button>
                  </div>
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
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
                    />
                    {showDepartamentoSuggestions && departamentoSuggestions.length > 0 && (
                      <div className={`absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto ${styles.autocompleteDropdown}`}>
                        {departamentoSuggestions.map((dept) => (
                          <div
                            key={dept.id}
                            onClick={() => selectDepartamento(dept)}
                            className={`px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm ${styles.autocompleteOption}`}
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Trabajador activo
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <div>
                    {editingId && selectedWorker && !selectedWorker.es_propietario && !selectedWorker.solo_lectura && selectedWorker.puede_eliminar !== false && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(selectedWorker)}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-all duration-250 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-md"
                      >
                        Eliminar Trabajador
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all duration-250 ease-in-out transform hover:scale-105 active:scale-95"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-250 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-lg flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Guardando...
                        </>
                      ) : (editingId ? 'Actualizar' : 'Crear')}
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
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${styles.modalOverlay}
          transition-all duration-300 ease-in-out
          ${userModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`}>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-md ${styles.modalContent}
            transform transition-all duration-300 ease-in-out
            ${userModalAnimating 
              ? 'scale-100 opacity-100 translate-y-0' 
              : 'scale-95 opacity-0 translate-y-4'
            }`}>
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {selectedWorker?.tiene_usuario && !selectedWorker?.tiene_acceso 
                    ? 'Reactivar Cuenta de Usuario'
                    : selectedWorker?.email && selectedWorker?.email.trim() && !selectedWorker?.tiene_usuario
                    ? 'Activar Cuenta de Usuario'
                    : 'Crear Cuenta de Usuario'}
                </h3>
                <button
                  onClick={closeUserModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mensajes de error y éxito dentro del modal de usuario */}
              {error && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg animate-fade-in-slide-up">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg animate-fade-in-slide-up">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">{success}</span>
                  </div>
                </div>
              )}

              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  {selectedWorker?.tiene_usuario && !selectedWorker?.tiene_acceso 
                    ? `Reactivar cuenta para: `
                    : selectedWorker?.email && selectedWorker?.email.trim() && !selectedWorker?.tiene_usuario
                    ? `Activar cuenta para: `
                    : `Crear cuenta para: `}
                  <strong>{selectedWorker.nombre} {selectedWorker.apellido}</strong>
                </p>
                {selectedWorker.email && selectedWorker.email.trim() ? (
                  <p className="text-sm text-gray-600">
                    Email actual: <strong>{selectedWorker.email}</strong>
                  </p>
                ) : null}
                {selectedWorker?.tiene_usuario && !selectedWorker?.tiene_acceso ? (
                  <p className="text-sm text-blue-600 mt-1">
                    ℹ️ Esta cuenta ya existe pero está desactivada. Reactivarla permitirá al usuario acceder nuevamente al sistema.
                  </p>
                ) : null}
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
                    placeholder="alejandra.gonzalez@empresa.cl"
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customInput}`}
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customSelect}`}
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm ${styles.customSelect}`}
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
                          onChange={(e) => handlePermissionChange(permiso.codigo, e.target.checked)}
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{permiso.nombre}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Los permisos especiales se suman a los del rol seleccionado
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeUserModal}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all duration-200 transform hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
                  >
                    {loading 
                      ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          {selectedWorker?.tiene_usuario && !selectedWorker?.tiene_acceso 
                            ? 'Reactivando...' 
                            : selectedWorker?.email && selectedWorker?.email.trim() && !selectedWorker?.tiene_usuario
                            ? 'Activando...'
                            : 'Creando...'}
                        </>
                      )
                      : (selectedWorker?.tiene_usuario && !selectedWorker?.tiene_acceso 
                          ? 'Reactivar Cuenta'
                          : selectedWorker?.email && selectedWorker?.email.trim() && !selectedWorker?.tiene_usuario
                          ? 'Activar Cuenta'
                          : 'Crear Usuario')
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de eliminación masiva */}
      {showBulkDeleteModal && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${styles.modalOverlay}
          transition-opacity duration-300 ease-in-out
          ${showBulkDeleteModal ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-md ${styles.modalContent}
            transform transition-transform duration-300 ease-in-out
            ${showBulkDeleteModal ? 'scale-100' : 'scale-95'}`}>
            <div className="p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Eliminar Múltiples Trabajadores
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  ¿Está seguro de que desea eliminar {selectedWorkers.size} trabajador{selectedWorkers.size > 1 ? 'es' : ''}? Esta acción no se puede deshacer.
                </p>

                <div className="bg-gray-50 rounded-md p-4 mb-4 text-left max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 mb-2">Trabajadores a eliminar:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {getSelectedWorkerNames().map((name, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={() => setShowBulkDeleteModal(false)}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar {selectedWorkers.size} trabajador{selectedWorkers.size > 1 ? 'es' : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de cambio de estado */}
      {showStatusChangeModal && statusChangeData && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 bg-black transition-all duration-300 ease-in-out ${
          statusModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out ${
            statusModalAnimating 
              ? 'scale-100 opacity-100 translate-y-0' 
              : 'scale-95 opacity-0 translate-y-4'
          }`}>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className={`w-8 h-8 ${statusChangeData.activo ? 'text-amber-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {statusChangeData.activo ? 'Confirmar desactivación' : 'Confirmar activación'}
                  </h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  ¿Desea {statusChangeData.activo ? 'desactivar' : 'activar'} a <strong>{statusChangeData.nombre} {statusChangeData.apellido}</strong>?
                </p>
                <div className={`${statusChangeData.activo ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'} border rounded-lg p-3`}>
                  <p className={`${statusChangeData.activo ? 'text-amber-800' : 'text-green-800'} text-sm`}>
                    <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {statusChangeData.activo ? (
                      statusChangeData.tiene_usuario && statusChangeData.estado_acceso === 'activo' ? (
                        <>El estado del trabajador cambiará a <strong>inactivo</strong> y su cuenta de usuario también será <strong>desactivada</strong>. No se podrá vincular ningún objeto al usuario mientras esté desactivado.</>
                      ) : statusChangeData.tiene_usuario && statusChangeData.estado_acceso === 'tuvo_pero_desactivado' ? (
                        <>El estado del trabajador cambiará a <strong>inactivo</strong>. Este trabajador tiene una cuenta de usuario que ya está <strong>desactivada</strong>. No se podrá vincular ningún objeto al trabajador mientras esté desactivado.</>
                      ) : (
                        <>El estado del trabajador cambiará a <strong>inactivo</strong>. Este trabajador no tiene cuenta de usuario. No se podrá vincular ningún objeto al trabajador mientras esté desactivado.</>
                      )
                    ) : (
                      <>El estado del trabajador cambiará a <strong>activo</strong>. Podrá vincular objetos nuevamente y acceder al sistema si tiene una cuenta de usuario.</>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelStatusChange}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 transform hover:scale-105 hover:shadow-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmStatusChange}
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded-md transition-all duration-200 disabled:opacity-50 flex items-center transform hover:scale-105 ${
                    statusChangeData.activo 
                      ? 'bg-amber-600 hover:bg-amber-700 hover:shadow-lg' 
                      : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {statusChangeData.activo ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.416 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                      {statusChangeData.activo ? 'Sí, desactivar' : 'Sí, activar'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para desactivar cuenta */}
      {showDeactivateAccountModal && deactivateAccountData && (
        <div className={`fixed inset-0 flex items-center justify-center z-50
          transition-all duration-300 ease-in-out
          ${deactivateAccountAnimating ? 'bg-black bg-opacity-50' : 'bg-opacity-0'}`}>
          <div className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6
            transform transition-all duration-300 ease-in-out
            ${deactivateAccountAnimating 
              ? 'scale-100 opacity-100 translate-y-0' 
              : 'scale-95 opacity-0 translate-y-4'}`}>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">
                  Desactivar Cuenta
                </h3>
              </div>
              <button
                onClick={closeDeactivateAccountModal}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                ¿Está seguro de que desea desactivar la cuenta de <strong>{deactivateAccountData.nombre} {deactivateAccountData.apellido}</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Advertencia</p>
                    <p>Esta acción desactivará permanentemente la cuenta del usuario. No podrá acceder al sistema hasta que la cuenta sea reactivada.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeactivateAccountModal}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeactivateAccount}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Desactivando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                    Sí, desactivar cuenta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de gestión simplificado (departamentos/ocupaciones) */}
      {showExternalManageModal && (
        <div 
          className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50
            transition-opacity duration-300 ease-in-out
            ${externalManageAnimating ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeExternalManageModal();
            }
          }}
        >
          <div 
            className={`bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative
              transform transition-all duration-300 ease-in-out
              ${externalManageAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-teal-900">
                Gestionar {externalManageType === 'departamento' ? 'Departamentos' : 'Ocupaciones'}
              </h3>
              <button
                onClick={closeExternalManageModal}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:scale-110 transform"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* SECCIÓN PRINCIPAL: AGREGAR NUEVO (LO PRIMERO Y MÁS PROMINENTE) */}
            <div className="mb-6 p-4 bg-teal-50 rounded-lg border-2 border-teal-200">
              <h4 className="text-sm font-medium text-teal-900 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar Nuevo {externalManageType === 'departamento' ? 'Departamento' : 'Ocupación'}
              </h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newItemValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Capitalizar solo la primera letra, manteniendo el resto exactamente como el usuario lo escribe
                    const capitalizedValue = value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
                    setNewItemValue(capitalizedValue);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newItemValue.trim()) {
                      addNewItem();
                    }
                  }}
                  placeholder={`Nombre del ${externalManageType === 'departamento' ? 'departamento' : 'ocupación'}...`}
                  className="flex-1 px-3 py-2 border border-teal-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  autoFocus
                />
                <button
                  onClick={addNewItem}
                  disabled={loading || !newItemValue.trim()}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Agregar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Lista de items existentes */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {externalManageType === 'departamento' ? 'Departamentos' : 'Ocupaciones'} Existentes
              </h4>
              
              {externalManageType === 'departamento' ? (
                departamentos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p>No hay departamentos registrados</p>
                    <p className="text-xs mt-1">Agrega el primero arriba ↑</p>
                  </div>
                ) : (
                  departamentos.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      {editingItemIndex === index ? (
                        <input
                          type="text"
                          value={editingItemValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Capitalizar solo la primera letra, manteniendo el resto exactamente como el usuario lo escribe
                            const capitalizedValue = value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
                            setEditingItemValue(capitalizedValue);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveItemEdit();
                            if (e.key === 'Escape') cancelItemEdit();
                          }}
                          className="flex-1 px-2 py-1 border border-teal-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center flex-1">
                          <span className="text-gray-700 font-medium">{dept.nombre}</span>
                          {isDepartamentoProtegido(dept.nombre) && (
                            <div className="ml-2 flex items-center">
                              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24" title="Departamento protegido">
                                <path d="M12 2C13.1 2 14 2.9 14 4V6H16C16.55 6 17 6.45 17 7V17C17 17.55 16.55 18 16 18H8C7.45 18 7 17.55 7 17V7C7 6.45 7.45 6 8 6H10V4C10 2.9 10.9 2 12 2ZM12 3.5C11.72 3.5 11.5 3.72 11.5 4V6H12.5V4C12.5 3.72 12.28 3.5 12 3.5Z"/>
                              </svg>
                              <span className="text-xs text-amber-600 ml-1">Protegido</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        {editingItemIndex === index ? (
                          <>
                            <button
                              onClick={saveItemEdit}
                              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-100 transition-all duration-200"
                              title="Guardar cambios"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelItemEdit}
                              className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100 transition-all duration-200"
                              title="Cancelar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditingItem(index, dept.nombre)}
                              disabled={isDepartamentoProtegido(dept.nombre)}
                              className={`p-1 rounded transition-all duration-200 ${
                                isDepartamentoProtegido(dept.nombre)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                              }`}
                              title={isDepartamentoProtegido(dept.nombre) ? 'Departamento protegido - No editable' : 'Editar'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteItem(index)}
                              disabled={isDepartamentoProtegido(dept.nombre)}
                              className={`p-1 rounded transition-all duration-200 ${
                                isDepartamentoProtegido(dept.nombre)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600 hover:text-red-800 hover:bg-red-100'
                              }`}
                              title={isDepartamentoProtegido(dept.nombre) ? 'Departamento protegido - No eliminable' : 'Eliminar'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )
              ) : (
                ocupaciones.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 00-2 2H10a2 2 0 00-2-2V4m8 0h2v16h-2" />
                    </svg>
                    <p>No hay ocupaciones registradas</p>
                    <p className="text-xs mt-1">Agrega la primera arriba ↑</p>
                  </div>
                ) : (
                  ocupaciones.map((ocupacion, index) => (
                    <div key={index} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 ${
                      isOcupacionProtegida(ocupacion) 
                        ? 'bg-amber-50 border border-amber-200' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}>
                      {editingItemIndex === index ? (
                        <input
                          type="text"
                          value={editingItemValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Capitalizar solo la primera letra, manteniendo el resto exactamente como el usuario lo escribe
                            const capitalizedValue = value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
                            setEditingItemValue(capitalizedValue);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveItemEdit();
                            if (e.key === 'Escape') cancelItemEdit();
                          }}
                          className="flex-1 px-2 py-1 border border-teal-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center flex-1">
                          <span className={`font-medium ${isOcupacionProtegida(ocupacion) ? 'text-amber-800' : 'text-gray-700'}`}>
                            {ocupacion}
                          </span>
                          {isOcupacionProtegida(ocupacion) && (
                            <div className="ml-2 flex items-center">
                              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24" title="Ocupación protegida">
                                <path d="M12 2C13.1 2 14 2.9 14 4V6H16C16.55 6 17 6.45 17 7V17C17 17.55 16.55 18 16 18H8C7.45 18 7 17.55 7 17V7C7 6.45 7.45 6 8 6H10V4C10 2.9 10.9 2 12 2ZM12 3.5C11.72 3.5 11.5 3.72 11.5 4V6H12.5V4C12.5 3.72 12.28 3.5 12 3.5Z"/>
                              </svg>
                              <span className="text-xs text-amber-600 ml-1">Predeterminada</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        {editingItemIndex === index ? (
                          <>
                            <button
                              onClick={saveItemEdit}
                              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-100 transition-all duration-200"
                              title="Guardar cambios"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelItemEdit}
                              className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100 transition-all duration-200"
                              title="Cancelar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditingItem(index, ocupacion)}
                              disabled={isOcupacionProtegida(ocupacion)}
                              className={`p-1 rounded transition-all duration-200 ${
                                isOcupacionProtegida(ocupacion)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                              }`}
                              title={isOcupacionProtegida(ocupacion) ? 'Ocupación protegida - No editable' : 'Editar'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteItem(index)}
                              disabled={isOcupacionProtegida(ocupacion)}
                              className={`p-1 rounded transition-all duration-200 ${
                                isOcupacionProtegida(ocupacion)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600 hover:text-red-800 hover:bg-red-100'
                              }`}
                              title={isOcupacionProtegida(ocupacion) ? 'Ocupación protegida - No eliminable' : 'Eliminar'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            {/* Footer con información simplificada */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center text-xs text-gray-500">
                <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5C2.962 18.333 3.924 20 5.464 20z" />
                </svg>
                Los cambios afectan a todos los trabajadores
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
