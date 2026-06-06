import { useState } from "react";
import { SavedState } from "../App";
import { getLotLabel, getPileNumber } from "../utils/lotUtils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";

interface DateHistoryPanelProps {
  savedStates: SavedState[];
  selectedDate: string | null;
  onLoadState: (date: string) => void;
  onDeleteState: (date: string) => void;
}

const PILE_COLORS: Record<number, { bg: string; text: string; dot: string }> = {
  1: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  2: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  3: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  4: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  5: { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  6: { bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-500" },
};

export function DateHistoryPanel({
  savedStates,
  selectedDate,
  onLoadState,
  onDeleteState,
}: DateHistoryPanelProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [previewDate, setPreviewDate] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return eachDayOfInterval({ start, end });
  };

  const getSavedStateForDate = (date: Date): SavedState | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return savedStates.find((s) => s.date === dateStr);
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const startDay = currentMonth.getDay();

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const previewState = previewDate
    ? savedStates.find((s) => s.date === previewDate)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Calendar View</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              ←
            </button>
            <span className="font-medium text-slate-700">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-slate-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}
          {daysInMonth.map((day) => {
            const savedState = getSavedStateForDate(day);
            const dateStr = format(day, "yyyy-MM-dd");
            const isSelected = selectedDate === dateStr;
            const isPreview = previewDate === dateStr;
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={dateStr}
                onClick={() => savedState && onLoadState(dateStr)}
                onMouseEnter={() => savedState && setPreviewDate(dateStr)}
                onMouseLeave={() => setPreviewDate(null)}
                disabled={!savedState}
                className={`h-10 rounded-lg text-sm font-medium transition-all ${
                  savedState
                    ? isSelected
                      ? "bg-emerald-600 text-white"
                      : isPreview
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : isToday
                    ? "bg-slate-100 text-slate-600"
                    : "text-slate-400"
                }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-600 mb-2">Saved Dates</h4>
          <div className="flex flex-wrap gap-2">
            {savedStates.length === 0 ? (
              <p className="text-sm text-slate-400">No saved dates yet</p>
            ) : (
              savedStates.map((state) => (
                <div
                  key={state.date}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    selectedDate === state.date
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span className="text-sm font-medium">{state.date}</span>
                  <button
                    onClick={() => onDeleteState(state.date)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          {previewState ? `Data for ${previewDate}` : "Preview"}
        </h3>
        {previewState ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Total Quantity</p>
                <p className="text-lg font-bold text-emerald-700">
                  {previewState.lots
                    .reduce((sum, lot) => sum + lot.quantity, 0)
                    .toLocaleString()}{" "}
                  MT
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Avg GCV</p>
                <p className="text-lg font-bold text-blue-700">
                  {(() => {
                    const lotsWithQty = previewState.lots.filter(
                      (lot) => lot.quantity > 0
                    );
                    if (lotsWithQty.length === 0) return 0;
                    const totalQty = lotsWithQty.reduce(
                      (sum, lot) => sum + lot.quantity,
                      0
                    );
                    const weightedGcv = lotsWithQty.reduce(
                      (sum, lot) => sum + lot.gcv * lot.quantity,
                      0
                    );
                    return Math.round(weightedGcv / totalQty).toLocaleString();
                  })()}{" "}
                  kcal/kg
                </p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-right">GCV</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {previewState.lots
                  .filter((lot) => lot.quantity > 0)
                  .map((lot) => {
                    const pileNumber = getPileNumber(lot.id);
                    const colors = PILE_COLORS[pileNumber] || PILE_COLORS[1];
                    return (
                      <tr key={lot.id} className="border-b border-slate-100">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                            <span className={`font-medium ${colors.text}`}>
                              {getLotLabel(lot.id)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {lot.gcv.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {lot.quantity.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>Hover over a saved date to preview data</p>
          </div>
        )}
      </div>
    </div>
  );
}