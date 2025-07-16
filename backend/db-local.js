// backend/db-local.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta a la base de datos SQLite
const dbPath = path.join(__dirname, 'inventarios.db');

// Crear conexión a SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar con SQLite:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Conectado a SQLite:', dbPath);
    }
});

// Simular la interfaz de mysql2 para compatibilidad
const dbWrapper = {
    query: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error en consulta SQL:', err.message);
                console.error('SQL:', sql);
                console.error('Params:', params);
                callback(err, null);
            } else {
                callback(null, rows);
            }
        });
    },
    
    promise: () => ({
        query: (sql, params) => {
            return new Promise((resolve, reject) => {
                db.all(sql, params || [], (err, rows) => {
                    if (err) {
                        console.error('Error en consulta SQL (promise):', err.message);
                        console.error('SQL:', sql);
                        console.error('Params:', params);
                        reject(err);
                    } else {
                        // Para simular el formato de mysql2 que devuelve [rows, fields]
                        resolve([rows, null]);
                    }
                });
            });
        },
        
        execute: (sql, params) => {
            return new Promise((resolve, reject) => {
                db.run(sql, params || [], function(err) {
                    if (err) {
                        console.error('Error en execute SQL:', err.message);
                        console.error('SQL:', sql);
                        console.error('Params:', params);
                        reject(err);
                    } else {
                        // Para simular el formato de mysql2 para INSERT/UPDATE/DELETE
                        const result = {
                            insertId: this.lastID,
                            affectedRows: this.changes
                        };
                        resolve([result, null]);
                    }
                });
            });
        },
        
        getConnection: async () => {
            return {
                execute: (sql, params) => {
                    return new Promise((resolve, reject) => {
                        db.run(sql, params || [], function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                const result = {
                                    insertId: this.lastID,
                                    affectedRows: this.changes
                                };
                                resolve([result, null]);
                            }
                        });
                    });
                },
                beginTransaction: () => Promise.resolve(),
                commit: () => Promise.resolve(),
                rollback: () => Promise.resolve(),
                release: () => {}
            };
        }
    })
};

module.exports = dbWrapper;
