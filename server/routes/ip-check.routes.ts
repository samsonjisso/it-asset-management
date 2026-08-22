import { Router, type Request, type Response } from "express";
import { requireAuth } from "../utils/auth.js";
import { IPV4_RE, ping } from "../utils/ping.js";

const router = Router();
router.use(requireAuth);

router.get("/check-availability", async (req: Request, res: Response) => {
  const ip = typeof req.query.ip === "string" ? req.query.ip.trim() : "";
  if (!IPV4_RE.test(ip)) {
    return res
      .status(400)
      .json({ error: "Enter a valid IPv4 address, e.g. 10.6.1.50" });
  }

  const responded = await ping(ip);
  if (responded) {
    res.json({ available: false, message: "The IP is already assigned." });
  } else {
    res.json({ available: true, message: "The IP is available." });
  }
});

export default router;
