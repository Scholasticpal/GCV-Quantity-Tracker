import { useState, ChangeEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Lot } from "../types/lot";
import { Plus, Minus } from "lucide-react";
import { getLotLabel, getPileNumber } from "../utils/lotUtils";

interface ControlPanelProps {
  onAddNewLot: (gcv: number, quantity: number) => void;
  onAddToExisting: (lotIndex: number, gcv: number, quantity: number) => void;
  onSubtractFromLot: (lotIndex: number, quantity: number) => void;
  selectedLotIndex: number | null;
  lots: Lot[];
}

const PILE_COLORS: Record<number, { bg: string; text: string; dot: string }> = {
  1: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  2: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  3: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  4: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  5: { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  6: { bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-500" },
};

export function ControlPanel({
  onAddNewLot,
  onAddToExisting,
  onSubtractFromLot,
  selectedLotIndex,
  lots,
}: ControlPanelProps) {
  const [addGcv, setAddGcv] = useState("");
  const [addQuantity, setAddQuantity] = useState("");
  const [subtractQuantity, setSubtractQuantity] = useState("");
  const [addToExistingGcv, setAddToExistingGcv] = useState("");
  const [addToExistingQuantity, setAddToExistingQuantity] = useState("");

  const handleAddNewLot = () => {
    const gcv = parseFloat(addGcv);
    const quantity = parseFloat(addQuantity);

    if (isNaN(gcv) || isNaN(quantity) || gcv <= 0 || quantity <= 0) {
      return;
    }

    onAddNewLot(gcv, quantity);
    setAddGcv("");
    setAddQuantity("");
  };

  const handleAddToExisting = () => {
    if (selectedLotIndex === null) {
      return;
    }

    const gcv = parseFloat(addToExistingGcv);
    const quantity = parseFloat(addToExistingQuantity);

    if (isNaN(gcv) || isNaN(quantity) || gcv <= 0 || quantity <= 0) {
      return;
    }

    onAddToExisting(selectedLotIndex, gcv, quantity);
    setAddToExistingGcv("");
    setAddToExistingQuantity("");
  };

  const handleSubtract = () => {
    if (selectedLotIndex === null) {
      return;
    }

    const quantity = parseFloat(subtractQuantity);

    if (isNaN(quantity) || quantity <= 0) {
      return;
    }

    onSubtractFromLot(selectedLotIndex, quantity);
    setSubtractQuantity("");
  };

  const selectedLot = selectedLotIndex !== null ? lots[selectedLotIndex] : null;
  const selectedLotLabel = selectedLot ? getLotLabel(selectedLot.id) : "";
  const selectedPileNumber = selectedLot ? getPileNumber(selectedLot.id) : 0;
  const pileColors = PILE_COLORS[selectedPileNumber] || PILE_COLORS[1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          Add New Lot
        </h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="newGcv" className="text-sm text-slate-600">
              GCV (kcal/kg)
            </Label>
            <Input
              id="newGcv"
              type="number"
              value={addGcv}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddGcv(e.target.value)}
              placeholder="e.g., 4500"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="newQuantity" className="text-sm text-slate-600">
              Quantity (MT)
            </Label>
            <Input
              id="newQuantity"
              type="number"
              value={addQuantity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddQuantity(e.target.value)}
              placeholder="e.g., 1000"
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleAddNewLot}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Add to Next Empty Entry
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Add to Selected Lot
        </h3>
        {selectedLot ? (
          <div className={`mb-3 p-3 rounded-lg ${pileColors.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-3 h-3 rounded-full ${pileColors.dot}`} />
              <span className={`font-bold ${pileColors.text}`}>{selectedLotLabel}</span>
            </div>
            <span className={`text-sm ${pileColors.text}`}>
              Current: {selectedLot.gcv.toLocaleString()} kcal/kg, {selectedLot.quantity.toLocaleString()} MT
            </span>
          </div>
        ) : (
          <div className="mb-3 p-2 bg-amber-50 rounded-lg text-sm">
            <span className="text-amber-700">Select an entry from the table first</span>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label htmlFor="existingGcv" className="text-sm text-slate-600">
              New Lot GCV (kcal/kg)
            </Label>
            <Input
              id="existingGcv"
              type="number"
              value={addToExistingGcv}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddToExistingGcv(e.target.value)}
              placeholder="e.g., 5000"
              className="mt-1"
              disabled={selectedLotIndex === null}
            />
          </div>
          <div>
            <Label htmlFor="existingQuantity" className="text-sm text-slate-600">
              New Lot Quantity (MT)
            </Label>
            <Input
              id="existingQuantity"
              type="number"
              value={addToExistingQuantity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddToExistingQuantity(e.target.value)}
              placeholder="e.g., 500"
              className="mt-1"
              disabled={selectedLotIndex === null}
            />
          </div>
          <Button
            onClick={handleAddToExisting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={selectedLotIndex === null}
          >
            Merge with Selected
          </Button>
          <p className="text-xs text-slate-500 italic">
            GCV will be calculated using weighted average
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Minus className="w-5 h-5 text-red-600" />
          Subtract Quantity
        </h3>
        {selectedLot ? (
          <div className={`mb-3 p-3 rounded-lg bg-red-50`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-3 h-3 rounded-full ${pileColors.dot}`} />
              <span className={`font-bold ${pileColors.text}`}>{selectedLotLabel}</span>
            </div>
            <span className="text-sm text-red-700">
              Available: {selectedLot.quantity.toLocaleString()} MT
            </span>
          </div>
        ) : (
          <div className="mb-3 p-2 bg-amber-50 rounded-lg text-sm">
            <span className="text-amber-700">Select an entry from the table first</span>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label htmlFor="subtractQty" className="text-sm text-slate-600">
              Quantity to Subtract (MT)
            </Label>
            <Input
              id="subtractQty"
              type="number"
              value={subtractQuantity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSubtractQuantity(e.target.value)}
              placeholder="e.g., 200"
              className="mt-1"
              disabled={selectedLotIndex === null}
            />
          </div>
          <Button
            onClick={handleSubtract}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            disabled={selectedLotIndex === null}
          >
            Subtract from Selected
          </Button>
          <p className="text-xs text-slate-500 italic">
            GCV remains unchanged; only quantity decreases
          </p>
        </div>
      </div>
    </div>
  );
}