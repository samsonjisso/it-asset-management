import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import profilesRoutes from "./routes/profiles.routes.js";
import ipCheckRoutes from "./routes/ip-check.routes.js";
import importRoutes from "./routes/import.routes.js";
import { registerCrudRoutes } from "./routes/register.js";
import {
  sanitizeBody,
  sanitizeQuery,
  validateGenericRequest,
} from "./middleware/common.js";

/**
 * Builds the Express app: global middleware, the auth/profiles/ip-check
 * routers, every generic CRUD table route (via registerCrudRoutes), the
 * health check, and the final 404 handler. Extracted from index.ts so the
 * process-entry concerns (env loading, db init, listen()) stay separate
 * from "what the app looks like".
 */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(sanitizeBody);
  app.use(sanitizeQuery);
  app.use(validateGenericRequest);

  app.use("/api/auth", authRoutes);
  app.use("/api/profiles", profilesRoutes);
  app.use("/api/ip", ipCheckRoutes);
  app.use("/api/import", importRoutes);

  registerCrudRoutes(app);

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // The frontend is now a separate Next.js app (see ../src/app). Next
  // proxies /api/* requests to this server via rewrites in next.config.js,
  // so this process only ever needs to serve the API.
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
