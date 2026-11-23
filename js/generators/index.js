// 產生器註冊表。新增單元：寫一個 generators/<單元id>.js（預設匯出 { unitId, types }），
// 在下面 import 並加進 ALL，再把單元資料加到 data/units.js。核心程式不用改。
import twoQuantity from './g6-two-quantity.js';
import circumference from './g6-circumference.js';
import ratePercent from './g5-rate-percent.js';
import ratio from './g6-ratio.js';
import fractionDivision from './g6-fraction-division.js';
import problemSolving1 from './g6-problem-solving-1.js';

const ALL = [twoQuantity, circumference, ratePercent, ratio, fractionDivision, problemSolving1];

const registry = new Map();

export function registerUnit(mod) {
  if (!mod || !mod.unitId || !mod.types) throw new Error('registerUnit: 格式不符');
  for (const [typeId, def] of Object.entries(mod.types)) {
    if (typeof def.generate !== 'function' || !Array.isArray(def.levels)) {
      throw new Error(`registerUnit: ${mod.unitId}:${typeId} 缺少 generate 或 levels`);
    }
  }
  registry.set(mod.unitId, mod);
}

for (const m of ALL) registerUnit(m);

export function getGenerator(unitId, typeId) {
  const mod = registry.get(unitId);
  return (mod && mod.types[typeId]) || null;
}

export function registeredUnits() { return [...registry.keys()]; }

export function registeredTypes(unitId) {
  const mod = registry.get(unitId);
  return mod ? Object.keys(mod.types) : [];
}
