"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, Profile, UserRole } from "../lib/supabase";
import { transferOwnership } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Modal } from "../components/Modal";
import {
  Field,
  TextInput,
  SelectInput,
  Button,
} from "../components/FormControls";
import { isValidEmail, isValidPhone } from "../lib/validation";
import { MODULE_LABELS, modulesForRole } from "../lib/permissions";
import {
  Plus,
  Pencil,
  Users,
  UserCheck,
  UserX,
  Mail,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Crown,
} from "lucide-react";

const roleOptions: { value: UserRole; label: string; hint: string }[] = [
  { value: "admin", label: "Admin", hint: "Full system access and management" },
  {
    value: "editor",
    label: "Editor",
    hint: "Can add and modify asset information",
  },
  { value: "reader", label: "Reader", hint: "View-only access" },
  {
    value: "audit",
    label: "Audit",
    hint: "Can view everything but cannot edit or delete",
  },
];

const roleColors: Record<string, string> = {
  admin: "text-red-700 bg-red-50 border-red-200",
  editor:
    "text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 border-brand-200",
  reader:
    "text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700",
  audit: "text-purple-700 bg-purple-50 border-purple-200",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  reader: "Reader",
  audit: "Audit",
};

// Per-User Module Access checklist: shown on Create/Edit User whenever
// the "Restrict to specific modules" toggle is on. Only offers modules
// the selected role could ever see anyway (e.g. no point showing a
// "Departments" checkbox for a Reader — that page is admin-only
// regardless of module access), grouped the same way the sidebar
// groups them.
function ModuleAccessChecklist({
  role,
  selected,
  onToggle,
}: {
  role: UserRole;
  selected: string[];
  onToggle: (moduleId: string) => void;
}) {
  const available = modulesForRole(role);
  const mainModules = available.filter((m) => m.group === "main");
  const adminModules = available.filter((m) => m.group === "admin");

  const renderGroup = (label: string, mods: typeof available) =>
    mods.length > 0 && (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
          {label}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {mods.map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-brand-600 rounded-lg px-2.5 py-1.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(m.id)}
                onChange={() => onToggle(m.id)}
                className="shrink-0"
              />
              <span className="truncate">{m.label}</span>
            </label>
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
      {renderGroup("Main Modules", mainModules)}
      {renderGroup("Admin Customization", adminModules)}
      {available.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No restrictable modules for this role.
        </p>
      )}
    </div>
  );
}

export function UserManagementPage() {
  const { profile, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [resettingUser, setResettingUser] = useState<Profile | null>(null);
  const [transferTarget, setTransferTarget] = useState<Profile | null>(null);
  const [transferPassword, setTransferPassword] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "reader" as UserRole,
    phone: "",
    must_change_password: true,
    restrictAccess: false,
    permissions: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    role: "reader" as UserRole,
    phone: "",
    is_active: true,
    must_change_password: false,
    restrictAccess: false,
    permissions: [] as string[],
  });
  const [resetForm, setResetForm] = useState({
    password: "",
    force_change: true,
  });

  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dropping the role to one that can't see a previously-ticked module
  // (e.g. switching from Admin to Reader while "Departments" was
  // checked) silently drops that module from the selection, so the
  // checklist never holds a stale checkbox the new role could never
  // reach anyway.
  const toggleNewUserModule = (moduleId: string) => {
    setNewUser((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(moduleId)
        ? prev.permissions.filter((m) => m !== moduleId)
        : [...prev.permissions, moduleId],
    }));
  };
  const toggleEditModule = (moduleId: string) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(moduleId)
        ? prev.permissions.filter((m) => m !== moduleId)
        : [...prev.permissions, moduleId],
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast("All fields are required", "error");
      return;
    }
    if (!isValidEmail(newUser.email)) {
      toast("Please enter a valid email address", "error");
      return;
    }
    if (newUser.phone.trim() && !isValidPhone(newUser.phone)) {
      toast("Please enter a valid phone number", "error");
      return;
    }
    if (newUser.restrictAccess && newUser.permissions.length === 0) {
      toast(
        "Tick at least one module, or turn off access restriction",
        "error",
      );
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.auth.admin.createUser({
      email: newUser.email,
      password: newUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: newUser.full_name,
        role: newUser.role,
        phone: newUser.phone,
        must_change_password: newUser.must_change_password,
        permissions: newUser.restrictAccess ? newUser.permissions : null,
      },
    });
    setSaving(false);
    if (error || !data.user) {
      toast(error?.message ?? "Could not create user", "error");
      return;
    }
    toast("User created successfully", "success");
    setModalOpen(false);
    setNewUser({
      email: "",
      full_name: "",
      password: "",
      role: "reader",
      phone: "",
      must_change_password: true,
      restrictAccess: false,
      permissions: [],
    });
    loadData();
  };

  const openEdit = (user: Profile) => {
    setEditingUser(user);
    const perms = user.permissions ?? null;
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone ?? "",
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      restrictAccess: !!(perms && perms.length > 0),
      permissions: perms ?? [],
    });
    setEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editForm.full_name.trim()) {
      toast("Full Name is required", "error");
      return;
    }
    if (!isValidEmail(editForm.email)) {
      toast("Please enter a valid email address", "error");
      return;
    }
    if (editForm.phone.trim() && !isValidPhone(editForm.phone)) {
      toast("Please enter a valid phone number", "error");
      return;
    }
    if (editForm.restrictAccess && editForm.permissions.length === 0) {
      toast(
        "Tick at least one module, or turn off access restriction",
        "error",
      );
      return;
    }
    setSaving(true);
    const isSelf = editingUser.id === profile?.id;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.full_name,
        email: editForm.email.trim(),
        role: editForm.role,
        phone: editForm.phone || null,
        is_active: editForm.is_active,
        must_change_password: editForm.must_change_password,
        // Module access can't be changed for your own account (the
        // checklist is hidden in that case) — omit the field entirely
        // rather than resending the unchanged value, since the server
        // rejects any update to a self-account that even touches it.
        ...(isSelf
          ? {}
          : {
              permissions: editForm.restrictAccess
                ? editForm.permissions
                : null,
            }),
      })
      .eq("id", editingUser.id);
    setSaving(false);
    // The server enforces email uniqueness (409 "A user with this email
    // already exists" — see server/routes/profiles.js) regardless of
    // which role either account has, so this surfaces that message
    // as-is rather than a generic failure.
    if (error) toast(error.message, "error");
    else {
      toast("User updated", "success");
      setEditModalOpen(false);
      loadData();
    }
  };

  const toggleActive = async (user: Profile) => {
    await supabase
      .from("profiles")
      .update({ is_active: !user.is_active })
      .eq("id", user.id);
    loadData();
  };

  // Server-side already blocks deleting your own account and requires
  // the admin role (see server/routes/profiles.js), so this is guarded
  // the same way toggleActive/openEdit are — hidden for the caller's
  // own card — plus a confirmation prompt since it's irreversible.
  const handleDeleteUser = async (user: Profile) => {
    if (
      !confirm(
        `Delete user "${user.full_name}" (${user.email})? This cannot be undone.`,
      )
    )
      return;
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);
    if (error) toast(error.message, "error");
    else {
      toast("User deleted", "success");
      loadData();
    }
  };

  const openReset = (user: Profile) => {
    setResettingUser(user);
    setResetForm({ password: "", force_change: true });
    setResetModalOpen(true);
  };

  const openTransfer = (user: Profile) => {
    setTransferTarget(user);
    setTransferPassword("");
    setTransferModalOpen(true);
  };

  // Transfer Ownership: only the current owner ever sees this control
  // (see the `profile?.is_owner` check on the button below), and the
  // server independently re-checks that plus the submitted password
  // before moving is_owner - see POST /profiles/:id/transfer-ownership.
  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget) return;
    setTransferring(true);
    const { error } = await transferOwnership(
      transferTarget.id,
      transferPassword,
    );
    setTransferring(false);
    if (error) toast(error.message, "error");
    else {
      toast(`Ownership transferred to ${transferTarget.full_name}`, "success");
      setTransferModalOpen(false);
      loadData();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setSaving(true);
    const { error } = await supabase.auth.admin.resetUserPassword(
      resettingUser.id,
      resetForm.password,
      resetForm.force_change,
    );
    setSaving(false);
    if (error) toast(error.message, "error");
    else {
      toast(`Password reset for ${resettingUser.full_name}`, "success");
      setResetModalOpen(false);
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              User Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {users.length} users registered
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} /> Create User
          </Button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-700 flex items-center gap-2">
          <ShieldAlert size={16} /> You have read-only (Audit) access to user
          accounts. Only Admins can create, edit, or reset users.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className={`bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-4 gbb-card-hover ${!user.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center font-semibold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Mail size={11} />
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.id === profile?.id && (
                  <span className="text-xs text-gold-400 font-medium">You</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between flex-wrap gap-1.5">
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-medium ${roleColors[user.role]}`}
                >
                  {roleLabels[user.role]}
                </span>
                <span
                  className={`text-xs ${user.is_active ? "text-green-600" : "text-gray-400 dark:text-gray-500"}`}
                >
                  {user.is_active ? "Active" : "Disabled"}
                </span>
              </div>
              {user.is_owner && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  <Crown size={12} /> Owner — cannot be deleted, demoted, or
                  disabled by other admins
                </div>
              )}
              {user.must_change_password && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  <KeyRound size={12} /> Must change password at next login
                </div>
              )}
              {user.permissions && user.permissions.length > 0 && (
                <div className="mt-2 text-[11px] text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-1.5 font-medium mb-1">
                    <ShieldCheck size={12} /> Restricted access
                  </div>
                  <p className="text-teal-600 leading-snug">
                    {user.permissions
                      .map((m) => MODULE_LABELS[m] ?? m)
                      .join(", ")}
                  </p>
                </div>
              )}
              {isAdmin && (
                <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(user)}
                    className="flex-1"
                  >
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openReset(user)}
                    className="flex-1"
                  >
                    <KeyRound size={14} /> Reset Password
                  </Button>
                  {/* Transfer Ownership: only the current owner sees this, and
                      only on other active admins' cards - matches what the
                      server will actually accept (see POST
                      /profiles/:id/transfer-ownership). */}
                  {profile?.is_owner &&
                    user.id !== profile?.id &&
                    user.role === "admin" &&
                    user.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTransfer(user)}
                        className="flex-1"
                      >
                        <Crown size={14} /> Make Owner
                      </Button>
                    )}
                  {user.id !== profile?.id && !user.is_owner && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(user)}
                        className="flex-1"
                      >
                        {user.is_active ? (
                          <>
                            <UserX size={14} /> Disable
                          </>
                        ) : (
                          <>
                            <UserCheck size={14} /> Enable
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        className="flex-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} /> Delete
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create user modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New User"
        size="md"
      >
        <form noValidate onSubmit={handleCreateUser} className="space-y-4">
          <Field label="Full Name" required>
            <TextInput
              value={newUser.full_name}
              onChange={(e) =>
                setNewUser({ ...newUser, full_name: e.target.value })
              }
              placeholder="Full name"
              required
            />
          </Field>
          <Field label="Email Address" required>
            <TextInput
              type="email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
              placeholder="user@gohbetochbank.com"
              required
            />
          </Field>
          <Field
            label="Temporary Password"
            required
            hint="At least 8 characters, with upper/lowercase, a number, and a symbol. The user will be asked to set their own password if 'force change' is checked below."
          >
            <TextInput
              type="password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              placeholder="Temporary password"
              required
              minLength={8}
            />
          </Field>
          <Field label="Role" required>
            <SelectInput
              value={newUser.role}
              onChange={(e) => {
                const role = e.target.value as UserRole;
                const allowedIds = modulesForRole(role).map((m) => m.id);
                setNewUser({
                  ...newUser,
                  role,
                  permissions: newUser.permissions.filter((m) =>
                    allowedIds.includes(m),
                  ),
                });
              }}
              required
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.hint}
                </option>
              ))}
            </SelectInput>
          </Field>
          <label className="flex items-start gap-2.5 bg-teal-50 border border-teal-200 rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={newUser.restrictAccess}
              onChange={(e) =>
                setNewUser({
                  ...newUser,
                  restrictAccess: e.target.checked,
                  permissions: e.target.checked ? newUser.permissions : [],
                })
              }
              className="mt-0.5"
            />
            <span className="text-xs text-teal-700">
              Restrict this user to specific modules only (e.g. tick just "IP
              Management" so that's all they can see).
            </span>
          </label>
          {newUser.restrictAccess && (
            <ModuleAccessChecklist
              role={newUser.role}
              selected={newUser.permissions}
              onToggle={toggleNewUserModule}
            />
          )}
          <Field label="Phone (optional)">
            <TextInput
              value={newUser.phone}
              onChange={(e) =>
                setNewUser({ ...newUser, phone: e.target.value })
              }
              placeholder="Phone number"
            />
          </Field>
          <label className="flex items-start gap-2.5 bg-brand-50 dark:bg-brand-900/40 border border-brand-200 rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={newUser.must_change_password}
              onChange={(e) =>
                setNewUser({
                  ...newUser,
                  must_change_password: e.target.checked,
                })
              }
              className="mt-0.5"
            />
            <span className="text-xs text-brand-700 dark:text-brand-300">
              Force this user to change their password the first time they log
              in (recommended for new accounts).
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit user modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User"
        size="md"
      >
        <form noValidate onSubmit={handleEditUser} className="space-y-4">
          <Field label="Full Name" required>
            <TextInput
              value={editForm.full_name}
              onChange={(e) =>
                setEditForm({ ...editForm, full_name: e.target.value })
              }
              required
            />
          </Field>
          <Field
            label="Email Address"
            required
            hint="Changing this updates the address the user logs in with."
          >
            <TextInput
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm({ ...editForm, email: e.target.value })
              }
              placeholder="user@gohbetochbank.com"
              required
            />
          </Field>
          <Field label="Role" required>
            <SelectInput
              value={editForm.role}
              onChange={(e) => {
                const role = e.target.value as UserRole;
                const allowedIds = modulesForRole(role).map((m) => m.id);
                setEditForm({
                  ...editForm,
                  role,
                  permissions: editForm.permissions.filter((m) =>
                    allowedIds.includes(m),
                  ),
                });
              }}
              required
              disabled={
                editingUser?.id === profile?.id || editingUser?.is_owner
              }
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.hint}
                </option>
              ))}
            </SelectInput>
            {editingUser?.id === profile?.id && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                You cannot change your own role.
              </p>
            )}
            {editingUser?.is_owner && editingUser?.id !== profile?.id && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                The owner's role cannot be changed.
              </p>
            )}
          </Field>
          {editingUser?.id === profile?.id || editingUser?.is_owner ? (
            editForm.restrictAccess && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {editingUser?.id === profile?.id
                  ? "You cannot change your own module access — ask another admin if this needs updating."
                  : "The owner's module access cannot be restricted."}
              </p>
            )
          ) : (
            <>
              <label className="flex items-start gap-2.5 bg-teal-50 border border-teal-200 rounded-lg p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.restrictAccess}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      restrictAccess: e.target.checked,
                      permissions: e.target.checked ? editForm.permissions : [],
                    })
                  }
                  className="mt-0.5"
                />
                <span className="text-xs text-teal-700">
                  Restrict this user to specific modules only (e.g. tick just
                  "IP Management" so that's all they can see).
                </span>
              </label>
              {editForm.restrictAccess && (
                <ModuleAccessChecklist
                  role={editForm.role}
                  selected={editForm.permissions}
                  onToggle={toggleEditModule}
                />
              )}
            </>
          )}
          <Field label="Phone">
            <TextInput
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: e.target.value })
              }
              placeholder="Phone number"
            />
          </Field>
          <label className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={editForm.must_change_password}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  must_change_password: e.target.checked,
                })
              }
              className="mt-0.5"
            />
            <span className="text-xs text-amber-700">
              Require this user to set a new password the next time they log in.
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Reset Password${resettingUser ? ` — ${resettingUser.full_name}` : ""}`}
        size="sm"
      >
        <form noValidate onSubmit={handleResetPassword} className="space-y-4">
          <Field
            label="New Temporary Password"
            required
            hint="At least 8 characters, with upper/lowercase, a number, and a symbol. Can't be the same as their current password. Share this with the user securely."
          >
            <TextInput
              type="password"
              value={resetForm.password}
              onChange={(e) =>
                setResetForm({ ...resetForm, password: e.target.value })
              }
              placeholder="New temporary password"
              required
              minLength={8}
              autoFocus
            />
          </Field>
          <label className="flex items-start gap-2.5 bg-brand-50 dark:bg-brand-900/40 border border-brand-200 rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={resetForm.force_change}
              onChange={(e) =>
                setResetForm({ ...resetForm, force_change: e.target.checked })
              }
              className="mt-0.5"
            />
            <span className="text-xs text-brand-700 dark:text-brand-300">
              Force the user to set their own new password the next time they
              log in (recommended).
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title={`Transfer Ownership${transferTarget ? ` — ${transferTarget.full_name}` : ""}`}
        size="sm"
      >
        <form
          noValidate
          onSubmit={handleTransferOwnership}
          className="space-y-4"
        >
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
            <Crown size={16} className="shrink-0 mt-0.5" />
            <span>
              {transferTarget?.full_name} will become the sole owner — protected
              from deletion, demotion, and being disabled by any other admin.
              You will lose that protection and become a regular admin. This
              cannot be undone by yourself; only the new owner could transfer it
              back.
            </span>
          </div>
          <Field
            label="Confirm Your Password"
            required
            hint="Re-enter your password to confirm this change."
          >
            <TextInput
              type="password"
              value={transferPassword}
              onChange={(e) => setTransferPassword(e.target.value)}
              placeholder="Your current password"
              required
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTransferModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={transferring || !transferPassword}
            >
              {transferring ? "Transferring..." : "Transfer Ownership"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
