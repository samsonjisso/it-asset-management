import { Router } from "express";
import { requireAuth, requireRole } from "../utils/auth.js";
import {
  login,
  session,
  changePassword,
} from "../controllers/auth.controller.js";
import {
  adminCreateUser,
  forgotPassword,
  resetPassword,
} from "../controllers/authAdmin.controller.js";

const router = Router();

router.post("/login", login);
router.get("/session", requireAuth, session);
router.patch("/password", requireAuth, changePassword);
router.post(
  "/admin/create-user",
  requireAuth,
  requireRole("admin"),
  adminCreateUser,
);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
