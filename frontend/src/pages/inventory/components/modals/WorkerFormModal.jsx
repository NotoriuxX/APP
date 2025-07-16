import React, { useEffect } from 'react';
import WorkerForm from '../forms/WorkerForm';

const WorkerFormModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isEditing,
  loading,
  departamentos,
  ocupaciones,
  getDepartamentoSuggestions,
  getOcupacionSuggestions,
  formAnimating,
  setFormAnimating
}) => {
  // Cerrar con animación
  const handleClose = () => {
    setFormAnimating(true);
    setTimeout(() => {
      setFormAnimating(false);
      onClose();
    }, 300);
  };

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className={`bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-all duration-300 ${
          formAnimating ? 'animate-fade-out-slide-down' : 'animate-fade-in-slide-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {isEditing ? 'Editar Trabajador' : 'Nuevo Trabajador'}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <WorkerForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={onSubmit}
            onCancel={handleClose}
            isEditing={isEditing}
            departamentos={departamentos}
            ocupaciones={ocupaciones}
            getDepartamentoSuggestions={getDepartamentoSuggestions}
            getOcupacionSuggestions={getOcupacionSuggestions}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkerFormModal;
