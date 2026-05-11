import { signup, signin, refreshToken,logout } from "../controllers/auth.controller.js";
import { checkDuplicateUsernameOrEmail } from "../middleware/verifySignUp.js";


export default function(app) {
  app.post("/api/auth/signup", checkDuplicateUsernameOrEmail, signup);
  app.post("/api/auth/signin", signin);
  app.post("/api/auth/refresh", refreshToken);
   app.post("/api/auth/logout",logout);
}
