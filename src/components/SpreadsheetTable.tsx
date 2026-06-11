import { useState } from "react";
import { Lot } from "../types/lot";
import { getLotLabel, getPileNumber, getSubLabel } from "../utils/lotUtils";

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

// Color configurations for each pile with sub-colors for A-E
const PILE_COLORS: Record<number, {
  main: string;
  subColors: Record<string, { bg: string; text: string; dot: string; hover: string }>;
}> = {
  1: {
    main: "emerald",
    subColors: {
      A: { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", hover: "hover:bg-emerald-200" },
      B: { bg: "bg-emerald-200", text: "text-emerald-900", dot: "bg-emerald-600", hover: "hover:bg-emerald-300" },
      C: { bg: "bg-emerald-300", text: "text-emerald-900", dot: "bg-emerald-700", hover: "hover:bg-emerald-400" },
      D: { bg: "bg-emerald-400", text: "text-emerald-950", dot: "bg-emerald-800", hover: "hover:bg-emerald-500" },
      E: { bg: "bg-emerald-500", text: "text-white", dot: "bg-emerald-900", hover: "hover:bg-emerald-600" },
    }
  },
  2: {
    main: "blue",
    subColors: {
      A: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500", hover: "hover:bg-blue-200" },
      B: { bg: "bg-blue-200", text: "text-blue-900", dot: "bg-blue-600", hover: "hover:bg-blue-300" },
      C: { bg: "bg-blue-300", text: "text-blue-900", dot: "bg-blue-700", hover: "hover:bg-blue-400" },
      D: { bg: "bg-blue-400", text: "text-blue-950", dot: "bg-blue-800", hover: "hover:bg-blue-500" },
      E: { bg: "bg-blue-500", text: "text-white", dot: "bg-blue-900", hover: "hover:bg-blue-600" },
    }
  },
  3: {
    main: "amber",
    subColors: {
      A: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", hover: "hover:bg-amber-200" },
      B: { bg: "bg-amber-200", text: "text-amber-900", dot: "bg-amber-600", hover: "hover:bg-amber-300" },
      C: { bg: "bg-amber-300", text: "text-amber-900", dot: "bg-amber-700", hover: "hover:bg-amber-400" },
      D: { bg: "bg-amber-400", text: "text-amber-950", dot: "bg-amber-800", hover: "hover:bg-amber-500" },
      E: { bg: "bg-amber-500", text: "text-white", dot: "bg-amber-900", hover: "hover:bg-amber-600" },
    }
  },
  4: {
    main: "purple",
    subColors: {
      A: { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500", hover: "hover:bg-purple-200" },
      B: { bg: "bg-purple-200", text: "text-purple-900", dot: "bg-purple-600", hover: "hover:bg-purple-300" },
      C: { bg: "bg-purple-300", text: "text-purple-900", dot: "bg-purple-700", hover: "hover:bg-purple-400" },
      D: { bg: "bg-purple-400", text: "text-purple-950", dot: "bg-purple-800", hover: "hover:bg-purple-500" },
      E: { bg: "bg-purple-500", text: "text-white", dot: "bg-purple-900", hover: "hover:bg-purple-600" },
    }
  },
  5: {
    main: "rose",
    subColors: {
      A: { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500", hover: "hover:bg-rose-200" },
      B: { bg: "bg-rose-200", text: "text-rose-900", dot: "bg-rose-600", hover: "hover:bg-rose-300" },
      C: { bg: "bg-rose-300", text: "text-rose-900", dot: "bg-rose-700", hover: "hover:bg-rose-400" },
      D: { bg: "bg-rose-400", text: "text-rose-950", dot: "bg-rose-800", hover: "hover:bg-rose-500" },
      E: { bg: "bg-rose-500", text: "text-white", dot: "bg-rose-900", hover: "hover:bg-rose-600" },
    }
  },
  6: {
    main: "teal",
    subColors: {
      A: { bg: "bg-teal-100", text: "text-teal-800", dot: "bg-teal-500", hover: "hover:bg-teal-200" },
      B: { bg: "bg-teal-200", text: "text-teal-900", dot: "bg-teal-600", hover: "hover:bg-teal-300" },
      C: { bg: "bg-teal-300", text: "text-teal-900", dot: "bg-teal-700", hover: "hover:bg-teal-400" },
      D: { bg: "bg-teal-400", text: "text-teal-950", dot: "bg-teal-800", hover: "hover:bg-teal-500" },
      E: { bg: "bg-teal-500", text: "text-white", dot: "bg-teal-900", hover: "hover:bg-teal-600" },
    }
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

  const isViewer = role === "viewer";

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
      lotsAdded < 0 || lotsSubtracted < 0
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
    onResetLot(id);
    if (editingRowId === id) {
      cancelEditing();
    }
  };

  const updateFormField = (field: keyof EditFormData, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const inputClasses =
    "w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono";

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
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
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lots.map((lot, index) => {
              const isSelected = selectedLotIndex === index;
              const hasData = lot.quantity > 0;
              const pileNumber = getPileNumber(lot.id);
              const subLabel = getSubLabel(lot.id);
              const lotLabel = getLotLabel(lot.id);
              const pileColors = PILE_COLORS[pileNumber];
              const subColor = pileColors?.subColors[subLabel] || PILE_COLORS[1].subColors.A;
              const isEditing = editingRowId === lot.id;

              return (
                <tr
                  key={lot.id}
                  className={`transition-colors ${
                    isSelected
                      ? "bg-amber-100 border-l-4 border-l-amber-500"
                      : hasData
                      ? `${subColor.bg} ${subColor.hover}`
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {/* Name column — always read-only */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${subColor.dot}`} />
                      <span className={`font-bold ${subColor.text}`}>
                        {lotLabel}
                      </span>
                    </div>
                  </td>

                  {/* GCV */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.gcv}
                        onChange={(e) => updateFormField("gcv", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <span
                        className={`font-mono text-sm ${
                          hasData ? "text-slate-800 font-semibold" : "text-slate-400"
                        }`}
                      >
                        {lot.gcv.toLocaleString()}
                      </span>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.quantity}
                        onChange={(e) => updateFormField("quantity", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <span
                        className={`font-mono text-sm ${
                          hasData ? "text-slate-800 font-semibold" : "text-slate-400"
                        }`}
                      >
                        {lot.quantity.toLocaleString()}
                      </span>
                    )}
                  </td>

                  {/* Original GCV */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.originalGcv}
                        onChange={(e) => updateFormField("originalGcv", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <span className="font-mono text-sm text-slate-500">
                        {lot.originalGcv.toLocaleString()}
                      </span>
                    )}
                  </td>

                  {/* Original Quantity */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.originalQuantity}
                        onChange={(e) => updateFormField("originalQuantity", e.target.value)}
                        className={inputClasses}
                      />
                    ) : (
                      <span className="font-mono text-sm text-slate-500">
                        {lot.originalQuantity.toLocaleString()}
                      </span>
                    )}
                  </td>

                  {/* Lots Added */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
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
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
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

                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={saveEditing}
                          className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-400 hover:bg-slate-500 text-white rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        {/* Select button — always visible */}
                        <button
                          onClick={() => onSelectLot(isSelected ? null : index)}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                            isSelected
                              ? "bg-amber-500 hover:bg-amber-600 text-white"
                              : "bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300"
                          }`}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>

                        {!isViewer && (
                          <>
                            {/* Edit button */}
                            <button
                              onClick={() => startEditing(lot)}
                              className="px-2.5 py-1 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300 rounded transition-colors"
                            >
                              Edit
                            </button>

                            {/* Reset button */}
                            <button
                              onClick={() => handleResetRow(lot.id)}
                              className="px-2 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded transition-colors"
                              title="Reset this lot to zero"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}