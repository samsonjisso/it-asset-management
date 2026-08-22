import { Reminder, ReminderType } from "../../../lib/supabase";

export type { Reminder, ReminderType };

export interface ReminderFormState {
  title: string;
  reminder_type: string;
  detail: string;
  remind_at: string;
  alert_email: string;
}

export const emptyForm: ReminderFormState = {
  title: "",
  reminder_type: "",
  detail: "",
  remind_at: "",
  alert_email: "",
};

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
