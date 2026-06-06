import { Lot } from "../types/lot";
import { calculatePileStats } from "../utils/lotUtils";

interface PileSummaryProps {
  lots: Lot[];
}

const PILE_COLORS: Record<number, { 
  bg: string; 
  text: string; 
  border: string;
  gradient: string;
  subDots: string[];
}> = {
  1: { 
    bg: "bg-emerald-50", 
    text: "text-emerald-700", 
    border: "border-emerald-200",
    gradient: "from-emerald-400 to-emerald-600",
    subDots: ["bg-emerald-200", "bg-emerald-300", "bg-emerald-400", "bg-emerald-500", "bg-emerald-600"]
  },
  2: { 
    bg: "bg-blue-50", 
    text: "text-blue-700", 
    border: "border-blue-200",
    gradient: "from-blue-400 to-blue-600",
    subDots: ["bg-blue-200", "bg-blue-300", "bg-blue-400", "bg-blue-500", "bg-blue-600"]
  },
  3: { 
    bg: "bg-amber-50", 
    text: "text-amber-700", 
    border: "border-amber-200",
    gradient: "from-amber-400 to-amber-600",
    subDots: ["bg-amber-200", "bg-amber-300", "bg-amber-400", "bg-amber-500", "bg-amber-600"]
  },
  4: { 
    bg: "bg-purple-50", 
    text: "text-purple-700", 
    border: "border-purple-200",
    gradient: "from-purple-400 to-purple-600",
    subDots: ["bg-purple-200", "bg-purple-300", "bg-purple-400", "bg-purple-500", "bg-purple-600"]
  },
  5: { 
    bg: "bg-rose-50", 
    text: "text-rose-700", 
    border: "border-rose-200",
    gradient: "from-rose-400 to-rose-600",
    subDots: ["bg-rose-200", "bg-rose-300", "bg-rose-400", "bg-rose-500", "bg-rose-600"]
  },
  6: { 
    bg: "bg-teal-50", 
    text: "text-teal-700", 
    border: "border-teal-200",
    gradient: "from-teal-400 to-teal-600",
    subDots: ["bg-teal-200", "bg-teal-300", "bg-teal-400", "bg-teal-500", "bg-teal-600"]
  },
};

const SUB_LABELS = ["A", "B", "C", "D", "E"];

export function PileSummary({ lots }: PileSummaryProps) {
  const pileStats = calculatePileStats(lots);

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200 mb-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Pile-wise Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pileStats.map((stat) => {
          const colors = PILE_COLORS[stat.pile];
          return (
            <div
              key={stat.pile}
              className={`${colors.bg} ${colors.border} border rounded-xl p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">{stat.pile}</span>
                  </div>
                  <span className={`text-lg font-bold ${colors.text}`}>
                    Pile-{stat.pile}
                  </span>
                </div>
                <div className="flex gap-1">
                  {colors.subDots.map((dotColor, i) => (
                    <span key={i} className={`w-2 h-2 rounded-full ${dotColor}`} title={SUB_LABELS[i]} />
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/50 rounded-lg p-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Quantity</p>
                  <p className={`text-xl font-bold ${colors.text}`}>
                    {stat.quantity.toLocaleString()}
                    <span className="text-xs font-normal ml-1">MT</span>
                  </p>
                </div>
                <div className="bg-white/50 rounded-lg p-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Avg GCV</p>
                  <p className={`text-lg font-bold ${colors.text}`}>
                    {stat.gcv.toLocaleString()}
                    <span className="text-xs font-normal ml-1">kcal/kg</span>
                  </p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/30">
                <div className="flex justify-between text-sm">
                  {SUB_LABELS.map((label, i) => {
                    const lotIndex = (stat.pile - 1) * 5 + i;
                    const lot = lots[lotIndex];
                    const hasData = lot && lot.quantity > 0;
                    return (
                      <div key={label} className="text-center">
                        <div className={`w-6 h-6 mx-auto rounded ${colors.subDots[i]} flex items-center justify-center mb-1`}>
                          <span className={`text-xs font-bold ${i >= 3 ? 'text-white' : colors.text}`}>{label}</span>
                        </div>
                        <p className={`text-xs font-medium ${hasData ? colors.text : 'text-slate-400'}`}>
                          {hasData ? lot.quantity.toLocaleString() : '-'}
                        </p>
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