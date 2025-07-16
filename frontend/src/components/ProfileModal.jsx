import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300/api';

// Determina fuerza de contraseña
const getPasswordStrength = (pw) => {
  if (pw.length < 8) return 'weak';
  const hasLetters = /[a-zA-Z]/.test(pw);
  const hasNumbers = /\d/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  if (hasLetters && hasNumbers && hasSpecial && pw.length >= 12) return 'strong';
  if (hasLetters && hasNumbers) return 'medium';
  return 'weak';
};

const ProfileModal = ({ isOpen, onClose }) => {
  const { usuario, grupos } = useAuth();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [rut, setRut] = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [password, setPassword] = useState('');           // nueva contraseña
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [grupoNombre, setGrupoNombre] = useState('');
  const [originalData, setOriginalData] = useState({});
  const [status, setStatus] = useState(null);

  // Estados para autocompletado
  const [departamentos, setDepartamentos] = useState([]);
  const [ocupaciones, setOcupaciones] = useState([]);
  const [departamentoSuggestions, setDepartamentoSuggestions] = useState([]);
  const [ocupacionSuggestions, setOcupacionSuggestions] = useState([]);
  const [showDepartamentoSuggestions, setShowDepartamentoSuggestions] = useState(false);
  const [showOcupacionSuggestions, setShowOcupacionSuggestions] = useState(false);

  // Mostrar/ocultar cada campo
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  // Calcular fuerza de nueva contraseña
  const strength = useMemo(() => getPasswordStrength(password), [password]);

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
    setRut(rutFormateado);
  };

  // Función para capitalizar solo la primera letra del texto completo
  const capitalizeFirstLetterOnly = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Función para cargar departamentos
  const fetchDepartamentos = async () => {
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
        setDepartamentos(departamentosData);
      }
    } catch (err) {
      console.error('Error al cargar departamentos:', err);
    }
  };

  // Función para cargar ocupaciones
  const fetchOcupaciones = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      if (!grupos || grupos.length === 0) return;
      
      const grupoActivo = grupos[0];
      const grupo_id = grupoActivo.id || grupoActivo.grupo_id;

      const response = await fetch(`${API_URL}/trabajadores?grupo_id=${grupo_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const trabajadores = await response.json();
        const ocupacionesUnicas = [...new Set(
          trabajadores
            ?.filter(t => t.ocupacion)
            .map(t => t.ocupacion)
        )] || [];
        setOcupaciones(ocupacionesUnicas);
      }
    } catch (err) {
      console.error('Error al cargar ocupaciones:', err);
    }
  };

  // Funciones para autocompletado de departamento
  const handleDepartamentoChange = (value) => {
    const capitalizedValue = capitalizeFirstLetterOnly(value);
    setDepartamento(capitalizedValue);

    const trimmedValue = capitalizedValue.trim();
    if (trimmedValue === '') {
      setDepartamentoSuggestions([]);
      setShowDepartamentoSuggestions(false);
      return;
    }

    const filteredDepts = departamentos.filter(dept => 
      dept.nombre.toLowerCase().includes(trimmedValue.toLowerCase())
    );
    
    setDepartamentoSuggestions(filteredDepts);
    setShowDepartamentoSuggestions(true);
  };

  // Funciones para autocompletado de ocupación
  const handleOcupacionChange = (value) => {
    const capitalizedValue = capitalizeFirstLetterOnly(value);
    setOcupacion(capitalizedValue);

    const trimmedValue = capitalizedValue.trim();
    if (trimmedValue === '') {
      setOcupacionSuggestions([]);
      setShowOcupacionSuggestions(false);
      return;
    }

    const filteredOcupaciones = ocupaciones.filter(ocupacion => 
      ocupacion.toLowerCase().includes(trimmedValue.toLowerCase())
    );
    
    setOcupacionSuggestions(filteredOcupaciones);
    setShowOcupacionSuggestions(true);
  };

  // Función para seleccionar sugerencia
  const selectDepartamento = (dept) => {
    setDepartamento(dept.nombre);
    setShowDepartamentoSuggestions(false);
  };

  const selectOcupacion = (ocupacion) => {
    setOcupacion(ocupacion);
    setShowOcupacionSuggestions(false);
  };

  useEffect(() => {
    if (isOpen && usuario) {
      setNombre(usuario.nombre);
      setApellido(usuario.apellido || '');
      setRut(usuario.rut || '');
      
      // Cargar datos de trabajador si existe
      const cargarDatosTrabajador = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token || !grupos || grupos.length === 0) return;

          const grupoActivo = grupos[0];
          const grupo_id = grupoActivo.id || grupoActivo.grupo_id;

          const response = await fetch(`${API_URL}/trabajadores?grupo_id=${grupo_id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const trabajadores = await response.json();
            // Buscar el trabajador actual por usuario_id
            const trabajadorActual = trabajadores.find(t => t.usuario_id === usuario.id);
            
            if (trabajadorActual) {
              setOcupacion(trabajadorActual.ocupacion || '');
              setDepartamento(trabajadorActual.departamento_nombre || '');
              setOriginalData(prev => ({
                ...prev,
                ocupacion: trabajadorActual.ocupacion || '',
                departamento: trabajadorActual.departamento_nombre || ''
              }));
            } else {
              // Si no existe como trabajador, es propietario del grupo
              setOcupacion('Propietario del grupo');
              setDepartamento('');
              setOriginalData(prev => ({
                ...prev,
                ocupacion: 'Propietario del grupo',
                departamento: ''
              }));
            }
          }
        } catch (err) {
          console.error('Error al cargar datos del trabajador:', err);
          setOcupacion('Propietario del grupo');
          setDepartamento('');
          setOriginalData(prev => ({
            ...prev,
            ocupacion: 'Propietario del grupo',
            departamento: ''
          }));
        }
      };

      cargarDatosTrabajador();
      
      const g = grupos[0] || {};
      const nombreGrupoFinal = g.nombre?.startsWith('Personal-') ? '' : (g.nombre || '');
      setGrupoNombre(nombreGrupoFinal);
      setOriginalData({
        nombre: usuario.nombre,
        apellido: usuario.apellido || '',
        rut: usuario.rut || '',
        grupoNombre: nombreGrupoFinal,
        ocupacion: '',
        departamento: ''
      });
      setPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setStatus(null);

      // Cargar departamentos y ocupaciones
      fetchDepartamentos();
      fetchOcupaciones();
    }
  }, [isOpen, usuario, grupos]);

  if (!usuario) return null;
  
  // Siempre mantenemos montado el modal,
  // y solo usamos clases para ocultar o mostrar con animación.

  const hasChanges = () => (
    nombre !== originalData.nombre ||
    apellido !== originalData.apellido ||
    rut !== originalData.rut ||
    grupoNombre !== originalData.grupoNombre ||
    password !== ''
  );

  const handleClose = () => {
    if (hasChanges() && !window.confirm('Hay cambios sin guardar. ¿Seguro que quieres salir?')) {
      return;
    }
    onClose();
  };

  const handleOverlayClick = (e) => {
    // Solo cerrar si se hace clic en el overlay, no en el contenido del modal
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSave = async () => {
    setStatus('guardando...');
    if (!currentPassword) {
      setStatus('Error: debes ingresar tu contraseña actual');
      return;
    }
    if (password && password !== confirmPassword) {
      setStatus('Error: las contraseñas no coinciden');
      return;
    }
    if (password && strength === 'weak') {
      setStatus('Error: la nueva contraseña es demasiado débil');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Actualizar perfil
      const res1 = await fetch(`${API_URL}/auth/usuario`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre,
          apellido,
          rut,
          password_actual: currentPassword,
          ...(password && { password_nueva: password })
        })
      });

      if (!res1.ok) {
        const err = await res1.json();
        throw new Error(err.message || 'Error al actualizar perfil');
      }

      // Actualizar nombre de grupo si cambia
      const grupoId = grupos[0]?.id;
      if (grupoId && grupoNombre !== originalData.grupoNombre) {
        const res2 = await fetch(`${API_URL}/grupos/${grupoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ nombre: grupoNombre, password_actual: currentPassword })
        });
        if (!res2.ok) {
          const err2 = await res2.json();
          throw new Error(err2.message || 'Error al actualizar grupo');
        }
      }

      setStatus('Guardado exitoso');
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
<div
  className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50
    transition-opacity duration-300 ease-in-out
    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
  onClick={handleOverlayClick}
>
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'scale-100' : 'scale-95'}`}
      >
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
          onClick={handleClose}
        >
          <FaTimes size={18} />
        </button>
        <h2 className="text-xl font-semibold mb-4">Mi Perfil</h2>

        <div className="space-y-4">
          {/* SECCIÓN: INFORMACIÓN PERSONAL */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Información Personal</h3>
            
            {/* Nombre y Apellido en una fila */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input
                  type="text"
                  value={apellido}
                  onChange={e => setApellido(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* RUT */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
              <input
                type="text"
                value={rut}
                onChange={e => handleRutChange(e.target.value)}
                placeholder="Ej: 12345678-9"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Email readonly */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (no editable)</label>
              <input
                type="email"
                value={usuario.email}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 rounded-md cursor-not-allowed"
              />
            </div>
          </div>

          {/* SECCIÓN: INFORMACIÓN LABORAL */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">Información Laboral</h3>
              <div className="flex items-center text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium">Solo lectura</span>
              </div>
            </div>
            
            {/* Ocupación */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ocupación</label>
              <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-600 rounded-md cursor-not-allowed">
                {ocupacion || 'No especificada'}
              </div>
              <p className="mt-1 text-xs text-gray-500">La información laboral es gestionada por el administrador</p>
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-600 rounded-md cursor-not-allowed">
                {departamento || 'No asignado'}
              </div>
              <p className="mt-1 text-xs text-gray-500">Contacte al administrador para cambios en departamento</p>
            </div>
          </div>

          {/* SECCIÓN: EMPRESA */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Empresa</h3>
            
            {/* Nombre de Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Empresa</label>
              <input
                type="text"
                value={grupoNombre}
                onChange={e => setGrupoNombre(e.target.value)}
                placeholder="Ingresa el nombre de tu empresa"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* SECCIÓN: SEGURIDAD */}
          <div className="pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Seguridad</h3>
            
            {/* Nueva Contraseña */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Dejar en blanco para mantener actual"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {password && (
                <>
                  {/* Barra de fuerza */}
                  <div className="mt-2 flex space-x-1">
                    <span className={`flex-1 h-1 rounded ${strength !== 'weak' ? 'bg-red-500' : 'bg-gray-200'}`} />
                    <span className={`flex-1 h-1 rounded ${(strength === 'medium' || strength === 'strong') ? 'bg-yellow-500' : 'bg-gray-200'}`} />
                    <span className={`flex-1 h-1 rounded ${strength === 'strong' ? 'bg-green-500' : 'bg-gray-200'}`} />
                  </div>
                  <p className={`mt-1 text-xs ${
                    strength === 'weak' ? 'text-red-500' :
                    strength === 'medium' ? 'text-yellow-500' :
                    'text-green-500'
                  }`}> 
                    {strength === 'weak' ? 'Débil' : strength === 'medium' ? 'Mediana' : 'Fuerte'}
                  </p>
                </>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirma la nueva contraseña"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Contraseña Actual */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña Actual <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual para confirmar cambios"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Requerido para guardar cualquier cambio</p>
            </div>
          </div>

          {status && (
            <div className={`p-3 rounded-md text-sm ${
              status.startsWith('Error') || status.includes('Error') 
                ? 'bg-red-50 border border-red-200 text-red-700' 
                : status === 'guardando...'
                ? 'bg-blue-50 border border-blue-200 text-blue-700'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {status}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button 
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
              onClick={handleClose}
            >
              Cancelar
            </button>
            <button 
              className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-md transition-colors duration-200 flex items-center"
              onClick={handleSave}
              disabled={status === 'guardando...'}
            >
              {status === 'guardando...' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
