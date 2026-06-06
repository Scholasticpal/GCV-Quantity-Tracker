import { Lot } from "../types/lot";
import {
  calculateTotalQuantity,
  calculateAverageGcv,
  calculateTotalEnergy,
  getActiveLotsCount,
} from "../utils/lotUtils";

interface SummaryCardsProps {
  lots: Lot[];
}

export function SummaryCards({ lots }: SummaryCardsProps) {
  const totalQuantity = calculateTotalQuantity(lots);
  const averageGcv = calculateAverageGcv(lots);
  const totalEnergy = calculateTotalEnergy(lots);
  const activeLots = getActiveLotsCount(lots);

  const cards = [
    {
      label: "Active Sets",
      value: activeLots,
      unit: `/ ${lots.length}`,
      bgLight: "bg-emerald-50",
      textDark: "text-emerald-700",
    },
    {
      label: "Total Quantity",
      value: totalQuantity.toLocaleString(),
      unit: "MT",
      bgLight: "bg-blue-50",
      textDark: "text-blue-700",
    },
    {
      label: "Weighted Avg GCV",
      value: averageGcv.toLocaleString(),
      unit: "kcal/kg",
      bgLight: "bg-amber-50",
      textDark: "text-amber-700",
    },
    {
      label: "Total Energy",
      value: (totalEnergy / 1000000).toFixed(2),
      unit: "M kcal",
      bgLight: "bg-purple-50",
      textDark: "text-purple-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bgLight} rounded-xl p-4 border border-slate-200 shadow-sm`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {card.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${card.textDark}`}>
              {card.value}
            </span>
            <span className="text-sm text-slate-500">{card.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}