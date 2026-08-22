import nodemailer, { type Transporter } from "nodemailer";
import type { SendMailInput } from "../types.js";

let transporter: Transporter | null = null;
let configWarningShown = false;

function isConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS,
  );
}

function getTransporter(): Transporter | null {
  if (!isConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/25
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Sends an email. Returns true if sent, false if SMTP isn't configured
 * (in which case the reminder is logged instead of failing outright).
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
}: SendMailInput): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    if (!configWarningShown) {
      console.warn(
        "[mailer] SMTP is not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS). " +
          "Reminder emails will be logged instead of sent. See server/.env.example.",
      );
      configWarningShown = true;
    }
    console.log(`[mailer] Would send email to ${to}: ${subject}`);
    return false;
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return true;
}

export function mailerConfigured(): boolean {
  return isConfigured();
}
