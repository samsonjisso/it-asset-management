"use client";
import { useAuth } from "@/context/AuthContext";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/FormControls";
import { Plus, Bell } from "lucide-react";
import { useReminders } from "./hooks/useReminders";
import { useReminderForm } from "./hooks/useReminderForm";
import { getReminderColumns } from "./components/ReminderColumns";
import { UpcomingBanner } from "./components/UpcomingBanner";
import { ReminderFormModal } from "./components/ReminderFormModal";

export function RemindersPage() {
  const { canWrite, hasRole } = useAuth();
  const { records, reminderTypes, loading, loadData, handleDelete, dismiss } =
    useReminders();
  const {
    modalOpen,
    editing,
    form,
    setForm,
    saving,
    openAdd,
    openEdit,
    closeModal,
    handleSave,
  } = useReminderForm({ reminderTypes, onSaved: loadData });

  const columns = getReminderColumns({
    canWrite,
    hasRole,
    onEdit: openEdit,
    onDelete: handleDelete,
    onDismiss: dismiss,
  });

  const upcoming = records.filter(
    (r) =>
      !r.is_dismissed &&
      new Date(r.remind_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Reminders & Notifications
            </h1>
            <p className="text-sm text-gray-500">
              {records.length} reminders, {upcoming.length} upcoming
            </p>
          </div>
        </div>
        {canWrite() && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Create Reminder
          </Button>
        )}
      </div>

      <UpcomingBanner upcoming={upcoming} />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKeys={["title", "reminder_type", "detail"]}
          searchPlaceholder="Search reminders..."
          dateFilterKey="remind_at"
          emptyMessage="No reminders created yet"
        />
      )}

      <ReminderFormModal
        open={modalOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        reminderTypes={reminderTypes}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  );
}
