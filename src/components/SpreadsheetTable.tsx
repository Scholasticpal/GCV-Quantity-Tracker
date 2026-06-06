import { Lot } from "../types/lot";
import { Button } from "./ui/button";
import { getLotLabel, getPileNumber, getSubLabel } from "../utils/lotUtils";

interface SpreadsheetTableProps {
  lots: Lot[];
  selectedLotIndex: number | null;
  onSelectLot: (index: number | null) => void;
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
}: SpreadsheetTableProps) {
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${subColor.dot}`} />
                      <span className={`font-bold ${subColor.text}`}>
                        {lotLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-sm ${
                        hasData ? "text-slate-800 font-semibold" : "text-slate-400"
                      }`}
                    >
                      {lot.gcv.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-sm ${
                        hasData ? "text-slate-800 font-semibold" : "text-slate-400"
                      }`}
                    >
                      {lot.quantity.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-slate-500">
                      {lot.originalGcv.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-slate-500">
                      {lot.originalQuantity.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lot.lotsAdded > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {lot.lotsAdded}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lot.lotsSubtracted > 0
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {lot.lotsSubtracted}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasData && (
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => onSelectLot(isSelected ? null : index)}
                        className={`text-xs ${
                          isSelected
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "border-slate-300 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
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