import { z } from "zod";

export const pingSchema = z.object({
  ip: z.string().trim().min(1, "IP address is required"),
});
