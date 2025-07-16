require("dotenv").config();
const express = require("express");
const cors = require("cors");
const inventariosRouter = require("./routes/inventarios");
const categoriasRouter = require("./routes/categorias");
const seccionesRouter = require("./routes/secciones");
const trabajadoresRoutes = require("./routes/trabajadores");
const trabajadoresAvanzadoRoutes = require("./routes/trabajadores-avanzado");
const authRoutes = require("./routes/auth");
const estadosRouter = require('./routes/estados');
const photocopyRoutes = require('./routes/photocopies');
const authRouter = require('./routes/auth');
const gruposRouter = require('./routes/grupos');
const db = require("./db-local"); // Usar base de datos local

const app = express();
const PORT = 3300;

// Hacer la conexión de base de datos disponible para todas las rutas
app.set('db', db);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/inventarios", inventariosRouter);
app.use("/api/categorias", categoriasRouter);
app.use("/api/secciones", seccionesRouter);
app.use("/api/items", require("./routes/items"));
app.use("/api/estados", estadosRouter);
app.use("/api/departamentos", require("./routes/departamentos"));
app.use("/api/trabajadores", trabajadoresRoutes);
app.use("/api/trabajadores-avanzado", trabajadoresAvanzadoRoutes);
app.use('/api/photocopies', photocopyRoutes);
app.use("/api/auth", authRoutes);
app.use('/api', authRouter);
app.use('/api', gruposRouter);

// Inicialización del servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor ejecutándose en http://localhost:${PORT} (modo local SQLite)`);
});
