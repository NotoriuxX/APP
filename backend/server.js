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
const permisosRouter = require('./routes/permisos');
const rolesRouter = require('./routes/roles');
const db = require("./db");

const app = express();
const PORT = 3300;

// Hacer la conexión de base de datos disponible para todas las rutas
app.set('db', db);

// Middlewares
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware para manejar UTF-8 correctamente
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configurar charset UTF-8 para todas las respuestas
app.use((req, res, next) => {
    res.charset = 'utf-8';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Rutas
app.use('/api/estados', estadosRouter);
app.use("/api/inventarios", inventariosRouter);
app.use("/api/categorias", categoriasRouter);
app.use("/api/secciones", seccionesRouter);
app.use("/api/trabajadores", trabajadoresRoutes);
app.use("/api/trabajadores-avanzado", trabajadoresAvanzadoRoutes);
app.use('/api/photocopies', photocopyRoutes);
app.use("/api/auth", authRoutes);
app.use('/api', authRouter);
app.use('/api', gruposRouter);
app.use('/api/permisos', permisosRouter);
app.use('/api/roles', rolesRouter);

// Inicialización del servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
});
