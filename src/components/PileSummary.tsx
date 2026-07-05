import { Lot } from "../types/lot";
import { calculatePileStats } from "../utils/lotUtils";

interface PileSummaryProps {
  lots: Lot[];
}

const PILE_COLORS: Record<number, {
  topBorder: string;
  bgSoft: string;
  textStrong: string;
  borderLight: string;
}> = {
  1: { topBorder: "border-t-[3px] border-t-emerald-500", bgSoft: "bg-emerald-50/50", textStrong: "text-emerald-700", borderLight: "border-emerald-200" },
  2: { topBorder: "border-t-[3px] border-t-indigo-500", bgSoft: "bg-indigo-50/50", textStrong: "text-indigo-700", borderLight: "border-indigo-200" },
  3: { topBorder: "border-t-[3px] border-t-amber-500", bgSoft: "bg-amber-50/50", textStrong: "text-amber-700", borderLight: "border-amber-200" },
  4: { topBorder: "border-t-[3px] border-t-purple-500", bgSoft: "bg-purple-50/50", textStrong: "text-purple-700", borderLight: "border-purple-200" },
  5: { topBorder: "border-t-[3px] border-t-rose-500", bgSoft: "bg-rose-50/50", textStrong: "text-rose-700", borderLight: "border-rose-200" },
  6: { topBorder: "border-t-[3px] border-t-sky-500", bgSoft: "bg-sky-50/50", textStrong: "text-sky-700", borderLight: "border-sky-200" },
};

const SUB_LABELS = ["A", "B", "C", "D", "E"];

export function PileSummary({ lots }: PileSummaryProps) {
  const pileStats = calculatePileStats(lots);

  return (
    <div className="bg-white rounded-md shadow-sm p-4 border border-slate-200 mb-6">
      <h3 className="text-base font-bold text-slate-900 mb-3">Pile-wise Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pileStats.map((stat) => {
          const colors = PILE_COLORS[stat.pile];
          return (
            <div
              key={stat.pile}
              className={`border border-slate-200 shadow-sm rounded-md p-3 transition-colors ${colors.topBorder} ${colors.bgSoft}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-bold ${colors.textStrong}`}>
                  Pile-{stat.pile}
                </span>
                <div className="flex gap-1">
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className={`bg-white/50 rounded-md p-2 border ${colors.borderLight}`}>
                  <p className={`text-[10px] uppercase font-semibold tracking-wide ${colors.textStrong}`}>Quantity</p>
                  <p className="text-sm font-bold text-slate-900">
                    {stat.quantity.toLocaleString()}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">MT</span>
                  </p>
                </div>
                <div className={`bg-white/50 rounded-md p-2 border ${colors.borderLight}`}>
                  <p className={`text-[10px] uppercase font-semibold tracking-wide ${colors.textStrong}`}>Avg GCV</p>
                  <p className="text-sm font-bold text-slate-900">
                    {stat.gcv.toLocaleString()}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">kcal/kg</span>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-6 gap-1 text-center items-center">
                  <div />
                  {SUB_LABELS.map((label) => (
                    <div key={label} className="flex justify-center">
                      <div className="bg-slate-100 text-slate-700 border border-slate-300 rounded-sm px-1.5 py-0.5 flex items-center justify-center gap-1">
                        <span className="text-[10px] font-bold">{label}</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-center mt-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide">GCV</span>
                  </div>
                  {SUB_LABELS.map((label, i) => {
                    const lotIndex = (stat.pile - 1) * 5 + i;
                    const lot = lots[lotIndex];
                    const hasData = lot && lot.quantity > 0;
                    return (
                      <div key={label} className="flex items-center justify-center mt-1">
                        <span className={`text-[11px] font-medium ${hasData ? 'text-slate-900' : 'text-slate-300'}`}>
                          {hasData ? lot.gcv.toLocaleString() : '-'}
                        </span>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-center mt-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide">QTY</span>
                  </div>
                  {SUB_LABELS.map((label, i) => {
                    const lotIndex = (stat.pile - 1) * 5 + i;
                    const lot = lots[lotIndex];
                    const hasData = lot && lot.quantity > 0;
                    return (
                      <div key={label} className="flex items-center justify-center mt-1">
                        <span className={`text-[11px] font-medium ${hasData ? 'text-slate-900' : 'text-slate-300'}`}>
                          {hasData ? lot.quantity.toLocaleString() : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}