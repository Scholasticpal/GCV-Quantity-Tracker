import { useState } from "react";
import { SavedState } from "../App";
import { getLotLabel } from "../utils/lotUtils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";

interface DateHistoryPanelProps {
  savedStates: SavedState[];
  selectedDate: string | null;
  onLoadState: (date: string) => void;
  onDeleteState: (date: string) => void;
  role?: string;
}



export function DateHistoryPanel({
  savedStates,
  selectedDate,
  onLoadState,
  onDeleteState,
  role,
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
      <div className="bg-white rounded-md shadow-sm p-5 border border-slate-200">
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
                className={`h-10 rounded-sm text-sm transition-all border ${
                  savedState
                    ? isSelected
                      ? "bg-[#003B70] border-[#003B70] text-white font-bold"
                      : isPreview
                      ? "bg-slate-100 border-slate-300 text-slate-800 font-medium"
                      : "bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-100"
                    : isToday
                    ? "bg-slate-50 border-slate-200 text-slate-600 font-medium"
                    : "bg-white border-transparent text-slate-400"
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border ${
                    selectedDate === state.date
                      ? "bg-[#003B70] text-white border-[#003B70]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <span className="text-sm font-medium">{state.date}</span>
                  {role !== "viewer" && (
                    <button
                      onClick={() => onDeleteState(state.date)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm p-5 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          {previewState ? `Data for ${previewDate}` : "Preview"}
        </h3>
        {previewState ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Quantity</p>
                <p className="text-lg font-bold text-slate-900">
                  {previewState.lots
                    .reduce((sum, lot) => sum + lot.quantity, 0)
                    .toLocaleString()}{" "}
                  MT
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg GCV</p>
                <p className="text-lg font-bold text-slate-900">
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
                    return (
                      <tr key={lot.id} className="border-b border-slate-100">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#003B70]">
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