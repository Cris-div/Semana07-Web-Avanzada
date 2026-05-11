import db from "../models/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const User = db.user;
const Role = db.role;

/**
 * Utilidad: respuestas de error consistentes
 */
const errorResponse = (res, status, message, details = null) => {
  return res.status(status).json({
    success: false,
    message,
    ...(details && { details })
  });
};

/**
 * Utilidad: validación básica de email
 */
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * 🔹 SIGNUP (Registro)
 */
export const signup = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const { username, email, password, roles } = req.body || {};

    // Validaciones
    if (!username || !email || !password) {
      await t.rollback();

      return errorResponse(
        res,
        400,
        "Faltan campos requeridos: username, email, password"
      );
    }

    if (username.length < 3) {
      await t.rollback();

      return errorResponse(
        res,
        400,
        "El username debe tener al menos 3 caracteres"
      );
    }

    if (!isValidEmail(email)) {
      await t.rollback();

      return errorResponse(
        res,
        400,
        "Email inválido"
      );
    }

    if (password.length < 6) {
      await t.rollback();

      return errorResponse(
        res,
        400,
        "El password debe tener al menos 6 caracteres"
      );
    }

    // Verificar duplicados
    const exists = await User.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { username },
          { email }
        ]
      },
      transaction: t
    });

    if (exists) {
      await t.rollback();

      return errorResponse(
        res,
        400,
        "Username o email ya están en uso"
      );
    }

    // Verificar roles
    const rolesCount = await Role.count({
      transaction: t
    });

    if (rolesCount === 0) {
      await t.rollback();

      return errorResponse(
        res,
        500,
        "No existen roles en la base de datos"
      );
    }

    // Crear usuario
    const user = await User.create(
      {
        username,
        email,
        password: bcrypt.hashSync(password, 10)
      },
      { transaction: t }
    );

    // Resolver roles
    let rolesToAssign = [];

    if (Array.isArray(roles) && roles.length > 0) {

      const foundRoles = await Role.findAll({
        where: {
          name: roles
        },
        transaction: t
      });

      if (foundRoles.length !== roles.length) {
        await t.rollback();

        return errorResponse(
          res,
          400,
          "Uno o más roles no existen"
        );
      }

      rolesToAssign = foundRoles;

    } else {

      const defaultRole = await Role.findOne({
        where: {
          name: "user"
        },
        transaction: t
      });

      if (!defaultRole) {
        await t.rollback();

        return errorResponse(
          res,
          500,
          "No existe el rol por defecto 'user'"
        );
      }

      rolesToAssign = [defaultRole];
    }

    // Asignar roles
    await user.setRoles(
      rolesToAssign,
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: rolesToAssign.map(r => r.name)
      }
    });

  } catch (error) {

    await t.rollback();

    if (error.name === "SequelizeUniqueConstraintError") {
      return errorResponse(
        res,
        400,
        "Username o email ya están en uso"
      );
    }

    return errorResponse(
      res,
      500,
      "Error al registrar usuario",
      error.message
    );
  }
};

/**
 * 🔹 SIGNIN (Login)
 */
export const signin = async (req, res) => {

  try {

    const { email, password } = req.body || {};

    if (!email || !password) {
      return errorResponse(
        res,
        400,
        "Email y password son requeridos"
      );
    }

    // Buscar usuario
    const user = await User.findOne({
      where: { email },
      include: {
        model: Role,
        through: { attributes: [] }
      }
    });

    if (!user) {
      return errorResponse(
        res,
        404,
        "Usuario no encontrado"
      );
    }

    // Validar password
    const validPassword = bcrypt.compareSync(
      password,
      user.password
    );

    if (!validPassword) {
      return errorResponse(
        res,
        401,
        "Password incorrecto"
      );
    }

    // ACCESS TOKEN
    const accessToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      {
        expiresIn: "15s"
      }
    );

    // REFRESH TOKEN
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "7d"
      }
    );

    // Eliminar refresh token anterior
    await db.refreshToken.destroy({
      where: {
        userId: user.id
      }
    });

    // Guardar refresh token en BD
    await db.refreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiryDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      )
    });

    // Roles
    const authorities = user.roles?.map(
      r => r.name
    ) || [];

    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: authorities,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {

    return errorResponse(
      res,
      500,
      "Error en login",
      error.message
    );
  }
};

/**
 * 🔹 REFRESH TOKEN
 */
export const refreshToken = async (req, res) => {

  try {

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(
        res,
        403,
        "Refresh token requerido"
      );
    }

    // Buscar token en BD
    const tokenDoc = await db.refreshToken.findOne({
      where: {
        token: refreshToken
      }
    });

    if (!tokenDoc) {
      return errorResponse(
        res,
        403,
        "Refresh token inválido"
      );
    }

    // Verificar token
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      (err, decoded) => {

        if (err) {
          return errorResponse(
            res,
            401,
            "Refresh token expirado"
          );
        }

        // Nuevo access token
        const newAccessToken = jwt.sign(
          { id: decoded.id },
          process.env.JWT_SECRET,
          {
            expiresIn: "1m"
          }
        );

        return res.status(200).json({
          success: true,
          accessToken: newAccessToken
        });

      }
    );

  } catch (error) {

    return errorResponse(
      res,
      500,
      "Error al renovar token",
      error.message
    );
  }
};

/**
 * 🔹 LOGOUT
 */
export const logout = async (req, res) => {

  try {

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(
        res,
        400,
        "Refresh token requerido"
      );
    }

    await db.refreshToken.destroy({
      where: {
        token: refreshToken
      }
    });

    return res.status(200).json({
      success: true,
      message: "Logout exitoso"
    });

  } catch (error) {

    return errorResponse(
      res,
      500,
      "Error en logout",
      error.message
    );
  }
};