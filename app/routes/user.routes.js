import { allAccess, userBoard, adminBoard } from "../controllers/user.controller.js";
import { authJwt } from "../middleware/authJwt.js";


export default function(app) {


  app.get("/api/test/all", allAccess);


  app.get(
    "/api/test/user",
    authJwt.verifyToken,
    userBoard
  );


  app.get(
    "/api/test/mod",
    authJwt.verifyToken,
    authJwt.isModerator,
    (req, res) => {
      res.send("Contenido MODERATOR");
    }
  );


  app.get(
    "/api/test/admin",
    authJwt.verifyToken,
    authJwt.isAdmin,
    adminBoard
  );
}
