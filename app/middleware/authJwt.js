import jwt from "jsonwebtoken";
import db from "../models/index.js";


const User = db.user;
const Role = db.role;


// Verificar Token
const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"];


  if (!token) {
    return res.status(403).send({ message: "No token provided" });
  }


  token = token.replace("Bearer ", "");


  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    req.userId = decoded.id;
    next();
  });
};


// ADMIN
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: Role
    });


    if (!user) {
      return res.status(404).send({ message: "Usuario no encontrado" });
    }


    for (let role of user.roles) {
      if (role.name === "admin") {
        return next();
      }
    }


    return res.status(403).send({ message: "Requiere ADMIN" });


  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};


// MODERATOR
const isModerator = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: Role
    });


    if (!user) {
      return res.status(404).send({ message: "Usuario no encontrado" });
    }


    for (let role of user.roles) {
      if (role.name === "moderator") {
        return next();
      }
    }


    return res.status(403).send({ message: "Requiere MODERATOR" });


  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};


export const authJwt = {
  verifyToken,
  isAdmin,
  isModerator
};
