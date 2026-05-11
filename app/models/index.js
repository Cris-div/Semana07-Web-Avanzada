import dbConfig from "../config/db.config.js";
import Sequelize from "sequelize";

import userModel from "./user.model.js";
import roleModel from "./role.model.js";
import refreshTokenModel from "./refreshToken.model.js";


const sequelize = new Sequelize(
  dbConfig.DB,
  dbConfig.USER,
  dbConfig.PASSWORD,
  {
    host: dbConfig.HOST,
    dialect: dbConfig.dialect
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;


// MODELOS
db.user = userModel(sequelize, Sequelize);
db.role = roleModel(sequelize, Sequelize);
db.refreshToken = refreshTokenModel(sequelize, Sequelize);


// RELACIÓN USER - ROLE
db.role.belongsToMany(db.user, {
  through: "user_roles"
});

db.user.belongsToMany(db.role, {
  through: "user_roles"
});


// RELACIÓN USER - REFRESH TOKEN
db.refreshToken.belongsTo(db.user, {
  foreignKey: "userId",
  targetKey: "id"
});

db.user.hasOne(db.refreshToken, {
  foreignKey: "userId",
  targetKey: "id"
});


export default db;