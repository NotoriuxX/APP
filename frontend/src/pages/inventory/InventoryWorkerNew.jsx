import React, { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { useWorkers } from './hooks/useWorkers';
import { useDepartmentsAndOccupations } from './hooks/useDepartmentsAndOccupations';

// Componentes
import {
  WorkersTable,
  WorkerFormModal,
  DeleteConfirmModal,
  ManagementModal
} from './components';

// Estilos
import './styles/animations.css';
import styles from './InventoryWorker.module.css';

export default function InventoryWorker() {
  const { usuario, permisos, isLoading: authLoading } = useAuth();
  
  // Hooks personalizados
  const {
    allTrabajadores,
    getPaginatedWorkers,
    loading: workersLoading,
    error: workersError,
    success: workersSuccess,
    filters,
    setFilters,
    sortConfig,
    setSortConfig,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    createWorker,
    updateWorker,
    deleteWorker,
    toggleWorkerStatus,
    clearMessages
  } = useWorkers();

  const {
    departamentos,
    ocupaciones,
    getDepartamentoSuggestions,
    getOcupacionSuggestions,
    createDepartamento,
    updateDepartamento,
    deleteDepartamento,
    loading: deptLoading
  } = useDepartmentsAndOccupations();

  // Estados locales para UI
  const [showForm, setShowForm] = useState(false);
  const [formAnimating, setFormAnimating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  
  // Estados para gestión de departamentos/ocupaciones
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [managementType, setManagementType] = useState(''); // 'departamento' o 'ocupacion'
  
  // Estados para formulario
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

  // Estados para modales
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  
  // Estados para selección múltiple
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Obtener datos paginados
  const paginatedData = getPaginatedWorkers();

  // ========================================
  // FUNCIONES DE FORMULARIO
  // ========================================

  const openNewWorkerForm = () => {
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
    setEditingId(null);
    setShowForm(true);
  };

  const openEditWorkerForm = (trabajador) => {
    setFormData({
      nombres: trabajador.nombres || '',
      apellidos: trabajador.apellidos || '',
      ocupacion: trabajador.ocupacion || '',
      email: trabajador.email || '',
      ropera: trabajador.ropera || '',
      departamento: trabajador.departamento || '',
      fecha_contratacion: trabajador.fecha_contratacion?.split('T')[0] || '',
      activo: trabajador.activo !== false
    });
    setEditingId(trabajador.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    clearMessages();
  };

  const handleSubmitForm = async () => {
    try {
      if (editingId) {
        await updateWorker(editingId, formData);
      } else {
        await createWorker(formData);
      }
      closeForm();
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  // ========================================
  // FUNCIONES DE ELIMINACIÓN
  // ========================================

  const openDeleteModal = (trabajador) => {
    setWorkerToDelete(trabajador);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setWorkerToDelete(null);
  };

  const handleDeleteWorker = async () => {
    if (workerToDelete) {
      try {
        await deleteWorker(workerToDelete.id);
        closeDeleteModal();
      } catch (error) {
        // Error ya manejado en el hook
      }
    }
  };

  // ========================================
  // FUNCIONES DE FILTROS Y BÚSQUEDA
  // ========================================

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setCurrentPage(1);
  };

  // ========================================
  // FUNCIONES DE ORDENAMIENTO
  // ========================================

  const handleSort = (sortData) => {
    setSortConfig(sortData);
  };

  // ========================================
  // FUNCIONES DE SELECCIÓN
  // ========================================

  const handleSelectWorker = (workerId, selected) => {
    const newSelectedWorkers = new Set(selectedWorkers);
    if (selected) {
      newSelectedWorkers.add(workerId);
    } else {
      newSelectedWorkers.delete(workerId);
    }
    setSelectedWorkers(newSelectedWorkers);
  };

  const handleSelectAll = (selected) => {
    if (selected) {
      const allIds = new Set(paginatedData.workers.map(w => w.id));
      setSelectedWorkers(allIds);
    } else {
      setSelectedWorkers(new Set());
    }
  };

  // ========================================
  // FUNCIONES DE ESTADO
  // ========================================

  const handleToggleStatus = async (trabajador) => {
    try {
      await toggleWorkerStatus(trabajador.id, !trabajador.activo);
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  // ========================================
  // FUNCIONES DE GESTIÓN
  // ========================================

  const openManagementModal = (type) => {
    setManagementType(type);
    setShowManagementModal(true);
  };

  const closeManagementModal = () => {
    setShowManagementModal(false);
    setManagementType('');
  };

  const handleCreateManagementItem = async (value) => {
    if (managementType === 'departamento') {
      await createDepartamento(value);
    }
    // Para ocupaciones, no necesitamos hacer nada especial ya que se crean automáticamente
  };

  const handleUpdateManagementItem = async (id, value) => {
    if (managementType === 'departamento') {
      await updateDepartamento(id, value);
    }
  };

  const handleDeleteManagementItem = async (id) => {
    if (managementType === 'departamento') {
      await deleteDepartamento(id);
    }
  };

  // ========================================
  // FUNCIONES PLACEHOLDER (para otros modales)
  // ========================================

  const handleCreateUser = (trabajador) => {
    // TODO: Implementar modal de creación de usuario
    console.log('Crear usuario para:', trabajador);
  };

  const handleDeactivateAccount = (trabajador) => {
    // TODO: Implementar modal de desactivación de cuenta
    console.log('Desactivar cuenta para:', trabajador);
  };

  // ========================================
  // RENDER
  // ========================================

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Trabajadores</h1>
              <p className="mt-2 text-gray-600">
                Administra la información de los trabajadores de la empresa
              </p>
            </div>
            {permisos?.trabajadores?.crear && (
              <button
                onClick={openNewWorkerForm}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-150 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nuevo Trabajador</span>
              </button>
            )}
          </div>
        </div>

        {/* Mensajes */}
        {workersError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {workersError}
          </div>
        )}
        
        {workersSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {workersSuccess}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Nombre, email, ropera..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            {/* Departamento */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Departamento
                </label>
                <button
                  onClick={() => openManagementModal('departamento')}
                  className="text-teal-600 hover:text-teal-800 text-xs"
                  title="Gestionar departamentos"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">Todos</option>
                {departamentos.map(dept => (
                  <option key={dept.id} value={dept.nombre}>
                    {dept.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Ocupación */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Ocupación
                </label>
                <button
                  onClick={() => openManagementModal('ocupacion')}
                  className="text-teal-600 hover:text-teal-800 text-xs"
                  title="Gestionar ocupaciones"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              <select
                value={filters.ocupacion}
                onChange={(e) => handleFilterChange('ocupacion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">Todas</option>
                {ocupaciones.map((occ, index) => (
                  <option key={index} value={occ}>
                    {occ}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Controles adicionales */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSelectMode(!isSelectMode)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isSelectMode
                  ? 'bg-teal-100 text-teal-700 border border-teal-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              {isSelectMode ? 'Cancelar selección' : 'Seleccionar múltiple'}
            </button>
            
            {isSelectMode && selectedWorkers.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedWorkers.size} trabajador(es) seleccionado(s)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Mostrar:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <WorkersTable
          workers={paginatedData.workers}
          sortConfig={sortConfig}
          onSort={handleSort}
          onEdit={openEditWorkerForm}
          onDelete={openDeleteModal}
          onToggleStatus={handleToggleStatus}
          onCreateUser={handleCreateUser}
          onDeactivateAccount={handleDeactivateAccount}
          selectedWorkers={selectedWorkers}
          onSelectWorker={handleSelectWorker}
          onSelectAll={handleSelectAll}
          isSelectMode={isSelectMode}
          permisos={permisos}
        />

        {/* Paginación */}
        {paginatedData.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(paginatedData.totalPages, currentPage + 1))}
                disabled={currentPage === paginatedData.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} al {Math.min(currentPage * itemsPerPage, paginatedData.totalItems)} de {paginatedData.totalItems} resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: paginatedData.totalPages }, (_, i) => i + 1).map(page => (
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
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(paginatedData.totalPages, currentPage + 1))}
                    disabled={currentPage === paginatedData.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Modales */}
        <WorkerFormModal
          isOpen={showForm}
          onClose={closeForm}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmitForm}
          isEditing={!!editingId}
          loading={workersLoading}
          departamentos={departamentos}
          ocupaciones={ocupaciones}
          getDepartamentoSuggestions={getDepartamentoSuggestions}
          getOcupacionSuggestions={getOcupacionSuggestions}
          formAnimating={formAnimating}
          setFormAnimating={setFormAnimating}
        />

        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteWorker}
          worker={workerToDelete}
          loading={workersLoading}
        />

        <ManagementModal
          isOpen={showManagementModal}
          onClose={closeManagementModal}
          type={managementType}
          items={managementType === 'departamento' ? departamentos : ocupaciones}
          onCreateItem={handleCreateManagementItem}
          onUpdateItem={handleUpdateManagementItem}
          onDeleteItem={handleDeleteManagementItem}
          loading={deptLoading}
        />
      </div>
    </div>
  );
}
