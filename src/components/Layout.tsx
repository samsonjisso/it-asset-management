"use client";

import { useState, useEffect, useMemo, useRef, ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { GBBLogo } from "./GBBLogo";
import { ThemeToggle } from "./ThemeToggle";
import { useToast } from "./Toast";
import { api, markAllNotificationsRead } from "../lib/api";
import {
  supabase,
  Reminder,
  AdminNotification,
  PCRegistration,
  Device,
  Server as ServerRecord,
  License,
  IPAddress,
} from "../lib/supabase";
import {
  LayoutDashboard,
  Monitor,
  KeyRound,
  HardDrive,
  Server,
  Bell,
  FileBarChart,
  Users,
  Info,
  DatabaseBackup,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Building2,
  Calendar,
  Network,
  Tags,
  Briefcase,
  BellRing,
  Search,
  HelpCircle,
  Plus,
  Settings,
  Layers,
  Boxes,
  Building,
  Router,
  ServerCog,
  Layers3,
  Tag,
  Truck,
  CheckCheck,
  Pencil,
  Trash2,
} from "lucide-react";
import { UserRole } from "../lib/supabase";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  roles: UserRole[];
}

const ALL_ROLES: UserRole[] = ["admin", "editor", "reader", "audit"];

// Admin Change Notifications: maps a notification's table_name (see
// server/crud.js recordNotification) to the nav/page id that record
// lives on, so clicking a notification can take the admin straight to
// it — mirrors TABLE_MODULE_MAP in server/crud.js.
const NOTIFICATION_TABLE_PAGE: Record<string, string> = {
  pc_registrations: "pc",
  ip_addresses: "ip",
  licenses: "licenses",
  devices: "devices",
  servers: "servers",
  reminders: "reminders",
  profiles: "users",
  departments: "departments",
  license_types: "license_types",
  license_subtypes: "license_types",
  device_types: "device_types",
  pc_form_fields: "pc_fields",
  device_owners: "device_owners",
  server_owners: "server_owners",
  server_types: "server_types",
  server_environments: "server_environments",
  os_releases: "os_releases",
  host_locations: "host_locations",
  floors: "floors",
  access_switches: "access_switches",
  access_switch_ips: "access_switch_ips",
  patch_levels: "patch_levels",
  ip_subnets: "ip_subnets",
  asset_models: "asset_models",
  vendors: "vendors",
  reminder_types: "reminder_types",
};

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={19} />,
    roles: ALL_ROLES,
  },
  { id: "pc", label: "PCs", icon: <Monitor size={19} />, roles: ALL_ROLES },
  {
    id: "ip",
    label: "IP Management",
    icon: <Network size={19} />,
    roles: ALL_ROLES,
  },
  {
    id: "licenses",
    label: "Licenses",
    icon: <KeyRound size={19} />,
    roles: ALL_ROLES,
  },
  {
    id: "devices",
    label: "Devices",
    icon: <HardDrive size={19} />,
    roles: ALL_ROLES,
  },
  {
    id: "servers",
    label: "Servers",
    icon: <Server size={19} />,
    roles: ALL_ROLES,
  },
  {
    id: "reminders",
    label: "Reminders",
    icon: <Bell size={19} />,
    roles: ALL_ROLES,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <BellRing size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: <FileBarChart size={19} />,
    roles: ALL_ROLES,
  },
  {
    id: "users",
    label: "User Management",
    icon: <Users size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "backup",
    label: "Backup & Restore",
    icon: <DatabaseBackup size={19} />,
    roles: ["admin", "audit"],
  },
  { id: "about", label: "About", icon: <Info size={19} />, roles: ALL_ROLES },
];

// Shown in their own "Customization" group at the bottom of the
// sidebar. Admins can manage everything here; audit accounts can view
// every screen too (the Audit role must be able to view all system
// features, including Customization - each of these pages already
// hides its own Add/Edit/Delete controls behind an admin-only check,
// so granting audit the nav item only ever grants read access).
const customizationItems: NavItem[] = [
  {
    id: "departments",
    label: "Departments",
    icon: <Building2 size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "license_types",
    label: "License Types",
    icon: <Tags size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "server_owners",
    label: "Server Owners",
    icon: <Briefcase size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "device_owners",
    label: "Device Owners",
    icon: <Briefcase size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "server_types",
    label: "Server Types",
    icon: <Server size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "server_environments",
    label: "Server Environments",
    icon: <Layers size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "os_releases",
    label: "OS Releases",
    icon: <ServerCog size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "host_locations",
    label: "Host Locations",
    icon: <Layers3 size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "floors",
    label: "Floors",
    icon: <Building size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "access_switches",
    label: "Access Switches",
    icon: <Network size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "access_switch_ips",
    label: "Access Switch IPs",
    icon: <Router size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "patch_levels",
    label: "Patch / Level Numbers",
    icon: <Tag size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "device_types",
    label: "Device Types",
    icon: <HardDrive size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "reminder_types",
    label: "Reminder Types",
    icon: <BellRing size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "pc_fields",
    label: "PC Registration Fields",
    icon: <Monitor size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "ip_fields",
    label: "IP Registration Fields",
    icon: <Network size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "ip_subnets",
    label: "IP Subnets",
    icon: <Network size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "asset_models",
    label: "Asset Models",
    icon: <Boxes size={19} />,
    roles: ["admin", "audit"],
  },
  {
    id: "vendors",
    label: "Vendors",
    icon: <Truck size={19} />,
    roles: ["admin", "audit"],
  },
];

const allNavItems = [...navItems, ...customizationItems];

const createOptions: { id: string; label: string; icon: ReactNode }[] = [
  { id: "pc", label: "PC", icon: <Monitor size={15} /> },
  { id: "devices", label: "Device", icon: <HardDrive size={15} /> },
  { id: "servers", label: "Server", icon: <Server size={15} /> },
  { id: "licenses", label: "License", icon: <KeyRound size={15} /> },
  { id: "ip", label: "IP Address", icon: <Network size={15} /> },
];

interface LayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onCreate: (page: string) => void;
  children: ReactNode;
}

// Global header search — a single flat index built from every
// registration table, filtered client-side as the user types (the
// same fetch-everything-then-filter pattern the rest of the app
// already uses, e.g. DashboardPage). Each entry knows which module
// page it belongs to, so a result is "usable" by taking the user
// straight to that module.
interface SearchResult {
  id: string;
  page: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  // Comprehensive haystack the free-text search actually matches
  // against - every relevant field for that record type (asset/serial
  // numbers, MAC, IP, department, owner, product key, location, etc.),
  // not just the short title/subtitle shown on screen.
  searchText: string;
}

export function Layout({
  activePage,
  onNavigate,
  onCreate,
  children,
}: LayoutProps) {
  const { profile, signOut, canWrite, hasModuleAccess } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showReminders, setShowReminders] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchIndex, setSearchIndex] = useState<SearchResult[] | null>(null);

  // Sidebar nav: on short/narrow screens the item list can outgrow the
  // available height and needs to scroll. Rather than let the last item
  // get sliced off flat against the bottom edge (looks broken), a soft
  // fade is shown there — but only while there's actually more to scroll
  // to, so it disappears once the list is scrolled all the way down.
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [navCanScrollDown, setNavCanScrollDown] = useState(false);

  const visibleItems = navItems.filter(
    (item) =>
      profile && item.roles.includes(profile.role) && hasModuleAccess(item.id),
  );
  const visibleCustomizationItems = customizationItems.filter(
    (item) =>
      profile && item.roles.includes(profile.role) && hasModuleAccess(item.id),
  );
  const visibleCreateOptions = createOptions.filter(
    (opt) => hasModuleAccess(opt.id) && canWrite(),
  );

  // Re-check whenever the visible item count changes (role/access loads
  // async) or the window resizes, and on every scroll of the nav itself.
  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const check = () =>
      setNavCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [visibleItems.length, visibleCustomizationItems.length]);

  useEffect(() => {
    if (!profile) {
      setReminders([]);
      return;
    }
    loadReminders();
    const interval = setInterval(loadReminders, 60000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  // Admin Change Notifications: only fetched for accounts that can
  // actually see the Notifications module (admin/audit, and not
  // restricted away from it via Per-User Module Access) — same gate
  // the nav item itself uses.
  const canSeeNotifications =
    !!profile &&
    ["admin", "audit"].includes(profile.role) &&
    hasModuleAccess("notifications");
  useEffect(() => {
    if (!canSeeNotifications) {
      setNotifications([]);
      return;
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [canSeeNotifications]);

  const loadNotifications = async () => {
    const { data, error } = await api.get<AdminNotification[]>(
      "/notifications?is_read=false&limit=20",
    );
    if (error) {
      toast(error.message, "error");
      return;
    }
    if (data) setNotifications(data.slice(0, 20));
  };

  const markNotificationRead = async (id: string) => {
    const { error } = await api.patch(`/notifications/${id}`, {
      is_read: true,
    });
    // Only drop it from the local list once the server has actually
    // confirmed the read — otherwise a failed request looks like it
    // worked locally, and the very next poll (loadNotifications, every
    // 60s) brings the still-unread row right back.
    if (error) {
      toast(error.message || "Could not mark notification as read", "error");
      return;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllNotificationsReadAndRefresh = async () => {
    const { error } = await markAllNotificationsRead();
    if (error) {
      toast(
        error.message || "Could not mark all notifications as read",
        "error",
      );
      return;
    }
    // Re-sync from the server instead of blindly assuming every
    // locally-held notification is now read — same reasoning as above.
    await loadNotifications();
  };

  // Opening a notification — clicking it, not just the separate "mark
  // as read" X — is what marks it read: seeing it is enough. It also
  // takes the user to the page where that record lives.
  const openNotification = (n: AdminNotification) => {
    setShowNotifications(false);
    if (!n.is_read) markNotificationRead(n.id);
    const page = NOTIFICATION_TABLE_PAGE[n.table_name];
    if (page && hasModuleAccess(page)) onNavigate(page);
  };

  const loadReminders = async () => {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      is_dismissed: "false",
      remind_at_lte: oneWeekLater.toISOString(),
      order: "remind_at",
      ascending: "true",
    });
    const { data, error } = await api.get<Reminder[]>(
      `/reminders?${params.toString()}`,
    );
    if (error) {
      toast(error.message, "error");
      return;
    }
    if (data) setReminders(data);
  };

  const dismissReminder = async (id: string) => {
    const { error } = await api.patch(`/reminders/${id}`, {
      is_dismissed: true,
    });
    if (error) {
      toast(error.message, "error");
      return;
    }
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Builds the flat search index once (lazily, on first use of the
  // search box) from every module the signed-in account can actually
  // see — a per-user-restricted account never gets results for a
  // module it doesn't have access to, matching how the sidebar nav
  // and stat cards are already filtered.
  const loadSearchIndex = async () => {
    setSearchLoading(true);
    const wants = (page: string) => hasModuleAccess(page);
    const [pcRes, devRes, srvRes, licRes, ipRes] = await Promise.all([
      wants("pc")
        ? supabase.from("pc_registrations").select("*")
        : Promise.resolve({ data: [] as PCRegistration[] }),
      wants("devices")
        ? supabase.from("devices").select("*")
        : Promise.resolve({ data: [] as Device[] }),
      wants("servers")
        ? supabase.from("servers").select("*")
        : Promise.resolve({ data: [] as ServerRecord[] }),
      wants("licenses")
        ? supabase.from("licenses").select("*")
        : Promise.resolve({ data: [] as License[] }),
      wants("ip")
        ? supabase.from("ip_addresses").select("*")
        : Promise.resolve({ data: [] as IPAddress[] }),
    ]);

    const items: SearchResult[] = [];

    ((pcRes.data ?? []) as PCRegistration[]).forEach((r) => {
      items.push({
        id: `pc-${r.id}`,
        page: "pc",
        icon: <Monitor size={15} />,
        title: r.hostname || "Unnamed PC",
        subtitle:
          [r.ip_address, r.service_tag, r.owner_name]
            .filter(Boolean)
            .join(" · ") || "PC Registration",
        searchText: [
          r.asset_id,
          r.hostname,
          r.asset_tag,
          r.service_tag,
          r.monitor_serial,
          r.mac_address,
          r.product_key,
          r.ip_address,
          r.owner_name,
          r.department?.name,
          r.floor_number,
          r.access_switch_name,
          r.access_switch_ip,
          r.switch_port_number,
          r.patch_level_number,
          r.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      });
    });

    ((devRes.data ?? []) as Device[]).forEach((r) => {
      items.push({
        id: `dev-${r.id}`,
        page: "devices",
        icon: <HardDrive size={15} />,
        title:
          r.hostname || r.device_model || r.device_type || "Unnamed Device",
        subtitle:
          [r.device_type, r.ip_address, r.serial_number]
            .filter(Boolean)
            .join(" · ") || "Device Registration",
        searchText: [
          r.asset_id,
          r.hostname,
          r.device_type,
          r.device_model,
          r.device_owner,
          r.serial_number,
          r.mac_address,
          r.ip_address,
          r.location,
          r.rack_number,
          r.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      });
    });

    ((srvRes.data ?? []) as ServerRecord[]).forEach((r) => {
      items.push({
        id: `srv-${r.id}`,
        page: "servers",
        icon: <Server size={15} />,
        title: r.hostname || "Unnamed Server",
        subtitle:
          [r.ip_address, r.environment, r.server_owner]
            .filter(Boolean)
            .join(" · ") || "Server Registration",
        searchText: [
          r.asset_id,
          r.hostname,
          r.server_type,
          r.server_type_other,
          r.environment,
          r.server_owner,
          r.vendor,
          r.ip_address,
          r.network_subnet,
          r.os_release,
          r.host_location,
          r.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      });
    });

    ((licRes.data ?? []) as License[]).forEach((r) => {
      items.push({
        id: `lic-${r.id}`,
        page: "licenses",
        icon: <KeyRound size={15} />,
        title: r.license_subtype || r.license_type || "Unnamed License",
        subtitle:
          [r.vendor, r.license_key].filter(Boolean).join(" · ") ||
          "License Registration",
        searchText: [
          r.asset_id,
          r.license_type,
          r.license_subtype,
          r.vendor,
          r.license_key,
          r.assigned_pc?.hostname,
          r.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      });
    });

    ((ipRes.data ?? []) as IPAddress[]).forEach((r) => {
      items.push({
        id: `ip-${r.id}`,
        page: "ip",
        icon: <Network size={15} />,
        title: r.ip_address,
        subtitle:
          [r.hostname, r.ip_owner, r.status].filter(Boolean).join(" · ") ||
          "IP Management",
        searchText: [
          r.ip_address,
          r.hostname,
          r.department?.name,
          r.ip_owner,
          r.mac_address,
          r.access_switch_port,
          r.patch_panel_label,
          r.status,
          r.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      });
    });

    setSearchIndex(items);
    setSearchLoading(false);
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !searchIndex) return [];
    return searchIndex
      .filter(
        (item) =>
          item.searchText.includes(q) || item.title.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [searchQuery, searchIndex]);

  const handleSearchFocus = () => {
    setSearchOpen(true);
    if (!searchIndex && !searchLoading) loadSearchIndex();
  };

  const handleSearchResultClick = (page: string) => {
    onNavigate(page);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    editor: "Editor",
    reader: "Reader (Read Only)",
    audit: "Audit (Read Only)",
  };

  return (
    <div className="flex flex-col h-screen gbb-mesh-bg">
      {/* Global top bar — Goh Betoch Bank corporate navy, not black */}

      <header className="h-12 shrink-0 bg-gradient-to-r from-navy-900 to-navy-700 flex items-center justify-between px-3 gap-3 z-40 relative">
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-white/70 hover:bg-white/10 p-2 rounded"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-2 pr-3 rounded hover:bg-white/10 transition-colors -ml-1 pl-1 py-1"
            title="Go to Dashboard"
          >
            <GBBLogo
              size={34}
              className="rounded bg-white dark:bg-gray-900 p-1 shrink-0"
            />
            <span className="hidden sm:block text-[13.5px] font-semibold text-white tracking-tight truncate">
              GBB Asset Inventory
            </span>
          </button>
        </div>

        {/* Center search — Jira global search styling */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 z-10"
            />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={handleSearchFocus}
              placeholder="Search PCs, devices, servers, licenses, IPs..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full bg-white/10 hover:bg-white/15 focus:bg-white dark:focus:bg-gray-900 text-white focus:text-gray-900 dark:focus:text-gray-100 placeholder:text-white/40 focus:placeholder:text-gray-400 dark:focus:placeholder:text-gray-500 text-sm rounded pl-8 pr-3 py-1.5 outline-none transition-colors cursor-text relative"
            />

            {searchOpen && searchQuery.trim() && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setSearchOpen(false)}
                />
                <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 rounded shadow-lift ring-1 ring-black/5 border border-brand-600 z-40 gbb-pop-in max-h-96 overflow-y-auto">
                  {searchLoading ? (
                    <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                      Searching…
                    </p>
                  ) : searchResults.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No results for "{searchQuery.trim()}"
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSearchResultClick(r.page)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-brand-50/60 transition-colors"
                        >
                          <span className="shrink-0 w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
                            {r.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                              {r.title}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                              {r.subtitle}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="relative hidden sm:block">
            {visibleCreateOptions.length > 0 && (
              <button
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
              >
                <Plus size={15} /> Create
              </button>
            )}
            {createMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setCreateMenuOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-gray-900 rounded shadow-lift ring-1 ring-black/5 border border-brand-600 z-40 gbb-pop-in py-1.5">
                  <p className="px-3.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    New Asset
                  </p>
                  {visibleCreateOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        onCreate(opt.id);
                        setCreateMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50/60 transition-colors"
                    >
                      <span className="text-brand-600">{opt.icon}</span>{" "}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Reminder bell */}
          <div className="relative">
            <button
              onClick={() => setShowReminders(!showReminders)}
              className="relative p-2 rounded text-white/70 hover:bg-white/10 transition-colors"
            >
              <Bell size={17} />
              {reminders.length > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {reminders.length}
                </span>
              )}
            </button>

            {showReminders && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowReminders(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded shadow-lift ring-1 ring-black/5 border border-brand-600 z-40 gbb-pop-in max-h-96 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <Calendar size={16} className="text-brand-600" /> Upcoming
                      Reminders
                    </h3>
                  </div>
                  {reminders.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No upcoming reminders
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {reminders.map((r) => {
                        const days = Math.ceil(
                          (new Date(r.remind_at).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24),
                        );
                        return (
                          <div
                            key={r.id}
                            className="px-4 py-3 hover:bg-brand-50/60 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {r.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {r.reminder_type}
                                </p>
                                {r.detail && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                    {r.detail}
                                  </p>
                                )}
                                <p className="text-xs mt-1">
                                  <span
                                    className={`font-medium ${
                                      days <= 0
                                        ? "text-red-600"
                                        : days <= 3
                                          ? "text-amber-600"
                                          : "text-brand-600"
                                    }`}
                                  >
                                    {days <= 0
                                      ? "Due now!"
                                      : `In ${days} day${days === 1 ? "" : "s"}`}
                                  </span>
                                  <span className="text-gray-400 dark:text-gray-500 ml-2">
                                    {new Date(r.remind_at).toLocaleDateString()}
                                  </span>
                                </p>
                              </div>
                              {canWrite() && (
                                <button
                                  onClick={() => dismissReminder(r.id)}
                                  className="text-gray-400 dark:text-gray-500 hover:text-red-500"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Admin Change Notifications bell — who updated/deleted an
              important record, what changed, and when. Only shown to
              accounts that can see the Notifications module. */}
          {canSeeNotifications && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded text-white/70 hover:bg-white/10 transition-colors"
              >
                <BellRing size={17} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded shadow-lift ring-1 ring-black/5 border border-brand-600 z-40 gbb-pop-in max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <BellRing size={16} className="text-brand-600" />{" "}
                        Notifications
                      </h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={markAllNotificationsReadAndRefresh}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1"
                        >
                          <CheckCheck size={13} /> Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                        No new notifications
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => openNotification(n)}
                            className="px-4 py-3 hover:bg-brand-50/60 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                  {n.action === "delete" ? (
                                    <Trash2
                                      size={13}
                                      className="text-red-500 shrink-0"
                                    />
                                  ) : (
                                    <Pencil
                                      size={13}
                                      className="text-brand-600 shrink-0"
                                    />
                                  )}
                                  <span className="truncate">
                                    {n.record_type}: {n.record_label || "—"}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                  {n.summary}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  {n.actor_name} ·{" "}
                                  {new Date(n.created_at).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markNotificationRead(n.id);
                                }}
                                className="text-gray-400 dark:text-gray-500 hover:text-green-600"
                                title="Mark as read"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigate("notifications");
                      }}
                      className="w-full text-center text-xs font-medium text-brand-600 hover:text-brand-700 dark:hover:text-brand-300 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800"
                    >
                      View all notifications
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* <button className="hidden sm:flex p-2 rounded text-white/70 hover:bg-white/10 transition-colors">
            <HelpCircle size={17} />
          </button> */}

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-semibold ring-2 ring-white/20">
                {profile?.full_name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <ChevronDown
                size={14}
                className="hidden sm:block text-white/50"
              />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded shadow-lift ring-1 ring-black/5 border border-brand-600 z-40 gbb-pop-in py-2">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {profile?.email}
                    </p>
                    <p className="text-xs text-brand-600 font-medium mt-1">
                      {roleLabels[profile?.role ?? ""]}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onNavigate("profile");
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50/60 dark:hover:bg-brand-900/30 transition-colors"
                  >
                    <Users size={16} /> My Profile
                  </button>
                  <div className="border-t border-gray-100 dark:border-gray-800 dark:border-gray-800 my-1">
                    <ThemeToggle variant="menu-item" />
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-800 dark:border-gray-800" />
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — Jira "object schema" style panel: white, hairline
            border, flat selected state with left rail accent */}
        <aside
          className={`fixed lg:relative inset-y-12 lg:inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="px-4 pt-5 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Asset Inventory
            </p>
          </div>

          {/* This wrapper (not the <nav> itself) carries flex-1 + scroll, so
              it always fills the remaining sidebar height — keeping the
              white background seamless down to the bottom edge. The <nav>
              and the role footer inside it are sized to their own content
              and stack directly on top of one another (no flex-grow, no
              mt-auto), so for roles with a short menu (e.g. Editor) the
              footer sits right under the last item instead of being pinned
              to the very bottom with a big empty gap above it. For roles
              with a long menu the extra content simply scrolls, and the
              footer still ends up directly after the last item. Items
              themselves are sized generously (h-11, text-sm) rather than
              packed tight, so a short menu naturally reads as fuller.
              On short viewports the list itself can still outgrow the
              space and need to scroll — navCanScrollDown drives a soft
              fade at the bottom edge (below) so the last item fades out
              instead of being sliced off flat mid-row. */}
          <div
            ref={navScrollRef}
            className="flex-1 overflow-y-auto flex flex-col min-h-0"
          >
            <nav className="px-2.5 pb-4 space-y-2">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`relative w-full flex items-center gap-3 pl-4 pr-3 h-12 rounded-lg text-[15px] font-medium transition-colors border-l-[3px] ${
                    activePage === item.id
                      ? "bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border-l-brand-600"
                      : "text-gray-600 dark:text-gray-300 border-l-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <span className="shrink-0 flex items-center justify-center">
                    {item.icon}
                  </span>
                  <span className="truncate text-left">{item.label}</span>
                </button>
              ))}

              {visibleCustomizationItems.length > 0 && (
                <>
                  <p className="px-3 pt-5 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Customization
                  </p>
                  {visibleCustomizationItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`relative w-full flex items-center gap-3 pl-4 pr-3 h-12 rounded-lg text-[15px] font-medium transition-colors border-l-[3px] ${
                        activePage === item.id
                          ? "bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border-l-brand-600"
                          : "text-gray-600 dark:text-gray-300 border-l-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                      }`}
                    >
                      <span className="shrink-0 flex items-center justify-center">
                        {item.icon}
                      </span>
                      <span className="truncate text-left">{item.label}</span>
                    </button>
                  ))}
                </>
              )}
            </nav>

            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
              <Settings
                size={14}
                className="text-gray-300 dark:text-gray-600"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                {profile ? roleLabels[profile.role] : ""}
              </p>
            </div>
          </div>

          {/* Soft fade cue, only shown while the list can still scroll
              further — makes a cut-off last item read as "more below"
              rather than as a rendering glitch. */}
          {navCanScrollDown && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
          )}
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-12 bg-black/30 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Secondary bar — breadcrumb-style page title, like a Jira project header */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-3 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {allNavItems.find((i) => i.id === activePage)?.label ??
                "Dashboard"}
            </h2>
          </div>

          <main className="flex-1 overflow-y-auto p-4 lg:p-6 gbb-fade-in">
            {children}
          </main>
        </div>
      </div>

      {/* Global footer — spans the full width of the app, beneath the
          sidebar and main content alike, in the same navy corporate
          branding as the top bar so it reads as one consistent theme. */}
      <footer className="shrink-0 bg-gradient-to-r from-navy-900 to-navy-700 px-4 py-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center">
        <span className="text-[11px] sm:text-xs text-white/60">
          © Goh Betoch Bank. Developed by{" "}
          <span className="text-white/90 font-medium">
            Information Systems Department
          </span>
          .
        </span>
      </footer>
    </div>
  );
}
