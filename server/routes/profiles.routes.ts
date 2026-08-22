import { Router } from "express";
import { requireAuth, requireRole } from "../utils/auth.js";
import {
  listProfiles,
  getProfile,
  updateProfile,
  deleteProfile,
} from "../controllers/profiles.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", listProfiles);
router.get("/:id", getProfile);
router.patch("/:id", updateProfile);
router.delete("/:id", requireRole("admin"), deleteProfile);

export default router;
