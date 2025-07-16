# 🏗️ ESTRUCTURA JSX DETALLADA
## Arquitectura Paso a Paso del PhotocopyPage

## 🎯 JERARQUÍA ESTRUCTURAL COMPLETA

### 📐 ESQUEMA VISUAL DE COMPONENTES

```
📄 PhotocopyPage.jsx
├── 🌟 Container Principal (bg-gray-50 min-h-screen)
│   │
│   ├── 📊 Header Section
│   │   ├── 🏷️ Page Title
│   │   ├── 📈 Statistics Cards Grid
│   │   └── ⚡ Quick Actions Bar
│   │
│   ├── 🔍 Search & Filters Section
│   │   ├── 🔎 Search Input
│   │   ├── 📅 Date Filters
│   │   └── 🎛️ Additional Filters
│   │
│   ├── 📋 Main Content Area
│   │   ├── 📊 Data Table/Grid
│   │   ├── 🔄 Loading States
│   │   └── 📄 Pagination
│   │
│   └── 🎭 Modals & Overlays
│       ├── ➕ Add Modal
│       ├── ✏️ Edit Modal
│       └── 🗑️ Delete Confirmation
```

## 🏗️ ESTRUCTURA JERÁRQUICA DETALLADA

### 📦 CONTAINER PRINCIPAL

```jsx
// 🌟 CONTENEDOR RAÍZ
<div className="bg-gray-50 min-h-screen">
  <div className="container mx-auto px-4 py-6 max-w-7xl">
    {/* Todo el contenido va aquí */}
  </div>
</div>
```

**📝 Explicación del Container:**
- `bg-gray-50`: Fondo gris muy suave para toda la página
- `min-h-screen`: Altura mínima de pantalla completa
- `container mx-auto`: Contenedor centrado y responsive
- `px-4 py-6`: Padding horizontal y vertical
- `max-w-7xl`: Ancho máximo controlado

### 📊 SECCIÓN HEADER

```jsx
{/* 🏷️ HEADER SECTION */}
<header className="mb-8">
  {/* 📝 Page Title */}
  <div className="mb-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">
      📄 Gestión de Fotocopias
    </h1>
    <p className="text-gray-600 text-lg">
      Control y seguimiento de documentos fotocopiados
    </p>
  </div>

  {/* 📈 Statistics Cards Grid */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    {/* Card 1: Total Fotocopias */}
    <div className={`
      bg-white p-4 rounded-lg shadow-sm border border-gray-200
      transform transition-all duration-200 hover:scale-105 hover:shadow-md
      ${styles['photocopy-animate-fade-in-up']}
      ${styles['photocopy-delay-100']}
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Total Hoy</p>
          <p className="text-2xl font-bold text-teal-600">{totalToday}</p>
        </div>
        <div className="p-3 bg-teal-100 rounded-full">
          <svg className="w-6 h-6 text-teal-600" /* Icono SVG */>
        </div>
      </div>
    </div>

    {/* Card 2: Costo Total */}
    <div className={`
      bg-white p-4 rounded-lg shadow-sm border border-gray-200
      transform transition-all duration-200 hover:scale-105 hover:shadow-md
      ${styles['photocopy-animate-fade-in-up']}
      ${styles['photocopy-delay-200']}
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Costo Total</p>
          <p className="text-2xl font-bold text-green-600">${totalCost}</p>
        </div>
        <div className="p-3 bg-green-100 rounded-full">
          <svg className="w-6 h-6 text-green-600" /* Icono SVG */>
        </div>
      </div>
    </div>

    {/* Card 3: Documentos Únicos */}
    <div className={`
      bg-white p-4 rounded-lg shadow-sm border border-gray-200
      transform transition-all duration-200 hover:scale-105 hover:shadow-md
      ${styles['photocopy-animate-fade-in-up']}
      ${styles['photocopy-delay-300']}
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Documentos</p>
          <p className="text-2xl font-bold text-blue-600">{uniqueDocuments}</p>
        </div>
        <div className="p-3 bg-blue-100 rounded-full">
          <svg className="w-6 h-6 text-blue-600" /* Icono SVG */>
        </div>
      </div>
    </div>

    {/* Card 4: Promedio por Documento */}
    <div className={`
      bg-white p-4 rounded-lg shadow-sm border border-gray-200
      transform transition-all duration-200 hover:scale-105 hover:shadow-md
      ${styles['photocopy-animate-fade-in-up']}
      ${styles['photocopy-delay-400']}
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Promedio</p>
          <p className="text-2xl font-bold text-purple-600">{averagePerDoc}</p>
        </div>
        <div className="p-3 bg-purple-100 rounded-full">
          <svg className="w-6 h-6 text-purple-600" /* Icono SVG */>
        </div>
      </div>
    </div>
  </div>

  {/* ⚡ Quick Actions Bar */}
  <div className="flex flex-wrap gap-3">
    <button className={`
      bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg
      font-medium transition-all duration-200 flex items-center gap-2
      hover:scale-105 active:scale-95 focus:ring-2 focus:ring-teal-500
      ${styles['photocopy-hover-lift']}
    `}
    onClick={() => setShowAddModal(true)}>
      <svg className="w-5 h-5" /* Icono Plus */>
      Nuevo Registro
    </button>

    <button className={`
      bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg
      font-medium transition-all duration-200 flex items-center gap-2
      border border-gray-300 hover:border-gray-400
      hover:scale-105 active:scale-95 focus:ring-2 focus:ring-gray-500
    `}
    onClick={exportToExcel}>
      <svg className="w-5 h-5" /* Icono Download */>
      Exportar Excel
    </button>

    <button className={`
      bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg
      font-medium transition-all duration-200 flex items-center gap-2
      border border-gray-300 hover:border-gray-400
      hover:scale-105 active:scale-95 focus:ring-2 focus:ring-gray-500
    `}
    onClick={generateReport}>
      <svg className="w-5 h-5" /* Icono Chart */>
      Generar Reporte
    </button>
  </div>
</header>
```

### 🔍 SECCIÓN BÚSQUEDA Y FILTROS

```jsx
{/* 🔍 SEARCH & FILTERS SECTION */}
<section className={`
  bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6
  ${styles['photocopy-animate-fade-in-up']}
  ${styles['photocopy-delay-500']}
`}>
  <h2 className="text-lg font-semibold text-gray-900 mb-4">
    🔍 Búsqueda y Filtros
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* 🔎 Search Input */}
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Buscar
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por documento, trabajador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`
            w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-teal-500 focus:border-teal-500
            transition-all duration-200 bg-white
            hover:border-gray-400
          `}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" /* Icono Search */>
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" /* Icono X */>
          </button>
        )}
      </div>
    </div>

    {/* 📅 Date From Filter */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Fecha Desde
      </label>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-teal-500 focus:border-teal-500
          transition-all duration-200 bg-white
          hover:border-gray-400
        `}
      />
    </div>

    {/* 📅 Date To Filter */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Fecha Hasta
      </label>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-teal-500 focus:border-teal-500
          transition-all duration-200 bg-white
          hover:border-gray-400
        `}
      />
    </div>

    {/* 🎛️ Department Filter */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Departamento
      </label>
      <select
        value={selectedDepartment}
        onChange={(e) => setSelectedDepartment(e.target.value)}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-teal-500 focus:border-teal-500
          transition-all duration-200 bg-white
          hover:border-gray-400
        `}
      >
        <option value="">Todos los departamentos</option>
        {departments.map(dept => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
    </div>
  </div>

  {/* 🔄 Filter Actions */}
  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
    <div className="text-sm text-gray-600">
      {filteredData.length} registro(s) encontrado(s)
    </div>
    <div className="flex gap-2">
      <button
        onClick={clearFilters}
        className={`
          px-3 py-1 text-sm text-gray-600 hover:text-gray-800
          border border-gray-300 rounded-md hover:border-gray-400
          transition-all duration-200
        `}
      >
        Limpiar Filtros
      </button>
      <button
        onClick={applyFilters}
        className={`
          px-3 py-1 text-sm bg-teal-600 hover:bg-teal-700 text-white
          rounded-md transition-all duration-200
          hover:scale-105 active:scale-95
        `}
      >
        Aplicar
      </button>
    </div>
  </div>
</section>
```

### 📋 ÁREA DE CONTENIDO PRINCIPAL

```jsx
{/* 📋 MAIN CONTENT AREA */}
<main className={`
  bg-white rounded-lg shadow-sm border border-gray-200
  ${styles['photocopy-animate-fade-in-up']}
  ${styles['photocopy-delay-600']}
`}>
  {/* 📊 Table Header */}
  <div className="px-6 py-4 border-b border-gray-200">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-gray-900">
        📄 Registros de Fotocopias
      </h3>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          Mostrando {startIndex + 1}-{endIndex} de {filteredData.length}
        </span>
        <button
          onClick={refreshData}
          className={`
            p-2 text-gray-400 hover:text-gray-600 rounded-lg
            hover:bg-gray-100 transition-all duration-200
            ${isRefreshing ? styles['photocopy-animate-spin'] : ''}
          `}
        >
          <svg className="w-4 h-4" /* Icono Refresh */>
        </button>
      </div>
    </div>
  </div>

  {/* 📊 Table Content */}
  <div className="overflow-x-auto">
    {loading ? (
      /* 🔄 Loading State */
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex space-x-4">
              <div className="w-12 h-4 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : filteredData.length === 0 ? (
      /* 📭 Empty State */
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" /* Icono Empty */>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay registros
        </h3>
        <p className="text-gray-600 mb-4">
          No se encontraron fotocopias con los filtros aplicados.
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className={`
            bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg
            font-medium transition-all duration-200
            hover:scale-105 active:scale-95
          `}
        >
          Agregar Primera Fotocopia
        </button>
      </div>
    ) : (
      /* 📋 Data Table */
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Table Headers con ordenamiento */}
            <th className={`
              px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
              cursor-pointer hover:bg-gray-100 transition-all duration-200
            `}
            onClick={() => handleSort('date')}>
              <div className="flex items-center gap-1">
                Fecha
                {sortField === 'date' && (
                  <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`}>
                    {/* Icono de ordenamiento */}
                  </svg>
                )}
              </div>
            </th>
            
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trabajador
            </th>
            
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Documento
            </th>
            
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cantidad
            </th>
            
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Costo
            </th>
            
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedData.map((record, index) => (
            <tr 
              key={record.id}
              className={`
                hover:bg-gray-50 transition-all duration-200
                ${styles['photocopy-animate-fade-in-up']}
                ${styles[`photocopy-delay-${Math.min(500 + (index * 100), 900)}`]}
              `}
            >
              {/* Fecha */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(record.date)}
              </td>
              
              {/* Trabajador */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-teal-600 font-medium text-sm">
                      {record.worker.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {record.worker}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.department}
                    </div>
                  </div>
                </div>
              </td>
              
              {/* Documento */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 font-medium">
                  {record.document}
                </div>
                <div className="text-sm text-gray-500">
                  {record.description}
                </div>
              </td>
              
              {/* Cantidad */}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`
                  inline-flex px-2 py-1 text-xs font-semibold rounded-full
                  ${record.quantity > 50 ? 'bg-red-100 text-red-800' : 
                    record.quantity > 20 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'}
                `}>
                  {record.quantity} copias
                </span>
              </td>
              
              {/* Costo */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                ${record.cost.toFixed(2)}
              </td>
              
              {/* Acciones */}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => openEditModal(record)}
                    className={`
                      text-teal-600 hover:text-teal-700 p-1 rounded
                      hover:bg-teal-50 transition-all duration-200
                    `}
                    title="Editar"
                  >
                    <svg className="w-4 h-4" /* Icono Edit */>
                  </button>
                  
                  <button
                    onClick={() => openDeleteModal(record)}
                    className={`
                      text-red-600 hover:text-red-700 p-1 rounded
                      hover:bg-red-50 transition-all duration-200
                    `}
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" /* Icono Delete */>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>

  {/* 📄 Pagination */}
  {filteredData.length > itemsPerPage && (
    <div className="px-6 py-4 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando {startIndex + 1} a {endIndex} de {filteredData.length} resultados
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`
              px-3 py-1 text-sm border border-gray-300 rounded-md
              ${currentPage === 1 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }
              transition-all duration-200
            `}
          >
            Anterior
          </button>
          
          {/* Page Numbers */}
          <div className="flex gap-1">
            {getPageNumbers().map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`
                  px-3 py-1 text-sm border rounded-md transition-all duration-200
                  ${currentPage === page
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }
                `}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`
              px-3 py-1 text-sm border border-gray-300 rounded-md
              ${currentPage === totalPages 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }
              transition-all duration-200
            `}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )}
</main>
```

## 🎭 MODALES Y OVERLAYS

### ➕ MODAL DE AGREGAR

```jsx
{/* ➕ ADD MODAL */}
{showAddModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className={`
      bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto
      ${styles['photocopy-animate-scale-in']}
    `}>
      {/* Modal Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          ➕ Nueva Fotocopia
        </h3>
        <button
          onClick={() => setShowAddModal(false)}
          className={`
            text-gray-400 hover:text-gray-600 p-1 rounded
            hover:bg-gray-100 transition-all duration-200
          `}
        >
          <svg className="w-5 h-5" /* Icono X */>
        </button>
      </div>

      {/* Modal Body */}
      <form onSubmit={handleSubmitAdd} className="p-6">
        <div className="space-y-4">
          {/* Trabajador Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trabajador *
            </label>
            <select
              value={formData.workerId}
              onChange={(e) => setFormData({...formData, workerId: e.target.value})}
              required
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                transition-all duration-200
              `}
            >
              <option value="">Seleccionar trabajador</option>
              {workers.map(worker => (
                <option key={worker.id} value={worker.id}>
                  {worker.name} - {worker.department}
                </option>
              ))}
            </select>
          </div>

          {/* Documento Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documento *
            </label>
            <input
              type="text"
              value={formData.document}
              onChange={(e) => setFormData({...formData, document: e.target.value})}
              placeholder="Ej: Manual de procedimientos"
              required
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                transition-all duration-200
              `}
            />
          </div>

          {/* Cantidad Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
              min="1"
              required
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                transition-all duration-200
              `}
            />
          </div>

          {/* Costo por Copia Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Costo por Copia
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.costPerCopy}
              onChange={(e) => setFormData({...formData, costPerCopy: parseFloat(e.target.value)})}
              placeholder="0.10"
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                transition-all duration-200
              `}
            />
          </div>

          {/* Descripción Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descripción adicional..."
              rows="3"
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                transition-all duration-200 resize-none
              `}
            />
          </div>

          {/* Costo Total Display */}
          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-teal-700">
                Costo Total:
              </span>
              <span className="text-lg font-bold text-teal-600">
                ${(formData.quantity * formData.costPerCopy).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowAddModal(false)}
            className={`
              px-4 py-2 text-gray-700 border border-gray-300 rounded-lg
              hover:bg-gray-50 hover:border-gray-400
              transition-all duration-200
            `}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`
              px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg
              font-medium transition-all duration-200 flex items-center gap-2
              hover:scale-105 active:scale-95 focus:ring-2 focus:ring-teal-500
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            `}
          >
            {submitting ? (
              <>
                <div className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full ${styles['photocopy-animate-spin']}`}></div>
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" /* Icono Save */>
                Guardar
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

## 🎯 PATRONES DE NOMENCLATURA JSX

### 📝 CONVENCIONES DE NOMBRES

```jsx
// 🏷️ NOMBRES DE COMPONENTES
const PhotocopyPage = () => {
  // 📊 Estados con prefijos descriptivos
  const [photocopies, setPhotocopies] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 🎭 Estados de modales con prefijo 'show'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // 📝 Estados de formularios con sufijo 'Data'
  const [formData, setFormData] = useState({});
  const [editData, setEditData] = useState({});
  
  // 🔄 Estados de procesos con prefijo 'is' o 'has'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 🎯 Estados seleccionados con prefijo 'selected'
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
};
```

### 🔧 FUNCIONES Y MANEJADORES

```jsx
// 📝 NAMING PATTERNS PARA FUNCIONES
const PhotocopyPage = () => {
  // 🔄 Manejadores de eventos con prefijo 'handle'
  const handleSubmit = (e) => { /* ... */ };
  const handleSearch = (term) => { /* ... */ };
  const handleFilter = (filters) => { /* ... */ };
  const handleSort = (field) => { /* ... */ };
  
  // 📂 Operaciones de modal con prefijo de acción
  const openAddModal = () => setShowAddModal(true);
  const closeAddModal = () => setShowAddModal(false);
  const openEditModal = (record) => { /* ... */ };
  const openDeleteModal = (record) => { /* ... */ };
  
  // 🔄 Operaciones de datos con prefijos específicos
  const fetchPhotocopies = async () => { /* ... */ };
  const createPhotocopy = async (data) => { /* ... */ };
  const updatePhotocopy = async (id, data) => { /* ... */ };
  const deletePhotocopy = async (id) => { /* ... */ };
  
  // 📊 Utilidades con nombres descriptivos
  const calculateTotalCost = (records) => { /* ... */ };
  const formatCurrency = (amount) => { /* ... */ };
  const formatDate = (date) => { /* ... */ };
  const exportToExcel = () => { /* ... */ };
  const generateReport = () => { /* ... */ };
  
  // 🎯 Validaciones con prefijo 'validate' o 'is'
  const validateForm = (data) => { /* ... */ };
  const isValidQuantity = (qty) => { /* ... */ };
  const hasRequiredFields = (data) => { /* ... */ };
};
```

## 🚀 SIGUIENTE PASO

**Continuar con**: `06_STATE_MANAGEMENT.md` para la gestión detallada de estados.
