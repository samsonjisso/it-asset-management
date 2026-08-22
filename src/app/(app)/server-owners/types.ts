import type { ServerOwner } from "../../../lib/supabase";

export type { ServerOwner };

export interface ServerOwnerCardProps {
  owner: ServerOwner;
  canManage: boolean;
  onEdit: (owner: ServerOwner) => void;
  onDelete: (owner: ServerOwner) => void;
}

export interface ServerOwnerModalProps {
  open: boolean;
  editing: ServerOwner | null;
  label: string;
  saving: boolean;
  onLabelChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}
