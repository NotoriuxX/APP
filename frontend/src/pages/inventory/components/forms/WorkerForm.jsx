import React, { useState, useEffect } from 'react';
import { capitalizeFirstLetter, processEmail, validateEmail, validateRopera } from '../../utils';

const WorkerForm = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isEditing,
  departamentos,
  ocupaciones,
  getDepartamentoSuggestions,
  getOcupacionSuggestions,
  loading
}) => {
  const [errors, setErrors] = useState({});
  const [showDepartamentoSuggestions, setShowDepartamentoSuggestions] = useState(false);
  const [showOcupacionSuggestions, setShowOcupacionSuggestions] = useState(false);
  const [departamentoSuggestions, setDepartamentoSuggestions] = useState([]);
  const [ocupacionSuggestions, setOcupacionSuggestions] = useState([]);

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombres.trim()) {
      newErrors.nombres = 'El nombre es requerido';
    }

    if (!formData.apellidos.trim()) {
      newErrors.apellidos = 'Los apellidos son requeridos';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido';
    }

    if (!formData.ocupacion.trim()) {
      newErrors.ocupacion = 'La ocupación es requerida';
    }

    if (!formData.departamento.trim()) {
      newErrors.departamento = 'El departamento es requerido';
    }

    if (formData.ropera && !validateRopera(formData.ropera)) {
      newErrors.ropera = 'La ropera debe ser un número entre 1 y 9999';
    }

    if (!formData.fecha_contratacion) {
      newErrors.fecha_contratacion = 'La fecha de contratación es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit();
    }
  };

  // Manejar cambios en los campos
  const handleFieldChange = (field, value) => {
    let processedValue = value;

    if (field === 'nombres' || field === 'apellidos') {
      processedValue = capitalizeFirstLetter(value);
    } else if (field === 'email') {
      processedValue = processEmail(value);
    } else if (field === 'departamento') {
      processedValue = capitalizeFirstLetter(value);
      // Actualizar sugerencias
      const suggestions = getDepartamentoSuggestions(value);
      setDepartamentoSuggestions(suggestions);
      setShowDepartamentoSuggestions(suggestions.length > 0 && value.length > 0);
    } else if (field === 'ocupacion') {
      processedValue = capitalizeFirstLetter(value);
      // Actualizar sugerencias
      const suggestions = getOcupacionSuggestions(value);
      setOcupacionSuggestions(suggestions);
      setShowOcupacionSuggestions(suggestions.length > 0 && value.length > 0);
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Seleccionar sugerencia
  const selectSuggestion = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (field === 'departamento') {
      setShowDepartamentoSuggestions(false);
    } else if (field === 'ocupacion') {
      setShowOcupacionSuggestions(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombres */}
        <div>
          <label htmlFor="nombres" className="block text-sm font-medium text-gray-700">
            Nombres *
          </label>
          <input
            type="text"
            id="nombres"
            value={formData.nombres}
            onChange={(e) => handleFieldChange('nombres', e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
              errors.nombres ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Juan Carlos"
          />
          {errors.nombres && (
            <p className="mt-1 text-sm text-red-600">{errors.nombres}</p>
          )}
        </div>

        {/* Apellidos */}
        <div>
          <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700">
            Apellidos *
          </label>
          <input
            type="text"
            id="apellidos"
            value={formData.apellidos}
            onChange={(e) => handleFieldChange('apellidos', e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
              errors.apellidos ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Pérez González"
          />
          {errors.apellidos && (
            <p className="mt-1 text-sm text-red-600">{errors.apellidos}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="juan.perez@empresa.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Ropera */}
        <div>
          <label htmlFor="ropera" className="block text-sm font-medium text-gray-700">
            Ropera
          </label>
          <input
            type="number"
            id="ropera"
            min="1"
            max="9999"
            value={formData.ropera}
            onChange={(e) => handleFieldChange('ropera', e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
              errors.ropera ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="123"
          />
          {errors.ropera && (
            <p className="mt-1 text-sm text-red-600">{errors.ropera}</p>
          )}
        </div>

        {/* Departamento */}
        <div className="relative">
          <label htmlFor="departamento" className="block text-sm font-medium text-gray-700">
            Departamento *
          </label>
          <input
            type="text"
            id="departamento"
            value={formData.departamento}
            onChange={(e) => handleFieldChange('departamento', e.target.value)}
            onFocus={() => {
              if (formData.departamento && getDepartamentoSuggestions(formData.departamento).length > 0) {
                setShowDepartamentoSuggestions(true);
              }
            }}
            onBlur={() => {
              // Delay para permitir click en sugerencias
              setTimeout(() => setShowDepartamentoSuggestions(false), 200);
            }}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
              errors.departamento ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ventas"
          />
          {errors.departamento && (
            <p className="mt-1 text-sm text-red-600">{errors.departamento}</p>
          )}
          
          {/* Sugerencias de departamento */}
          {showDepartamentoSuggestions && departamentoSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
              {departamentoSuggestions.map((dept, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSuggestion('departamento', dept.nombre)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {dept.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ocupación */}
        <div className="relative">
          <label htmlFor="ocupacion" className="block text-sm font-medium text-gray-700">
            Ocupación *
          </label>
          <input
            type="text"
            id="ocupacion"
            value={formData.ocupacion}
            onChange={(e) => handleFieldChange('ocupacion', e.target.value)}
            onFocus={() => {
              if (formData.ocupacion && getOcupacionSuggestions(formData.ocupacion).length > 0) {
                setShowOcupacionSuggestions(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowOcupacionSuggestions(false), 200);
            }}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
              errors.ocupacion ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Vendedor"
          />
          {errors.ocupacion && (
            <p className="mt-1 text-sm text-red-600">{errors.ocupacion}</p>
          )}
          
          {/* Sugerencias de ocupación */}
          {showOcupacionSuggestions && ocupacionSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
              {ocupacionSuggestions.map((occ, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSuggestion('ocupacion', occ)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {occ}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fecha de contratación */}
        <div className="md:col-span-2">
          <label htmlFor="fecha_contratacion" className="block text-sm font-medium text-gray-700">
            Fecha de Contratación *
          </label>
          <input
            type="date"
            id="fecha_contratacion"
            value={formData.fecha_contratacion}
            onChange={(e) => handleFieldChange('fecha_contratacion', e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
              errors.fecha_contratacion ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.fecha_contratacion && (
            <p className="mt-1 text-sm text-red-600">{errors.fecha_contratacion}</p>
          )}
        </div>

        {/* Estado activo (solo para edición) */}
        {isEditing && (
          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => handleFieldChange('activo', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                Trabajador activo
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-150"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')} Trabajador
        </button>
      </div>
    </form>
  );
};

export default WorkerForm;
