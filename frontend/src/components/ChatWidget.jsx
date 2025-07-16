import React, { useState } from 'react';
import { FaTimes, FaPaperPlane, FaUserCircle, FaEllipsisV, FaChevronDown } from 'react-icons/fa';

const FancyChatWidget = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none"
      >
        <FaUserCircle className="text-2xl" />
      </button>

      {/* Ventana de chat con animación suave */}
      <div
        className={`fixed bottom-20 right-4 w-80 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right
          ${open ? 'h-[520px] opacity-100 scale-100' : 'h-0 opacity-0 scale-95 pointer-events-none'}`}
      >
        {/* Contenido solo visible cuando abierto */}
        <div className="flex flex-col h-full">
          {/* Encabezado con gradiente */}
          <div className="relative p-4 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-700 text-white">
            <div className="flex items-center space-x-2">
              <FaUserCircle className="w-8 h-8" />
              <div>
                <p className="font-semibold">Soporte Black</p>
                <p className="text-xs opacity-75">En línea</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="focus:outline-none"><FaEllipsisV /></button>
              <button onClick={() => setOpen(false)} className="focus:outline-none"><FaTimes /></button>
              <button className="ml-1 focus:outline-none"><FaChevronDown /></button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
            <div className="flex space-x-2 items-start">
              <FaUserCircle className="w-6 h-6 text-gray-400 mt-1" />
              <div className="bg-white p-3 rounded-xl rounded-bl-none shadow">
                <p className="text-sm text-gray-800">Hola 👋 ¿En qué podemos ayudarte?</p>
              </div>
            </div>
            <div className="flex space-x-2 items-start justify-end">
              <div className="bg-blue-600 text-white p-3 rounded-xl rounded-br-none shadow">
                <p className="text-sm">Necesito información sobre mi pedido.</p>
              </div>
              <FaUserCircle className="w-6 h-6 text-blue-600 mt-1" />
            </div>
          </div>

          {/* Campo de entrada */}
          <div className="p-3 border-t border-gray-200 bg-white flex items-center space-x-2">
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              className="flex-1 border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="bg-blue-600 p-2 rounded-full text-white focus:outline-none hover:bg-blue-700 transition">
              <FaPaperPlane />
            </button>
          </div>

          {/* Pie de chat */}
          <div className="text-center text-xs text-gray-400 p-2">
            Powered by <span className="font-semibold text-blue-600">MeryChat</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default FancyChatWidget;