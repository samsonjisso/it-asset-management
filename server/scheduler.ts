import { db, nowIso } from './db.js';
import { sendMail } from './mailer.js';

interface Reminder {
  id: string;
  title: string;
  reminder_type: string;
  detail: string | null;
  remind_at: string;
  alert_email: string | null;
}

function buildEmail(reminder: Reminder) {
  const when = new Date(reminder.remind_at).toLocaleString();
  const subject = `Reminder: ${reminder.title}`;
  const text = [
    `This is an automated reminder from the Goh Betoch Bank IT Asset Inventory system.`,
    ``,
    `Title: ${reminder.title}`,
    `Type: ${reminder.reminder_type}`,
    `Due: ${when}`,
    reminder.detail ? `Detail: ${reminder.detail}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px;">
      <div style="background:#343494;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">Goh Betoch Bank IT Asset Inventory</h2>
        <p style="margin:4px 0 0;color:#ffc800;font-size:13px;">Reminder Alert</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
        <h3 style="margin:0 0 8px;color:#111827;">${escapeHtml(reminder.title)}</h3>
        <p style="margin:0 0 4px;color:#374151;font-size:14px;"><strong>Type:</strong> ${escapeHtml(reminder.reminder_type)}</p>
        <p style="margin:0 0 4px;color:#374151;font-size:14px;"><strong>Due:</strong> ${escapeHtml(when)}</p>
        ${reminder.detail ? `<p style="margin:12px 0 0;color:#374151;font-size:14px;">${escapeHtml(reminder.detail)}</p>` : ''}
      </div>
    </div>
  `;

  return { subject, text, html };
}

function escapeHtml(s: unknown): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function checkDueReminders() {
  try {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM reminders
         WHERE is_dismissed = 0
           AND email_sent = 0
           AND alert_email IS NOT NULL
           AND alert_email != ''
           AND remind_at <= ?`,
        [nowIso()]
      );

      const due = rows as Reminder[];

      for (const reminder of due) {
        try {
          const { subject, text, html } = buildEmail(reminder);
          const sent = await sendMail({ to: reminder.alert_email as string, subject, text, html });
          // Mark as processed either way so we don't retry forever when SMTP
          // isn't configured; is_notified also flips so the in-app banner
          // (via the "is_notified" flag) reflects it's been actioned.
          await connection.execute(
            'UPDATE reminders SET email_sent = 1, is_notified = 1, updated_at = ? WHERE id = ?',
            [nowIso(), reminder.id]
          );
          if (sent) {
            console.log(`[reminders] Sent alert email for "${reminder.title}" to ${reminder.alert_email}`);
          }
        } catch (err) {
          console.error(
            `[reminders] Failed to send alert email for "${reminder.title}":`,
            (err as Error).message
          );
          // Leave email_sent = 0 so it retries on the next check.
        }
      }
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[reminders] Error checking due reminders:', (err as Error).message);
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler() {
  const intervalMs = Number(process.env.REMINDER_CHECK_INTERVAL_MS) || 60_000; // default: every 1 minute
  checkDueReminders(); // run once at startup
  intervalHandle = setInterval(checkDueReminders, intervalMs);
  console.log(`[reminders] Email scheduler started (checking every ${Math.round(intervalMs / 1000)}s)`);
}

export function stopReminderScheduler() {
  if (intervalHandle) clearInterval(intervalHandle);
}
