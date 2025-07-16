      {/* Modal de creación de usuario */}
      {showUserModal && selectedWorker && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${styles.modalOverlay}
          transition-all duration-300 ease-in-out
          ${userModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`}>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl ${styles.modalContent}
            transform transition-all duration-300 ease-in-out
            ${userModalAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedWorker?.tiene_usuario && !selectedWorker?.tiene_acceso 
                        ? 'Reactivar Cuenta de Usuario'
                        : selectedWorker?.email && selectedWorker?.email.trim() && !selectedWorker?.tiene_usuario
                        ? 'Activar Cuenta de Usuario'
                        : 'Crear Usuario'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Para: {selectedWorker?.nombre} {selectedWorker?.apellido}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeUserModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={userFormData.email}
                      onChange={handleUserInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
                      placeholder="email@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={userFormData.password}
                      onChange={handleUserInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
                      placeholder="Mínimo 6 caracteres"
                      minLength="6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Contraseña *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={userFormData.confirmPassword}
                    onChange={handleUserInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
                    placeholder="Confirma la contraseña"
                  />
                </div>

                {/* Sección de Roles */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Rol del Usuario
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rolesDisponibles.map((rol) => (
                      <div
                        key={rol.id}
                        data-role={rol.id}
                        className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                          userFormData.rol_global === rol.id
                            ? 'border-teal-500 bg-teal-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-teal-300'
                        }`}
                        onClick={() => handleRoleChange(rol.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            userFormData.rol_global === rol.id ? 'bg-teal-500' : 'bg-gray-300'
                          }`}>
                            <div className={`w-3 h-3 rounded-full ${
                              userFormData.rol_global === rol.id ? 'bg-white' : 'bg-gray-500'
                            }`}></div>
                          </div>
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              userFormData.rol_global === rol.id ? 'text-teal-900' : 'text-gray-900'
                            }`}>
                              {rol.nombre}
                            </h4>
                            <p className={`text-xs mt-1 ${
                              userFormData.rol_global === rol.id ? 'text-teal-700' : 'text-gray-600'
                            }`}>
                              {rol.descripcion}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sección de Permisos Modulares */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Permisos Específicos
                    </label>
                    <span className="text-xs text-gray-500">
                      {Object.keys(selectedPermissions).filter(p => selectedPermissions[p]).length} permisos seleccionados
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {modulosPermisos.map((modulo) => {
                      const isExpanded = expandedModules.has(modulo.id);
                      const isActive = isModuleActive(modulo.id);
                      const selectedCount = getSelectedPermissionsCount(modulo.id);
                      
                      return (
                        <div key={modulo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Header del módulo */}
                          <div
                            className={`p-4 cursor-pointer transition-all duration-200 flex items-center justify-between ${
                              isActive 
                                ? 'bg-teal-50 border-b border-teal-200' 
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                            onClick={() => toggleModuleExpansion(modulo.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{modulo.icono}</span>
                              <div className="flex-1">
                                <h4 className={`text-sm font-medium ${
                                  isActive ? 'text-teal-900' : 'text-gray-900'
                                }`}>
                                  {modulo.nombre}
                                </h4>
                                <p className={`text-xs ${
                                  isActive ? 'text-teal-700' : 'text-gray-600'
                                }`}>
                                  {modulo.descripcion}
                                </p>
                              </div>
                              
                              {selectedCount > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                  {selectedCount}/{modulo.permisos.length}
                                </span>
                              )}
                              
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleModulePermissions(modulo.id);
                                }}
                                className={`ml-2 px-2 py-1 text-xs rounded transition-colors duration-200 ${
                                  isActive 
                                    ? 'bg-teal-600 text-white hover:bg-teal-700' 
                                    : 'bg-gray-600 text-white hover:bg-gray-700'
                                }`}
                              >
                                {isActive ? 'Deseleccionar' : 'Seleccionar'}
                              </button>
                              
                              <svg 
                                className={`w-5 h-5 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                } ${isActive ? 'text-teal-600' : 'text-gray-600'}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Contenido expandible del módulo */}
                          {isExpanded && (
                            <div className="module-content animate-module-expand">
                              <div className="p-4 bg-white border-t border-gray-100">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {modulo.permisos.map((permiso) => (
                                    <label
                                      key={permiso.codigo}
                                      data-permission={permiso.codigo}
                                      className="permission-checkbox flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-50 transition-all duration-200"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedPermissions[permiso.codigo] || false}
                                        onChange={(e) => handlePermissionChange(permiso.codigo, e.target.checked)}
                                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded transition-all duration-200"
                                      />
                                      <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-900">
                                          {permiso.nombre}
                                        </span>
                                        <p className="text-xs text-gray-600">
                                          {permiso.descripcion}
                                        </p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Los permisos se agregan al rol seleccionado. Puedes personalizar según las necesidades específicas.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeUserModal}
                    className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all duration-200 transform hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
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
