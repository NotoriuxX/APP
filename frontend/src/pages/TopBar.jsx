import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import { useSearch } from '../components/SearchContext';
import useAuth from '../hooks/useAuth';
import ProfileModal from '../components/ProfileModal';

const TopBar = () => {
  const { usuario, cerrarSesion } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = usuario ? usuario.nombre : 'Invitado';
  const initials = usuario
    ? usuario.nombre
        .split(' ')
        .map((n) => n[0])
        .join('')
    : 'U';

  return (
    <>
      <div className="fixed top-2 left-0 right-0 h-14 w-full flex items-center justify-end px-6 bg-transparent z-40 space-x-4">
        {/* ... búsqueda ... */}

        {/* Perfil */}
        <div className="relative mt-2" ref={menuRef}>
          <button
            className="flex items-center justify-center w-10 h-10 text-black font-bold bg-[#D1D5DB] rounded-full hover:ring-2 hover:ring-[#14B8A6] transition"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {initials}
          </button>

          <div
            className={`absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-lg p-2 transition-all transform ${
              menuOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
            } duration-200`}
          >
            <div className="px-4 py-2 text-gray-700 font-semibold">{userName}</div>
            <hr className="border-gray-200" />

            <button
              className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-black transition"
              onClick={() => {
                setMenuOpen(false);
                setShowProfile(true);
              }}
            >
              <FaUser className="mr-2" /> Mi perfil
            </button>

            <button className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-black transition">
              <FaCog className="mr-2" /> Configuración
            </button>
          </div>
        </div>

        {/* Cerrar sesión */}
        <button
          className="relative flex items-center justify-center w-10 h-10 text-black bg-[#D1D5DB] rounded-full hover:ring-2 hover:ring-[#14B8A6] transition group mt-2"
          onClick={() => {
            setTimeout(() => cerrarSesion(), 300);
          }}
        >
          <FaSignOutAlt className="text-xl transition-transform transform group-hover:scale-110" />
        </button>
      </div>

      {/* Modal de perfil */}
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
};

export default TopBar;