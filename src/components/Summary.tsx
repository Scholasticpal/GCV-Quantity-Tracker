import { Lot } from "../types/lot";

interface SummaryProps {
  lots: Lot[];
}

export function Summary({ lots }: SummaryProps) {
  const activeLots = lots.filter((lot) => lot.quantity > 0);
  const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);

  const weightedGcv = (() => {
    const lotsWithQty = lots.filter((lot) => lot.quantity > 0);
    if (lotsWithQty.length === 0) return 0;
    const totalQty = lotsWithQty.reduce((sum, lot) => sum + lot.quantity, 0);
    const weighted = lotsWithQty.reduce(
      (sum, lot) => sum + lot.gcv * lot.quantity,
      0
    );
    return Math.round(weighted / totalQty);
  })();

  const totalEnergy = Math.round((totalQuantity * weightedGcv) / 1000);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
        <p className="text-sm text-slate-500 mb-1">Active Sets</p>
        <p className="text-3xl font-bold text-slate-800">{activeLots.length}</p>
        <p className="text-xs text-slate-400 mt-1">of 30 total</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
        <p className="text-sm text-slate-500 mb-1">Total Quantity</p>
        <p className="text-3xl font-bold text-emerald-600">
          {totalQuantity.toLocaleString()}
        </p>
        <p className="text-xs text-slate-400 mt-1">MT</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
        <p className="text-sm text-slate-500 mb-1">Avg GCV</p>
        <p className="text-3xl font-bold text-blue-600">
          {weightedGcv.toLocaleString()}
        </p>
        <p className="text-xs text-slate-400 mt-1">kcal/kg</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
        <p className="text-sm text-slate-500 mb-1">Total Energy</p>
        <p className="text-3xl font-bold text-purple-600">{totalEnergy}</p>
        <p className="text-xs text-slate-400 mt-1">M kcal</p>
      </div>
    </div>
  );
}