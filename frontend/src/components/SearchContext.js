// src/components/SearchContext.jsx
import { createContext, useContext, useState } from 'react';

// Crear el contexto
const SearchContext = createContext();

// Proveer el contexto
export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </SearchContext.Provider>
  );
};

// Hook para usar el contexto
export const useSearch = () => useContext(SearchContext);