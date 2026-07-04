import { useState, useEffect, useCallback } from "react";
import { SpreadsheetTable } from "./components/SpreadsheetTable";
import { ControlPanel } from "./components/ControlPanel";
import { SummaryCards } from "./components/SummaryCards";
import { PileSummary } from "./components/PileSummary";
import { DateHistoryPanel } from "./components/DateHistoryPanel";
import { AdminPanel } from "./components/AdminPanel";
import { Auth } from "./components/Auth";
import { Lot } from "./types/lot";
import { initializeLots, addLotToExisting, subtractFromLot } from "./utils/lotUtils";
import { format } from "date-fns";
import { supabase } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";
import { ShieldCheck, LayoutDashboard, LogOut } from "lucide-react";

export interface SavedState {
  date: string;
  lots: Lot[];
}

export default function App() {
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

  // ======================== AUTH ========================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsAuthorizing(true);
        fetchRole(session.user.id);
      }
      else {
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
        window.alert("Access Denied: This account has been banned by an administrator.");
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

  // Fetch data when session becomes available
  useEffect(() => {
    if (session && !loadingAuth) {
      fetchData();
    }
  }, [session, loadingAuth, fetchData]);

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

  const handleAddNewLot = async (index: number, gcv: number, quantity: number) => {
    if (index < 0 || index >= lots.length) return;

    const targetLot = lots[index];
    let newLots: Lot[];

    if (targetLot.quantity === 0) {
      // Empty slot: direct insert/set
      newLots = lots.map((lot, i) => {
        if (i === index) {
          return {
            ...lot,
            gcv,
            quantity,
            originalGcv: gcv,
            originalQuantity: quantity,
            lotsAdded: 1,
          };
        }
        return lot;
      });
    } else {
      // Slot has data: weighted average merge (same as addLotToExisting)
      newLots = addLotToExisting(lots, index, gcv, quantity);
      if (newLots === lots) return;
    }

    const changedLot = newLots[index];
    const prevLots = lots;
    setLots(newLots);
    setSyncing(true);
    try {
      await syncLotToSupabase(changedLot);
    } catch {
      setLots(prevLots);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddToExisting = async (lotIndex: number, gcv: number, quantity: number) => {
    const newLots = addLotToExisting(lots, lotIndex, gcv, quantity);
    if (newLots === lots) return;

    const changedLot = newLots[lotIndex];
    setLots(newLots);
    setSyncing(true);
    try {
      await syncLotToSupabase(changedLot);
    } catch {
      setLots(lots);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubtractFromLot = async (lotIndex: number, quantity: number) => {
    const newLots = subtractFromLot(lots, lotIndex, quantity);
    if (newLots === lots) return;

    const changedLot = newLots[lotIndex];
    setLots(newLots);
    setSyncing(true);
    try {
      await syncLotToSupabase(changedLot);
    } catch {
      setLots(lots);
    } finally {
      setSyncing(false);
    }
  };

  // ======================== INLINE EDIT & RESET ========================

  const handleEditLot = async (id: number, updatedValues: Partial<Lot>) => {
    const prevLots = lots;
    const newLots = lots.map((lot) =>
      lot.id === id ? { ...lot, ...updatedValues } : lot
    );
    const changedLot = newLots.find((lot) => lot.id === id);
    if (!changedLot) return;

    setLots(newLots);
    setSyncing(true);
    try {
      await syncLotToSupabase(changedLot);
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
      lot.id === id ? { ...lot, ...resetValues } : lot
    );
    const changedLot = newLots.find((lot) => lot.id === id);
    if (!changedLot) return;

    setLots(newLots);
    setSyncing(true);
    try {
      await syncLotToSupabase(changedLot);
    } catch {
      setLots(prevLots);
    } finally {
      setSyncing(false);
    }
  };

  // ======================== SAVED STATES ========================

  const handleSaveCurrentState = async () => {
    const today = format(new Date(), "yyyy-MM-dd");

    setSyncing(true);
    try {
      const { error } = await supabase
        .from("saved_states")
        .upsert(
          { state_date: today, lots_data: lots },
          { onConflict: "state_date" }
        );

      if (error) throw error;

      // Update local state
      const existingIndex = savedStates.findIndex((s) => s.date === today);
      if (existingIndex >= 0) {
        setSavedStates(
          savedStates.map((s, i) =>
            i === existingIndex ? { ...s, lots } : s
          )
        );
      } else {
        setSavedStates([...savedStates, { date: today, lots }]);
      }
    } catch (error) {
      console.error("Error saving state:", error);
    } finally {
      setSyncing(false);
    }
  };

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
          .eq("id", lot.id)
      );

      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
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
    } catch (error) {
      console.error("Error deleting state:", error);
    } finally {
      setSyncing(false);
    }
  };



  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    await supabase.auth.signOut();
  };

  // ======================== HELPERS ========================
  const canAccessAdmin = role === "superadmin" || role === "admin";

  // ======================== RENDER ========================

  if (loadingAuth && !isAuthorizing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100 overflow-hidden">
        <div className="text-emerald-700 text-lg font-medium">Loading...</div>
      </div>
    );
  }

  const isResettingPassword = localStorage.getItem("isResettingPassword") === "true";

  if (isAuthorizing) {
    return (
      <div className="h-screen w-full bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || isResettingPassword) {
    return <Auth />;
  }

  if (loadingData) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-100 gap-3 overflow-hidden">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <div className="text-emerald-700 text-lg font-medium">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100 md:h-screen md:overflow-hidden">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <header className="bg-emerald-700 text-white shadow-sm shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
          {/* Left — Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate sm:text-2xl">
                <span className="sm:hidden">GCV Manager</span>
                <span className="hidden sm:inline">GCV & Quantity Manager</span>
              </h1>
              <p className="text-emerald-200 text-xs mt-0.5 flex gap-2 items-center">
                <span className="hidden sm:inline">Pile-1 to Pile-6 (A-E) • Dynamic GCV</span>
                {role && (
                  <span className="px-2 py-0.5 bg-emerald-600 rounded text-xs uppercase font-bold tracking-wider">
                    {role}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right — Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {syncing && (
              <span className="hidden sm:flex items-center gap-2 text-emerald-200 text-xs font-medium">
                <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                Syncing…
              </span>
            )}

            {/* Admin toggle — only for superadmin / admin */}
            {canAccessAdmin && (
              <button
                onClick={() => setViewMode(viewMode === "dashboard" ? "admin" : "dashboard")}
                className={`w-40 flex-shrink-0 whitespace-nowrap flex justify-center items-center gap-2 text-xs px-2 py-1 sm:text-sm sm:px-3 sm:py-1.5 rounded-lg font-medium transition-colors border cursor-pointer ${
                  viewMode === "admin"
                    ? "bg-white text-emerald-700 border-white hover:bg-emerald-50"
                    : "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500"
                }`}
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
              className="inline-flex items-center whitespace-nowrap flex-shrink-0 gap-1.5 text-xs px-2 py-1 sm:text-sm sm:px-3 sm:py-1.5 bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors font-medium border border-emerald-600 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Scrollable Content Pane ────────────────────────── */}
      <main className="flex-1 w-full p-2 sm:p-4 md:overflow-y-auto">
        {/* ─── Admin Panel View ───────────────────────────────── */}
        {viewMode === "admin" && canAccessAdmin && (
          <AdminPanel currentRole={role!} />
        )}

        {/* ─── Dashboard View ─────────────────────────────────── */}
        {viewMode === "dashboard" && (
          <div className="max-w-7xl mx-auto w-full">
            {/* Tab bar — hidden from viewers */}
            {role !== "viewer" && (
              <div className="flex border-b border-slate-300 mb-6">
                <button
                  onClick={() => setActiveTab("editor")}
                  className={`px-6 py-3 font-medium text-sm transition-colors cursor-pointer ${activeTab === "editor"
                      ? "text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-6 py-3 font-medium text-sm transition-colors cursor-pointer ${activeTab === "history"
                      ? "text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
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

            {/* Non-viewer: Full editor and history */}
            {role !== "viewer" && activeTab === "editor" && (
              <>
                {role === "superadmin" && (
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={handleSaveCurrentState}
                      disabled={syncing}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {syncing ? "Saving…" : "Save Today's Data"}
                    </button>
                  </div>
                )}

                <SummaryCards lots={lots} />
                <PileSummary lots={lots} />

                <ControlPanel
                  onAddNewLot={handleAddNewLot}
                  onAddToExisting={handleAddToExisting}
                  onSubtractFromLot={handleSubtractFromLot}
                  selectedLotIndex={selectedLotIndex}
                  lots={lots}
                  role={role}
                />

                <SpreadsheetTable
                  lots={lots}
                  selectedLotIndex={selectedLotIndex}
                  onSelectLot={setSelectedLotIndex}
                  onEditLot={handleEditLot}
                  onResetLot={handleResetLot}
                  role={role}
                />
              </>
            )}

            {role !== "viewer" && activeTab === "history" && (
              <DateHistoryPanel
                savedStates={savedStates}
                selectedDate={selectedDate}
                onLoadState={handleLoadState}
                onDeleteState={handleDeleteState}
                role={role}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}