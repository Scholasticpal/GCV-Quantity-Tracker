import { useState, useEffect } from "react";
import { SpreadsheetTable } from "./components/SpreadsheetTable";
import { ControlPanel } from "./components/ControlPanel";
import { SummaryCards } from "./components/SummaryCards";
import { PileSummary } from "./components/PileSummary";
import { DateHistoryPanel } from "./components/DateHistoryPanel";
import { Auth } from "./components/Auth";
import { Lot } from "./types/lot";
import { initializeLots, addNewLot, addLotToExisting, subtractFromLot } from "./utils/lotUtils";
import { format } from "date-fns";
import { supabase } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";

export interface SavedState {
  date: string;
  lots: Lot[];
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [lots, setLots] = useState<Lot[]>(() => initializeLots(30));
  const [selectedLotIndex, setSelectedLotIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "history">("editor");
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchRole(session.user.id);
      } else {
        setRole(undefined);
        setLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();
      
      if (error) throw error;
      if (data) setRole(data.role);
    } catch (error) {
      console.error("Error fetching role:", error);
    } finally {
      setLoadingAuth(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("gcv-saved-states");
    if (stored) {
      try {
        setSavedStates(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved states");
      }
    }
  }, []);

  const saveToStorage = (states: SavedState[]) => {
    localStorage.setItem("gcv-saved-states", JSON.stringify(states));
  };

  const handleAddNewLot = (gcv: number, quantity: number) => {
    setLots((prevLots) => addNewLot(prevLots, gcv, quantity));
  };

  const handleAddToExisting = (lotIndex: number, gcv: number, quantity: number) => {
    setLots((prevLots) => addLotToExisting(prevLots, lotIndex, gcv, quantity));
  };

  const handleSubtractFromLot = (lotIndex: number, quantity: number) => {
    setLots((prevLots) => subtractFromLot(prevLots, lotIndex, quantity));
  };

  const handleSaveCurrentState = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const existingIndex = savedStates.findIndex((s) => s.date === today);
    
    let newStates: SavedState[];
    if (existingIndex >= 0) {
      newStates = savedStates.map((s, i) =>
        i === existingIndex ? { ...s, lots: lots } : s
      );
    } else {
      newStates = [...savedStates, { date: today, lots }];
    }
    
    setSavedStates(newStates);
    saveToStorage(newStates);
  };

  const handleLoadState = (date: string) => {
    const state = savedStates.find((s) => s.date === date);
    if (state) {
      setLots(state.lots);
      setSelectedDate(date);
      setSelectedLotIndex(null);
    }
  };

  const handleDeleteState = (date: string) => {
    const newStates = savedStates.filter((s) => s.date !== date);
    setSavedStates(newStates);
    saveToStorage(newStates);
    if (selectedDate === date) {
      setSelectedDate(null);
    }
  };

  const handleClearAll = () => {
    setLots(initializeLots(30));
    setSelectedLotIndex(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-emerald-700 text-lg font-medium">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-emerald-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">GCV & Quantity Manager</h1>
            <p className="text-emerald-100 mt-1 text-sm flex gap-2 items-center">
              <span>Track Pile-1 to Pile-6 (A-E each) with dynamic GCV calculations</span>
              {role && (
                <span className="px-2 py-0.5 bg-emerald-600 rounded text-xs uppercase font-bold tracking-wider">
                  {role}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm bg-emerald-800 hover:bg-emerald-900 px-4 py-2 rounded-lg transition-colors font-medium border border-emerald-600"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex border-b border-slate-300 mb-6">
          <button
            onClick={() => setActiveTab("editor")}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === "editor"
                ? "text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === "history"
                ? "text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            Date History
          </button>
        </div>

        {activeTab === "editor" && (
          <>
            {role !== "viewer" && (
              <div className="flex gap-3 mb-4">
                <button
                  onClick={handleSaveCurrentState}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  Save Today's Data
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                >
                  Clear All
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
            />
          </>
        )}

        {activeTab === "history" && (
          <DateHistoryPanel
            savedStates={savedStates}
            selectedDate={selectedDate}
            onLoadState={handleLoadState}
            onDeleteState={handleDeleteState}
            role={role}
          />
        )}
      </div>
    </div>
  );
}