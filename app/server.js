import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./models/index.js";
import helmet from "helmet";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet());
// Sincronización
await db.sequelize.sync({
  alter: true
});

// Inicializar roles
const count = await db.role.count();

if (count === 0) {

  await db.role.bulkCreate([
    { id: 1, name: "user" },
    { id: 2, name: "moderator" },
    { id: 3, name: "admin" }
  ]);

  console.log("Roles creados");
}

// Rutas
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

authRoutes(app);
userRoutes(app);

// Middleware global de errores
app.use(errorHandler);

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV}`);

});