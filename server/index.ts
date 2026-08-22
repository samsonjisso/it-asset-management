import dotenv from "dotenv";

dotenv.config();

import "./utils/db.js"; // ensures schema + seed run before routes are registered
import { createApp } from "./app.js";
import { startReminderScheduler } from "./utils/scheduler.js";

const PORT = process.env.PORT || 4000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`GBB Asset Inventory API listening on http://localhost:${PORT}`);
  startReminderScheduler();
});

// Barrel export: the original index.ts was a flat file that other modules
// could (in principle) import pieces from directly. Re-exporting the app
// factory, the CRUD router factory and the shared types here keeps that
// possible now that the implementation lives in separate files.
export { app };
export { createApp } from "./app.js";
export { createCrudRouter } from "./routes/crud.routes.js";
export * from "./types.js";
