import { useState } from "react";
import { Lot } from "../types/lot";
import { getLotLabel, getPileNumber, getSubLabel, PILE_THEMES } from "../utils/lotUtils";
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
  const isAdmin = role === "admin" || isSuperadmin;

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
            <tr className="bg-[#003B70] text-white">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider sticky left-0 z-20 bg-[#003B70] shadow-[1px_0_0_0_#e2e8f0] w-14">
                S.No
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider sticky left-[56px] z-20 bg-[#003B70] shadow-[1px_0_0_0_#e2e8f0]">
                Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                GCV (kcal/kg)
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                Quantity (MT)
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                Original GCV
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                Original Qty
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                Lots Added
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                Deductions
              </th>
              {isAdmin && (
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">
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
              const isEditing = editingRowId === lot.id;
              
              const isLastInPile = subLabel === "E";
              const borderClass = isLastInPile ? "border-b-2 border-[#003B70]/30" : "border-b border-slate-200";
              
              const pileTheme = PILE_THEMES[pileNumber] || PILE_THEMES[1];
              
              let rowVisualClass = "";
              if (isSelected) {
                rowVisualClass = `${pileTheme.bg} border-l-4 ${pileTheme.border} ${pileTheme.text} font-medium`;
              } else if (hasData) {
                rowVisualClass = `text-slate-900 font-medium bg-white ${pileTheme.hoverBgSoft} border-l-4 ${pileTheme.borderLeft}`;
              } else {
                rowVisualClass = `text-slate-400 bg-slate-50/20 ${pileTheme.hoverBgSoft} border-l-4 border-transparent hover:${pileTheme.borderLeft}`;
              }

              return (
                <tr
                  key={lot.id}
                  className={`group transition-colors ${borderClass} ${rowVisualClass}`}
                >
                  {/* S.No column — sticky */}
                  <td className={`px-3 py-2 sticky left-0 z-20 bg-white shadow-[1px_0_0_0_#e2e8f0] text-sm group-hover:bg-slate-50 transition-colors ${
                    isSelected ? pileTheme.bg : hasData ? `bg-white ${pileTheme.groupHoverBgSoft}` : 'bg-slate-50/20 group-hover:bg-slate-50/80'
                  }`}>
                    <span className="font-medium opacity-80">{lot.id}</span>
                  </td>

                  {/* Name column — sticky */}
                  <td className={`px-3 py-2 sticky left-[56px] z-20 bg-white shadow-[1px_0_0_0_#e2e8f0] group-hover:bg-slate-50 transition-colors ${
                    isSelected ? pileTheme.bg : hasData ? `bg-white ${pileTheme.groupHoverBgSoft}` : 'bg-slate-50/20 group-hover:bg-slate-50/80'
                  }`}>
                    <div className="flex items-center whitespace-nowrap">
                      <span className="text-sm font-semibold">
                        {lotLabel}
                      </span>
                    </div>
                  </td>

                  {/* GCV */}
                  <td className="px-3 py-2">
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
                        className="font-mono text-sm"
                      />
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="px-3 py-2">
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
                        className="font-mono text-sm"
                      />
                    )}
                  </td>

                  {/* Original GCV */}
                  <td className="px-3 py-2">
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
                        className="font-mono text-sm opacity-80"
                      />
                    )}
                  </td>

                  {/* Original Quantity */}
                  <td className="px-3 py-2">
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
                        className="font-mono text-sm opacity-80"
                      />
                    )}
                  </td>

                  {/* Lots Added */}
                  <td className="px-3 py-2 text-center">
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
                        className={`inline-flex items-center px-2 py-0.5 text-xs ${
                          lot.lotsAdded > 0
                            ? "text-[#003B70] font-bold"
                            : "text-slate-400 font-medium"
                        }`}
                      >
                        {lot.lotsAdded}
                      </span>
                    )}
                  </td>

                  {/* Deductions */}
                  <td className="px-3 py-2 text-center">
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
                        className={`inline-flex items-center px-2 py-0.5 text-xs ${
                          lot.lotsSubtracted > 0
                            ? "text-red-600 font-bold"
                            : "text-slate-400 font-medium"
                        }`}
                      >
                        {lot.lotsSubtracted}
                      </span>
                    )}
                  </td>

                  {/* Actions — admin/superadmin */}
                  {isAdmin && (
                    <td className="px-3 py-2 text-center">
                      {isEditing && isSuperadmin ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={saveEditing}
                            className="p-2 rounded-md bg-[#003B70] text-white hover:bg-[#002A50] transition-colors"
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

                          {/* Edit (Superadmin only) */}
                          {isSuperadmin && (
                            <button
                              onClick={() => startEditing(lot)}
                              disabled={!hasData}
                              className={`p-2 rounded-lg transition-colors ${!hasData ? "opacity-30 cursor-not-allowed bg-transparent text-slate-400" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}
                              title={!hasData ? "Use Data Entry tools above to add initial data" : "Edit row"}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete (reset to zero) (Superadmin only) */}
                          {isSuperadmin && (
                            <button
                              onClick={() => handleResetRow(lot.id)}
                              disabled={!hasData}
                              className={`p-2 rounded-lg transition-colors ${!hasData ? "opacity-30 cursor-not-allowed bg-transparent text-slate-400" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
                              title={!hasData ? "Use Data Entry tools above to add initial data" : "Delete row data"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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