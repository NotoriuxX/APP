import React, { useState, useEffect } from 'react';
import { capitalizeFirstLetter, isDepartamentoProtegido, isOcupacionProtegida } from '../../utils';

const ManagementModal = ({
  isOpen,
  onClose,
  type, // 'departamento' o 'ocupacion'
  items,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  loading
}) => {
  const [newItemValue, setNewItemValue] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const title = type === 'departamento' ? 'Gestionar Departamentos' : 'Gestionar Ocupaciones';
  const itemName = type === 'departamento' ? 'departamento' : 'ocupación';

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setNewItemValue('');
      setEditingIndex(null);
      setEditingValue('');
      setIsCreating(false);
    }
  }, [isOpen]);

  // Función para verificar si un item está protegido
  const isItemProtected = (item) => {
    if (type === 'departamento') {
      return isDepartamentoProtegido(item.nombre || item);
    } else {
      return isOcupacionProtegida(item);
    }
  };

  // Crear nuevo item
  const handleCreateItem = async () => {
    if (!newItemValue.trim()) return;

    setIsCreating(true);
    try {
      await onCreateItem(newItemValue.trim());
      setNewItemValue('');
    } catch (error) {
      // Error manejado por el componente padre
    } finally {
      setIsCreating(false);
    }
  };

  // Iniciar edición
  const startEditing = (index, value) => {
    setEditingIndex(index);
    setEditingValue(typeof value === 'object' ? value.nombre : value);
  };

  // Guardar edición
  const saveEdit = async () => {
    if (!editingValue.trim()) return;

    try {
      const item = items[editingIndex];
      const itemId = typeof item === 'object' ? item.id : null;
      await onUpdateItem(itemId, editingValue.trim());
      setEditingIndex(null);
      setEditingValue('');
    } catch (error) {
      // Error manejado por el componente padre
    }
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  // Eliminar item
  const handleDeleteItem = async (index) => {
    const item = items[index];
    const itemId = typeof item === 'object' ? item.id : null;
    const itemName = typeof item === 'object' ? item.nombre : item;
    
    if (window.confirm(`¿Estás seguro de que deseas eliminar ${itemName}?`)) {
      try {
        await onDeleteItem(itemId);
      } catch (error) {
        // Error manejado por el componente padre
      }
    }
  };

  // Manejar teclas
  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      if (editingIndex !== null) {
        cancelEdit();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden animate-fade-in-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Agregar nuevo item */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agregar nuevo {itemName}
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newItemValue}
                onChange={(e) => setNewItemValue(capitalizeFirstLetter(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, handleCreateItem)}
                placeholder={`Nombre del ${itemName}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                onClick={handleCreateItem}
                disabled={!newItemValue.trim() || isCreating}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {isCreating ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Agregar'
                )}
              </button>
            </div>
          </div>

          {/* Lista de items */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {type === 'departamento' ? 'Departamentos existentes' : 'Ocupaciones existentes'}
            </h4>
            
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay {type === 'departamento' ? 'departamentos' : 'ocupaciones'} registrados
              </p>
            ) : (
              items.map((item, index) => {
                const itemValue = typeof item === 'object' ? item.nombre : item;
                const isProtected = isItemProtected(item);
                
                return (
                  <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(capitalizeFirstLetter(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, saveEdit)}
                        className="flex-1 px-2 py-1 border border-teal-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center flex-1">
                        <span className={`font-medium ${isProtected ? 'text-amber-800' : 'text-gray-700'}`}>
                          {itemValue}
                        </span>
                        {isProtected && (
                          <div className="ml-2 flex items-center">
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24" title={`${type} protegido`}>
                              <path d="M12 2C13.1 2 14 2.9 14 4V6H16C16.55 6 17 6.45 17 7V17C17 17.55 16.55 18 16 18H8C7.45 18 7 17.55 7 17V7C7 6.45 7.45 6 8 6H10V4C10 2.9 10.9 2 12 2ZM12 3.5C11.72 3.5 11.5 3.72 11.5 4V6H12.5V4C12.5 3.72 12.28 3.5 12 3.5Z"/>
                            </svg>
                            <span className="text-xs text-amber-600 ml-1">Protegido</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      {editingIndex === index ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-100 transition-all duration-200"
                            title="Guardar cambios"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEdit}
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
                            onClick={() => startEditing(index, item)}
                            disabled={isProtected}
                            className={`p-1 rounded transition-all duration-200 ${
                              isProtected
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                            }`}
                            title={isProtected ? `${type} protegido - No editable` : 'Editar'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteItem(index)}
                            disabled={isProtected}
                            className={`p-1 rounded transition-all duration-200 ${
                              isProtected
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-600 hover:text-red-800 hover:bg-red-100'
                            }`}
                            title={isProtected ? `${type} protegido - No eliminable` : 'Eliminar'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer con información */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5C2.962 18.333 3.924 20 5.464 20z" />
              </svg>
              Los cambios afectan a todos los trabajadores
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-150"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagementModal;
