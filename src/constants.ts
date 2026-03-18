// Conversion Constants

export const GOLD_OZ_TO_G = 31.1034768;

export const LNG_FACTORS = {
  // Base unit: Tonne (Metric Ton)
  tonne: 1,
  mmbtu: 51.7, // 1 tonne LNG is roughly 51.7 MMBtu (can vary slightly by source)
  cm: 1300,    // 1 tonne LNG is roughly 1300 cubic meters of gas
  cf: 45910,   // 1 tonne LNG is roughly 45,910 cubic feet of gas
};

export const OIL_FACTORS = {
  // Base unit: Tonne
  // 1 tonne of oil is roughly 7.33 barrels (average)
  // Barrels per tonne = 1 / (Density * 0.158987) ? 
  // Actually, a common rule of thumb is 7.33 bbl/tonne for 33 API oil.
  baseBarrelsPerTonne: 7.33,
};

export const DEFAULT_PARAMS = {
  usdToCny: 7.2,
  goldPriceUsdPerOz: 2150,
  oilDensity: 0.85, // Specific gravity (water = 1)
  daysPerYear: 365,
};
