"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase, Reminder } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Field, TextInput, SelectInput, TextArea, Button } from '../components/FormControls';
import { Plus, Pencil, Trash2, Bell, Calendar, Clock, AlertCircle, CheckCircle, Mail, MailCheck } from 'lucide-react';

const reminderTypes = [
  'Preventive Maintenance',
  'License Renewal',
  'Warranty Expiry',
  'Contract Renewal',
  'System Update',
  'Security Audit',
  'Backup Verification',
  'Hardware Check',
  'Other',
];

const emptyForm = {
  title: '',
  reminder_type: 'Preventive Maintenance',
  detail: '',
  remind_at: '',
  alert_email: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RemindersPage() {
  const { canWrite, hasRole, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('reminders').select('*').order('remind_at', { ascending: true });
    if (data) setRecords(data as Reminder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (rec: Reminder) => {
    setEditing(rec);
    setForm({
      title: rec.title,
      reminder_type: rec.reminder_type,
      detail: rec.detail ?? '',
      remind_at: rec.remind_at.slice(0, 16),
      alert_email: rec.alert_email ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.remind_at) {
      toast('Title and reminder date are required', 'error');
      return;
    }
    if (form.alert_email && !emailPattern.test(form.alert_email)) {
      toast('Please enter a valid alert email address', 'error');
      return;
    }
    setSaving(true);
    const newRemindAt = new Date(form.remind_at).toISOString();
    const payload: Record<string, unknown> = {
      title: form.title,
      reminder_type: form.reminder_type,
      detail: form.detail || null,
      remind_at: newRemindAt,
      alert_email: form.alert_email || null,
      created_by: profile?.id,
    };
    // If the due date, or the alert email itself, changed on an
    // already-processed reminder, allow the email alert to fire again.
    if (editing && (editing.remind_at !== newRemindAt || (editing.alert_email ?? '') !== form.alert_email)) {
      payload.email_sent = false;
      payload.is_notified = false;
    }
    const { error } = editing
      ? await supabase.from('reminders').update(payload).eq('id', editing.id)
      : await supabase.from('reminders').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast(editing ? 'Reminder updated' : 'Reminder created', 'success');
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: Reminder) => {
    if (!confirm(`Delete reminder "${rec.title}"?`)) return;
    const { error } = await supabase.from('reminders').delete().eq('id', rec.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Reminder deleted', 'success');
      loadData();
    }
  };

  const dismiss = async (rec: Reminder) => {
    await supabase.from('reminders').update({ is_dismissed: true }).eq('id', rec.id);
    loadData();
  };

  const getStatus = (rec: Reminder) => {
    if (rec.is_dismissed) return { label: 'Dismissed', color: 'text-gray-500 bg-gray-100', icon: <CheckCircle size={12} /> };
    const days = Math.ceil((new Date(rec.remind_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'Overdue', color: 'text-red-700 bg-red-50 border border-red-200', icon: <AlertCircle size={12} /> };
    if (days <= 7) return { label: `Due in ${days}d`, color: 'text-amber-700 bg-amber-50 border border-amber-200', icon: <Clock size={12} /> };
    return { label: 'Upcoming', color: 'text-green-700 bg-green-50 border border-green-200', icon: <Calendar size={12} /> };
  };

  const columns: Column<Reminder>[] = [
    { key: 'title', label: 'Title', sortable: true, sortValue: (r) => r.title, render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'reminder_type', label: 'Type', sortable: true, sortValue: (r) => r.reminder_type, render: (r) => <span className="text-xs px-2 py-1 rounded-full bg-[#343494]/10 text-[#343494] font-medium">{r.reminder_type}</span> },
    { key: 'detail', label: 'Detail', render: (r) => r.detail ? <span className="text-sm text-gray-600 line-clamp-2">{r.detail}</span> : '-' },
    { key: 'remind_at', label: 'Remind Date', sortable: true, sortValue: (r) => r.remind_at, render: (r) => (
      <div className="flex flex-col gap-1">
        <span className="text-sm">{new Date(r.remind_at).toLocaleDateString()}</span>
        <span className="text-xs text-gray-500">{new Date(r.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    )},
    { key: 'status', label: 'Status', render: (r) => {
      const status = getStatus(r);
      return <span className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${status.color}`}>{status.icon}{status.label}</span>;
    }},
    { key: 'alert_email', label: 'Email Alert', render: (r) => {
      if (!r.alert_email) return <span className="text-gray-400 text-xs">Not set</span>;
      return r.email_sent ? (
        <span className="text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200" title={r.alert_email}>
          <MailCheck size={12} /> Sent
        </span>
      ) : (
        <span className="text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200" title={r.alert_email}>
          <Mail size={12} /> Pending
        </span>
      );
    }},
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => canWrite() ? (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {!r.is_dismissed && <button onClick={() => dismiss(r)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Dismiss"><CheckCircle size={16} /></button>}
          <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16} /></button>
          {hasRole('admin', 'manager') && <button onClick={() => handleDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
        </div>
      ) : <span className="text-gray-400 text-xs">Read only</span>,
    },
  ];

  const upcoming = records.filter((r) => !r.is_dismissed && new Date(r.remind_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><Bell size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-[#343494]">Reminders & Notifications</h1>
            <p className="text-sm text-gray-500">{records.length} reminders, {upcoming.length} upcoming</p>
          </div>
        </div>
        {canWrite() && <Button variant="primary" size="sm" onClick={openAdd}><Plus size={16} /> Create Reminder</Button>}
      </div>

      {/* Upcoming reminders banner */}
      {upcoming.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 rounded-xl p-4 gbb-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Upcoming Reminders (within 1 week)</h3>
          </div>
          <div className="space-y-2">
            {upcoming.slice(0, 3).map((r) => {
              const days = Math.ceil((new Date(r.remind_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={r.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.title}</p>
                    <p className="text-xs text-gray-600">{r.reminder_type} - {new Date(r.remind_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 0 ? 'text-red-600 bg-red-50' : 'text-amber-700 bg-amber-50'}`}>
                    {days <= 0 ? 'Due now!' : `${days}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[#343494]/30 border-t-[#343494] rounded-full animate-spin" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={['title', 'reminder_type', 'detail']}
          searchPlaceholder="Search reminders..."
          dateFilterKey="remind_at"
          emptyMessage="No reminders created yet"
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Reminder' : 'Create New Reminder'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Reminder Name / Title" required>
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Quarterly Server Maintenance" required />
          </Field>
          <Field label="Reminder Type" required>
            <SelectInput value={form.reminder_type} onChange={(e) => setForm({ ...form, reminder_type: e.target.value })}>
              {reminderTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </Field>
          <Field label="Remind Date & Time" required>
            <TextInput type="datetime-local" value={form.remind_at} onChange={(e) => setForm({ ...form, remind_at: e.target.value })} required />
          </Field>
          <Field label="Detail">
            <TextArea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={3} placeholder="Write details about this reminder..." />
          </Field>
          <Field label="Alert Email (optional)">
            <TextInput
              type="email"
              value={form.alert_email}
              onChange={(e) => setForm({ ...form, alert_email: e.target.value })}
              placeholder="e.g., it-alerts@gohbetochbank.com"
            />
          </Field>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            The system will notify you in a popup one week before the reminder date and when the date arrives.
            {form.alert_email
              ? ' An automated email will also be sent to the address above once the reminder date/time is reached.'
              : ' Add an alert email above to also receive an automated email when the reminder is due.'}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Submit'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
