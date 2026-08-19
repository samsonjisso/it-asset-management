import { ReactNode } from 'react';
import { Modal } from './Modal';
import { Pencil } from 'lucide-react';
import { Button } from './FormControls';

export interface DetailField {
  label: string;
  value: ReactNode;
  mono?: boolean;
  full?: boolean; // span both columns (e.g. Notes)
}

export interface DetailSection {
  title?: string;
  fields: DetailField[];
}

interface DetailsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  sections: DetailSection[];
  onEdit?: () => void;
  editLabel?: string;
}

function isEmpty(value: ReactNode) {
  return value === null || value === undefined || value === '';
}

export function DetailsModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  sections,
  onEdit,
  editLabel = 'Edit Record',
}: DetailsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} size="lg">
      <div className="space-y-6">
        {icon && (
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft -mt-1 mb-1">
            {icon}
          </div>
        )}
        {sections.map((section, i) => (
          <div key={i} className="space-y-3">
            {section.title && (
              <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-600 border-b border-gray-100 pb-1.5">
                {section.title}
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {section.fields.map((f, j) => (
                <div key={j} className={f.full ? 'sm:col-span-2' : ''}>
                  <p className="text-xs font-medium text-gray-400 mb-0.5">{f.label}</p>
                  <p className={`text-sm text-gray-800 break-words ${f.mono ? 'font-mono' : ''}`}>
                    {isEmpty(f.value) ? <span className="text-gray-300 italic">Not set</span> : f.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          {onEdit && (
            <Button type="button" variant="primary" onClick={onEdit}>
              <Pencil size={16} /> {editLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
