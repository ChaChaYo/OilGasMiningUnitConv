import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, 
  Flame, 
  Droplets, 
  Settings2, 
  ChevronDown, 
  ChevronUp,
  Info,
  ArrowRightLeft,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types & Constants ---
type CommodityType = 'gold' | 'lng' | 'oil';

interface ConversionParams {
  usdToCny: number;
  goldPriceUsdPerOz: number;
  oilDensity: number; // Specific gravity
  daysPerYear: number;
}

const DEFAULT_PARAMS: ConversionParams = {
  usdToCny: 7.19,
  goldPriceUsdPerOz: 4500,
  oilDensity: 0.85, // Average crude
  daysPerYear: 365,
};

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Smart formatting: generally 2 decimal places, but at least 3 significant figures
const smartFormat = (num: number) => {
  if (num === null || num === undefined || isNaN(num)) return '';
  if (num === 0) return '0';
  
  const fixed2 = num.toFixed(2);
  const sigFigCount = (s: string) => {
    const match = s.match(/[1-9]/);
    if (!match) return 0;
    const firstSigIndex = s.indexOf(match[0]);
    return s.substring(firstSigIndex).replace('.', '').length;
  };

  if (sigFigCount(fixed2) >= 3) {
    return fixed2;
  }
  
  return parseFloat(num.toPrecision(3)).toString();
};

const autoScaleUnit = (totalValue: number, units: Record<string, number>) => {
  const sortedUnits = Object.entries(units).sort((a, b) => b[1] - a[1]);
  for (const [unit, factor] of sortedUnits) {
    if (totalValue >= factor * 0.1) return unit;
  }
  return sortedUnits[sortedUnits.length - 1][0];
};

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const InputGroup = ({ 
  label, 
  value, 
  onChange, 
  unit, 
  disabled = false, 
  step = "any", 
  onKeyDown,
  onStep
}: { 
  label: string; 
  value: string | number; 
  onChange: (val: string) => void; 
  unit?: string;
  disabled?: boolean;
  step?: string | number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStep?: (direction: 'up' | 'down') => void;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative group">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (onStep && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            onStep(e.key === 'ArrowUp' ? 'up' : 'down');
          }
          onKeyDown?.(e);
        }}
        onWheel={(e) => {
          if (onStep && document.activeElement === e.target) {
            e.preventDefault();
            onStep(e.deltaY < 0 ? 'up' : 'down');
          }
        }}
        disabled={disabled}
        step={step}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {onStep && !disabled && (
          <div className="flex flex-col border-r border-slate-200 pr-2 mr-1">
            <button 
              onClick={() => onStep('up')}
              className="p-0.5 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-slate-600"
            >
              <ChevronUp size={14} />
            </button>
            <button 
              onClick={() => onStep('down')}
              className="p-0.5 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-slate-600"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}
        {unit && (
          <span className="text-slate-400 text-sm font-medium">
            {unit}
          </span>
        )}
      </div>
    </div>
  </div>
);

const SelectInputGroup = ({ label, value, onChange, unit, onUnitChange, unitOptions }: { 
  label: string; 
  value: string | number; 
  onChange: (val: string | any) => void; 
  unit: string;
  onUnitChange: (val: string) => void;
  unitOptions: string[];
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative flex">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-l-lg px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
      />
      <select
        value={unit}
        onChange={(e) => onUnitChange(e.target.value)}
        className="bg-slate-100 border border-l-0 border-slate-200 rounded-r-lg px-3 py-2.5 text-slate-600 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 min-w-[80px] cursor-pointer"
      >
        {unitOptions.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<CommodityType>('gold');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [params, setParams] = useState<ConversionParams>(DEFAULT_PARAMS);

  // Gold State
  const [goldOz, setGoldOz] = useState<string>('1');
  const [goldOzUnit, setGoldOzUnit] = useState<string>('oz');
  const [goldG, setGoldG] = useState<string>('');
  const [goldGUnit, setGoldGUnit] = useState<string>('g');
  const [goldPriceUsd, setGoldPriceUsd] = useState<string>(DEFAULT_PARAMS.goldPriceUsdPerOz.toString());
  const [goldPriceCny, setGoldPriceCny] = useState<string>('');

  // LNG State
  const [lngTonne, setLngTonne] = useState<string>('1');
  const [lngTonneUnit, setLngTonneUnit] = useState<string>('t');
  const [lngMmbtu, setLngMmbtu] = useState<string>('');
  const [lngCf, setLngCf] = useState<string>('');
  const [lngCfUnit, setLngCfUnit] = useState<string>('cf');
  const [lngCm, setLngCm] = useState<string>('');
  const [lngCmUnit, setLngCmUnit] = useState<string>('m³');
  const [lngJoules, setLngJoules] = useState<string>('');
  const [lngJoulesUnit, setLngJoulesUnit] = useState<string>('GJ');
  const [lngWattHours, setLngWattHours] = useState<string>('');
  const [lngWattHoursUnit, setLngWattHoursUnit] = useState<string>('MWh');
  const [lngPriceUsd, setLngPriceUsd] = useState<string>('10.00');
  const [lngPriceCny, setLngPriceCny] = useState<string>('');

  // Oil State
  const [oilTonne, setOilTonne] = useState<string>('1');
  const [oilBbl, setOilBbl] = useState<string>('');
  const [oilTonneYear, setOilTonneYear] = useState<string>('1000000');
  const [oilBblDay, setOilBblDay] = useState<string>('');
  const [oilDensityInput, setOilDensityInput] = useState<string>(DEFAULT_PARAMS.oilDensity.toString());
  const [oilApiInput, setOilApiInput] = useState<string>(smartFormat((141.5 / DEFAULT_PARAMS.oilDensity) - 131.5));

  const handleClearTab = () => {
    if (activeTab === 'gold') {
      setGoldOz('');
      setGoldG('');
    } else if (activeTab === 'lng') {
      setLngTonne('');
      setLngMmbtu('');
      setLngCf('');
      setLngCm('');
      setLngJoules('');
      setLngWattHours('');
    } else if (activeTab === 'oil') {
      setOilTonne('');
      setOilBbl('');
      setOilTonneYear('');
      setOilBblDay('');
    }
  };

  // --- Conversion Handlers ---

  // Gold
  const GOLD_FACTOR = 31.1034768;
  const GOLD_OZ_UNITS: Record<string, number> = { oz: 1, Moz: 1e6 };
  const GOLD_G_UNITS: Record<string, number> = { g: 1, t: 1e6 };

  const handleGoldOzChange = (val: string, currentUnit = goldOzUnit) => {
    setGoldOz(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const totalOz = num * GOLD_OZ_UNITS[currentUnit];
      const totalG = totalOz * GOLD_FACTOR;
      const targetGUnit = autoScaleUnit(totalG, GOLD_G_UNITS);
      setGoldGUnit(targetGUnit);
      setGoldG(smartFormat(totalG / GOLD_G_UNITS[targetGUnit]));
    } else if (val === '') {
      setGoldG('');
    }
  };

  const handleGoldGChange = (val: string, currentUnit = goldGUnit) => {
    setGoldG(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const totalG = num * GOLD_G_UNITS[currentUnit];
      const totalOz = totalG / GOLD_FACTOR;
      const targetOzUnit = autoScaleUnit(totalOz, GOLD_OZ_UNITS);
      setGoldOzUnit(targetOzUnit);
      setGoldOz(smartFormat(totalOz / GOLD_OZ_UNITS[targetOzUnit]));
    } else if (val === '') {
      setGoldOz('');
    }
  };

  const handleGoldOzUnitChange = (newUnit: string) => {
    setGoldOzUnit(newUnit);
    const gNum = parseFloat(goldG);
    if (!isNaN(gNum)) {
      const totalG = gNum * GOLD_G_UNITS[goldGUnit];
      const totalOz = totalG / GOLD_FACTOR;
      setGoldOz(smartFormat(totalOz / GOLD_OZ_UNITS[newUnit]));
    }
  };

  const handleGoldGUnitChange = (newUnit: string) => {
    setGoldGUnit(newUnit);
    const ozNum = parseFloat(goldOz);
    if (!isNaN(ozNum)) {
      const totalOz = ozNum * GOLD_OZ_UNITS[goldOzUnit];
      const totalG = totalOz * GOLD_FACTOR;
      setGoldG(smartFormat(totalG / GOLD_G_UNITS[newUnit]));
    }
  };

  const handleGoldPriceUsdChange = (val: string) => {
    setGoldPriceUsd(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setGoldPriceCny(smartFormat((num * params.usdToCny) / GOLD_FACTOR));
    } else if (val === '') {
      setGoldPriceCny('');
    }
  };

  const handleGoldPriceCnyChange = (val: string) => {
    setGoldPriceCny(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setGoldPriceUsd(smartFormat((num * GOLD_FACTOR) / params.usdToCny));
    } else if (val === '') {
      setGoldPriceUsd('');
    }
  };

  // Sync CNY prices when exchange rate changes
  useEffect(() => {
    const gUsd = parseFloat(goldPriceUsd);
    if (!isNaN(gUsd)) {
      setGoldPriceCny(smartFormat((gUsd * params.usdToCny) / GOLD_FACTOR));
    }
    const lUsd = parseFloat(lngPriceUsd);
    if (!isNaN(lUsd)) {
      setLngPriceCny(smartFormat((lUsd * params.usdToCny) / (LNG_CM_PER_TONNE / LNG_MMBTU_PER_TONNE)));
    }
  }, [params.usdToCny]);

  // LNG
  const LNG_MMBTU_PER_TONNE = 51.7;
  const LNG_CF_PER_TONNE = 45910;
  const LNG_CM_PER_TONNE = 1300;
  const LNG_J_PER_MMBTU = 1055055852.62;
  const LNG_WH_PER_MMBTU = 293071.07;

  const CF_UNITS = { cf: 1, bcf: 1e9, tcf: 1e12 };
  const CM_UNITS = { 'm³': 1, 'MSm³': 1e6 };
  const TONNE_UNITS = { 't': 1, 'Mt': 1e6 };
  const JOULE_UNITS = { MJ: 1e6, GJ: 1e9, TJ: 1e12 };
  const WH_UNITS = { kWh: 1e3, MWh: 1e6, GWh: 1e9, TWh: 1e12 };

  const handleLngTonneChange = (val: string) => {
    setLngTonne(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const totalTonne = num * TONNE_UNITS[lngTonneUnit as keyof typeof TONNE_UNITS];
      const totalMmbtu = totalTonne * LNG_MMBTU_PER_TONNE;
      setLngMmbtu(smartFormat(totalMmbtu));
      
      const totalCf = totalTonne * LNG_CF_PER_TONNE;
      const cfUnit = autoScaleUnit(totalCf, CF_UNITS);
      setLngCfUnit(cfUnit);
      setLngCf(smartFormat(totalCf / CF_UNITS[cfUnit as keyof typeof CF_UNITS]));

      const totalCm = totalTonne * LNG_CM_PER_TONNE;
      const cmUnit = autoScaleUnit(totalCm, CM_UNITS);
      setLngCmUnit(cmUnit);
      setLngCm(smartFormat(totalCm / CM_UNITS[cmUnit as keyof typeof CM_UNITS]));

      const totalJ = totalMmbtu * LNG_J_PER_MMBTU;
      const jUnit = autoScaleUnit(totalJ, JOULE_UNITS);
      setLngJoulesUnit(jUnit);
      setLngJoules(smartFormat(totalJ / JOULE_UNITS[jUnit as keyof typeof JOULE_UNITS]));

      const totalWh = totalMmbtu * LNG_WH_PER_MMBTU;
      const whUnit = autoScaleUnit(totalWh, WH_UNITS);
      setLngWattHoursUnit(whUnit);
      setLngWattHours(smartFormat(totalWh / WH_UNITS[whUnit as keyof typeof WH_UNITS]));
    } else if (val === '') {
      setLngMmbtu('');
      setLngCf('');
      setLngCm('');
      setLngJoules('');
      setLngWattHours('');
    }
  };

  const handleLngTonneUnitChange = (newUnit: string) => {
    setLngTonneUnit(newUnit);
    const mmbtuNum = parseFloat(lngMmbtu);
    if (!isNaN(mmbtuNum)) {
      const totalTonne = mmbtuNum / LNG_MMBTU_PER_TONNE;
      setLngTonne(smartFormat(totalTonne / TONNE_UNITS[newUnit as keyof typeof TONNE_UNITS]));
    }
  };

  const handleLngMmbtuChange = (val: string) => {
    setLngMmbtu(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const totalMmbtu = num;
      const totalTonne = totalMmbtu / LNG_MMBTU_PER_TONNE;
      const tonneUnit = autoScaleUnit(totalTonne, TONNE_UNITS);
      setLngTonneUnit(tonneUnit);
      setLngTonne(smartFormat(totalTonne / TONNE_UNITS[tonneUnit as keyof typeof TONNE_UNITS]));
      
      const totalCf = totalTonne * LNG_CF_PER_TONNE;
      const cfUnit = autoScaleUnit(totalCf, CF_UNITS);
      setLngCfUnit(cfUnit);
      setLngCf(smartFormat(totalCf / CF_UNITS[cfUnit as keyof typeof CF_UNITS]));

      const totalCm = totalTonne * LNG_CM_PER_TONNE;
      const cmUnit = autoScaleUnit(totalCm, CM_UNITS);
      setLngCmUnit(cmUnit);
      setLngCm(smartFormat(totalCm / CM_UNITS[cmUnit as keyof typeof CM_UNITS]));

      const totalJ = totalMmbtu * LNG_J_PER_MMBTU;
      const jUnit = autoScaleUnit(totalJ, JOULE_UNITS);
      setLngJoulesUnit(jUnit);
      setLngJoules(smartFormat(totalJ / JOULE_UNITS[jUnit as keyof typeof JOULE_UNITS]));

      const totalWh = totalMmbtu * LNG_WH_PER_MMBTU;
      const whUnit = autoScaleUnit(totalWh, WH_UNITS);
      setLngWattHoursUnit(whUnit);
      setLngWattHours(smartFormat(totalWh / WH_UNITS[whUnit as keyof typeof WH_UNITS]));
    } else if (val === '') {
      setLngTonne('');
      setLngCf('');
      setLngCm('');
      setLngJoules('');
      setLngWattHours('');
    }
  };

  const handleLngCfChange = (val: string) => {
    setLngCf(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const totalCf = num * CF_UNITS[lngCfUnit as keyof typeof CF_UNITS];
      const totalTonne = totalCf / LNG_CF_PER_TONNE;
      const totalMmbtu = totalTonne * LNG_MMBTU_PER_TONNE;
      const tonneUnit = autoScaleUnit(totalTonne, TONNE_UNITS);
      setLngTonneUnit(tonneUnit);
      setLngTonne(smartFormat(totalTonne / TONNE_UNITS[tonneUnit as keyof typeof TONNE_UNITS]));
      setLngMmbtu(smartFormat(totalMmbtu));
      
      const totalCm = totalTonne * LNG_CM_PER_TONNE;
      const cmUnit = autoScaleUnit(totalCm, CM_UNITS);
      setLngCmUnit(cmUnit);
      setLngCm(smartFormat(totalCm / CM_UNITS[cmUnit as keyof typeof CM_UNITS]));

      const totalJ = totalMmbtu * LNG_J_PER_MMBTU;
      const jUnit = autoScaleUnit(totalJ, JOULE_UNITS);
      setLngJoulesUnit(jUnit);
      setLngJoules(smartFormat(totalJ / JOULE_UNITS[jUnit as keyof typeof JOULE_UNITS]));

      const totalWh = totalMmbtu * LNG_WH_PER_MMBTU;
      const whUnit = autoScaleUnit(totalWh, WH_UNITS);
      setLngWattHoursUnit(whUnit);
      setLngWattHours(smartFormat(totalWh / WH_UNITS[whUnit as keyof typeof WH_UNITS]));
    } else if (val === '') {
      setLngTonne('');
      setLngMmbtu('');
      setLngCm('');
      setLngJoules('');
      setLngWattHours('');
    }
  };

  const handleLngCfUnitChange = (newUnit: string) => {
    setLngCfUnit(newUnit);
    const mmbtuNum = parseFloat(lngMmbtu);
    if (!isNaN(mmbtuNum)) {
      const totalTonne = mmbtuNum / LNG_MMBTU_PER_TONNE;
      const totalCf = totalTonne * LNG_CF_PER_TONNE;
      setLngCf(smartFormat(totalCf / CF_UNITS[newUnit as keyof typeof CF_UNITS]));
    }
  };

  const handleLngCmChange = (val: string) => {
    setLngCm(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const totalCm = num * CM_UNITS[lngCmUnit as keyof typeof CM_UNITS];
      const totalTonne = totalCm / LNG_CM_PER_TONNE;
      const totalMmbtu = totalTonne * LNG_MMBTU_PER_TONNE;
      const tonneUnit = autoScaleUnit(totalTonne, TONNE_UNITS);
      setLngTonneUnit(tonneUnit);
      setLngTonne(smartFormat(totalTonne / TONNE_UNITS[tonneUnit as keyof typeof TONNE_UNITS]));
      setLngMmbtu(smartFormat(totalMmbtu));
      
      const totalCf = totalTonne * LNG_CF_PER_TONNE;
      const cfUnit = autoScaleUnit(totalCf, CF_UNITS);
      setLngCfUnit(cfUnit);
      setLngCf(smartFormat(totalCf / CF_UNITS[cfUnit as keyof typeof CF_UNITS]));

      const totalJ = totalMmbtu * LNG_J_PER_MMBTU;
      const jUnit = autoScaleUnit(totalJ, JOULE_UNITS);
      setLngJoulesUnit(jUnit);
      setLngJoules(smartFormat(totalJ / JOULE_UNITS[jUnit as keyof typeof JOULE_UNITS]));

      const totalWh = totalMmbtu * LNG_WH_PER_MMBTU;
      const whUnit = autoScaleUnit(totalWh, WH_UNITS);
      setLngWattHoursUnit(whUnit);
      setLngWattHours(smartFormat(totalWh / WH_UNITS[whUnit as keyof typeof WH_UNITS]));
    } else if (val === '') {
      setLngTonne('');
      setLngMmbtu('');
      setLngCf('');
      setLngJoules('');
      setLngWattHours('');
    }
  };

  const handleLngCmUnitChange = (newUnit: string) => {
    setLngCmUnit(newUnit);
    const mmbtuNum = parseFloat(lngMmbtu);
    if (!isNaN(mmbtuNum)) {
      const totalTonne = mmbtuNum / LNG_MMBTU_PER_TONNE;
      const totalCm = totalTonne * LNG_CM_PER_TONNE;
      setLngCm(smartFormat(totalCm / CM_UNITS[newUnit as keyof typeof CM_UNITS]));
    }
  };

  const handleLngJoulesChange = (val: string) => {
    setLngJoules(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const totalJ = num * JOULE_UNITS[lngJoulesUnit as keyof typeof JOULE_UNITS];
      const totalMmbtu = totalJ / LNG_J_PER_MMBTU;
      const totalTonne = totalMmbtu / LNG_MMBTU_PER_TONNE;
      const tonneUnit = autoScaleUnit(totalTonne, TONNE_UNITS);
      setLngTonneUnit(tonneUnit);
      setLngTonne(smartFormat(totalTonne / TONNE_UNITS[tonneUnit as keyof typeof TONNE_UNITS]));
      setLngMmbtu(smartFormat(totalMmbtu));
      
      const totalCf = totalTonne * LNG_CF_PER_TONNE;
      const cfUnit = autoScaleUnit(totalCf, CF_UNITS);
      setLngCfUnit(cfUnit);
      setLngCf(smartFormat(totalCf / CF_UNITS[cfUnit as keyof typeof CF_UNITS]));

      const totalCm = totalTonne * LNG_CM_PER_TONNE;
      const cmUnit = autoScaleUnit(totalCm, CM_UNITS);
      setLngCmUnit(cmUnit);
      setLngCm(smartFormat(totalCm / CM_UNITS[cmUnit as keyof typeof CM_UNITS]));

      const totalWh = totalMmbtu * LNG_WH_PER_MMBTU;
      const whUnit = autoScaleUnit(totalWh, WH_UNITS);
      setLngWattHoursUnit(whUnit);
      setLngWattHours(smartFormat(totalWh / WH_UNITS[whUnit as keyof typeof WH_UNITS]));
    } else if (val === '') {
      setLngTonne('');
      setLngMmbtu('');
      setLngCf('');
      setLngCm('');
      setLngWattHours('');
    }
  };

  const handleLngJoulesUnitChange = (newUnit: string) => {
    setLngJoulesUnit(newUnit);
    const mmbtuNum = parseFloat(lngMmbtu);
    if (!isNaN(mmbtuNum)) {
      const totalMmbtu = mmbtuNum;
      const totalJ = totalMmbtu * LNG_J_PER_MMBTU;
      setLngJoules(smartFormat(totalJ / JOULE_UNITS[newUnit as keyof typeof JOULE_UNITS]));
    }
  };

  const handleLngWattHoursChange = (val: string) => {
    setLngWattHours(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const totalWh = num * WH_UNITS[lngWattHoursUnit as keyof typeof WH_UNITS];
      const totalMmbtu = totalWh / LNG_WH_PER_MMBTU;
      const totalTonne = totalMmbtu / LNG_MMBTU_PER_TONNE;
      const tonneUnit = autoScaleUnit(totalTonne, TONNE_UNITS);
      setLngTonneUnit(tonneUnit);
      setLngTonne(smartFormat(totalTonne / TONNE_UNITS[tonneUnit as keyof typeof TONNE_UNITS]));
      setLngMmbtu(smartFormat(totalMmbtu));
      
      const totalCf = totalTonne * LNG_CF_PER_TONNE;
      const cfUnit = autoScaleUnit(totalCf, CF_UNITS);
      setLngCfUnit(cfUnit);
      setLngCf(smartFormat(totalCf / CF_UNITS[cfUnit as keyof typeof CF_UNITS]));

      const totalCm = totalTonne * LNG_CM_PER_TONNE;
      const cmUnit = autoScaleUnit(totalCm, CM_UNITS);
      setLngCmUnit(cmUnit);
      setLngCm(smartFormat(totalCm / CM_UNITS[cmUnit as keyof typeof CM_UNITS]));

      const totalJ = totalMmbtu * LNG_J_PER_MMBTU;
      const jUnit = autoScaleUnit(totalJ, JOULE_UNITS);
      setLngJoulesUnit(jUnit);
      setLngJoules(smartFormat(totalJ / JOULE_UNITS[jUnit as keyof typeof JOULE_UNITS]));
    } else if (val === '') {
      setLngTonne('');
      setLngMmbtu('');
      setLngCf('');
      setLngCm('');
      setLngJoules('');
    }
  };

  const handleLngWattHoursUnitChange = (newUnit: string) => {
    setLngWattHoursUnit(newUnit);
    const mmbtuNum = parseFloat(lngMmbtu);
    if (!isNaN(mmbtuNum)) {
      const totalMmbtu = mmbtuNum;
      const totalWh = totalMmbtu * LNG_WH_PER_MMBTU;
      setLngWattHours(smartFormat(totalWh / WH_UNITS[newUnit as keyof typeof WH_UNITS]));
    }
  };

  const handleLngPriceUsdChange = (val: string) => {
    setLngPriceUsd(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      // 1 MMBtu = (1300 / 51.7) m3
      const cnyPerCm = (num * params.usdToCny) / (LNG_CM_PER_TONNE / LNG_MMBTU_PER_TONNE);
      setLngPriceCny(smartFormat(cnyPerCm));
    } else if (val === '') {
      setLngPriceCny('');
    }
  };

  const handleLngPriceCnyChange = (val: string) => {
    setLngPriceCny(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const usdPerMmbtu = (num / params.usdToCny) * (LNG_CM_PER_TONNE / LNG_MMBTU_PER_TONNE);
      setLngPriceUsd(smartFormat(usdPerMmbtu));
    } else if (val === '') {
      setLngPriceUsd('');
    }
  };

  // Oil
  const bblPerTonne = useMemo(() => 1 / (0.158987 * params.oilDensity), [params.oilDensity]);

  const handleOilTonneChange = (val: string) => {
    setOilTonne(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setOilBbl(smartFormat(num * bblPerTonne));
    else if (val === '') setOilBbl('');
  };

  const handleOilBblChange = (val: string) => {
    setOilBbl(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setOilTonne(smartFormat(num / bblPerTonne));
    else if (val === '') setOilTonne('');
  };

  const handleOilTonneYearChange = (val: string) => {
    setOilTonneYear(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setOilBblDay(smartFormat((num * bblPerTonne) / params.daysPerYear));
    else if (val === '') setOilBblDay('');
  };

  const handleOilBblDayChange = (val: string) => {
    setOilBblDay(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setOilTonneYear(Math.round((num * params.daysPerYear) / bblPerTonne).toString());
    else if (val === '') setOilTonneYear('');
  };

  const handleOilDensityInputChange = (val: string) => {
    setOilDensityInput(val);
    const sg = parseFloat(val);
    if (!isNaN(sg) && sg > 0) {
      setParams(p => ({ ...p, oilDensity: sg }));
      const api = (141.5 / sg) - 131.5;
      setOilApiInput(smartFormat(api));
    } else if (val === '') {
      setOilApiInput('');
    }
  };

  const handleOilApiInputChange = (val: string) => {
    setOilApiInput(val);
    const api = parseFloat(val);
    if (!isNaN(api)) {
      const sg = 141.5 / (api + 131.5);
      setParams(p => ({ ...p, oilDensity: sg }));
      setOilDensityInput(smartFormat(sg));
    } else if (val === '') {
      setOilDensityInput('');
    }
  };

  // Initial calculation
  useEffect(() => {
    handleGoldOzChange(goldOz);
    handleLngTonneChange(lngTonne);
    handleLngPriceUsdChange(lngPriceUsd);
    handleOilTonneChange(oilTonne);
    handleOilTonneYearChange(oilTonneYear);
  }, []);

  // Update when density or days change
  useEffect(() => {
    handleOilTonneChange(oilTonne);
    handleOilTonneYearChange(oilTonneYear);
  }, [bblPerTonne, params.daysPerYear]);

  // Fetch exchange rate and gold price on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      // Fetch Exchange Rate
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        if (data && data.rates && data.rates.CNY) {
          const newRate = data.rates.CNY;
          setParams(prev => ({ ...prev, usdToCny: newRate }));
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      }

      // Fetch Gold Price (PAXG/USDT as proxy for Gold/USD)
      try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
        const data = await response.json();
        if (data && data.price) {
          const newGoldPrice = parseFloat(data.price);
          if (!isNaN(newGoldPrice)) {
            const formattedPrice = smartFormat(newGoldPrice);
            setGoldPriceUsd(formattedPrice);
            // The useEffect for params.usdToCny will handle updating goldPriceCny
          }
        }
      } catch (error) {
        console.error('Failed to fetch gold price:', error);
      }
    };
    fetchInitialData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
              🌊资源单位换算器by WL
            </h1>
            <p className="text-sm text-slate-500 mt-1">Professional unit conversion for energy analysts</p>
          </div>
        </header>

        {/* Tabs & Clear Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit overflow-x-auto">
            {[
              { id: 'gold', icon: Coins, label: 'Gold / 黄金' },
              { id: 'lng', icon: Flame, label: 'LNG / 天然气' },
              { id: 'oil', icon: Droplets, label: 'Oil / 原油' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CommodityType)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleClearTab}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all border border-red-100"
            title="Clear current tab / 清空当前页"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear / 清空</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Conversion Panel */}
          <div className="md:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-6">
                  {activeTab === 'gold' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <SelectInputGroup 
                          label="Weight (Imperial)" 
                          value={goldOz} 
                          onChange={(v) => handleGoldOzChange(v)} 
                          unit={goldOzUnit}
                          onUnitChange={handleGoldOzUnitChange}
                          unitOptions={Object.keys(GOLD_OZ_UNITS)}
                        />
                        <SelectInputGroup 
                          label="Weight (Metric)" 
                          value={goldG} 
                          onChange={(v) => handleGoldGChange(v)} 
                          unit={goldGUnit}
                          onUnitChange={handleGoldGUnitChange}
                          unitOptions={Object.keys(GOLD_G_UNITS)}
                        />
                      </div>
                      <div className="pt-6 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                          <span className="w-1 h-4 bg-emerald-600 rounded-full"></span>
                          Price Conversion / 价格换算
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <InputGroup 
                            label="Price (USD/oz)" 
                            value={goldPriceUsd} 
                            onChange={handleGoldPriceUsdChange} 
                            unit="$/oz" 
                          />
                          <InputGroup 
                            label="Price (CNY/g)" 
                            value={goldPriceCny} 
                            onChange={handleGoldPriceCnyChange} 
                            unit="¥/g" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'lng' && (
                    <div className="space-y-8">
                      {/* Mass Section */}
                      <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1 h-4 bg-indigo-600 rounded-full"></span>
                          Mass / 质量
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <SelectInputGroup 
                            label="LNG Mass" 
                            value={lngTonne} 
                            onChange={handleLngTonneChange} 
                            unit={lngTonneUnit}
                            onUnitChange={handleLngTonneUnitChange}
                            unitOptions={['t', 'Mt']}
                          />
                        </div>
                      </section>

                      {/* Energy Section */}
                      <section className="space-y-4 pt-6 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1 h-4 bg-indigo-600 rounded-full"></span>
                          Energy / 热值
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <InputGroup 
                            label="Heating Value" 
                            value={lngMmbtu} 
                            onChange={handleLngMmbtuChange} 
                            unit="MMBtu" 
                          />
                          <SelectInputGroup 
                            label="Joules" 
                            value={lngJoules} 
                            onChange={handleLngJoulesChange} 
                            unit={lngJoulesUnit}
                            onUnitChange={handleLngJoulesUnitChange}
                            unitOptions={['MJ', 'GJ', 'TJ']}
                          />
                          <SelectInputGroup 
                            label="Watt-hours" 
                            value={lngWattHours} 
                            onChange={handleLngWattHoursChange} 
                            unit={lngWattHoursUnit}
                            onUnitChange={handleLngWattHoursUnitChange}
                            unitOptions={['kWh', 'MWh', 'GWh', 'TWh']}
                          />
                        </div>
                      </section>

                      {/* Volume Section */}
                      <section className="space-y-4 pt-6 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1 h-4 bg-indigo-600 rounded-full"></span>
                          Volume / 体积
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <SelectInputGroup 
                            label="Cubic Feet" 
                            value={lngCf} 
                            onChange={handleLngCfChange} 
                            unit={lngCfUnit}
                            onUnitChange={handleLngCfUnitChange}
                            unitOptions={['cf', 'bcf', 'tcf']}
                          />
                          <SelectInputGroup 
                            label="Cubic Meters" 
                            value={lngCm} 
                            onChange={handleLngCmChange} 
                            unit={lngCmUnit}
                            onUnitChange={handleLngCmUnitChange}
                            unitOptions={['m³', 'MSm³']}
                          />
                        </div>
                      </section>

                      {/* Price Section */}
                      <section className="space-y-4 pt-6 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1 h-4 bg-emerald-600 rounded-full"></span>
                          Price Conversion / 价格换算
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <InputGroup 
                            label="Price (USD/MMBtu)" 
                            value={lngPriceUsd} 
                            onChange={handleLngPriceUsdChange} 
                            unit="$/MMBtu" 
                          />
                          <InputGroup 
                            label="Price (CNY/m³)" 
                            value={lngPriceCny} 
                            onChange={handleLngPriceCnyChange} 
                            unit="¥/m³" 
                          />
                        </div>
                      </section>

                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex gap-3">
                        <Info className="w-5 h-5 text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500 leading-relaxed">
                          LNG conversion factors are approximate. 1 Tonne LNG ≈ 51.7 MMBtu ≈ 45,910 ft³ ≈ 1,300 m³ of natural gas. 
                          Units auto-scale to keep values in a readable range (0.1 - 1000).
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'oil' && (
                    <div className="space-y-8">
                      <section className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Inventory Conversion</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <InputGroup 
                            label="Mass (Tonne)" 
                            value={oilTonne} 
                            onChange={handleOilTonneChange} 
                            unit="t" 
                          />
                          <InputGroup 
                            label="Volume (Barrels)" 
                            value={oilBbl} 
                            onChange={handleOilBblChange} 
                            unit="bbl" 
                          />
                        </div>
                      </section>

                      <section className="space-y-4 pt-6 border-t border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Production Rate</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <InputGroup 
                            label="Annual Production" 
                            value={oilTonneYear} 
                            onChange={handleOilTonneYearChange} 
                            unit="t/y" 
                          />
                          <InputGroup 
                            label="Daily Rate" 
                            value={oilBblDay} 
                            onChange={handleOilBblDayChange} 
                            unit="bbl/d" 
                          />
                        </div>
                      </section>
                    </div>
                  )}
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar / Advanced */}
          <div className="space-y-6">
            <Card className="p-5">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-widest">
                  <Settings2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  Advanced Parameters
                </div>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 space-y-5">
                      <InputGroup 
                        label="USD-CNY" 
                        value={params.usdToCny} 
                        onChange={(v) => setParams(p => ({ ...p, usdToCny: parseFloat(v) || 0 }))} 
                        step="0.01"
                        onStep={(direction) => {
                          const current = params.usdToCny;
                          const next = direction === 'up'
                            ? Math.floor(current * 100 + 1.0001) / 100
                            : Math.ceil(current * 100 - 1.0001) / 100;
                          setParams(p => ({ ...p, usdToCny: Number(next.toFixed(4)) }));
                        }}
                      />
                      {activeTab === 'oil' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <InputGroup 
                              label="Density (SG)" 
                              value={oilDensityInput} 
                              onChange={handleOilDensityInputChange} 
                              unit="g/cm³"
                            />
                            <InputGroup 
                              label="API Gravity" 
                              value={oilApiInput} 
                              onChange={handleOilApiInputChange} 
                              unit="°API"
                            />
                          </div>
                          <InputGroup 
                            label="Days Per Year" 
                            value={params.daysPerYear} 
                            onChange={(v) => setParams(p => ({ ...p, daysPerYear: parseInt(v) || 365 }))} 
                          />
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-[10px] text-amber-700 font-medium leading-tight">
                              Density affects the Barrel/Tonne ratio. Average crude is ~0.85 SG (35 API).
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            <Card className="p-5 bg-indigo-900 text-white border-none">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-4">Quick Reference / 快速参考</h3>
              <div className="space-y-4">
                {activeTab === 'gold' && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-70">1 Troy Oz</span>
                      <span className="font-mono">31.1035 g</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-70">1 kg Gold</span>
                      <span className="font-mono">32.1507 oz</span>
                    </div>
                  </>
                )}
                {activeTab === 'lng' && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-70">1 t LNG</span>
                      <span className="font-mono">~51.7 MMBtu</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-70">1 t LNG</span>
                      <span className="font-mono">~45,910 ft³</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-70">1 t LNG</span>
                      <span className="font-mono">~1,300 m³</span>
                    </div>
                  </>
                )}
                {activeTab === 'oil' && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-70">1 bbl Oil</span>
                      <span className="font-mono">158.987 L</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-70">1 t Oil ({params.oilDensity} SG)</span>
                      <span className="font-mono">{smartFormat(bblPerTonne)} bbl</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

        </div>

        {/* Footer */}
        <footer className="pt-8 pb-4 text-center border-t border-slate-200">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
            Data provided for analytical purposes only. Verify with official sources.
          </p>
        </footer>
      </div>
    </div>
  );
}
