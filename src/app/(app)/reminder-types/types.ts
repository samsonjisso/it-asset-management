import type { ReminderType } from "../../../lib/supabase";

export type { ReminderType };

export interface ReminderTypeCardProps {
  type: ReminderType;
  canManage: boolean;
  onEdit: (t: ReminderType) => void;
  onDelete: (t: ReminderType) => void;
}

export interface ReminderTypeModalProps {
  open: boolean;
  editing: ReminderType | null;
  label: string;
  saving: boolean;
  onLabelChange: (value: string) => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}
