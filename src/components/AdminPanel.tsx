import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  Menu,
  X,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  Users,
  ChevronDown,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface UserRecord {
  user_id: string;
  email: string;
  role: string;
  last_sign_in_at: string | null;
}

interface AdminPanelProps {
  currentRole: string;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200 flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function AdminPanel({ currentRole }: AdminPanelProps) {
  const isSuperadmin = currentRole === "superadmin";

  // ─── Sidebar ───
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ─── Add User Form ───
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "admin">("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // ─── Users Table ───
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ─── Role change dropdown ───
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ======================== FETCH USERS ========================
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setTableError(null);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .order("user_id", { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: UserRecord[] = data.map((row: any) => ({
          user_id: row.user_id,
          email: "",
          role: row.role,
          last_sign_in_at: null,
        }));

        // Fetch auth user emails via the admin edge function or auth.users
        // Since we use anon key, we query from auth.users if RLS allows,
        // otherwise we just show the user_id. We'll try a workaround:
        // For now, fetch emails from the auth metadata if available.
        // We'll use the admin API if the user has service_role access.
        // Fallback: show user_id as identifier.
        
        // Attempt to get user details from Supabase auth admin API
        // This requires service_role key, so it may fail with anon key.
        // We'll populate what we can.
        try {
          const { data: authData } = await supabase.auth.admin.listUsers();
          if (authData?.users) {
            const emailMap = new Map<string, { email: string; lastSignIn: string | null }>();
            for (const u of authData.users) {
              emailMap.set(u.id, {
                email: u.email || u.id,
                lastSignIn: u.last_sign_in_at || null,
              });
            }
            for (const user of mapped) {
              const info = emailMap.get(user.user_id);
              if (info) {
                user.email = info.email;
                user.last_sign_in_at = info.lastSignIn;
              } else {
                user.email = user.user_id.slice(0, 8) + "…";
              }
            }
          }
        } catch {
          // Admin API not available — populate with user_id truncation
          for (const user of mapped) {
            if (!user.email) {
              user.email = user.user_id.slice(0, 8) + "…";
            }
          }
        }

        setUsers(mapped);
      }
    } catch (err: any) {
      setTableError(err.message || "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ======================== INVITE USER ========================
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteEmail.trim()) {
      setInviteError("Please enter an email address.");
      return;
    }

    // Only superadmins can assign admin role
    if (inviteRole === "admin" && !isSuperadmin) {
      setInviteError("Only Superadmins can assign the Admin role.");
      return;
    }

    setInviteLoading(true);
    try {
      // Create the user via Supabase Auth admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: inviteEmail.trim(),
        email_confirm: true,
      });

      if (error) throw error;

      if (data?.user) {
        // Insert into user_roles
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: inviteRole });

        if (roleError) throw roleError;

        setInviteSuccess(`User "${inviteEmail.trim()}" added as ${inviteRole === "viewer" ? "User" : "Admin"}.`);
        setInviteEmail("");
        setInviteRole("viewer");
        await fetchUsers();
      }
    } catch (err: any) {
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("duplicate") || msg.includes("exists")) {
        setInviteError("This email is already registered.");
      } else {
        setInviteError(err.message || "Failed to add user.");
      }
    } finally {
      setInviteLoading(false);
    }
  };

  // ======================== CHANGE ROLE ========================
  const handleChangeRole = async (userId: string, newRole: string) => {
    if (newRole === "admin" && !isSuperadmin) return;

    setActionLoading(userId);
    setOpenDropdown(null);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      setTableError(err.message || "Failed to change role.");
    } finally {
      setActionLoading(null);
    }
  };

  // ======================== REVOKE ACCESS ========================
  const handleRevokeAccess = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke this user's access?")) return;

    setActionLoading(userId);
    try {
      // Delete from user_roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (roleError) throw roleError;

      // Try to delete from auth (requires admin)
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch {
        // If admin API fails, role is still removed
      }

      await fetchUsers();
    } catch (err: any) {
      setTableError(err.message || "Failed to revoke access.");
    } finally {
      setActionLoading(null);
    }
  };

  // ======================== HELPERS ========================
  const getRoleBadgeClasses = (role: string) => {
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
  };

  const getRoleDisplayName = (role: string) => {
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
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return "Never";
    try {
      return new Date(ts).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  // Available roles for the change-role dropdown
  const availableRoles = isSuperadmin
    ? ["viewer", "admin", "superadmin"]
    : ["viewer"];

  // ======================== SIDEBAR CONTENT ========================
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-800">Admin Tools</h2>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add User Form — Superadmin only */}
      {isSuperadmin && (
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-700">Add User</h3>
          </div>

          {inviteError && (
            <div className="mb-3">
              <ErrorBanner message={inviteError} />
            </div>
          )}
          {inviteSuccess && (
            <div className="mb-3">
              <SuccessBanner message={inviteSuccess} />
            </div>
          )}

          <form onSubmit={handleInviteUser} className="space-y-3">
            <div>
              <label htmlFor="inviteEmail" className="block text-xs font-medium text-slate-600 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={inviteLoading}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inviteRole" className="block text-xs font-medium text-slate-600 mb-1">
                Role
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "viewer" | "admin")}
                  disabled={inviteLoading}
                  className="w-full pl-10 pr-8 py-2 border border-slate-300 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                >
                  <option value="viewer">User</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={inviteLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {inviteLoading ? "Adding…" : "Add User"}
            </button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Overview</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Total Users</span>
            <span className="text-sm font-bold text-slate-800">{users.length}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Admins</span>
            <span className="text-sm font-bold text-blue-700">
              {users.filter((u) => u.role === "admin" || u.role === "superadmin").length}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Users</span>
            <span className="text-sm font-bold text-slate-700">
              {users.filter((u) => u.role === "viewer").length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ======================== RENDER ========================
  return (
    <div className="flex min-h-0 flex-1">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 ease-in-out
          lg:static lg:z-0 lg:shadow-none lg:translate-x-0 lg:shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header bar with hamburger */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-slate-700">Admin Panel</h2>
        </div>

        {/* Table content */}
        <div className="p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800">All Accounts</h2>
          </div>

          {tableError && (
            <div className="mb-4">
              <ErrorBanner message={tableError} />
            </div>
          )}

          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-7 h-7 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Loading users…</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">
                      Last Accessed
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.user_id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Email */}
                      <td className="px-4 py-3">
                        <span className="text-slate-800 font-medium">{user.email}</span>
                      </td>

                      {/* Role badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeClasses(user.role)}`}
                        >
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>

                      {/* Last Accessed */}
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                        {formatTimestamp(user.last_sign_in_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {user.role === "superadmin" ? (
                          <span className="text-xs text-slate-400 italic">Protected</span>
                        ) : actionLoading === user.user_id ? (
                          <div className="inline-flex items-center gap-1.5 text-slate-400 text-xs">
                            <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                            Updating…
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {/* Role change dropdown */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setOpenDropdown(openDropdown === user.user_id ? null : user.user_id)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                              >
                                Change Role
                                <ChevronDown className="w-3 h-3" />
                              </button>

                              {openDropdown === user.user_id && (
                                <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 z-30 py-1">
                                  {availableRoles
                                    .filter((r) => r !== user.role)
                                    .map((r) => (
                                      <button
                                        key={r}
                                        onClick={() => handleChangeRole(user.user_id, r)}
                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                      >
                                        {getRoleDisplayName(r)}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>

                            {/* Revoke button */}
                            <button
                              onClick={() => handleRevokeAccess(user.user_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                              title="Revoke access"
                            >
                              <Trash2 className="w-3 h-3" />
                              Revoke
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
