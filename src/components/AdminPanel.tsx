import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  Menu,
  X,
  Users,
  ShieldCheck,
  AlertTriangle,
  Ban,
  ShieldOff,
  Activity,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { PILE_THEMES } from "../utils/lotUtils";

// ─── Types ───────────────────────────────────────────────────
interface UserRecord {
  email: string;
  role: string;
  is_banned: boolean;
  last_active_at: string | null;
}

interface LogRecord {
  id: string;
  user_email: string;
  action_category: string;
  action_detail: string;
  created_at: string;
  metadata?: any;
}

interface AdminPanelProps {
  currentRole: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const ROLE_SORT_ORDER: Record<string, number> = {
  superadmin: 0,
  admin: 1,
  viewer: 2,
  pending: 3,
};

function sortUsers(users: UserRecord[]): UserRecord[] {
  return [...users].sort((a, b) => {
    const roleA = ROLE_SORT_ORDER[a.role] ?? 99;
    const roleB = ROLE_SORT_ORDER[b.role] ?? 99;
    if (roleA !== roleB) return roleA - roleB;

    // Secondary: newest last_active_at first
    const tsA = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
    const tsB = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
    return tsB - tsA;
  });
}

function formatLastActive(ts: string | null): string {
  if (!ts) return "—";
  try {
    const then = new Date(ts).getTime();
    const now = Date.now();
    const diffMs = now - then;

    if (diffMs < 0) return "Just now";

    const minutes = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);
    const days = Math.floor(diffMs / 86_400_000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) {
      const remainMins = minutes - hours * 60;
      return remainMins > 0
        ? `${hours} hr ${remainMins} min ago`
        : `${hours} hr ago`;
    }
    if (days < 7) return `${days}d ago`;

    return new Date(ts).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getRoleBadgeClasses(role: string): string {
  switch (role) {
    case "superadmin":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "admin":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "viewer":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "pending":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getRoleDisplayName(role: string): string {
  switch (role) {
    case "superadmin":
      return "Superadmin";
    case "admin":
      return "Admin";
    case "viewer":
      return "User";
    case "pending":
      return "pending";
    default:
      return role;
  }
}

function getLogCategoryBadgeClasses(category: string): string {
  switch (category?.toUpperCase()) {
    case "AUTH":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "DATA_ENTRY":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "ADMIN_ACTION":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "SYSTEM":
      return "bg-slate-100 text-slate-800 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getPileColor(name: string) {
  if (!name) return "text-slate-600";
  const match = name.match(/Pile\s*(\d)/i);
  if (match) {
    const p = parseInt(match[1], 10);
    return PILE_THEMES[p]?.text || "text-[#003B70]";
  }
  return "text-[#003B70]";
}

const LOGS_PER_PAGE = 25;

// ─── Component ───────────────────────────────────────────────

export function AdminPanel({ currentRole }: AdminPanelProps) {
  const isSuperadmin = currentRole === "superadmin";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");

  // ─── Logs State ───
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [logPage, setLogPage] = useState(1);

  // ════════════════════ FETCH USERS ════════════════════
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_admin_users_view",
      );
      if (rpcError) throw rpcError;
      if (data) setUsers(data as UserRecord[]);
    } catch (err: any) {
      console.error("AdminPanel fetch error:", err);
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ════════════════════ FETCH LOGS & REALTIME ════════════════════
  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setLogs(data as LogRecord[]);
    };

    fetchLogs();

    const channel = supabase
      .channel("realtime_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          setLogs((prev) => {
            const newLog = payload.new as LogRecord;
            if (prev.some((log) => log.id === newLog.id)) return prev;
            return [newLog, ...prev];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ════════════════════ ACTIONS ════════════════════

  const handleChangeRole = async (email: string, newRole: string) => {
    setActionLoading(email);
    try {
      const { error } = await supabase.rpc("admin_update_role", {
        target_email: email,
        new_role: newRole,
      });
      if (error) throw error;
      await supabase.rpc("log_activity", {
        p_category: "ADMIN_ACTION",
        p_detail: `Changed role of ${email} to ${newRole}`,
        p_metadata: {
          action_type: newRole === "admin" ? "Make Admin" : "Dismiss Admin",
        },
      });
      await fetchUsers();
    } catch (err: any) {
      console.error("Error changing role:", err);
      setError(err.message || "Failed to change role.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (email: string) => {
    const typed = window.prompt(
      `To ban this user, type their email:\n${email}`,
    );
    if (!typed || typed.trim().toLowerCase() !== email.trim().toLowerCase())
      return;

    setActionLoading(email);
    try {
      const { error } = await supabase.rpc("admin_set_ban", {
        target_email: email,
        ban_status: true,
      });
      if (error) throw error;
      await supabase.rpc("log_activity", {
        p_category: "ADMIN_ACTION",
        p_detail: `Banned user ${email}`,
        p_metadata: { action_type: "Ban User" },
      });
      await fetchUsers();
    } catch (err: any) {
      console.error("Error banning user:", err);
      setError(err.message || "Failed to ban user.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbanUser = async (email: string) => {
    if (!window.confirm(`Are you sure you want to unban ${email}?`)) return;
    setActionLoading(email);
    try {
      const { error } = await supabase.rpc("admin_set_ban", {
        target_email: email,
        ban_status: false,
      });
      if (error) throw error;
      await supabase.rpc("log_activity", {
        p_category: "ADMIN_ACTION",
        p_detail: `Unbanned user ${email}`,
        p_metadata: { action_type: "Unban User" },
      });
      await fetchUsers();
    } catch (err: any) {
      console.error("Error unbanning user:", err);
      setError(err.message || "Failed to unban user.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm("Clear all logs?")) {
      await supabase.rpc("dev_clear_logs");
      setLogs([]);
    }
  };

  // ════════════════════ RENDER ACTIONS ════════════════════

  const renderActions = (user: UserRecord) => {
    // Superadmin rows are protected
    if (user.role === "superadmin") {
      return <span className="text-xs text-slate-400 italic">Protected</span>;
    }

    // Loading state for this row
    if (actionLoading === user.email) {
      return (
        <div className="inline-flex items-center gap-1.5 text-slate-400 text-xs">
          <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
          Updating…
        </div>
      );
    }

    // Current user is superadmin
    if (isSuperadmin) {
      return (
        <div className="flex items-center justify-end gap-2 flex-nowrap whitespace-nowrap">
          {user.role === "admin" && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to dismiss admin to user?",
                  )
                ) {
                  handleChangeRole(user.email, "viewer");
                }
              }}
              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-300"
            >
              Dismiss as Admin
            </button>
          )}
          {user.role === "viewer" && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to make this user as admin?",
                  )
                ) {
                  handleChangeRole(user.email, "admin");
                }
              }}
              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer text-[#003B70] bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              Make Admin
            </button>
          )}
          {user.role === "pending" && (
            <>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Approve ${user.email} as a standard user?`,
                    )
                  ) {
                    handleChangeRole(user.email, "viewer");
                  }
                }}
                className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
              >
                <UserCheck className="w-3 h-3" />
                Approve as User
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Approve ${user.email} as an admin?`,
                    )
                  ) {
                    handleChangeRole(user.email, "admin");
                  }
                }}
                className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer text-[#003B70] bg-blue-50 hover:bg-blue-100 border-blue-200"
              >
                <UserPlus className="w-3 h-3" />
                Make Admin
              </button>
            </>
          )}
          <button
            onClick={() => handleBanUser(user.email)}
            className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer text-red-700 bg-red-50 hover:bg-red-100 border-red-200"
            title="Ban user"
          >
            <Ban className="w-3 h-3" />
            Ban User
          </button>
        </div>
      );
    }

    // Current user is admin: can act on viewers and pending users
    if (currentRole === "admin") {
      if (user.role === "viewer" || user.role === "pending") {
        return (
          <div className="flex items-center justify-end gap-2 flex-nowrap whitespace-nowrap">
            {user.role === "pending" && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Approve ${user.email} as a standard user?`,
                    )
                  ) {
                    handleChangeRole(user.email, "viewer");
                  }
                }}
                className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
              >
                <UserCheck className="w-3 h-3" />
                Approve as User
              </button>
            )}
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to make this user as admin?",
                  )
                ) {
                  handleChangeRole(user.email, "admin");
                }
              }}
              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer text-[#003B70] bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              {user.role === "pending" ? (
                <><UserPlus className="w-3 h-3" /> Make Admin</>
              ) : (
                <>Make Admin</>
              )}
            </button>
            <button
              onClick={() => handleBanUser(user.email)}
              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer text-red-700 bg-red-50 hover:bg-red-100 border-red-200"
              title="Ban user"
            >
              <Ban className="w-3 h-3" />
              Ban User
            </button>
          </div>
        );
      }

      // Admin viewing another admin — no actions available
      return <span className="text-xs text-slate-400 italic">—</span>;
    }

    return <span className="text-xs text-slate-400 italic">—</span>;
  };

  // ════════════════════ DERIVED DATA ════════════════════
  const activeUsers = sortUsers(users.filter((u) => !u.is_banned));
  const bannedUsers = sortUsers(users.filter((u) => u.is_banned));

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Date filtering
      if (dateFrom && log.created_at < dateFrom) return false;
      if (dateTo && log.created_at > dateTo + "T23:59:59Z") return false;

      // Search filtering
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchString =
          `${log.user_email} ${log.action_category} ${log.action_detail}`.toLowerCase();

        const orBlocks = query.split(" or ");
        const matches = orBlocks.some((block) => {
          const terms = block.trim().split(/\s+/);
          return terms.every((term) => searchString.includes(term));
        });

        if (!matches) return false;
      }

      return true;
    });
  }, [logs, searchQuery, dateFrom, dateTo]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / LOGS_PER_PAGE),
  );
  const paginatedLogs = filteredLogs.slice(
    (logPage - 1) * LOGS_PER_PAGE,
    logPage * LOGS_PER_PAGE,
  );

  // Reset pagination on filter change
  useEffect(() => {
    setLogPage(1);
  }, [searchQuery, dateFrom, dateTo]);

  // ════════════════════ SIDEBAR ════════════════════
  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#003B70]" />
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              Admin Panel
            </h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        <p className="px-2 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Navigation
        </p>
        <button
          onClick={() => {
            setActiveTab("users");
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border cursor-pointer ${
            activeTab === "users"
              ? "bg-[#003B70] text-white border-[#003B70]"
              : "text-slate-600 hover:bg-slate-100 border-transparent"
          }`}
        >
          <Users className="w-4 h-4" />
          Users List
        </button>
        <button
          onClick={() => {
            setActiveTab("logs");
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border cursor-pointer ${
            activeTab === "logs"
              ? "bg-[#003B70] text-white border-[#003B70]"
              : "text-slate-600 hover:bg-slate-100 border-transparent"
          }`}
        >
          <Activity className="w-4 h-4" />
          Activity Logs
        </button>
      </nav>

      {/* Footer Stats */}
      <div className="px-5 py-4 border-t border-slate-200">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Total Active</span>
            <span className="font-bold text-slate-700">
              {activeUsers.length}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Banned</span>
            <span className="font-bold text-red-600">{bannedUsers.length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════ RENDER ════════════════════
  return (
    <div className="flex flex-1 min-h-0 h-full">
      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar: Desktop = static 20%, Mobile = overlay ── */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-slate-50 border-r border-slate-200 shadow-xl
          transition-transform duration-300 ease-in-out
          lg:static lg:z-0 lg:shadow-none lg:translate-x-0 lg:w-1/5 lg:shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {sidebar}
      </aside>

      {/* ── Main Content: 80% ── */}
      <main className="flex-1 min-w-0 lg:w-4/5 overflow-y-auto">
        {/* Mobile hamburger bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-slate-700">Admin Panel</h2>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* ==================== USERS TAB ==================== */}
          {activeTab === "users" && (
            <>
              {/* Page Header */}
              <div className="flex items-center gap-2.5 mb-6">
                <Users className="w-5 h-5 text-[#003B70]" />
                <h2 className="text-lg font-bold text-slate-800">Users List</h2>
                <span className="ml-1 text-xs text-slate-400 font-medium">
                  ({activeUsers.length} active)
                </span>
              </div>

              {/* Error State */}
              {error && (
                <div className="mb-5 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="border-4 border-slate-200 border-t-[#003B70] rounded-full w-8 h-8 animate-spin" />
                  <span className="text-sm text-slate-500">Loading users…</span>
                </div>
              ) : activeUsers.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-sm">
                  No active users found.
                </div>
              ) : (
                /* Active Users Table */
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#003B70] text-white">
                        <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-16">
                          S.No
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-auto">
                          Email ID
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-1/5">
                          Role
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-1/5">
                          Last Active
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-1/5">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsers.map((user, idx) => (
                        <tr
                          key={user.email}
                          className="border-b border-slate-100 last:border-b-0 even:bg-slate-50 hover:bg-blue-50/30 transition-colors"
                        >
                          {/* S.No */}
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>

                          {/* Email ID */}
                          <td className="px-4 py-2.5">
                            <span
                              className="text-slate-800 font-medium truncate max-w-[140px] sm:max-w-[200px] lg:max-w-none lg:overflow-visible lg:whitespace-normal break-all block transition-all"
                              title={user.email}
                            >
                              {user.email}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getRoleBadgeClasses(user.role)}`}
                            >
                              {getRoleDisplayName(user.role)}
                            </span>
                          </td>

                          {/* Last Active */}
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {formatLastActive(user.last_active_at)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            {renderActions(user)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ════════════════════ BANNED USERS SECTION ════════════════════ */}
              {bannedUsers.length > 0 && (
                <>
                  <div className="flex items-center gap-2.5 mt-10 mb-6">
                    <Ban className="w-5 h-5 text-red-500" />
                    <h2 className="text-lg font-bold text-slate-800">
                      Banned Accounts
                    </h2>
                    <span className="ml-1 text-xs text-red-400 font-medium">
                      ({bannedUsers.length})
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#003B70] text-white">
                          <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-16">
                            S.No
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-auto">
                            Email ID
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-1/5">
                            Role
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-1/5">
                            Last Active
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-1/5">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bannedUsers.map((user, idx) => (
                          <tr
                            key={user.email}
                            className="border-b border-red-100 last:border-b-0 even:bg-slate-50 hover:bg-blue-50/30 transition-colors"
                          >
                            {/* S.No */}
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                              {idx + 1}
                            </td>

                            {/* Email ID */}
                            <td className="px-4 py-2.5">
                              <span
                                className="text-slate-800 font-medium line-through decoration-red-300 truncate max-w-[140px] sm:max-w-[200px] lg:max-w-none lg:overflow-visible lg:whitespace-normal break-all block transition-all"
                                title={user.email}
                              >
                                {user.email}
                              </span>
                            </td>

                            {/* Role */}
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getRoleBadgeClasses(user.role)}`}
                              >
                                {getRoleDisplayName(user.role)}
                              </span>
                            </td>

                            {/* Last Active */}
                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                              {formatLastActive(user.last_active_at)}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              {actionLoading === user.email ? (
                                <div className="inline-flex items-center justify-end gap-1.5 text-slate-400 text-xs">
                                  <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                                  Updating…
                                </div>
                              ) : isSuperadmin ? (
                                <button
                                  onClick={() => handleUnbanUser(user.email)}
                                  className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer bg-slate-50 text-[#003B70] hover:bg-slate-100 border-slate-300"
                                >
                                  <ShieldOff className="w-3 h-3" />
                                  Unban
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 italic">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {/* ==================== LOGS TAB ==================== */}
          {activeTab === "logs" && (
            <>
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-[#003B70]" />
                  <h2 className="text-lg font-bold text-slate-800">
                    System Logs
                  </h2>
                </div>
                {isSuperadmin && (
                  <button
                    onClick={handleClearLogs}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Logs (Dev)
                  </button>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex flex-col lg:flex-row gap-3 mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs (e.g. 'Pile 1' OR 'Auth')..."
                  className="flex-1 w-full bg-white border border-slate-300 text-slate-800 rounded-md focus:outline-none focus:border-[#003B70] focus:ring-1 focus:ring-[#003B70] px-3 py-2 transition-shadow text-sm"
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      From
                    </span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="min-w-[140px] px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:border-[#003B70] focus:ring-1 focus:ring-[#003B70] leading-normal"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      To
                    </span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="min-w-[140px] px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:border-[#003B70] focus:ring-1 focus:ring-[#003B70] leading-normal"
                    />
                  </div>
                </div>
              </div>

              {/* Logs Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#003B70] text-white">
                      <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-14">
                        S.No
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-40">
                        Timestamp
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-48">
                        User
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-36">
                        Category
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-36">
                        Action
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log, idx) => (
                        <tr
                          key={log.id}
                          className="border-b border-slate-100 last:border-b-0 even:bg-slate-50 hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                            {(logPage - 1) * LOGS_PER_PAGE + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="text-slate-800 font-medium truncate max-w-[120px] md:max-w-[180px] hover:max-w-none hover:whitespace-normal hover:break-all block transition-all"
                              title={log.user_email}
                            >
                              {log.user_email}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getLogCategoryBadgeClasses(log.action_category)}`}
                            >
                              {log.action_category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {log.metadata?.action_type ? (
                              <span className="text-slate-800 font-medium text-xs whitespace-nowrap">
                                {log.metadata.action_type}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {log.metadata?.target_pile && (
                              <span
                                className={`font-bold mr-2 ${getPileColor(log.metadata.target_pile)}`}
                              >
                                [{log.metadata.target_pile}
                                {log.metadata.target_sublot
                                  ? ` - ${log.metadata.target_sublot}`
                                  : ""}
                                ]
                              </span>
                            )}
                            <span className="text-slate-600">
                              {log.action_detail}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-slate-500"
                        >
                          No logs found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Showing page{" "}
                    <span className="font-semibold text-slate-700">
                      {logPage}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-700">
                      {totalPages}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      disabled={logPage === 1}
                      className="inline-flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 rounded-md px-3 py-1 transition-colors disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setLogPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={logPage === totalPages}
                      className="inline-flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 rounded-md px-3 py-1 transition-colors disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
