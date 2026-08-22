"use client";
import { useEffect, useState } from "react";
import { Layers, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/FormControls";
import { useServerEnvironments } from "./hooks/useServerEnvironments";
import { ServerEnvironmentCard } from "./components/ServerEnvironmentCard";
import { ServerEnvironmentModal } from "./components/ServerEnvironmentModal";
import { ServerEnvironment } from "./types";

export function ServerEnvironmentsPage() {
  const { hasRole, canWrite } = useAuth();
  const canManage = hasRole("admin");

  const { types, loading, loadData, saveEnvironment, deleteEnvironment } =
    useServerEnvironments();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServerEnvironment | null>(null);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (t: ServerEnvironment) => {
    setEditing(t);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">
              Server Environment Management
            </h1>
            <p className="text-sm text-gray-500">
              {types.length} environment{types.length === 1 ? "" : "s"}{" "}
              available on the Server Registration form
            </p>
          </div>
        </div>
        {canWrite() && (
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} /> Add Server Environment
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 text-center text-gray-500">
          No environments yet. Add one to make it available on the Server
          Registration form.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => (
            <ServerEnvironmentCard
              key={t.id}
              environment={t}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={deleteEnvironment}
            />
          ))}
        </div>
      )}

      <ServerEnvironmentModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSave={saveEnvironment}
      />
    </div>
  );
}
