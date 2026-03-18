export interface ConversionParams {
  usdToCny: number;
  goldPriceUsdPerOz: number;
  oilDensity: number; // API gravity or specific gravity? Usually tonnes to barrels depends on density.
  daysPerYear: number;
}

export type CommodityType = 'gold' | 'lng' | 'oil';

export interface UnitOption {
  label: string;
  value: string;
  factor: number; // Factor relative to a base unit
}
