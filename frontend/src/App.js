// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';

import ForgotPassword from './pages/auth/ForgotPassword';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminDashboard from './pages/inventory/Dashboard';
import Inicio from './pages/Inicio';
import InventoryWorker from './pages/inventory/InventoryWorker';
import PhotocopyPage from './pages/inventory/photocopy/PhotocopyPage.jsx';
import LocationManager from './pages/inventory/Location/LocationManager';
import Settings from './pages/Settings';
import Sidebar from './pages/Sidebar';
import TopBar from './pages/TopBar';
import ProtectedRoute from './components/ProtectedRoute';

import { SearchProvider } from './components/SearchContext';

function AppContent() {
  const location = useLocation();
  const hideSidebarRoutes = ['/login', '/register', '/forgot-password'];
  const showLayout = !hideSidebarRoutes.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {showLayout && <TopBar />}
      <div className="flex flex-1">
        {showLayout && <Sidebar />}
        <div className={`flex-1 ${showLayout ? 'pt-16' : ''} overflow-auto`}>
          <Routes>
            {/* Redirige "/" a "/inicio" */}
            <Route path="/" element={<Navigate to="/inicio" replace />} />

            <Route path="/inicio" element={<Inicio />} />
            <Route path="/inventory" element={
              <ProtectedRoute permission="inventario">
                <InventoryWorker />
              </ProtectedRoute>
            } />
            <Route path="/inventoryworker" element={
              <ProtectedRoute permission="trabajadores">
                <InventoryWorker />
              </ProtectedRoute>
            } />
            <Route path="/workers" element={
              <ProtectedRoute permission="trabajadores">
                <InventoryWorker />
              </ProtectedRoute>
            } />
            <Route path="/photocopy" element={
              <ProtectedRoute permission="fotocopias">
                <PhotocopyPage />
              </ProtectedRoute>
            } />
            <Route path="/photocopypage" element={
              <ProtectedRoute permission="fotocopias">
                <PhotocopyPage />
              </ProtectedRoute>
            } />
            <Route path="/locationmanager" element={<LocationManager />} />
            <Route path="/charts" element={<LocationManager />} />
            <Route path="/settings" element={
              <ProtectedRoute permission="configuracion" moduleName="Configuración">
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/admindashboard" element={<AdminDashboard />} />

            {/* Rutas de autenticación (sin layout) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <ModalsProvider modalRootElement={document.getElementById('modal-root')}>
        <SearchProvider>
          <Router>
            <AppContent />
          </Router>
        </SearchProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
