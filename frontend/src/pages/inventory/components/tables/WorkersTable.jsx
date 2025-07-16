import React from 'react';
import { formatDate } from '../../utils';

const WorkersTable = ({
  workers,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  onToggleStatus,
  onCreateUser,
  onDeactivateAccount,
  selectedWorkers,
  onSelectWorker,
  onSelectAll,
  isSelectMode,
  permisos
}) => {
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
    );
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSort({ key, direction });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {isSelectMode && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={workers.length > 0 && workers.every(worker => selectedWorkers.has(worker.id))}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </th>
              )}
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                onClick={() => handleSort('nombres')}
              >
                <div className="flex items-center space-x-1">
                  <span>Trabajador</span>
                  {getSortIcon('nombres')}
                </div>
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                onClick={() => handleSort('cargo')}
              >
                <div className="flex items-center space-x-1">
                  <span>Cargo</span>
                  {getSortIcon('cargo')}
                </div>
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                onClick={() => handleSort('rol_nombre')}
              >
                <div className="flex items-center space-x-1">
                  <span>Rol</span>
                  {getSortIcon('rol_nombre')}
                </div>
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                onClick={() => handleSort('departamento_nombre')}
              >
                <div className="flex items-center space-x-1">
                  <span>Departamento</span>
                  {getSortIcon('departamento_nombre')}
                </div>
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                onClick={() => handleSort('activo')}
              >
                <div className="flex items-center space-x-1">
                  <span>Estado</span>
                  {getSortIcon('activo')}
                </div>
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                onClick={() => handleSort('estado_acceso')}
              >
                <div className="flex items-center space-x-1">
                  <span>Usuario</span>
                  {getSortIcon('estado_acceso')}
                </div>
              </th>
              
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {workers.map((trabajador, index) => (
              <tr 
                key={trabajador.id} 
                className="animate-table-row-staggered hover:bg-gray-50 transition-colors duration-150"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {isSelectMode && (
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedWorkers.has(trabajador.id)}
                      onChange={(e) => onSelectWorker(trabajador.id, e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </td>
                )}
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-teal-800 font-medium text-sm">
                          {(trabajador.nombres || trabajador.nombre)?.charAt(0)?.toUpperCase()}{(trabajador.apellidos || trabajador.apellido)?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {trabajador.nombres || trabajador.nombre} {trabajador.apellidos || trabajador.apellido}
                      </div>
                      {trabajador.email && (
                        <div className="text-sm text-gray-500">
                          {trabajador.email}
                        </div>
                      )}
                      {trabajador.rut && (
                        <div className="text-sm text-gray-500">
                          RUT: {trabajador.rut}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{trabajador.cargo || 'No asignado'}</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {trabajador.rol_nombre || <span className="text-gray-400 italic">Sin cuenta</span>}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {trabajador.departamento_nombre && trabajador.departamento_nombre !== 'Sin departamento' ? 
                      trabajador.departamento_nombre : 
                      <span className="text-gray-400 italic">Sin departamento</span>}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onToggleStatus(trabajador)}
                    className="group relative"
                  >
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      trabajador.activo
                        ? 'bg-green-100 text-green-800 group-hover:bg-green-200'
                        : 'bg-red-100 text-red-800 group-hover:bg-red-200'
                    }`}>
                      {trabajador.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </button>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    trabajador.estado_acceso === 'con_acceso'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {trabajador.estado_acceso === 'con_acceso' ? 'Cuenta activa' : 'Sin cuenta'}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {permisos?.trabajadores?.editar && (
                      <button
                        onClick={() => onEdit(trabajador)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors duration-150"
                        title="Editar trabajador"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    
                    {permisos?.usuarios?.crear && !trabajador.usuario_id && (
                      <button
                        onClick={() => onCreateUser(trabajador)}
                        className="text-green-600 hover:text-green-900 transition-colors duration-150"
                        title="Crear cuenta de usuario"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </button>
                    )}
                    
                    {permisos?.usuarios?.eliminar && trabajador.usuario_id && (
                      <button
                        onClick={() => onDeactivateAccount(trabajador)}
                        className="text-orange-600 hover:text-orange-900 transition-colors duration-150"
                        title="Desactivar cuenta de usuario"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6z" />
                        </svg>
                      </button>
                    )}
                    
                    {permisos?.trabajadores?.eliminar && (
                      <button
                        onClick={() => onDelete(trabajador)}
                        className="text-red-600 hover:text-red-900 transition-colors duration-150"
                        title="Eliminar trabajador"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {workers.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay trabajadores</h3>
          <p className="mt-1 text-sm text-gray-500">No se encontraron trabajadores que coincidan con los filtros aplicados.</p>
        </div>
      )}
    </div>
  );
};

export default WorkersTable;
