import {
  type ExpenseCategory,
  formatPeriodWithYear,
  getPeriodIndex,
  periodIdFromIndex,
} from '../types';
import type { PeriodRecord } from '../hooks/useAllPeriods';
import { formatCurrency } from './formatCurrency';

export type PredictionTier = 'fixed' | 'likely' | 'maybe';

export interface PredictionPrefs {
  pinned: string[];
  ignored: string[];
}

export interface Prediction {
  /** Normalized description used to match the expense across periods */
  key: string;
  desc: string;
  category: ExpenseCategory;
  amount: number;
  amountRange?: { min: number; max: number };
  tier: PredictionTier;
  /** Repeats every N periods (1 = every half-month, 2 = monthly, 24 = yearly) */
  cadence: number;
  hits: number;
  slots: number;
  lastSeenPeriodId: string;
  pinned: boolean;
  reason: string;
}

export interface PredictionResult {
  predictions: Prediction[];
  /** Ignored expenses, so they can be restored */
  ignored: Array<{ key: string; desc: string }>;
  /** True when there was too little history and the last same-half period was copied */
  usedFallback: boolean;
}

/** Candidate cadences, in periods (half-months) */
export const CADENCES = [1, 2, 4, 6, 24] as const;
/** How far back to look: 24 periods = 12 months */
export const HISTORY_WINDOW = 24;
/** For cadences > 1, this share of all occurrences must land on the cadence */
const MIN_ON_PHASE_SHARE = 0.75;
/** Coefficient of variation below which an amount counts as fixed */
const STABLE_CV = 0.05;

const TIER_ORDER: Record<PredictionTier, number> = { fixed: 0, likely: 1, maybe: 2 };

export const normalizeDesc = (desc: string): string =>
  desc
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const round2 = (n: number) => Math.round(n * 100) / 100;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const coefficientOfVariation = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
};

const cadenceLabel = (cadence: number, targetHalf: number): string => {
  switch (cadence) {
    case 1: return 'Every period';
    case 2: return `Every ${targetHalf === 1 ? '1st' : '2nd'} half`;
    case 4: return 'Every 2 months';
    case 6: return 'Every 3 months';
    case 24: return 'Once a year';
    default: return `Every ${cadence} periods`;
  }
};

interface Occurrence {
  index: number;
  amount: number;
  desc: string;
  category: ExpenseCategory;
}

/** Group expenses by normalized description, one occurrence per period (amounts summed). */
const collectOccurrences = (periods: PeriodRecord[]): Map<string, Occurrence[]> => {
  const byKey = new Map<string, Map<number, Occurrence>>();
  for (const p of periods) {
    for (const exp of p.data.expenses) {
      const key = normalizeDesc(exp.desc);
      if (!key) continue;
      let perPeriod = byKey.get(key);
      if (!perPeriod) {
        perPeriod = new Map();
        byKey.set(key, perPeriod);
      }
      const existing = perPeriod.get(p.index);
      if (existing) {
        existing.amount += exp.amount;
      } else {
        perPeriod.set(p.index, {
          index: p.index,
          amount: exp.amount,
          desc: exp.desc.trim(),
          category: exp.category || 'Other',
        });
      }
    }
  }
  const result = new Map<string, Occurrence[]>();
  for (const [key, perPeriod] of byKey) {
    result.set(key, [...perPeriod.values()].sort((a, b) => a.index - b.index));
  }
  return result;
};

const sortPredictions = (list: Prediction[]): Prediction[] =>
  list.sort((a, b) =>
    TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.amount - a.amount || a.desc.localeCompare(b.desc)
  );

/**
 * Predict the expenses for `targetPeriodId` from past periods.
 *
 * Each expense (matched by normalized description) is tested against several cadences
 * aligned to the target period: every period, every same half of the month, every 2 months,
 * every 3 months, and once a year. The best-fitting cadence decides whether the expense is
 * due in the target period and how confident the prediction is.
 */
export const predictExpenses = (
  history: PeriodRecord[],
  targetPeriodId: string,
  prefs: PredictionPrefs = { pinned: [], ignored: [] }
): PredictionResult => {
  const targetIdx = getPeriodIndex(targetPeriodId);
  const targetHalf = Number(targetPeriodId.split('-')[2]);
  const pinned = new Set(prefs.pinned);
  const ignoredKeys = new Set(prefs.ignored);

  // Only periods that were actually tracked (empty ones were usually auto-created)
  const past = history
    .filter((p) => p.index < targetIdx && p.data.expenses.length > 0)
    .sort((a, b) => a.index - b.index);
  const windowed = past.filter((p) => p.index >= targetIdx - HISTORY_WINDOW);
  const trackedIdx = windowed.map((p) => p.index);

  const allOccurrences = collectOccurrences(past);
  const ignored = prefs.ignored.map((key) => {
    const occ = allOccurrences.get(key);
    return { key, desc: occ ? occ[occ.length - 1].desc : key };
  });

  // Not enough history: copy the most recent same-half period (old template behavior)
  if (windowed.length < 2) {
    const source =
      [...past].reverse().find((p) => p.half === targetHalf) ?? past[past.length - 1];
    if (!source) return { predictions: [], ignored, usedFallback: true };
    const seen = new Set<string>();
    const predictions: Prediction[] = [];
    for (const exp of source.data.expenses) {
      const key = normalizeDesc(exp.desc);
      if (!key || ignoredKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      predictions.push({
        key,
        desc: exp.desc.trim(),
        category: exp.category || 'Other',
        amount: exp.amount,
        tier: pinned.has(key) ? 'fixed' : 'likely',
        cadence: 1,
        hits: 1,
        slots: 1,
        lastSeenPeriodId: source.id,
        pinned: pinned.has(key),
        reason: `Copied from ${formatPeriodWithYear(source.id)} (not enough history yet)`,
      });
    }
    return { predictions: sortPredictions(predictions), ignored, usedFallback: true };
  }

  const windowOccurrences = collectOccurrences(windowed);
  const predictions: Prediction[] = [];

  for (const [key, occurrences] of windowOccurrences) {
    if (ignoredKeys.has(key)) continue;

    const occIdx = new Set(occurrences.map((o) => o.index));
    const firstIdx = occurrences[0].index;

    // Find the rhythm (cadence + phase) that best explains when this expense shows up
    let best: { cadence: number; phase: number; hits: number; slots: number[]; score: number } | null = null;
    for (const cadence of CADENCES) {
      for (let phase = 0; phase < cadence; phase++) {
        const slots = trackedIdx.filter((i) => i >= firstIdx && i % cadence === phase);
        if (slots.length === 0) continue;
        const hits = slots.filter((i) => occIdx.has(i)).length;
        if (hits === 0) continue;
        if (cadence > 1 && hits / occurrences.length < MIN_ON_PHASE_SHARE) continue;
        // Smoothed hit rate: favors rhythms backed by more observations
        const score = hits / (slots.length + 1);
        if (!best || score > best.score) best = { cadence, phase, hits, slots, score };
      }
    }

    const latest = occurrences[occurrences.length - 1];
    const isPinned = pinned.has(key);
    // Not due in the target period under its rhythm (e.g. an every-2-months bill in an off month)
    if (best && targetIdx % best.cadence !== best.phase) best = null;
    if (!best) {
      if (!isPinned) continue;
      best = { cadence: 1, phase: 0, hits: 0, slots: [], score: 0 };
    }

    const { cadence, hits, slots } = best;
    const hitRate = slots.length ? hits / slots.length : 0;
    const onPhase = occurrences.filter((o) => (targetIdx - o.index) % cadence === 0);
    const amountSource = (onPhase.length ? onPhase : occurrences).slice(-3).map((o) => o.amount);
    const stable = coefficientOfVariation(amountSource) < STABLE_CV;
    const amount = round2(stable ? amountSource[amountSource.length - 1] : median(amountSource));
    const amountRange = stable
      ? undefined
      : { min: Math.min(...amountSource), max: Math.max(...amountSource) };
    const lastYear = occIdx.has(targetIdx - 24);

    let tier: PredictionTier | null = null;
    if (hitRate >= 0.8 && (hits >= 3 || (cadence >= 4 && hits >= 2)) && stable) tier = 'fixed';
    else if (hitRate >= 0.6 && hits >= 2) tier = 'likely';
    else if ((hits >= 2 && hitRate >= 0.34) || (cadence === 24 && lastYear)) tier = 'maybe';

    // Missed the last two times it was due: probably stopped (cancelled, paid off).
    // Keep it as an unchecked suggestion at most.
    const lastTwo = slots.slice(-2);
    const stopped = slots.length >= 3 && lastTwo.every((i) => !occIdx.has(i));
    if (stopped) tier = tier && tier !== 'maybe' ? 'maybe' : null;

    if (isPinned) tier = 'fixed';
    if (!tier) continue;

    const parts: string[] = [];
    if (cadence === 24 && hits === 1) {
      parts.push('Same period last year');
    } else if (hits > 0) {
      parts.push(`${cadenceLabel(cadence, targetHalf)} · seen ${hits} of ${slots.length} times`);
    }
    if (amountRange) {
      parts.push(`${formatCurrency(amountRange.min)}–${formatCurrency(amountRange.max)}`);
    } else if (hits > 1) {
      parts.push(`always ${formatCurrency(amount)}`);
    }
    if (stopped) parts.push('missed the last 2 times');
    if (isPinned) parts.push('pinned');
    parts.push(`last seen ${formatPeriodWithYear(periodIdFromIndex(latest.index))}`);

    predictions.push({
      key,
      desc: latest.desc,
      category: latest.category,
      amount,
      amountRange,
      tier,
      cadence,
      hits,
      slots: slots.length,
      lastSeenPeriodId: periodIdFromIndex(latest.index),
      pinned: isPinned,
      reason: parts.join(' · '),
    });
  }

  // Pinned expenses that haven't appeared inside the window: use their last known values
  for (const key of pinned) {
    if (ignoredKeys.has(key) || windowOccurrences.has(key)) continue;
    const occ = allOccurrences.get(key);
    if (!occ) continue;
    const latest = occ[occ.length - 1];
    const lastSeenPeriodId = periodIdFromIndex(latest.index);
    predictions.push({
      key,
      desc: latest.desc,
      category: latest.category,
      amount: round2(latest.amount),
      tier: 'fixed',
      cadence: 1,
      hits: 0,
      slots: 0,
      lastSeenPeriodId,
      pinned: true,
      reason: `Pinned · last seen ${formatPeriodWithYear(lastSeenPeriodId)}`,
    });
  }

  return { predictions: sortPredictions(predictions), ignored, usedFallback: false };
};
