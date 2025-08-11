// Test de conexión a la base de datos
const db = require('./db');

async function testDB() {
  try {
    console.log('🔍 Probando conexión a la base de datos...');
    
    // Probar conexión básica
    const [result] = await db.promise().query('SELECT 1 as test');
    console.log('✅ Conexión exitosa:', result);
    
    // Verificar tabla fotocopias
    const [tables] = await db.promise().query("SHOW TABLES LIKE 'fotocopias'");
    console.log('🔍 Tabla fotocopias existe:', tables.length > 0);
    
    if (tables.length > 0) {
      // Verificar estructura de la tabla
      const [structure] = await db.promise().query('DESCRIBE fotocopias');
      console.log('🔍 Estructura de fotocopias:');
      structure.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));
      
      // Contar registros
      const [count] = await db.promise().query('SELECT COUNT(*) as total FROM fotocopias');
      console.log('🔍 Total de registros:', count[0].total);
      
      // Mostrar algunos registros
      const [sample] = await db.promise().query('SELECT * FROM fotocopias LIMIT 3');
      console.log('🔍 Muestra de registros:');
      sample.forEach((row, i) => console.log(`  ${i+1}:`, row));
    }
    
    // Verificar tablas usuarios y grupos
    const [usuarios] = await db.promise().query("SHOW TABLES LIKE 'usuarios'");
    const [grupos] = await db.promise().query("SHOW TABLES LIKE 'grupos'");
    console.log('🔍 Tabla usuarios existe:', usuarios.length > 0);
    console.log('🔍 Tabla grupos existe:', grupos.length > 0);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testDB();
