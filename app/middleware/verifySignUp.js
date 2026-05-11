import db from "../models/index.js";


export const checkDuplicateUsernameOrEmail = async (req, res, next) => {
  try {
    // Validar username
    const userByUsername = await db.user.findOne({
      where: { username: req.body.username }
    });


    if (userByUsername) {
      return res.status(400).send({ message: "El username ya está en uso" });
    }


    // Validar email
    const userByEmail = await db.user.findOne({
      where: { email: req.body.email }
    });


    if (userByEmail) {
      return res.status(400).send({ message: "El email ya está en uso" });
    }


    next();
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};
