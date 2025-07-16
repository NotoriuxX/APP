import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown, FaChevronRight, FaCheck } from 'react-icons/fa';
import styles from './PermissionsManager.module.css';

const PermissionsManager = ({ 
  selectedRole, 
  onPermissionsChange,
  initialPermissions = []
}) => {
  const [modules, setModules] = useState([]);
  const [expandedModules, setExpandedModules] = useState({});
  const [selectedPermissions, setSelectedPermissions] = useState(new Set(initialPermissions));

  useEffect(() => {
    fetchModulesAndPermissions();
  }, [selectedRole]);

  const fetchModulesAndPermissions = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/permisos/modulos`);
      const data = await response.json();
      setModules(data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const togglePermission = (moduleId, permissionCode) => {
    const permissionKey = `${moduleId}.${permissionCode}`;
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionKey)) {
        newSet.delete(permissionKey);
        // Si se desmarca un permiso específico, verificar si debemos desmarcar el módulo
        const modulePermissions = modules
          .find(m => m.id === moduleId)
          ?.permisos
          .map(p => `${moduleId}.${p.codigo}`);
        
        const anyPermissionSelected = modulePermissions?.some(p => newSet.has(p));
        if (!anyPermissionSelected) {
          newSet.delete(moduleId);
        }
      } else {
        newSet.add(permissionKey);
      }
      onPermissionsChange(Array.from(newSet));
      return newSet;
    });
  };

  const toggleAllModulePermissions = (moduleId) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      const module = modules.find(m => m.id === moduleId);
      const allPermissions = module.permisos.map(p => `${moduleId}.${p.codigo}`);
      
      const allSelected = allPermissions.every(p => prev.has(p));
      
      if (allSelected) {
        // Desmarcar todo
        allPermissions.forEach(p => newSet.delete(p));
        newSet.delete(moduleId);
      } else {
        // Marcar todo
        allPermissions.forEach(p => newSet.add(p));
        newSet.add(moduleId);
      }
      
      onPermissionsChange(Array.from(newSet));
      return newSet;
    });
  };

  return (
    <div className={styles.permissionsContainer}>
      {modules.map(module => (
        <div key={module.id} className={styles.moduleCard}>
          <motion.div 
            className={styles.moduleHeader}
            onClick={() => toggleModule(module.id)}
            initial={false}
            animate={{ backgroundColor: expandedModules[module.id] ? '#f0f0f0' : '#ffffff' }}
          >
            <div className={styles.moduleTitle}>
              <i className={`fas ${module.icono} ${styles.moduleIcon}`}></i>
              <span>{module.nombre}</span>
            </div>
            <div className={styles.moduleControls}>
              <motion.button
                className={styles.toggleButton}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAllModulePermissions(module.id);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaCheck className={
                  selectedPermissions.has(module.id) ? styles.checkSelected : styles.check
                } />
              </motion.button>
              <motion.div
                animate={{ rotate: expandedModules[module.id] ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {expandedModules[module.id] ? <FaChevronDown /> : <FaChevronRight />}
              </motion.div>
            </div>
          </motion.div>

          <AnimatePresence>
            {expandedModules[module.id] && (
              <motion.div
                className={styles.permissionsList}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {module.permisos.map(permission => (
                  <motion.div
                    key={permission.codigo}
                    className={styles.permissionItem}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className={styles.permissionLabel}>
                      <input
                        type="checkbox"
                        checked={selectedPermissions.has(`${module.id}.${permission.codigo}`)}
                        onChange={() => togglePermission(module.id, permission.codigo)}
                        className={styles.permissionCheckbox}
                      />
                      <span>{permission.nombre}</span>
                    </label>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default PermissionsManager;
