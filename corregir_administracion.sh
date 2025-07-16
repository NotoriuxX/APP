#!/bin/bash

echo "🔧 Corrigiendo departamento mal codificado..."

# Verificar departamentos actuales
echo "📋 Departamentos antes de la corrección:"
node -e "
const db = require('./db');
db.query('SELECT id, nombre FROM departamentos WHERE nombre LIKE \"%Administraci%\"', (err, results) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Departamentos encontrados:', results);
    
    // Corregir el problema
    console.log('\\n🔧 Iniciando corrección...');
    
    // 1. Actualizar trabajadores que tengan el departamento mal codificado
    db.query('UPDATE trabajadores SET departamento_id = (SELECT id FROM departamentos WHERE nombre = \"Administración\" LIMIT 1) WHERE departamento_id = (SELECT id FROM departamentos WHERE nombre = \"AdministraciÃ³n\" LIMIT 1)', (err2, result2) => {
      if (err2) {
        console.error('Error actualizando trabajadores:', err2);
      } else {
        console.log('✅ Trabajadores actualizados:', result2.affectedRows);
        
        // 2. Eliminar el departamento mal codificado
        db.query('DELETE FROM departamentos WHERE nombre = \"AdministraciÃ³n\"', (err3, result3) => {
          if (err3) {
            console.error('Error eliminando departamento mal codificado:', err3);
          } else {
            console.log('✅ Departamento mal codificado eliminado:', result3.affectedRows);
            
            // 3. Verificar resultado final
            db.query('SELECT id, nombre FROM departamentos WHERE nombre LIKE \"%Administraci%\"', (err4, results4) => {
              if (err4) {
                console.error('Error verificando resultado:', err4);
              } else {
                console.log('\\n📋 Departamentos después de la corrección:', results4);
              }
              db.end();
            });
          }
        });
      }
    });
  }
});
"

echo "✅ Corrección completada!"
