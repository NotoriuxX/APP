const fs = require('fs');

// Leer el archivo
const filePath = '/Users/manuelmery/Library/CloudStorage/OneDrive-Personal/Documentos/Proyectos/OneDrive_1_30-5-2025/inventario-black-main/backend/routes/dashboardImpresiones.js';
let content = fs.readFileSync(filePath, 'utf8');

// Patrón a buscar (fórmula vieja)
const oldPattern = /CASE\s+WHEN\s+f\.cantidad\s*%\s*2\s*=\s*0\s+THEN\s+f\.cantidad\s*\/\s*2\s+ELSE\s+FLOOR\(f\.cantidad\s*\/\s*2\)\s*\+\s*1/g;

// Nueva fórmula
const newFormula = `CASE 
                    WHEN f.cantidad % 2 = 0 THEN (f.cantidad / 2) * COALESCE(f.multiplicador, 1)
                    ELSE (FLOOR(f.cantidad / 2) + 1) * COALESCE(f.multiplicador, 1)`;

console.log('Buscando patrones a reemplazar...');
const matches = content.match(oldPattern);
console.log(`Encontradas ${matches ? matches.length : 0} ocurrencias`);

if (matches && matches.length > 0) {
  console.log('Patrones encontrados:');
  matches.forEach((match, i) => {
    console.log(`${i+1}: ${match}`);
  });
  
  // Reemplazar todos los patrones
  content = content.replace(oldPattern, newFormula);
  
  // También necesitamos actualizar las referencias a f.cantidad solo (sin multiplicador) en contextos de hojas
  // Buscar patrones como "ELSE f.cantidad END" que deberían ser "ELSE f.cantidad * COALESCE(f.multiplicador, 1) END"
  const simplePattern = /ELSE\s+f\.cantidad\s+END/g;
  const newSimpleFormula = 'ELSE f.cantidad * COALESCE(f.multiplicador, 1) END';
  
  const simpleMatches = content.match(simplePattern);
  console.log(`\nEncontradas ${simpleMatches ? simpleMatches.length : 0} ocurrencias simples`);
  
  if (simpleMatches) {
    content = content.replace(simplePattern, newSimpleFormula);
  }
  
  // Escribir el archivo corregido
  fs.writeFileSync(filePath, content);
  console.log('\n✅ Archivo actualizado correctamente');
} else {
  console.log('No se encontraron patrones a reemplazar');
}
