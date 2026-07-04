import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  Menu,
  X,
  Users,
  ShieldCheck,
  AlertTriangle,
  Ban,
  ShieldOff,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
interface UserRecord {
  email: string;
  role: string;
  is_banned: boolean;
  last_active_at: string | null;
}

interface AdminPanelProps {
  currentRole: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const ROLE_SORT_ORDER: Record<string, number> = {
  superadmin: 0,
  admin: 1,
  viewer: 2,
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
    default:
      return role;
  }
}

// ─── Component ───────────────────────────────────────────────

export function AdminPanel({ currentRole }: AdminPanelProps) {
  const isSuperadmin = currentRole === "superadmin";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ════════════════════ FETCH ════════════════════
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_admin_users_view");
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

  // ════════════════════ ACTIONS ════════════════════

  const handleChangeRole = async (email: string, newRole: string) => {
    setActionLoading(email);
    try {
      const { error } = await supabase.rpc('admin_update_role', { target_email: email, new_role: newRole });
      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      console.error("Error changing role:", err);
      setError(err.message || "Failed to change role.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (email: string) => {
    const typed = window.prompt(`To ban this user, type their email:\n${email}`);
    if (!typed || typed.trim().toLowerCase() !== email.trim().toLowerCase()) return;

    setActionLoading(email);
    try {
      const { error } = await supabase.rpc('admin_set_ban', { target_email: email, ban_status: true });
      if (error) throw error;
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
      const { error } = await supabase.rpc('admin_set_ban', { target_email: email, ban_status: false });
      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      console.error("Error unbanning user:", err);
      setError(err.message || "Failed to unban user.");
    } finally {
      setActionLoading(null);
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
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {user.role === "admin" && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to dismiss admin to user?")) {
                  handleChangeRole(user.email, "viewer");
                }
              }}
              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
            >
              Dismiss as Admin
            </button>
          )}
          {user.role === "viewer" && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to make this user as admin?")) {
                  handleChangeRole(user.email, "admin");
                }
              }}
              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            >
              Make Admin
            </button>
          )}
          <button
            onClick={() => handleBanUser(user.email)}
            className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            title="Ban user"
          >
            <Ban className="w-3 h-3" />
            Ban User
          </button>
        </div>
      );
    }

    // Current user is admin: can only ban/promote viewers
    if (currentRole === "admin") {
      if (user.role === "viewer") {
        return (
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to make this user as admin?")) {
                  handleChangeRole(user.email, "admin");
                }
              }}
              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            >
              Make Admin
            </button>
            <button
              onClick={() => handleBanUser(user.email)}
              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
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

  // ════════════════════ SIDEBAR ════════════════════
  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Admin Panel</h2>
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
      <nav className="flex-1 px-3 py-4">
        <p className="px-2 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Navigation
        </p>
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
        >
          <Users className="w-4 h-4" />
          Users List
        </button>
      </nav>

      {/* Footer Stats */}
      <div className="px-5 py-4 border-t border-slate-200">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Total Active</span>
            <span className="font-bold text-slate-700">{activeUsers.length}</span>
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
    <div className="flex flex-1 min-h-0">
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
          {/* Page Header */}
          <div className="flex items-center gap-2.5 mb-6">
            <Users className="w-5 h-5 text-emerald-600" />
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
              <div className="w-7 h-7 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
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
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-14">
                      S.No
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                      Email ID
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">
                      Last Active
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map((user, idx) => (
                    <tr
                      key={user.email}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* S.No */}
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>

                      {/* Email ID */}
                      <td className="px-4 py-3">
                        <span className="text-slate-800 font-medium">{user.email}</span>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeClasses(user.role)}`}
                        >
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
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
                <h2 className="text-lg font-bold text-slate-800">Banned Accounts</h2>
                <span className="ml-1 text-xs text-red-400 font-medium">
                  ({bannedUsers.length})
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-red-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-red-50/50 border-b border-red-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider w-14">
                        S.No
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                        Email ID
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                        Role
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">
                        Last Active
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bannedUsers.map((user, idx) => (
                      <tr
                        key={user.email}
                        className="border-b border-red-100 last:border-b-0 hover:bg-red-50/30 transition-colors"
                      >
                        {/* S.No */}
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                          {idx + 1}
                        </td>

                        {/* Email ID */}
                        <td className="px-4 py-3">
                          <span className="text-slate-800 font-medium line-through decoration-red-300">
                            {user.email}
                          </span>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeClasses(user.role)}`}
                          >
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>

                        {/* Last Active */}
                        <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                          {formatLastActive(user.last_active_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          {actionLoading === user.email ? (
                            <div className="inline-flex items-center gap-1.5 text-slate-400 text-xs">
                              <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                              Updating…
                            </div>
                          ) : isSuperadmin ? (
                            <button
                              onClick={() => handleUnbanUser(user.email)}
                              className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            >
                              <ShieldOff className="w-3 h-3" />
                              Unban
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
