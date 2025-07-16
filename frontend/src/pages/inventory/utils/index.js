// Utilidades y constantes compartidas

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3300/api';

// Funciones de protección y filtrado
export const isDepartamentoProtegido = (nombreDepartamento) => {
  const departamentosProtegidos = ['Administración'];
  return departamentosProtegidos.includes(nombreDepartamento);
};

export const isOcupacionProtegida = (nombreOcupacion) => {
  const ocupacionesProtegidas = ['Propietario de Grupo', 'propietario de grupo', 'propietario'];
  return ocupacionesProtegidas.some(ocupacion => 
    nombreOcupacion.toLowerCase().includes(ocupacion.toLowerCase())
  );
};

export const filtrarOcupacionesProtegidas = (ocupaciones) => {
  return ocupaciones.filter(ocupacion => !isOcupacionProtegida(ocupacion));
};

// Funciones de formateo de texto
export const capitalizeFirstLetterOnly = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.split(' ').map(word => {
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

export const processEmail = (str) => {
  if (!str) return str;
  return str.toLowerCase();
};

// Funciones de validación
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRopera = (ropera) => {
  if (!ropera || ropera.length === 0) return true; // Opcional
  const numRopera = parseInt(ropera);
  return !isNaN(numRopera) && numRopera > 0 && numRopera <= 9999;
};

// Validación de fortaleza de contraseña
export const validatePasswordStrength = (password) => {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = [minLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  
  return {
    isValid: strength >= 3,
    strength,
    requirements: {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial
    }
  };
};

// Función para generar contraseña temporal
export const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const length = 8;
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Función para mostrar notificaciones
export const showNotification = (message, type = 'success', duration = 3000) => {
  // Esta función puede ser expandida para usar una librería de notificaciones
  console.log(`${type.toUpperCase()}: ${message}`);
};

// Función para formatear fechas
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Función para formatear fecha y hora
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Función para formatear fecha de manera segura
export const formatDateSafe = (dateString) => {
  try {
    return formatDate(dateString);
  } catch (error) {
    return dateString || '';
  }
};

// Función para formatear fecha y hora de manera segura
export const formatDateTimeSafe = (dateString) => {
  try {
    return formatDateTime(dateString);
  } catch (error) {
    return dateString || '';
  }
};
