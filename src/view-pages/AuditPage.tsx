"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";
import { Button } from "../components/FormControls";

interface AuditRecord {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  record_label: string | null;
  before_data: unknown;
  after_data: unknown;
  actor_name: string;
  created_at: string;
}

interface AuditResponse {
  data: AuditRecord[];
  page: number;
  limit: number;
  total: number;
}

const ACTIONS = ["", "create", "update", "delete", "backup_restore"];

function formatSnapshot(value: unknown) {
  if (value === null || value === undefined) return "No snapshot";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function AuditPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("");
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search.trim()) params.set("search", search.trim());
    if (actor.trim()) params.set("actor", actor.trim());
    if (table) params.set("table", table);
    if (action) params.set("action", action);
    const result = await api.get<AuditResponse>(`/audit?${params}`);
    if (result.error) toast(result.error.message, "error");
    else if (result.data) {
      setRecords(result.data.data);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [action, actor, page, search, table, toast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
          <ClipboardList size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} recorded system event{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-gray-900 border border-brand-600 rounded-xl p-4">
        <label className="relative md:col-span-2">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={search}
            onChange={(event) => updateFilter(setSearch, event.target.value)}
            placeholder="Search record or table"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm"
          />
        </label>
        <input
          value={actor}
          onChange={(event) => updateFilter(setActor, event.target.value)}
          placeholder="Actor"
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
        <select
          value={action}
          onChange={(event) => updateFilter(setAction, event.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          {ACTIONS.map((value) => (
            <option key={value} value={value}>
              {value ? value.replace("_", " ") : "All actions"}
            </option>
          ))}
        </select>
        <input
          value={table}
          onChange={(event) => updateFilter(setTable, event.target.value)}
          placeholder="Table name"
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-brand-600 rounded-xl">
        <table className="w-full text-left">
          <thead className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Snapshots</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Loading audit events...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No audit events found.</td></tr>
            ) : records.map((record) => (
              <tr key={record.id} className="align-top">
                <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(record.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><span className="text-xs font-medium rounded-full border px-2 py-1">{record.action.replace("_", " ")}</span></td>
                <td className="px-4 py-3"><div className="text-sm font-medium">{record.record_label || "Database"}</div><div className="text-xs text-gray-500">{record.table_name}</div></td>
                <td className="px-4 py-3 text-sm">{record.actor_name}</td>
                <td className="px-4 py-3 space-y-2 min-w-[260px]">
                  <details><summary className="cursor-pointer text-xs text-brand-600">Before</summary><pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 dark:bg-gray-800 p-2 text-[11px]">{formatSnapshot(record.before_data)}</pre></details>
                  <details><summary className="cursor-pointer text-xs text-brand-600">After</summary><pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 dark:bg-gray-800 p-2 text-[11px]">{formatSnapshot(record.after_data)}</pre></details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Page {page} of {pageCount}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={15} /> Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight size={15} /></Button>
        </div>
      </div>
    </div>
  );
}