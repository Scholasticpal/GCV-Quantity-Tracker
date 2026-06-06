import { Lot } from "../types/lot";

const PILE_LABELS = ["A", "B", "C", "D", "E"];

export function getLotLabel(id: number): string {
  if (id >= 1 && id <= 5) {
    return `Pile-1 : ${PILE_LABELS[id - 1]}`;
  }
  if (id >= 6 && id <= 10) {
    return `Pile-2 : ${PILE_LABELS[id - 6]}`;
  }
  if (id >= 11 && id <= 15) {
    return `Pile-3 : ${PILE_LABELS[id - 11]}`;
  }
  if (id >= 16 && id <= 20) {
    return `Pile-4 : ${PILE_LABELS[id - 16]}`;
  }
  if (id >= 21 && id <= 25) {
    return `Pile-5 : ${PILE_LABELS[id - 21]}`;
  }
  if (id >= 26 && id <= 30) {
    return `Pile-6 : ${PILE_LABELS[id - 26]}`;
  }
  return `Set ${id}`;
}

export function getPileNumber(id: number): number {
  if (id >= 1 && id <= 5) return 1;
  if (id >= 6 && id <= 10) return 2;
  if (id >= 11 && id <= 15) return 3;
  if (id >= 16 && id <= 20) return 4;
  if (id >= 21 && id <= 25) return 5;
  if (id >= 26 && id <= 30) return 6;
  return 0;
}

export function getSubLabel(id: number): string {
  const subIndex = (id - 1) % 5;
  return PILE_LABELS[subIndex];
}

export function initializeLots(count: number): Lot[] {
  const lots: Lot[] = [];
  for (let i = 1; i <= count; i++) {
    lots.push({
      id: i,
      gcv: 0,
      quantity: 0,
      originalGcv: 0,
      originalQuantity: 0,
      lotsAdded: 0,
      lotsSubtracted: 0,
    });
  }
  return lots;
}

export function findNextEmptyLotIndex(lots: Lot[]): number {
  return lots.findIndex((lot) => lot.quantity === 0 && lot.lotsAdded === 0);
}

export function addNewLot(
  lots: Lot[],
  gcv: number,
  quantity: number
): Lot[] {
  const emptyIndex = findNextEmptyLotIndex(lots);
  if (emptyIndex === -1) {
    return lots;
  }

  return lots.map((lot, index) => {
    if (index === emptyIndex) {
      return {
        ...lot,
        gcv: gcv,
        quantity: quantity,
        originalGcv: gcv,
        originalQuantity: quantity,
        lotsAdded: 1,
      };
    }
    return lot;
  });
}

export function addLotToExisting(
  lots: Lot[],
  targetIndex: number,
  gcv: number,
  quantity: number
): Lot[] {
  if (targetIndex < 0 || targetIndex >= lots.length) return lots;

  return lots.map((lot, index) => {
    if (index === targetIndex) {
      const currentQuantity = lot.quantity;
      const currentGcv = lot.gcv;
      const newQuantity = currentQuantity + quantity;
      const newGcv = Math.round(
        (currentGcv * currentQuantity + gcv * quantity) / newQuantity
      );

      return {
        ...lot,
        gcv: newGcv,
        quantity: newQuantity,
        lotsAdded: lot.lotsAdded + 1,
      };
    }
    return lot;
  });
}

export function subtractFromLot(
  lots: Lot[],
  targetIndex: number,
  quantity: number
): Lot[] {
  if (targetIndex < 0 || targetIndex >= lots.length) return lots;

  const targetLot = lots[targetIndex];
  if (quantity > targetLot.quantity) {
    return lots;
  }

  return lots.map((lot, index) => {
    if (index === targetIndex) {
      const newQuantity = lot.quantity - quantity;

      return {
        ...lot,
        quantity: newQuantity,
        lotsSubtracted: lot.lotsSubtracted + 1,
      };
    }
    return lot;
  });
}

export function calculateTotalQuantity(lots: Lot[]): number {
  return lots.reduce((sum, lot) => sum + lot.quantity, 0);
}

export function calculateAverageGcv(lots: Lot[]): number {
  const lotsWithQuantity = lots.filter((lot) => lot.quantity > 0);
  if (lotsWithQuantity.length === 0) return 0;

  const totalQuantity = lotsWithQuantity.reduce((sum, lot) => sum + lot.quantity, 0);
  const weightedGcv = lotsWithQuantity.reduce(
    (sum, lot) => sum + lot.gcv * lot.quantity,
    0
  );

  return Math.round(weightedGcv / totalQuantity);
}

export function calculateTotalEnergy(lots: Lot[]): number {
  return lots.reduce((sum, lot) => sum + lot.gcv * lot.quantity, 0);
}

export function getActiveLotsCount(lots: Lot[]): number {
  return lots.filter((lot) => lot.quantity > 0).length;
}

export function calculatePileStats(lots: Lot[]) {
  const pileStats: { pile: number; quantity: number; gcv: number; energy: number }[] = [];
  
  for (let p = 1; p <= 6; p++) {
    const pileLots = lots.filter((lot) => getPileNumber(lot.id) === p);
    const quantity = pileLots.reduce((sum, lot) => sum + lot.quantity, 0);
    const energy = pileLots.reduce((sum, lot) => sum + lot.gcv * lot.quantity, 0);
    const gcv = quantity > 0 ? Math.round(energy / quantity) : 0;
    
    pileStats.push({ pile: p, quantity, gcv, energy });
  }
  
  return pileStats;
}