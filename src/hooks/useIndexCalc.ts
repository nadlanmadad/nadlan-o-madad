import { useReducer, useMemo } from "react";
import type { IndexState, IndexResults } from "@/types";

const INDEX_DEFAULTS: Record<string, { returnPct: number; dividendPct: number }> = {
  "S&P 500":    { returnPct: 10.5, dividendPct: 1.5 },
  "Nasdaq 100": { returnPct: 13.0, dividendPct: 0.7 },
  "MSCI World": { returnPct: 8.5,  dividendPct: 2.0 },
  "מדד מותאם": { returnPct: 8.0,  dividendPct: 1.0 },
};

export const INDEX_LIST = Object.keys(INDEX_DEFAULTS);

function calcCAGR(netReturn: number, equity: number, years: number): number {
  if (equity <= 0 || years <= 0) return 0;
  const ratio = 1 + netReturn / equity;
  if (ratio <= 0) return -100;
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

export const DEFAULT_IDX_STATE: IndexState = {
  selectedIndex: "S&P 500", returnPct: 10.5, dividendPct: 1.5,
  drip: true, pessimisticOffset: -3, optimisticOffset: 3,
};

type Action = { type: "SET"; field: keyof IndexState; value: any }
            | { type: "SET_INDEX"; name: string }
            | { type: "LOAD"; state: IndexState };

function reducer(state: IndexState, action: Action): IndexState {
  if (action.type === "SET_INDEX") {
    const d = INDEX_DEFAULTS[action.name] ?? INDEX_DEFAULTS["מדד מותאם"];
    return { ...state, selectedIndex: action.name, returnPct: d.returnPct, dividendPct: d.dividendPct };
  }
  if (action.type === "LOAD") return action.state;
  return { ...state, [action.field]: action.value };
}

function calcScenario(equity: number, years: number, returnPct: number, dividendPct: number, drip: boolean) {
  const TAX = 0.25;
  const yearlyValues: number[] = [equity];
  if (drip) {
    const totalRate = (returnPct + dividendPct) / 100;
    const finalValue = equity * Math.pow(1 + totalRate, years);
    const grossReturn = finalValue - equity;
    const netReturn = grossReturn * (1 - TAX);
    for (let y = 1; y <= years; y++) yearlyValues.push(equity * Math.pow(1 + totalRate, y));
    return { finalValue, grossReturn, netReturn, roeAnnual: calcCAGR(netReturn, equity, years), yearlyValues };
  } else {
    let value = equity;
    let totalDividends = 0;
    for (let y = 1; y <= years; y++) {
      value = value * (1 + returnPct / 100);
      totalDividends += value * (dividendPct / 100) * (1 - TAX);
      yearlyValues.push(value);
    }
    const netCapital = (value - equity) * (1 - TAX);
    const netReturn = netCapital + totalDividends;
    return { finalValue: value, grossReturn: (value - equity) + totalDividends, netReturn, roeAnnual: calcCAGR(netReturn, equity, years), yearlyValues };
  }
}

export function useIndexCalc(equity: number, years: number) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_IDX_STATE);

  const results = useMemo((): IndexResults => {
    const { returnPct, dividendPct, drip, pessimisticOffset, optimisticOffset } = state;
    const realistic   = calcScenario(equity, years, returnPct, dividendPct, drip);
    const pessimistic = calcScenario(equity, years, returnPct + pessimisticOffset, dividendPct, drip);
    const optimistic  = calcScenario(equity, years, returnPct + optimisticOffset, dividendPct, drip);
    return {
      finalValue: realistic.finalValue, totalReturn: realistic.grossReturn,
      netReturn: realistic.netReturn, roeAnnual: realistic.roeAnnual,
      yearlyValues: realistic.yearlyValues,
      scenarioROEAnnual: { pessimistic: pessimistic.roeAnnual, realistic: realistic.roeAnnual, optimistic: optimistic.roeAnnual },
      scenarioNetReturn: { pessimistic: pessimistic.netReturn, realistic: realistic.netReturn, optimistic: optimistic.netReturn },
    };
  }, [state, equity, years]);

  return { state, dispatch, results };
}
