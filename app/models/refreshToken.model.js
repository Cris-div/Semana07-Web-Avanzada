export default (sequelize, Sequelize) => {
  const RefreshToken = sequelize.define("refreshToken", {
    token: {
      type: Sequelize.STRING
    },
    expiryDate: {
      type: Sequelize.DATE
    }
  });

  return RefreshToken;
};