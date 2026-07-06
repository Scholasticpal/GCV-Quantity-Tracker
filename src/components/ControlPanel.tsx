import { useState, ChangeEvent, useEffect } from "react";
import { Lot } from "../types/lot";
import { Plus, Minus } from "lucide-react";
import { getLotLabel, getPileNumber, getSubLabel } from "../utils/lotUtils";
import { PILE_THEMES } from "../utils/lotUtils";

const MAX_VALUE = 1000000;
const SUB_LABELS = ["A", "B", "C", "D", "E"];

interface ControlPanelProps {
  onAddNewLot: (index: number, gcv: number, quantity: number) => void;
  onAddToExisting: (lotIndex: number, gcv: number, quantity: number) => void;
  onSubtractFromLot: (lotIndex: number, quantity: number) => void;
  selectedLotIndex: number | null;
  lots: Lot[];
  role?: string;
  stagedAction?: any;
}



export function ControlPanel({
  onAddNewLot,
  onAddToExisting,
  onSubtractFromLot,
  selectedLotIndex,
  lots,
  role,
  stagedAction,
}: ControlPanelProps) {
  const [addGcv, setAddGcv] = useState("");
  const [addQuantity, setAddQuantity] = useState("");
  const [selectedTargetPile, setSelectedTargetPile] = useState(1);
  const [selectedTargetSub, setSelectedTargetSub] = useState("A");
  const [subtractQuantity, setSubtractQuantity] = useState("");
  const [addToExistingGcv, setAddToExistingGcv] = useState("");
  const [addToExistingQuantity, setAddToExistingQuantity] = useState("");

  const isViewer = role === "viewer";

  const handleAddNewLot = () => {
    const gcv = parseFloat(addGcv);
    const quantity = parseFloat(addQuantity);

    if (isNaN(gcv) || isNaN(quantity) || gcv < 0 || quantity < 0 || gcv > MAX_VALUE || quantity > MAX_VALUE) {
      return;
    }

    const targetIndex = (selectedTargetPile - 1) * 5 + SUB_LABELS.indexOf(selectedTargetSub);
    onAddNewLot(targetIndex, gcv, quantity);
  };

  const handleAddToExisting = () => {
    if (selectedLotIndex === null) {
      return;
    }

    const gcv = parseFloat(addToExistingGcv);
    const quantity = parseFloat(addToExistingQuantity);

    if (isNaN(gcv) || isNaN(quantity) || gcv < 0 || quantity < 0 || gcv > MAX_VALUE || quantity > MAX_VALUE) {
      return;
    }

    onAddToExisting(selectedLotIndex, gcv, quantity);
  };

  const handleSubtract = () => {
    if (selectedLotIndex === null) {
      return;
    }

    const quantity = parseFloat(subtractQuantity);

    if (isNaN(quantity) || quantity < 0 || quantity > MAX_VALUE) {
      return;
    }

    onSubtractFromLot(selectedLotIndex, quantity);
  };

  // ─── Reactive Sync Effects ──────────────────────────────────────────

  // Clear inputs when staging is cancelled or published
  useEffect(() => {
    if (stagedAction === null) {
      setAddGcv("");
      setAddQuantity("");
      setAddToExistingGcv("");
      setAddToExistingQuantity("");
      setSubtractQuantity("");
    }
  }, [stagedAction]);

  // Reactive Sync: Add New Lot
  useEffect(() => {
    if (stagedAction?.type === 'ADD' && stagedAction.pileName === `Pile ${selectedTargetPile}` && stagedAction.sublotName === selectedTargetSub) {
      if (addGcv !== "" && addQuantity !== "") {
        handleAddNewLot();
      }
    }
  }, [addGcv, addQuantity, selectedTargetPile, selectedTargetSub]);

  // Reactive Sync: Merge
  useEffect(() => {
    if (stagedAction?.type === 'MERGE' && selectedLotIndex !== null) {
      const selectedPile = getPileNumber(lots[selectedLotIndex].id);
      const selectedSub = getSubLabel(lots[selectedLotIndex].id);
      if (stagedAction.pileName === `Pile ${selectedPile}` && stagedAction.sublotName === selectedSub) {
        if (addToExistingGcv !== "" && addToExistingQuantity !== "") {
          handleAddToExisting();
        }
      }
    }
  }, [addToExistingGcv, addToExistingQuantity, selectedLotIndex]);

  // Reactive Sync: Subtract
  useEffect(() => {
    if (stagedAction?.type === 'SUBTRACT' && selectedLotIndex !== null) {
      const selectedPile = getPileNumber(lots[selectedLotIndex].id);
      const selectedSub = getSubLabel(lots[selectedLotIndex].id);
      if (stagedAction.pileName === `Pile ${selectedPile}` && stagedAction.sublotName === selectedSub) {
        if (subtractQuantity !== "") {
          handleSubtract();
        }
      }
    }
  }, [subtractQuantity, selectedLotIndex]);


  const selectedLot = selectedLotIndex !== null ? lots[selectedLotIndex] : null;
  const selectedLotLabel = selectedLot ? getLotLabel(selectedLot.id) : "";
  const selectedPileNumber = selectedLot ? getPileNumber(selectedLot.id) : 0;

  // Preview of the target lot for "Add New Lot"
  const targetIndex = (selectedTargetPile - 1) * 5 + SUB_LABELS.indexOf(selectedTargetSub);
  const targetLot = lots[targetIndex] || null;
  const targetLabel = targetLot ? getLotLabel(targetLot.id) : `Pile-${selectedTargetPile} : ${selectedTargetSub}`;

  if (isViewer) {
    return (
      <div className="mb-6 p-4 bg-slate-50 text-slate-700 rounded-md border border-slate-200 shadow-sm flex items-center justify-center">
        <p className="font-medium">You are in Viewer mode. Editing controls are disabled.</p>
      </div>
    );
  }

  const selectClasses =
    "w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-md border border-slate-200 p-4">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-slate-800" />
          Add New Lot
        </h3>
        <div className="space-y-3">
          {/* Pile & Sub-lot dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="targetPile" className="text-sm font-medium text-slate-700">
                Pile
              </label>
              <select
                id="targetPile"
                value={selectedTargetPile}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setSelectedTargetPile(Number(e.target.value))
                }
                className={`mt-1 ${selectClasses}`}
                disabled={isViewer}
              >
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <option key={p} value={p}>
                    Pile {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="targetSub" className="text-sm font-medium text-slate-700">
                Sub-lot
              </label>
              <select
                id="targetSub"
                value={selectedTargetSub}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setSelectedTargetSub(e.target.value)
                }
                className={`mt-1 ${selectClasses}`}
                disabled={isViewer}
              >
                {SUB_LABELS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target preview */}
          {targetLot && (
            <div className={`p-3 rounded-md font-medium border-l-4 ${PILE_THEMES[selectedTargetPile]?.bgSoft} ${PILE_THEMES[selectedTargetPile]?.borderLeft} ${PILE_THEMES[selectedTargetPile]?.text}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">{targetLabel}</span>
                {targetLot.quantity > 0 ? (
                  <span className="text-xs ml-auto">
                    {targetLot.gcv.toLocaleString()} kcal · {targetLot.quantity.toLocaleString()} MT
                  </span>
                ) : (
                  <span className="text-xs opacity-70 ml-auto">Empty</span>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="newGcv" className="text-sm font-medium text-slate-700">
              GCV (kcal/kg)
            </label>
            <input
              id="newGcv"
              type="number"
              min="0"
              max={MAX_VALUE}
              value={addGcv}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddGcv(e.target.value)}
              placeholder="e.g., 4500"
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
              disabled={isViewer}
            />
          </div>
          <div>
            <label htmlFor="newQuantity" className="text-sm font-medium text-slate-700">
              Quantity (MT)
            </label>
            <input
              id="newQuantity"
              type="number"
              min="0"
              max={MAX_VALUE}
              value={addQuantity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddQuantity(e.target.value)}
              placeholder="e.g., 1000"
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
              disabled={isViewer}
            />
          </div>
          <button
            onClick={handleAddNewLot}
            className="w-full bg-[#003B70] hover:bg-[#002A50] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
            disabled={isViewer}
          >
            Add to Selected Location
          </button>
          <p className="text-xs text-slate-500 italic">
            If the location has data, GCV will be merged via weighted average
          </p>
        </div>
      </div>

      <div className="bg-white rounded-md border border-slate-200 p-4 relative overflow-hidden">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-slate-800" />
          Add to Selected Lot
        </h3>
        
        {/* Overlay for disabled state */}
        {!selectedLot && (
          <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-slate-50/60 flex items-center justify-center rounded-md border border-transparent">
            <span className="bg-white text-[#003B70] font-semibold text-sm px-4 py-2 rounded-full shadow-md border border-slate-200">Select an entry from the table first</span>
          </div>
        )}

        {selectedLot && (
          <div className={`p-3 rounded-md mb-4 font-medium border ${PILE_THEMES[selectedPileNumber]?.bgSoft} ${PILE_THEMES[selectedPileNumber]?.borderLight} ${PILE_THEMES[selectedPileNumber]?.text}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold">{selectedLotLabel}</span>
            </div>
            <span className="text-sm">
              Current: {selectedLot.gcv.toLocaleString()} kcal/kg, {selectedLot.quantity.toLocaleString()} MT
            </span>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label htmlFor="existingGcv" className="text-sm font-medium text-slate-700">
              New Lot GCV (kcal/kg)
            </label>
            <input
              id="existingGcv"
              type="number"
              min="0"
              max={MAX_VALUE}
              value={addToExistingGcv}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddToExistingGcv(e.target.value)}
              placeholder="e.g., 5000"
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
              disabled={selectedLotIndex === null || isViewer}
            />
          </div>
          <div>
            <label htmlFor="existingQuantity" className="text-sm font-medium text-slate-700">
              New Lot Quantity (MT)
            </label>
            <input
              id="existingQuantity"
              type="number"
              min="0"
              max={MAX_VALUE}
              value={addToExistingQuantity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddToExistingQuantity(e.target.value)}
              placeholder="e.g., 500"
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
              disabled={selectedLotIndex === null || isViewer}
            />
          </div>
          <button
            onClick={handleAddToExisting}
            className="w-full bg-[#003B70] hover:bg-[#002A50] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
            disabled={selectedLotIndex === null || isViewer}
          >
            Merge with Selected
          </button>
          <p className="text-xs text-slate-500 italic">
            GCV will be calculated using weighted average
          </p>
        </div>
      </div>

      <div className="bg-white rounded-md border border-slate-200 p-4 relative overflow-hidden">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Minus className="w-5 h-5 text-slate-800" />
          Subtract Quantity
        </h3>

        {/* Overlay for disabled state */}
        {!selectedLot && (
          <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-slate-50/60 flex items-center justify-center rounded-md border border-transparent">
            <span className="bg-white text-[#003B70] font-semibold text-sm px-4 py-2 rounded-full shadow-md border border-slate-200">Select an entry from the table first</span>
          </div>
        )}

        {selectedLot && (
          <div className={`mb-3 p-3 rounded-md border font-medium ${PILE_THEMES[selectedPileNumber]?.bgSoft} ${PILE_THEMES[selectedPileNumber]?.borderLight} ${PILE_THEMES[selectedPileNumber]?.text}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold">{selectedLotLabel}</span>
            </div>
            <span className="text-sm">
              Available: {selectedLot.quantity.toLocaleString()} MT
            </span>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label htmlFor="subtractQty" className="text-sm font-medium text-slate-700">
              Quantity to Subtract (MT)
            </label>
            <input
              id="subtractQty"
              type="number"
              min="0"
              max={MAX_VALUE}
              value={subtractQuantity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSubtractQuantity(e.target.value)}
              placeholder="e.g., 200"
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
              disabled={selectedLotIndex === null || isViewer}
            />
          </div>
          <button
            onClick={handleSubtract}
            className="w-full bg-[#003B70] hover:bg-[#002A50] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
            disabled={selectedLotIndex === null || isViewer}
          >
            Subtract from Selected
          </button>
          <p className="text-xs text-slate-500 italic">
            GCV remains unchanged; only quantity decreases
          </p>
        </div>
      </div>
    </div>
  );
}