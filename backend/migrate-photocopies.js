const db = require('./db');

async function migratePhotocopies() {
  try {
    console.log('🔄 Iniciando migración de fotocopias...');
    
    // 1. Verificar estructura actual
    const [structure] = await db.promise().query('DESCRIBE fotocopias');
    const currentColumns = structure.map(col => col.Field);
    console.log('📋 Columnas actuales:', currentColumns);
    
    // 2. Agregar columnas faltantes una por una
    const columnsToAdd = [
      { name: 'multiplicador', sql: 'ADD COLUMN multiplicador INT DEFAULT 1 AFTER cantidad' },
      { name: 'tipo_hoja_id', sql: 'ADD COLUMN tipo_hoja_id INT DEFAULT 1 AFTER tipo' },
      { name: 'total_hojas', sql: 'ADD COLUMN total_hojas INT DEFAULT 0 AFTER doble_hoja' }
    ];
    
    for (const column of columnsToAdd) {
      if (!currentColumns.includes(column.name)) {
        console.log(`🔧 Agregando columna: ${column.name}`);
        await db.promise().query(`ALTER TABLE fotocopias ${column.sql}`);
        console.log(`✅ Columna ${column.name} agregada`);
      } else {
        console.log(`⚠️  Columna ${column.name} ya existe`);
      }
    }
    
    // 3. Crear tabla tipos_hoja si no existe
    console.log('🔧 Verificando tabla tipos_hoja...');
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS tipos_hoja (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        costo_unitario DECIMAL(10,2) DEFAULT 0.00,
        activo TINYINT(1) DEFAULT 1,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY ux_tipos_hoja_nombre (nombre)
      ) ENGINE=InnoDB
    `);
    console.log('✅ Tabla tipos_hoja verificada');
    
    // 4. Insertar tipos de hoja por defecto
    const [tiposCount] = await db.promise().query('SELECT COUNT(*) as total FROM tipos_hoja');
    if (tiposCount[0].total === 0) {
      console.log('🔧 Insertando tipos de hoja por defecto...');
      await db.promise().query(`
        INSERT INTO tipos_hoja (nombre, descripcion, costo_unitario) VALUES
        ('A4 Estándar', 'Hoja A4 estándar para fotocopias', 10.00),
        ('Carta', 'Papel tamaño carta estándar', 12.00),
        ('Oficio', 'Papel tamaño oficio', 15.00)
      `);
      console.log('✅ Tipos de hoja por defecto insertados');
    } else {
      console.log('⚠️  Tipos de hoja ya existen');
    }
    
    // 5. Actualizar registros existentes
    console.log('🔧 Actualizando registros existentes...');
    await db.promise().query(`
      UPDATE fotocopias 
      SET total_hojas = cantidad * multiplicador 
      WHERE total_hojas = 0 OR total_hojas IS NULL
    `);
    console.log('✅ Total de hojas recalculado');
    
    // 6. Agregar foreign key si no existe (opcional)
    try {
      await db.promise().query(`
        ALTER TABLE fotocopias 
        ADD CONSTRAINT fk_fotocopias_tipo_hoja 
        FOREIGN KEY (tipo_hoja_id) REFERENCES tipos_hoja(id)
      `);
      console.log('✅ Foreign key tipo_hoja_id agregado');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Foreign key ya existe');
      } else {
        console.warn('⚠️ No se pudo agregar foreign key:', err.message);
      }
    }
    
    // 7. Verificar resultado final
    const [newStructure] = await db.promise().query('DESCRIBE fotocopias');
    console.log('🎉 Nueva estructura de fotocopias:');
    newStructure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
    });
    
    // 8. Verificar datos
    const [count] = await db.promise().query('SELECT COUNT(*) as total FROM fotocopias');
    console.log(`📊 Total de registros: ${count[0].total}`);
    
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

migratePhotocopies();
