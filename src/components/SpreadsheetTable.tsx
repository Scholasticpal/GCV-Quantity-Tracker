import { useState } from "react";
import { Lot } from "../types/lot";
import { getLotLabel, getPileNumber, getSubLabel } from "../utils/lotUtils";
import { MousePointerClick, Pencil, Trash2, Check, X } from "lucide-react";

const MAX_VALUE = 1000000;

interface SpreadsheetTableProps {
  lots: Lot[];
  selectedLotIndex: number | null;
  onSelectLot: (index: number | null) => void;
  onEditLot?: (id: number, updatedValues: Partial<Lot>) => void;
  onResetLot?: (id: number) => void;
  role?: string;
}

interface EditFormData {
  gcv: string;
  quantity: string;
  originalGcv: string;
  originalQuantity: string;
  lotsAdded: string;
  lotsSubtracted: string;
}

// ─── TruncatedCell ──────────────────────────────────────────────
// Displays numbers compactly. If > 5 digits, shows truncated with "…".
// Click toggles expanded view; hover shows full value via title.
function TruncatedCell({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const formatted = value.toLocaleString();
  const raw = String(value);
  const isTruncated = raw.length > 5;

  if (!isTruncated || expanded) {
    return (
      <span
        className={`cursor-default ${className}`}
        title={formatted}
        onClick={() => isTruncated && setExpanded(false)}
      >
        {formatted}
      </span>
    );
  }

  return (
    <span
      className={`cursor-pointer ${className}`}
      title={`Full value: ${formatted} — click to expand`}
      onClick={() => setExpanded(true)}
    >
      {raw.slice(0, 5)}…
    </span>
  );
}

// ─── Pile color config (name column + dot only) ─────────────────
const PILE_COLORS: Record<
  number,
  {
    subColors: Record<
      string,
      { bg: string; text: string; dot: string; border: string }
    >;
  }
> = {
  1: {
    subColors: {
      A: { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", border: "border-l-emerald-400" },
      B: { bg: "bg-emerald-200", text: "text-emerald-900", dot: "bg-emerald-600", border: "border-l-emerald-500" },
      C: { bg: "bg-emerald-300", text: "text-emerald-900", dot: "bg-emerald-700", border: "border-l-emerald-600" },
      D: { bg: "bg-emerald-400", text: "text-emerald-950", dot: "bg-emerald-800", border: "border-l-emerald-700" },
      E: { bg: "bg-emerald-500", text: "text-white",       dot: "bg-emerald-900", border: "border-l-emerald-800" },
    },
  },
  2: {
    subColors: {
      A: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500", border: "border-l-blue-400" },
      B: { bg: "bg-blue-200", text: "text-blue-900", dot: "bg-blue-600", border: "border-l-blue-500" },
      C: { bg: "bg-blue-300", text: "text-blue-900", dot: "bg-blue-700", border: "border-l-blue-600" },
      D: { bg: "bg-blue-400", text: "text-blue-950", dot: "bg-blue-800", border: "border-l-blue-700" },
      E: { bg: "bg-blue-500", text: "text-white",    dot: "bg-blue-900", border: "border-l-blue-800" },
    },
  },
  3: {
    subColors: {
      A: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", border: "border-l-amber-400" },
      B: { bg: "bg-amber-200", text: "text-amber-900", dot: "bg-amber-600", border: "border-l-amber-500" },
      C: { bg: "bg-amber-300", text: "text-amber-900", dot: "bg-amber-700", border: "border-l-amber-600" },
      D: { bg: "bg-amber-400", text: "text-amber-950", dot: "bg-amber-800", border: "border-l-amber-700" },
      E: { bg: "bg-amber-500", text: "text-white",     dot: "bg-amber-900", border: "border-l-amber-800" },
    },
  },
  4: {
    subColors: {
      A: { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500", border: "border-l-purple-400" },
      B: { bg: "bg-purple-200", text: "text-purple-900", dot: "bg-purple-600", border: "border-l-purple-500" },
      C: { bg: "bg-purple-300", text: "text-purple-900", dot: "bg-purple-700", border: "border-l-purple-600" },
      D: { bg: "bg-purple-400", text: "text-purple-950", dot: "bg-purple-800", border: "border-l-purple-700" },
      E: { bg: "bg-purple-500", text: "text-white",      dot: "bg-purple-900", border: "border-l-purple-800" },
    },
  },
  5: {
    subColors: {
      A: { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500", border: "border-l-rose-400" },
      B: { bg: "bg-rose-200", text: "text-rose-900", dot: "bg-rose-600", border: "border-l-rose-500" },
      C: { bg: "bg-rose-300", text: "text-rose-900", dot: "bg-rose-700", border: "border-l-rose-600" },
      D: { bg: "bg-rose-400", text: "text-rose-950", dot: "bg-rose-800", border: "border-l-rose-700" },
      E: { bg: "bg-rose-500", text: "text-white",    dot: "bg-rose-900", border: "border-l-rose-800" },
    },
  },
  6: {
    subColors: {
      A: { bg: "bg-teal-100", text: "text-teal-800", dot: "bg-teal-500", border: "border-l-teal-400" },
      B: { bg: "bg-teal-200", text: "text-teal-900", dot: "bg-teal-600", border: "border-l-teal-500" },
      C: { bg: "bg-teal-300", text: "text-teal-900", dot: "bg-teal-700", border: "border-l-teal-600" },
      D: { bg: "bg-teal-400", text: "text-teal-950", dot: "bg-teal-800", border: "border-l-teal-700" },
      E: { bg: "bg-teal-500", text: "text-white",    dot: "bg-teal-900", border: "border-l-teal-800" },
    },
  },
};

export function SpreadsheetTable({
  lots,
  selectedLotIndex,
  onSelectLot,
  onEditLot,
  onResetLot,
  role,
}: SpreadsheetTableProps) {
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    gcv: "",
    quantity: "",
    originalGcv: "",
    originalQuantity: "",
    lotsAdded: "",
    lotsSubtracted: "",
  });

  const isSuperadmin = role === "superadmin";

  const startEditing = (lot: Lot) => {
    setEditingRowId(lot.id);
    setEditFormData({
      gcv: String(lot.gcv),
      quantity: String(lot.quantity),
      originalGcv: String(lot.originalGcv),
      originalQuantity: String(lot.originalQuantity),
      lotsAdded: String(lot.lotsAdded),
      lotsSubtracted: String(lot.lotsSubtracted),
    });
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditFormData({
      gcv: "",
      quantity: "",
      originalGcv: "",
      originalQuantity: "",
      lotsAdded: "",
      lotsSubtracted: "",
    });
  };

  const clampValue = (val: string): string => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (num > MAX_VALUE) return String(MAX_VALUE);
    return val;
  };

  const saveEditing = () => {
    if (editingRowId === null || !onEditLot) return;

    const gcv = parseFloat(editFormData.gcv);
    const quantity = parseFloat(editFormData.quantity);
    const originalGcv = parseFloat(editFormData.originalGcv);
    const originalQuantity = parseFloat(editFormData.originalQuantity);
    const lotsAdded = parseInt(editFormData.lotsAdded, 10);
    const lotsSubtracted = parseInt(editFormData.lotsSubtracted, 10);

    if (
      isNaN(gcv) || isNaN(quantity) ||
      isNaN(originalGcv) || isNaN(originalQuantity) ||
      isNaN(lotsAdded) || isNaN(lotsSubtracted) ||
      gcv < 0 || quantity < 0 ||
      originalGcv < 0 || originalQuantity < 0 ||
      lotsAdded < 0 || lotsSubtracted < 0 ||
      gcv > MAX_VALUE || quantity > MAX_VALUE ||
      originalGcv > MAX_VALUE || originalQuantity > MAX_VALUE ||
      lotsAdded > MAX_VALUE || lotsSubtracted > MAX_VALUE
    ) {
      return;
    }

    onEditLot(editingRowId, {
      gcv,
      quantity,
      originalGcv,
      originalQuantity,
      lotsAdded,
      lotsSubtracted,
    });

    cancelEditing();
  };

  const handleResetRow = (id: number) => {
    if (!onResetLot) return;
    const label = getLotLabel(id);
    const confirmed = window.confirm(
      `Are you sure you want to delete all data of ${label}?`
    );
    if (!confirmed) return;
    onResetLot(id);
    if (editingRowId === id) {
      cancelEditing();
    }
  };

  const updateFormField = (field: keyof EditFormData, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: clampValue(value) }));
  };

  const inputClasses =
    "w-full min-w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono";

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-0 z-10 bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.1)] w-14">
                S.No
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-14 z-10 bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                GCV (kcal/kg)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Quantity (MT)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Original GCV
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Original Qty
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                Lots Added
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                Deductions
              </th>
              {isSuperadmin && (
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {lots.map((lot, idx) => {
              const isSelected = selectedLotIndex === idx;
              const hasData = lot.quantity > 0;
              const pileNumber = getPileNumber(lot.id);
              const subLabel = getSubLabel(lot.id);
              const lotLabel = getLotLabel(lot.id);
              const pileColors = PILE_COLORS[pileNumber];
              const subColor = pileColors?.subColors[subLabel] || PILE_COLORS[1].subColors.A;
              const isEditing = editingRowId === lot.id;
              const isOddRow = idx % 2 === 1;

              // Data columns use clean white/slate alternating rows
              const dataRowBg = isSelected
                ? "bg-amber-50"
                : isOddRow
                ? "bg-slate-50"
                : "bg-white";

              // Name column carries the pile color indicator
              const nameColBg = isSelected
                ? "bg-amber-100"
                : hasData
                ? subColor.bg
                : isOddRow
                ? "bg-slate-50"
                : "bg-white";

              // Left border color indicator for the row
              const leftBorder = isSelected
                ? "border-l-4 border-l-amber-500"
                : hasData
                ? `border-l-4 ${subColor.border}`
                : "border-l-4 border-l-transparent";

              // Pile partition: thicker border on the last sub-label (E) of each pile
              const isPileLastRow = (idx + 1) % 5 === 0;
              const bottomBorder = isPileLastRow
                ? "border-b-2 border-b-slate-400"
                : "border-b border-b-slate-200";

              return (
                <tr
                  key={lot.id}
                  className={`transition-colors ${dataRowBg} ${leftBorder} ${bottomBorder}`}
                >
                  {/* Name column — sticky, colored */}
                  <td
                    className={`px-4 py-2.5 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${nameColBg}`}
                  >
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${subColor.dot}`} />
                      <span className={`font-bold text-sm ${hasData ? subColor.text : "text-slate-400"}`}>
                        {lotLabel}
                      </span>
                    </div>
                  </td>

                  {/* GCV */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max={MAX_VALUE}
                        value={editFormData.gcv}
                        onChange={(e) => updateFormField("gcv", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <TruncatedCell
                        value={lot.gcv}
                        className={`font-mono text-sm ${
                          hasData ? "text-slate-800 font-semibold" : "text-slate-400"
                        }`}
                      />
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max={MAX_VALUE}
                        value={editFormData.quantity}
                        onChange={(e) => updateFormField("quantity", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <TruncatedCell
                        value={lot.quantity}
                        className={`font-mono text-sm ${
                          hasData ? "text-slate-800 font-semibold" : "text-slate-400"
                        }`}
                      />
                    )}
                  </td>

                  {/* Original GCV */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max={MAX_VALUE}
                        value={editFormData.originalGcv}
                        onChange={(e) => updateFormField("originalGcv", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <TruncatedCell
                        value={lot.originalGcv}
                        className="font-mono text-sm text-slate-500"
                      />
                    )}
                  </td>

                  {/* Original Quantity */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max={MAX_VALUE}
                        value={editFormData.originalQuantity}
                        onChange={(e) => updateFormField("originalQuantity", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <TruncatedCell
                        value={lot.originalQuantity}
                        className="font-mono text-sm text-slate-500"
                      />
                    )}
                  </td>

                  {/* Lots Added */}
                  <td className="px-4 py-2.5 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max={MAX_VALUE}
                        value={editFormData.lotsAdded}
                        onChange={(e) => updateFormField("lotsAdded", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          lot.lotsAdded > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {lot.lotsAdded}
                      </span>
                    )}
                  </td>

                  {/* Deductions */}
                  <td className="px-4 py-2.5 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max={MAX_VALUE}
                        value={editFormData.lotsSubtracted}
                        onChange={(e) => updateFormField("lotsSubtracted", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          lot.lotsSubtracted > 0
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {lot.lotsSubtracted}
                      </span>
                    )}
                  </td>

                  {/* Actions — superadmin only */}
                  {isSuperadmin && (
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={saveEditing}
                            className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                            title="Save changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            title="Cancel editing"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {/* Select */}
                          <button
                            onClick={() => onSelectLot(isSelected ? null : idx)}
                            className={`p-2 rounded-lg transition-colors ${
                              isSelected
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            }`}
                            title={isSelected ? "Deselect row" : "Select row"}
                          >
                            <MousePointerClick className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => startEditing(lot)}
                            className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                            title="Edit row"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete (reset to zero) */}
                          <button
                            onClick={() => handleResetRow(lot.id)}
                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            title="Delete row data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}