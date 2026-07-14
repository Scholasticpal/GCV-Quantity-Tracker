import { useState, useEffect, useCallback } from "react";
import { SpreadsheetTable } from "./components/SpreadsheetTable";
import { ControlPanel } from "./components/ControlPanel";
import { SummaryCards } from "./components/SummaryCards";
import { PileSummary } from "./components/PileSummary";
import { DateHistoryPanel } from "./components/DateHistoryPanel";
import { AdminPanel } from "./components/AdminPanel";
import { Auth } from "./components/Auth";
import { Lot } from "./types/lot";
import { initializeLots } from "./utils/lotUtils";

import { supabase } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";
import { ShieldCheck, LayoutDashboard, LogOut, Menu, Clock, ShieldAlert } from "lucide-react";

export interface SavedState {
  date: string;
  lots: Lot[];
}

export function App() {
  // ─── Auth State ───────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(true);

  // ─── Data State ───────────────────────────────────────────
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLotIndex, setSelectedLotIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "history">("editor");
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ─── Loading / Syncing ────────────────────────────────────
  const [loadingData, setLoadingData] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // ─── View Mode ────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"dashboard" | "admin">("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stagedAction, setStagedAction] = useState<any | null>(null);

  // ======================== AUTH ========================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsAuthorizing(true);
        fetchRole(session.user.id);
      } else {
        setLoadingAuth(false);
        setIsAuthorizing(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          setIsAuthorizing(true);
        }
        fetchRole(session.user.id);
      } else {
        setRole(undefined);
        setLots([]);
        setSavedStates([]);
        setLoadingAuth(false);
        setIsAuthorizing(false);
        setLoadingData(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, is_banned")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      if (data?.is_banned === true) {
        // ── Ejection: banned user ──
        window.alert(
          "Access Denied: This account has been banned by an administrator.",
        );
        await supabase.auth.signOut();
        setSession(null);
        setRole(undefined);
        setIsAuthorizing(false);
        return;
      }

      if (data) setRole(data.role);
    } catch (error) {
      console.error("Error fetching role:", error);
    } finally {
      setLoadingAuth(false);
      setIsAuthorizing(false);
    }
  };

  // ======================== HEARTBEAT ========================
  useEffect(() => {
    if (!session) return;

    const pingLastActive = async () => {
      const { error } = await supabase.rpc("ping_last_active");
      if (error) console.error("Heartbeat error:", error);
    };

    // 1. Initial Ping
    pingLastActive();

    // 2. Interval Ping (every 5 minutes)
    const interval = setInterval(pingLastActive, 300000);

    // 3. Visibility Ping
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pingLastActive();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session]);

  // ======================== DATA FETCH ========================
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      // ── Lots ──
      const { data: lotsData, error: lotsError } = await supabase
        .from("lots")
        .select("*")
        .order("id", { ascending: true });

      if (lotsError) throw lotsError;

      if (!lotsData || lotsData.length === 0) {
        // Seed the 30 default lots
        const defaults = initializeLots(30);
        const rows = defaults.map((lot) => ({
          id: lot.id,
          gcv: lot.gcv,
          quantity: lot.quantity,
          original_gcv: lot.originalGcv,
          original_quantity: lot.originalQuantity,
          lots_added: lot.lotsAdded,
          lots_subtracted: lot.lotsSubtracted,
        }));

        const { error: insertError } = await supabase.from("lots").insert(rows);
        if (insertError) throw insertError;

        setLots(defaults);
      } else {
        // Map DB snake_case → TS camelCase
        const mapped: Lot[] = lotsData.map((row: any) => ({
          id: row.id,
          gcv: row.gcv,
          quantity: row.quantity,
          originalGcv: row.original_gcv,
          originalQuantity: row.original_quantity,
          lotsAdded: row.lots_added,
          lotsSubtracted: row.lots_subtracted,
        }));
        setLots(mapped);
      }

      // ── Saved States ──
      const { data: statesData, error: statesError } = await supabase
        .from("saved_states")
        .select("*")
        .order("state_date", { ascending: true });

      if (statesError) throw statesError;

      if (statesData && statesData.length > 0) {
        const mapped: SavedState[] = statesData.map((row: any) => ({
          date: row.state_date,
          lots: row.lots_data as Lot[],
        }));
        setSavedStates(mapped);
      } else {
        setSavedStates([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Fetch data when session becomes available (skip for pending users — they have no data access)
  useEffect(() => {
    if (session && !loadingAuth && role !== "pending") {
      fetchData();
    }
  }, [session, loadingAuth, role, fetchData]);

  // ── Realtime: auto-refresh role when admin approves a pending user ──
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("realtime_role_change")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const newRole = (payload.new as any)?.role;
          const isBanned = (payload.new as any)?.is_banned;

          if (isBanned) {
            window.alert(
              "Access Denied: This account has been banned by an administrator.",
            );
            supabase.auth.signOut();
            return;
          }

          if (newRole) {
            setRole((prevRole) => {
              // If transitioning from pending to an active role, refresh data
              if (prevRole === "pending" && newRole !== "pending") {
                fetchData();
              }
              return newRole;
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchData]);

  // ======================== DASHBOARD TRACKING ========================
  useEffect(() => {
    if (session && viewMode === "dashboard" && role !== "pending") {
      const logDashboardView = async () => {
        const { error } = await supabase.rpc("log_activity", {
          p_category: "SYSTEM",
          p_detail: "Viewed Dashboard",
          p_metadata: { action_type: "Page View" },
        });
        if (error) console.error(error);
      };
      logDashboardView();
    }
  }, [session, viewMode]);

  // ======================== LOT OPERATIONS ========================

  const syncLotToSupabase = async (lot: Lot) => {
    const { error } = await supabase
      .from("lots")
      .update({
        gcv: lot.gcv,
        quantity: lot.quantity,
        original_gcv: lot.originalGcv,
        original_quantity: lot.originalQuantity,
        lots_added: lot.lotsAdded,
        lots_subtracted: lot.lotsSubtracted,
      })
      .eq("id", lot.id);

    if (error) {
      console.error("Error syncing lot:", error);
      throw error;
    }
  };

  const handlePublishStagedData = async () => {
    if (!stagedAction) return;
    setSyncing(true);
    const { changedLot, type, pileName, sublotName, newQuantity, newGcv } =
      stagedAction;
    try {
      await syncLotToSupabase(changedLot);

      let detail = "";
      if (type === "ADD") detail = `Added ${newQuantity} MT at ${newGcv} GCV`;
      else if (type === "MERGE")
        detail = `Merged ${newQuantity} MT at ${newGcv} GCV`;
      else if (type === "SUBTRACT") detail = `Removed ${newQuantity} MT`;

      await supabase.rpc("log_activity", {
        p_category: "DATA_ENTRY",
        p_detail: detail,
        p_metadata: {
          action_type:
            type === "ADD"
              ? "Add New Lot"
              : type === "MERGE"
                ? "Merge Lot"
                : "Subtract Lot",
          target_pile: pileName,
          ...(sublotName ? { target_sublot: sublotName } : {}),
        },
      });

      setStagedAction(null);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddNewLot = async (
    index: number,
    gcv: number,
    quantity: number,
  ) => {
    const targetLot = lots[index];
    const pileNum = Math.floor(index / 5) + 1;
    const subLabel = ["A", "B", "C", "D", "E"][index % 5];

    let finalGcv = gcv;
    let finalQty = quantity;
    if (targetLot.quantity > 0) {
      finalQty = targetLot.quantity + quantity;
      finalGcv =
        (targetLot.gcv * targetLot.quantity + gcv * quantity) / finalQty;
    }

    setStagedAction({
      type: "ADD",
      pileName: `Pile ${pileNum}`,
      sublotName: subLabel,
      newGcv: Math.round(finalGcv),
      newQuantity: finalQty,
      changedLot: {
        ...targetLot,
        gcv: Math.round(finalGcv),
        quantity: finalQty,
        lotsAdded: targetLot.lotsAdded + 1,
      },
    });
  };

  const handleAddToExisting = async (
    lotIndex: number,
    gcv: number,
    quantity: number,
  ) => {
    const targetLot = lots[lotIndex];
    const pileNum = Math.floor(lotIndex / 5) + 1;
    const subLabel = ["A", "B", "C", "D", "E"][lotIndex % 5];

    const finalQty = targetLot.quantity + quantity;
    const finalGcv =
      (targetLot.gcv * targetLot.quantity + gcv * quantity) / finalQty;

    setStagedAction({
      type: "MERGE",
      pileName: `Pile ${pileNum}`,
      sublotName: subLabel,
      newGcv: Math.round(finalGcv),
      newQuantity: finalQty,
      changedLot: {
        ...targetLot,
        gcv: Math.round(finalGcv),
        quantity: finalQty,
        lotsAdded: targetLot.lotsAdded + 1,
      },
    });
  };

  const handleSubtractFromLot = async (lotIndex: number, quantity: number) => {
    const targetLot = lots[lotIndex];
    const pileNum = Math.floor(lotIndex / 5) + 1;
    const subLabel = ["A", "B", "C", "D", "E"][lotIndex % 5];

    const finalQty = Math.max(0, targetLot.quantity - quantity);

    setStagedAction({
      type: "SUBTRACT",
      pileName: `Pile ${pileNum}`,
      sublotName: subLabel,
      newGcv: targetLot.gcv,
      newQuantity: finalQty,
      changedLot: {
        ...targetLot,
        quantity: finalQty,
        lotsSubtracted: targetLot.lotsSubtracted + 1,
      },
    });
  };

  // ======================== INLINE EDIT & RESET ========================

  const handleEditLot = async (id: number, updatedValues: Partial<Lot>) => {
    const prevLots = lots;
    const oldLot = lots.find((l) => l.id === id);
    const newLots = lots.map((lot) =>
      lot.id === id ? { ...lot, ...updatedValues } : lot,
    );
    const changedLot = newLots.find((lot) => lot.id === id);
    if (!changedLot || !oldLot) return;

    const changes: string[] = [];
    for (const key of Object.keys(updatedValues) as (keyof Lot)[]) {
      if (oldLot[key] !== updatedValues[key]) {
        changes.push(`${key}: ${oldLot[key]} -> ${updatedValues[key]}`);
      }
    }
    const changeString =
      changes.length > 0 ? changes.join(", ") : "No changes made";

    setLots(newLots);
    setSyncing(true);
    try {
      await syncLotToSupabase(changedLot);
      const index = id - 1;
      const pileName = `Pile ${Math.floor(index / 5) + 1}`;
      const sublotName = ["A", "B", "C", "D", "E"][index % 5];
      await supabase.rpc("log_activity", {
        p_category: "DATA_ENTRY",
        p_detail: `Updated: ${changeString}`,
        p_metadata: {
          action_type: "Inline Edit",
          target_pile: pileName,
          target_sublot: sublotName,
        },
      });
    } catch {
      setLots(prevLots);
    } finally {
      setSyncing(false);
    }
  };

  const handleResetLot = async (id: number) => {
    const prevLots = lots;
    const resetValues: Partial<Lot> = {
      gcv: 0,
      quantity: 0,
      originalGcv: 0,
      originalQuantity: 0,
      lotsAdded: 0,
      lotsSubtracted: 0,
    };
    const newLots = lots.map((lot) =>
      lot.id === id ? { ...lot, ...resetValues } : lot,
    );
    const changedLot = newLots.find((lot) => lot.id === id);
    if (!changedLot) return;

    setLots(newLots);
    setSyncing(true);
    try {
      await syncLotToSupabase(changedLot);
      const index = id - 1;
      const pileName = `Pile ${Math.floor(index / 5) + 1}`;
      const sublotName = ["A", "B", "C", "D", "E"][index % 5];
      await supabase.rpc("log_activity", {
        p_category: "DATA_ENTRY",
        p_detail: "Cleared lot data to 0",
        p_metadata: {
          action_type: "Reset Lot",
          target_pile: pileName,
          target_sublot: sublotName,
        },
      });
    } catch {
      setLots(prevLots);
    } finally {
      setSyncing(false);
    }
  };

  // ======================== SAVED STATES ========================

  const handleLoadState = async (date: string) => {
    const state = savedStates.find((s) => s.date === date);
    if (!state) return;

    setSelectedDate(date);
    setSelectedLotIndex(null);
    setLots(state.lots);
    setSyncing(true);

    try {
      // Bulk update all 30 lots to match the historical snapshot
      const updates = state.lots.map((lot) =>
        supabase
          .from("lots")
          .update({
            gcv: lot.gcv,
            quantity: lot.quantity,
            original_gcv: lot.originalGcv,
            original_quantity: lot.originalQuantity,
            lots_added: lot.lotsAdded,
            lots_subtracted: lot.lotsSubtracted,
          })
          .eq("id", lot.id),
      );

      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      await supabase.rpc("log_activity", {
        p_category: "SYSTEM",
        p_detail: "Loaded historical snapshot",
        p_metadata: { action_type: "Load State" },
      });
    } catch (error) {
      console.error("Error restoring lots from snapshot:", error);
      // Re-fetch to get consistent state
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteState = async (date: string) => {
    setSyncing(true);
    try {
      const { error } = await supabase
        .from("saved_states")
        .delete()
        .eq("state_date", date);

      if (error) throw error;

      setSavedStates(savedStates.filter((s) => s.date !== date));
      if (selectedDate === date) {
        setSelectedDate(null);
      }
      await supabase.rpc("log_activity", {
        p_category: "DATA_ENTRY",
        p_detail: `Deleted historical state for ${date}`,
      });
    } catch (error) {
      console.error("Error deleting state:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    await supabase.rpc("log_activity", {
      p_category: "AUTH",
      p_detail: "User signed out",
      p_metadata: { action_type: "Sign Out" },
    });
    await supabase.auth.signOut();
  };

  // ======================== HELPERS ========================
  const canAccessAdmin = role === "superadmin" || role === "admin";

  // ======================== RENDER ========================

  if (loadingAuth && !isAuthorizing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100 overflow-hidden">
        <div className="text-[#003B70] text-lg font-medium">Loading...</div>
      </div>
    );
  }

  const isResettingPassword =
    localStorage.getItem("isResettingPassword") === "true";

  if (isAuthorizing) {
    return (
      <div className="h-screen w-full bg-slate-100 flex items-center justify-center">
        <div className="border-4 border-slate-200 border-t-[#003B70] rounded-full w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!session || isResettingPassword) {
    return <Auth />;
  }

  if (loadingData && role !== "pending") {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-100 gap-3 overflow-hidden">
        <div className="border-4 border-slate-200 border-t-[#003B70] rounded-full w-8 h-8 animate-spin" />
        <div className="text-[#003B70] text-lg font-medium">
          Loading data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100 md:h-screen md:overflow-hidden">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <header className="bg-[#003B70] text-white shadow-sm shrink-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Left — Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight truncate sm:text-lg">
                <span className="sm:hidden">GCV Manager</span>
                <span className="hidden sm:inline">GCV & Quantity Manager</span>
              </h1>
              <p className="text-slate-400 text-sm mt-0.5 flex gap-2 items-center">
                <span className="hidden sm:inline">
                  Pile-1 to Pile-6 (A-E) • Dynamic GCV
                </span>
                {role && (
                  <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-md text-xs uppercase font-bold tracking-wider shadow-sm border border-amber-600">
                    {role}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right — Desktop Controls */}
          <div className="hidden md:flex items-center gap-4">
            {syncing && (
              <span className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <span className="w-2 h-2 bg-slate-500 rounded-sm animate-pulse" />
                Syncing…
              </span>
            )}
            {session?.user?.email && (
              <span className="text-sm text-slate-200 truncate max-w-[200px]">
                {session.user.email}
              </span>
            )}

            {/* Admin toggle — only for superadmin / admin */}
            {canAccessAdmin && (
              <button
                onClick={() =>
                  setViewMode(viewMode === "dashboard" ? "admin" : "dashboard")
                }
                className="flex justify-center items-center gap-2 text-sm px-3 py-1.5 rounded-md font-medium transition-colors border border-transparent cursor-pointer bg-[#003B70] hover:bg-[#002A50] text-white"
              >
                {viewMode === "admin" ? (
                  <>
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </>
                )}
              </button>
            )}

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#003B70] hover:bg-[#002A50] text-white rounded-md transition-colors font-medium border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Right — Mobile Hamburger */}
          <div className="md:hidden flex items-center gap-3">
            {syncing && (
              <span className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-sm animate-pulse" />
                Syncing
              </span>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -mr-2 rounded-md hover:bg-[#002A50] transition-colors"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#003B70] border-t border-[#002A50] shadow-xl p-4 flex flex-col gap-4 z-50">
            {session?.user?.email && (
              <span className="text-slate-300 text-sm font-medium border-b border-[#002A50] pb-3 mb-1">
                {session.user.email}
              </span>
            )}

            {canAccessAdmin && (
              <button
                onClick={() => {
                  setViewMode(viewMode === "dashboard" ? "admin" : "dashboard");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex justify-center items-center gap-2 text-sm px-3 py-2 rounded-md font-medium transition-colors bg-[#002A50] hover:bg-slate-800 text-white"
              >
                {viewMode === "admin" ? (
                  <>
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex justify-center items-center gap-2 text-sm px-3 py-2 rounded-md font-medium transition-colors bg-[#002A50] hover:bg-slate-800 text-white"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </header>

      {stagedAction && (
        <div className="sticky top-0 left-0 w-full z-50 bg-white border-b-2 border-b-[#F58220] shadow-md px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-[#F58220] font-bold text-lg">⚠️</span>
            <p className="text-sm text-slate-700 italic font-medium">
              Are you sure you want to publish this data? Later, only a
              Superadmin can change it.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStagedAction(null)}
              className="text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublishStagedData}
              className="bg-[#003B70] hover:bg-[#002A50] text-white px-6 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors"
            >
              Publish Data
            </button>
          </div>
        </div>
      )}

      {/* ─── Scrollable Content Pane ────────────────────────── */}
      <main className="flex-1 w-full p-2 sm:p-4 md:overflow-y-auto">
        {/* ─── Admin Panel View ───────────────────────────────── */}
        {viewMode === "admin" && canAccessAdmin && (
          <AdminPanel currentRole={role!} />
        )}

        {/* ─── Dashboard View ─────────────────────────────────── */}
        {viewMode === "dashboard" && (
          <div className="max-w-7xl mx-auto w-full">
            {/* ── Pending Approval Screen ── */}
            {role === "pending" && (
              <div className="flex items-center justify-center py-24 px-4">
                <div className="max-w-lg w-full text-center">
                  {/* Icon */}
                  <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-6">
                    <Clock className="w-10 h-10 text-amber-500" />
                  </div>

                  {/* Heading */}
                  <h2 className="text-2xl font-bold text-slate-800 mb-3">
                    Access Pending Approval
                  </h2>

                  {/* Message */}
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                    Your account has been created successfully. Please contact an
                    administrator to approve your access to the application.
                  </p>

                  {/* Info Card */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-left">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800 mb-1">
                          What happens next?
                        </p>
                        <ul className="text-xs text-amber-700 space-y-1.5">
                          <li className="flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                            An admin will review and approve your account
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                            Once approved, this page will automatically refresh
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                            You'll then have access based on your assigned role
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Subtle pulse indicator */}
                  <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Waiting for admin approval…
                  </div>
                </div>
              </div>
            )}

            {/* Tab bar — hidden from viewers and pending */}
            {role !== "viewer" && role !== "pending" && (
              <div className="flex border-b border-slate-200 mb-6 hidden">
                <button
                  onClick={() => setActiveTab("editor")}
                  className={`px-6 py-3 text-sm transition-colors cursor-pointer -mb-px ${
                    activeTab === "editor"
                      ? "border-b-2 border-[#003B70] text-[#003B70] font-semibold bg-transparent"
                      : "border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium"
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-6 py-3 text-sm transition-colors cursor-pointer -mb-px ${
                    activeTab === "history"
                      ? "border-b-2 border-[#003B70] text-[#003B70] font-semibold bg-transparent"
                      : "border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium"
                  }`}
                >
                  Date History
                </button>
              </div>
            )}

            {/* Viewer: Only summary cards and pile summary */}
            {role === "viewer" && (
              <>
                <SummaryCards lots={lots} />
                <PileSummary lots={lots} />
              </>
            )}

            {/* Non-viewer, non-pending: Full editor and history */}
            {role !== "viewer" && role !== "pending" && activeTab === "editor" && (
              <>
                <SummaryCards lots={lots} />
                <PileSummary lots={lots} />

                <ControlPanel
                  onAddNewLot={handleAddNewLot}
                  onAddToExisting={handleAddToExisting}
                  onSubtractFromLot={handleSubtractFromLot}
                  selectedLotIndex={selectedLotIndex}
                  lots={lots}
                  role={role}
                  stagedAction={stagedAction}
                />

                <SpreadsheetTable
                  lots={lots}
                  selectedLotIndex={selectedLotIndex}
                  onSelectLot={setSelectedLotIndex}
                  onEditLot={handleEditLot}
                  onResetLot={handleResetLot}
                  role={role}
                  stagedAction={stagedAction}
                />
              </>
            )}

            {role !== "viewer" && role !== "pending" && activeTab === "history" && (
              <div className="hidden">
                <DateHistoryPanel
                  savedStates={savedStates}
                  selectedDate={selectedDate}
                  onLoadState={handleLoadState}
                  onDeleteState={handleDeleteState}
                  role={role}
                />
              </div>
            )}
          </div>
        )}
        <footer className="w-full bg-white border-t border-slate-200 mt-16 py-6 px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left shrink-0 text-xs text-slate-500 font-medium font-['Inter']">
          <p>
            &copy; {new Date().getFullYear()} GCV & Quantity Manager. All rights
            reserved.
          </p>
          <p className="text-slate-600">
            Conceptualized & Developed by{" "}
            <span className="font-bold text-[#003B70]">
              Dr. Vijay Kumar Garg
            </span>
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>{" "}
              System Operational
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-slate-400">v1.0.0</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
