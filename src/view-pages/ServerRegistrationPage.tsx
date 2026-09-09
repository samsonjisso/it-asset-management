"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  supabase,
  Server,
  ServerOwner,
  ServerType,
  ServerEnvironment,
  IPSubnet,
  OSRelease,
  HostLocation,
  Vendor,
  IPAddress,
  DirectoryUser,
} from "../lib/supabase";
import { matchSubnet } from "../lib/subnet";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { DataTable, Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { DetailsModal, DetailSection } from "../components/DetailsModal";
import {
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Button,
} from "../components/FormControls";
import { SearchableSelect } from "../components/SearchableSelect";
import { SearchableCombobox } from "../components/SearchableCombobox";
import { isValidIPv4, isValidPort, IPV4_PATTERN } from "../lib/validation";
import { ImageInput } from "../components/ImageInput";
import { ZoomImage } from "../components/ZoomImage";
import { fetchProfileDirectory } from "../lib/api";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Server as ServerIcon,
  Download,
  Upload,
} from "lucide-react";
import { ImportModal, ImportColumn } from "../components/ImportModal";

const emptyForm = {
  server_type: "",
  hostname: "",
  ip_address: "",
  ssh_port: "22",
  environment: "",
  server_owner: "",
  vendor: "",
  ram: "",
  cpu: "",
  storage: "",
  os_release: "",
  host_location: "",
  image: null as string | null,
  notes: "",
};

export function ServerRegistrationPage({
  autoOpenCreate,
}: { autoOpenCreate?: number } = {}) {
  const { canWrite, profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<Server[]>([]);
  const [serverOwners, setServerOwners] = useState<ServerOwner[]>([]);
  const [serverTypes, setServerTypes] = useState<ServerType[]>([]);
  const [environments, setEnvironments] = useState<ServerEnvironment[]>([]);
  const [osReleases, setOsReleases] = useState<OSRelease[]>([]);
  const [hostLocations, setHostLocations] = useState<HostLocation[]>([]);
  const [subnets, setSubnets] = useState<IPSubnet[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([]);
  const [employees, setEmployees] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [viewing, setViewing] = useState<Server | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      serversRes,
      ownersRes,
      typesRes,
      envRes,
      subnetsRes,
      osReleasesRes,
      hostLocationsRes,
      vendorsRes,
      ipRes,
      employeesRes,
    ] = await Promise.all([
      supabase
        .from("servers")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("server_owners").select("*").order("label"),
      supabase.from("server_types").select("*").order("label"),
      supabase.from("server_environments").select("*").order("label"),
      supabase.from("ip_subnets").select("*").order("prefix"),
      supabase.from("os_releases").select("*").order("label"),
      supabase.from("host_locations").select("*").order("label"),
      supabase.from("vendors").select("*").order("label"),
      // IP Management records — the Server IP Address field checks
      // here first: a match can be picked straight from the list,
      // and an address not found there can still be entered manually.
      supabase
        .from("ip_addresses")
        .select("*")
        .order("ip_address", { ascending: true }),
      // Resolves registered_by to a name for "Registered By" in the
      // detail view — see GET /profiles/directory.
      fetchProfileDirectory(),
    ]);
    if (serversRes.data) setRecords(serversRes.data as Server[]);
    if (ownersRes.data) setServerOwners(ownersRes.data as ServerOwner[]);
    if (typesRes.data) setServerTypes(typesRes.data as ServerType[]);
    if (envRes.data) setEnvironments(envRes.data as ServerEnvironment[]);
    if (subnetsRes.data) setSubnets(subnetsRes.data as IPSubnet[]);
    if (osReleasesRes.data) setOsReleases(osReleasesRes.data as OSRelease[]);
    if (hostLocationsRes.data)
      setHostLocations(hostLocationsRes.data as HostLocation[]);
    if (vendorsRes.data) setVendors(vendorsRes.data as Vendor[]);
    if (ipRes.data) setIpAddresses(ipRes.data as IPAddress[]);
    if (employeesRes.data) setEmployees(employeesRes.data as DirectoryUser[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      server_owner: serverOwners[0]?.code ?? "",
      server_type: serverTypes[0]?.code ?? "",
      environment: environments[0]?.code ?? "",
      os_release: osReleases[0]?.code ?? "",
      host_location: hostLocations[0]?.code ?? "",
    });
    setModalOpen(true);
  };

  const lastAutoOpen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      autoOpenCreate !== undefined &&
      autoOpenCreate !== lastAutoOpen.current
    ) {
      lastAutoOpen.current = autoOpenCreate;
      if (canWrite()) openAdd();
    }
  }, [autoOpenCreate]);

  const openView = (rec: Server) => setViewing(rec);

  const openEdit = (rec: Server) => {
    setEditing(rec);
    setForm({
      server_type: rec.server_type,
      hostname: rec.hostname,
      ip_address: rec.ip_address ?? "",
      ssh_port: rec.ssh_port.toString(),
      environment: rec.environment,
      server_owner: rec.server_owner,
      vendor: rec.vendor ?? "",
      ram: rec.ram ?? "",
      cpu: rec.cpu ?? "",
      storage: rec.storage ?? "",
      os_release: rec.os_release ?? "",
      host_location: rec.host_location ?? "",
      image: rec.image ?? null,
      notes: rec.notes ?? "",
    });
    setModalOpen(true);
  };

  const detectedSubnet = matchSubnet(form.ip_address, subnets);

  // IP Management lookup: as the user types/selects a Server IP
  // Address, check whether it matches an address already registered
  // in IP Management (offered below via a SearchableCombobox so it can be
  // picked directly) and surface that record's hostname/status. An
  // address with no match is left as-is — manual entry of a new,
  // not-yet-registered address is still allowed.
  const ipAddressOptions = useMemo(
    () => [...new Set(ipAddresses.map((ip) => ip.ip_address))].sort(),
    [ipAddresses],
  );
  const matchedIp = useMemo(
    () =>
      ipAddresses.find((ip) => ip.ip_address === form.ip_address.trim()) ??
      null,
    [ipAddresses, form.ip_address],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hostname) {
      toast("Server hostname is required", "error");
      return;
    }
    if (!form.server_owner) {
      toast(
        "Server Owner is required. Ask an admin to add one under Server Owner Management.",
        "error",
      );
      return;
    }
    if (!form.server_type) {
      toast(
        "Server Type is required. Add one under Customization > Server Types.",
        "error",
      );
      return;
    }
    if (!form.environment) {
      toast(
        "Server Environment is required. Add one under Customization > Server Environments.",
        "error",
      );
      return;
    }
    if (form.ip_address.trim() && !isValidIPv4(form.ip_address)) {
      toast(
        "Server IP Address must be a valid IPv4 address (e.g., 10.6.13.45)",
        "error",
      );
      return;
    }
    if (form.ssh_port.trim() && !isValidPort(form.ssh_port)) {
      toast("SSH Port Number must be a number between 1 and 65535", "error");
      return;
    }
    if (!form.ip_address.trim()) {
      toast("Server IP Address is required", "error");
      return;
    }
    if (!form.ssh_port.trim()) {
      toast("SSH Port Number is required", "error");
      return;
    }
    if (!form.ram.trim()) {
      toast("Resource RAM is required", "error");
      return;
    }
    if (!form.cpu.trim()) {
      toast("Resource CPU is required", "error");
      return;
    }
    if (!form.storage.trim()) {
      toast("Resource Storage is required", "error");
      return;
    }
    if (!form.os_release) {
      toast(
        "OS Release is required. Add one under Customization > OS Releases.",
        "error",
      );
      return;
    }
    if (!form.host_location) {
      toast(
        "Host Location is required. Add one under Customization > Host Locations.",
        "error",
      );
      return;
    }
    setSaving(true);
    const payload = {
      server_type: form.server_type,
      hostname: form.hostname,
      ip_address: form.ip_address || null,
      ssh_port: parseInt(form.ssh_port) || 22,
      environment: form.environment,
      server_owner: form.server_owner,
      network_subnet: detectedSubnet?.label ?? null,
      vendor: form.vendor || null,
      image: form.image,
      ram: form.ram || null,
      cpu: form.cpu || null,
      storage: form.storage || null,
      os_release: form.os_release || null,
      host_location: form.host_location || null,
      notes: form.notes || null,
      registered_by: profile?.id,
    };
    const { error } = editing
      ? await supabase.from("servers").update(payload).eq("id", editing.id)
      : await supabase.from("servers").insert(payload);
    setSaving(false);
    if (error) toast(error.message, "error");
    else {
      toast(editing ? "Server updated" : "Server registered", "success");
      setModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (rec: Server) => {
    if (!confirm(`Delete server "${rec.hostname}"?`)) return;
    const { error } = await supabase.from("servers").delete().eq("id", rec.id);
    if (error) toast(error.message, "error");
    else {
      toast("Server deleted", "success");
      loadData();
    }
  };

  const exportCSV = () => {
    const headers = [
      "Asset ID",
      "Server Type",
      "Hostname",
      "IP Address",
      "Network Subnet",
      "SSH Port",
      "Environment",
      "Owner",
      "Vendor",
      "RAM",
      "CPU",
      "Storage",
      "OS Release",
      "Host Location",
      "Created At",
    ];
    const rows = records.map((r) => [
      r.asset_id ?? "",
      serverTypes.find((t) => t.code === r.server_type)?.label ??
        r.server_type_other ??
        r.server_type,
      r.hostname,
      r.ip_address ?? "",
      r.network_subnet ?? "",
      r.ssh_port,
      environments.find((e) => e.code === r.environment)?.label ??
        r.environment,
      serverOwners.find((o) => o.code === r.server_owner)?.label ??
        r.server_owner,
      r.vendor ?? "",
      r.ram ?? "",
      r.cpu ?? "",
      r.storage ?? "",
      osReleases.find((rel) => rel.code === r.os_release)?.label ??
        r.os_release ??
        "",
      hostLocations.find((l) => l.code === r.host_location)?.label ??
        r.host_location ??
        "",
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk import from Excel/CSV — see ImportModal.
  const [importOpen, setImportOpen] = useState(false);
  const findByLabel = <T,>(
    list: T[],
    getLabel: (t: T) => string,
    needle: string,
  ) =>
    list.find(
      (x) => getLabel(x).trim().toLowerCase() === needle.trim().toLowerCase(),
    );

  const importColumns: ImportColumn[] = [
    {
      key: "server_type",
      label: "Server Type",
      required: true,
      example: serverTypes[0]?.label,
    },
    {
      key: "hostname",
      label: "Hostname",
      required: true,
      example: "SRV-HQ-001",
    },
    {
      key: "ip_address",
      label: "IP Address",
      required: true,
      example: "10.6.13.45",
    },
    { key: "ssh_port", label: "SSH Port", example: "22" },
    {
      key: "environment",
      label: "Environment",
      required: true,
      example: environments[0]?.label,
    },
    {
      key: "owner",
      label: "Owner",
      required: true,
      example: serverOwners[0]?.label,
    },
    { key: "vendor", label: "Vendor" },
    { key: "ram", label: "RAM", required: true, example: "32GB" },
    {
      key: "cpu",
      label: "CPU",
      required: true,
      example: "Intel Xeon Silver 4210",
    },
    { key: "storage", label: "Storage", required: true, example: "2TB SSD" },
    {
      key: "os_release",
      label: "OS Release",
      required: true,
      example: osReleases[0]?.label,
    },
    {
      key: "host_location",
      label: "Host Location",
      required: true,
      example: hostLocations[0]?.label,
    },
    { key: "notes", label: "Notes" },
  ];

  const validateImportRow = (raw: Record<string, string>) => {
    const preview = { ...raw };
    const errors: string[] = [];

    let serverTypeCode: string | null = null;
    if (!raw.server_type) errors.push("Server Type is required");
    else {
      const t = findByLabel(serverTypes, (x) => x.label, raw.server_type);
      if (!t) errors.push(`Server Type "${raw.server_type}" not found`);
      else serverTypeCode = t.code;
    }
    if (!raw.hostname) errors.push("Hostname is required");
    if (!raw.ip_address) errors.push("IP Address is required");
    else if (!isValidIPv4(raw.ip_address))
      errors.push("IP Address must be a valid IPv4 address");
    const sshPort = raw.ssh_port?.trim() || "22";
    if (!isValidPort(sshPort))
      errors.push("SSH Port must be a number between 1 and 65535");

    let environmentCode: string | null = null;
    if (!raw.environment) errors.push("Environment is required");
    else {
      const e = findByLabel(environments, (x) => x.label, raw.environment);
      if (!e) errors.push(`Environment "${raw.environment}" not found`);
      else environmentCode = e.code;
    }
    let ownerCode: string | null = null;
    if (!raw.owner) errors.push("Owner is required");
    else {
      const o = findByLabel(serverOwners, (x) => x.label, raw.owner);
      if (!o) errors.push(`Owner "${raw.owner}" not found`);
      else ownerCode = o.code;
    }
    let vendorLabel: string | null = null;
    if (raw.vendor) {
      const v = findByLabel(vendors, (x) => x.label, raw.vendor);
      if (!v) errors.push(`Vendor "${raw.vendor}" not found`);
      else vendorLabel = v.label;
    }
    if (!raw.ram) errors.push("RAM is required");
    if (!raw.cpu) errors.push("CPU is required");
    if (!raw.storage) errors.push("Storage is required");
    let osReleaseCode: string | null = null;
    if (!raw.os_release) errors.push("OS Release is required");
    else {
      const os = findByLabel(osReleases, (x) => x.label, raw.os_release);
      if (!os) errors.push(`OS Release "${raw.os_release}" not found`);
      else osReleaseCode = os.code;
    }
    let hostLocationCode: string | null = null;
    if (!raw.host_location) errors.push("Host Location is required");
    else {
      const hl = findByLabel(hostLocations, (x) => x.label, raw.host_location);
      if (!hl) errors.push(`Host Location "${raw.host_location}" not found`);
      else hostLocationCode = hl.code;
    }

    if (errors.length) return { preview, error: errors.join("; ") };

    const detected = matchSubnet(raw.ip_address?.trim() ?? "", subnets);
    const values = {
      server_type: serverTypeCode,
      hostname: raw.hostname,
      ip_address: raw.ip_address || null,
      ssh_port: parseInt(sshPort) || 22,
      environment: environmentCode,
      server_owner: ownerCode,
      network_subnet: detected?.label ?? null,
      vendor: vendorLabel,
      image: null,
      ram: raw.ram || null,
      cpu: raw.cpu || null,
      storage: raw.storage || null,
      os_release: osReleaseCode,
      host_location: hostLocationCode,
      notes: raw.notes || null,
      registered_by: profile?.id,
    };
    return { preview, values };
  };

  const importServerRow = async (values: Record<string, unknown>) => {
    const { error } = await supabase.from("servers").insert(values);
    return error?.message ?? null;
  };

  const envColors: Record<string, string> = {
    production: "text-red-700 bg-red-50 border-red-200",
    test: "text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 border-brand-200",
    standby:
      "text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700",
  };
  const defaultEnvColor =
    "text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 border-brand-200";

  // Comprehensive search text: raw fields plus resolved labels for the
  // type/environment/owner/OS/host-location codes stored on the row.
  const serverSearchValue = (r: Server) => {
    const type = serverTypes.find((t) => t.code === r.server_type);
    const env = environments.find((e) => e.code === r.environment);
    const owner = serverOwners.find((o) => o.code === r.server_owner);
    const os = osReleases.find((o) => o.code === r.os_release);
    const host = hostLocations.find((h) => h.code === r.host_location);
    return [
      r.asset_id,
      r.hostname,
      type?.label,
      r.server_type,
      r.server_type_other,
      env?.label,
      r.environment,
      owner?.label,
      r.server_owner,
      r.vendor,
      r.ip_address,
      r.network_subnet,
      r.ssh_port,
      r.ram,
      r.cpu,
      r.storage,
      os?.label,
      r.os_release,
      host?.label,
      r.host_location,
      r.notes,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const columns: Column<Server>[] = [
    {
      key: "asset_id",
      label: "Key",
      sortable: true,
      sortValue: (r) => r.asset_id ?? "",
      render: (r) =>
        r.asset_id ? (
          <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">
            {r.asset_id}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 italic">-</span>
        ),
    },
    {
      key: "hostname",
      label: "Name",
      sortable: true,
      sortValue: (r) => r.hostname,
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.image ? (
            <img
              src={r.image}
              alt=""
              className="w-6 h-6 rounded object-cover shrink-0"
            />
          ) : (
            <ServerIcon size={16} className="text-brand-600" />
          )}
          <span className="font-medium">{r.hostname}</span>
        </div>
      ),
    },
    {
      key: "server_type",
      label: "Type",
      sortable: true,
      sortValue: (r) => r.server_type,
      render: (r) =>
        serverTypes.find((t) => t.code === r.server_type)?.label ??
        r.server_type_other ??
        r.server_type,
    },
    {
      key: "environment",
      label: "Environment",
      render: (r) => (
        <span
          className={`text-xs px-2 py-1 rounded-full border font-medium ${envColors[r.environment] ?? defaultEnvColor}`}
        >
          {environments.find((e) => e.code === r.environment)?.label ??
            r.environment}
        </span>
      ),
    },
    {
      key: "server_owner",
      label: "Owner",
      render: (r) =>
        serverOwners.find((o) => o.code === r.server_owner)?.label ??
        r.server_owner,
    },
    {
      key: "vendor",
      label: "Vendor",
      render: (r) =>
        r.vendor ?? <span className="text-gray-300 dark:text-gray-600">-</span>,
    },
    {
      key: "network_subnet",
      label: "Subnet",
      render: (r) =>
        r.network_subnet ?? (
          <span className="text-gray-300 dark:text-gray-600">-</span>
        ),
    },
    {
      key: "created_at",
      label: "Registered",
      sortable: true,
      sortValue: (r) => r.created_at,
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openView(r)}
            className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {canWrite() && (
            <button
              onClick={() => openEdit(r)}
              className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
          )}
          {canWrite() && (
            <button
              onClick={() => handleDelete(r)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const viewSections: DetailSection[] = viewing
    ? [
        {
          title: "Server Information",
          fields: [
            { label: "Asset ID", value: viewing.asset_id, mono: true },
            { label: "Hostname", value: viewing.hostname },
            {
              label: "Server Type",
              value:
                serverTypes.find((t) => t.code === viewing.server_type)
                  ?.label ??
                viewing.server_type_other ??
                viewing.server_type,
            },
            {
              label: "Environment",
              value:
                environments.find((e) => e.code === viewing.environment)
                  ?.label ?? viewing.environment,
            },
            {
              label: "Server Owner",
              value:
                serverOwners.find((o) => o.code === viewing.server_owner)
                  ?.label ?? viewing.server_owner,
            },
            { label: "Vendor", value: viewing.vendor },
            {
              label: "Photo",
              value: viewing.image ? (
                <ZoomImage src={viewing.image} size={220} />
              ) : null,
              full: true,
            },
          ],
        },
        {
          title: "Network",
          fields: [
            { label: "IP Address", value: viewing.ip_address, mono: true },
            { label: "Network Subnet", value: viewing.network_subnet },
            { label: "SSH Port", value: viewing.ssh_port },
          ],
        },
        {
          title: "Resources",
          fields: [
            { label: "RAM", value: viewing.ram },
            { label: "CPU", value: viewing.cpu },
            { label: "Storage", value: viewing.storage },
            {
              label: "OS Release",
              value:
                osReleases.find((r) => r.code === viewing.os_release)?.label ??
                viewing.os_release,
            },
            {
              label: "Host Location",
              value:
                hostLocations.find((l) => l.code === viewing.host_location)
                  ?.label ?? viewing.host_location,
            },
          ],
        },
        {
          title: "Other",
          fields: [
            { label: "Notes", value: viewing.notes, full: true },
            {
              label: "Registered",
              value: new Date(viewing.created_at).toLocaleString(),
            },
            {
              label: "Registered By",
              value: viewing.registered_by
                ? (employees.find((u) => u.id === viewing!.registered_by)
                    ?.full_name ?? "Unknown user")
                : null,
            },
            {
              label: "Last Updated",
              value: new Date(viewing.updated_at).toLocaleString(),
            },
          ],
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft">
            <ServerIcon size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-600">Servers</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {records.length} registered servers
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </Button>
          {canWrite() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload size={16} /> Import
            </Button>
          )}
          {canWrite() && (
            <Button variant="primary" size="sm" onClick={openAdd}>
              <Plus size={16} /> Register Server
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchValue={serverSearchValue}
          searchPlaceholder="Search by asset ID, hostname, type, environment, owner, IP, OS..."
          dateFilterKey="created_at"
          emptyMessage="No servers registered yet"
          onRowClick={openView}
        />
      )}

      <DetailsModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.hostname ?? ""}
        subtitle={viewing?.asset_id ?? undefined}
        icon={<ServerIcon size={22} />}
        sections={viewSections}
        onEdit={
          viewing && canWrite()
            ? () => {
                const rec = viewing;
                setViewing(null);
                openEdit(rec);
              }
            : undefined
        }
        editLabel="Edit Server"
        onDelete={
          viewing && canWrite()
            ? () => {
                const rec = viewing;
                setViewing(null);
                handleDelete(rec);
              }
            : undefined
        }
        deleteLabel="Delete Server"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Server" : "Register New Server"}
        size="lg"
      >
        <form noValidate onSubmit={handleSave} className="space-y-4">
          {editing?.asset_id && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-brand-600 rounded-xl px-4 py-2.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Asset ID
              </span>
              <span className="font-mono text-sm font-semibold text-brand-700 dark:text-brand-300">
                {editing.asset_id}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Server Type"
              required
              hint={
                serverTypes.length === 0
                  ? "No server types configured yet — add one under Customization > Server Types."
                  : undefined
              }
            >
              <SearchableSelect
                options={serverTypes.map((t) => ({
                  value: t.code,
                  label: t.label,
                }))}
                value={form.server_type}
                onChange={(val) => setForm({ ...form, server_type: val })}
                placeholder="Select server type"
                searchPlaceholder="Search server types…"
                emptyMessage={
                  serverTypes.length === 0
                    ? "No server types configured."
                    : "No matching types."
                }
                required
              />
            </Field>
            <Field label="Server Name / Hostname" required>
              <TextInput
                value={form.hostname}
                onChange={(e) => setForm({ ...form, hostname: e.target.value })}
                placeholder="e.g., PROD-APP-01"
                required
              />
            </Field>
            <Field
              label="Server IP Address"
              required
              hint={
                form.ip_address
                  ? matchedIp
                    ? `Registered in IP Management — ${[matchedIp.hostname, matchedIp.status].filter(Boolean).join(" · ")}`
                    : (detectedSubnet
                        ? `Detected subnet: ${detectedSubnet.label}`
                        : "No matching subnet — add one under Customization > IP Subnets") +
                      ". Not found in IP Management — this will be entered as a new address."
                  : ipAddressOptions.length > 0
                    ? "Start typing to select a registered IP, or enter a new one"
                    : "e.g., 10.6.13.45"
              }
            >
              <SearchableCombobox
                options={ipAddressOptions.map((ip) => ({ value: ip }))}
                value={form.ip_address}
                onChange={(val) => setForm({ ...form, ip_address: val })}
                placeholder="10.6.x.x"
                pattern={IPV4_PATTERN}
                title="Enter a valid IPv4 address, e.g. 10.6.13.45"
                emptyMessage="No matching registered IP — this will be entered as a new address."
                required
              />
            </Field>
            <Field label="SSH Port Number" required>
              <NumberInput
                value={form.ssh_port}
                onChange={(e) => setForm({ ...form, ssh_port: e.target.value })}
                placeholder="22"
                min={1}
                max={65535}
                required
              />
            </Field>
            <Field
              label="Server Environment"
              required
              hint={
                environments.length === 0
                  ? "No environments configured yet — add one under Customization > Server Environments."
                  : undefined
              }
            >
              <SearchableSelect
                options={environments.map((env) => ({
                  value: env.code,
                  label: env.label,
                }))}
                value={form.environment}
                onChange={(val) => setForm({ ...form, environment: val })}
                placeholder="Select server environment"
                searchPlaceholder="Search environments…"
                emptyMessage={
                  environments.length === 0
                    ? "No environments configured."
                    : "No matching environments."
                }
                required
              />
            </Field>
            <Field
              label="Server Owner"
              required
              hint={
                serverOwners.length === 0
                  ? "No owners configured yet — an admin can add one under Server Owner Management."
                  : undefined
              }
            >
              <SearchableSelect
                options={serverOwners.map((o) => ({
                  value: o.code,
                  label: o.label,
                }))}
                value={form.server_owner}
                onChange={(val) => setForm({ ...form, server_owner: val })}
                placeholder="Select server owner"
                searchPlaceholder="Search owners…"
                emptyMessage={
                  serverOwners.length === 0
                    ? "No server owners configured."
                    : "No matching owners."
                }
                required
              />
            </Field>
            <Field
              label="Vendor"
              hint={
                vendors.length === 0
                  ? "No vendors configured yet — add one under Customization > Vendors."
                  : undefined
              }
            >
              <SearchableSelect
                options={vendors.map((v) => ({
                  value: v.label,
                  label: v.label,
                }))}
                value={form.vendor}
                onChange={(val) => setForm({ ...form, vendor: val })}
                placeholder="No vendor"
                searchPlaceholder="Search vendors…"
                emptyMessage={
                  vendors.length === 0
                    ? "No vendors configured."
                    : "No matching vendors."
                }
              />
            </Field>
            <Field label="Resource RAM" required>
              <TextInput
                value={form.ram}
                onChange={(e) => setForm({ ...form, ram: e.target.value })}
                placeholder="e.g., 32GB"
                required
              />
            </Field>
            <Field label="Resource CPU" required>
              <TextInput
                value={form.cpu}
                onChange={(e) => setForm({ ...form, cpu: e.target.value })}
                placeholder="e.g., 8 cores"
                required
              />
            </Field>
            <Field label="Resource Storage" required>
              <TextInput
                value={form.storage}
                onChange={(e) => setForm({ ...form, storage: e.target.value })}
                placeholder="e.g., 1TB"
                required
              />
            </Field>
            <Field
              label="OS Release"
              required
              hint={
                osReleases.length === 0
                  ? "No OS releases configured yet — add one under Customization > OS Releases."
                  : undefined
              }
            >
              <SearchableSelect
                options={osReleases.map((r) => ({
                  value: r.code,
                  label: r.label,
                }))}
                value={form.os_release}
                onChange={(val) => setForm({ ...form, os_release: val })}
                placeholder="Select OS release"
                searchPlaceholder="Search OS releases…"
                emptyMessage={
                  osReleases.length === 0
                    ? "No OS releases configured."
                    : "No matching releases."
                }
                required
              />
            </Field>
            <Field
              label="Host Location"
              required
              hint={
                hostLocations.length === 0
                  ? "No host locations configured yet — add one under Customization > Host Locations."
                  : undefined
              }
            >
              <SearchableSelect
                options={hostLocations.map((l) => ({
                  value: l.code,
                  label: l.label,
                }))}
                value={form.host_location}
                onChange={(val) => setForm({ ...form, host_location: val })}
                placeholder="Select host location"
                searchPlaceholder="Search host locations…"
                emptyMessage={
                  hostLocations.length === 0
                    ? "No host locations configured."
                    : "No matching locations."
                }
                required
              />
            </Field>
          </div>
          <ImageInput
            value={form.image}
            onChange={(dataUrl) => setForm({ ...form, image: dataUrl })}
            label="Server Photo"
            hint="Optional — helps identify this server visually"
            variant="large"
          />
          <Field label="Notes">
            <TextArea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes..."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving
                ? "Saving..."
                : editing
                  ? "Update Server"
                  : "Register Server"}
            </Button>
          </div>
        </form>
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Servers from Excel / CSV"
        subtitle="Bring in servers that are already deployed but not yet registered"
        columns={importColumns}
        templateFilename="server_registration_import_template"
        validateRow={validateImportRow}
        importRow={importServerRow}
        onImported={loadData}
      />
    </div>
  );
}
