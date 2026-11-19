import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getPeriodId } from '../types';
import { MONTHS, periodDateRange } from '../utils/periodFormat';
import { IconButton } from './ui/primitives';

interface PeriodTimelineProps {
  periodIds: string[];
  selectedPeriodId: string;
  selectedYear: number;
  yearRange: [number, number];
  onSelect: (periodId: string) => void;
  onYearChange: (year: number) => void;
}

/** A year at a glance: 12 months × 2 halves. Filled = set up, dashed = not yet. */
export const PeriodTimeline: React.FC<PeriodTimelineProps> = ({
  periodIds,
  selectedPeriodId,
  selectedYear,
  yearRange,
  onSelect,
  onYearChange,
}) => {
  const existing = new Set(periodIds);
  const today = getPeriodId();
  const selectedRef = useRef<HTMLButtonElement>(null);

  // On narrow screens the strip scrolls; keep the selected period in view
  useEffect(() => {
    const el = selectedRef.current;
    const strip = el?.closest('[data-strip]') as HTMLElement | null;
    if (!el || !strip || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
  }, [selectedPeriodId, selectedYear]);

  return (
    <div className="flex items-center gap-4">
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label="Previous year" disabled={selectedYear <= yearRange[0]} onClick={() => onYearChange(selectedYear - 1)}>
          <ChevronLeft />
        </IconButton>
        <span className="num w-11 text-center text-sm font-semibold text-fg">{selectedYear}</span>
        <IconButton label="Next year" disabled={selectedYear >= yearRange[1]} onClick={() => onYearChange(selectedYear + 1)}>
          <ChevronRight />
        </IconButton>
      </div>

      <div data-strip className="relative -mx-1 flex-1 overflow-x-auto px-1 pb-2">
        <div className="grid min-w-[640px] grid-cols-12 gap-1.5">
          {MONTHS.map((label, i) => {
            const month = i + 1;
            return (
              <div key={label} className="flex flex-col gap-1.5">
                <span className="text-center text-[11px] font-medium uppercase tracking-wide text-fg-3">{label}</span>
                <div className="flex gap-0.5">
                  {[1, 2].map((half) => {
                    const id = `${selectedYear}-${month}-${half}`;
                    const selected = id === selectedPeriodId;
                    const exists = existing.has(id);
                    const isToday = id === today;
                    return (
                      <button
                        key={half}
                        ref={selected ? selectedRef : undefined}
                        type="button"
                        onClick={() => onSelect(id)}
                        aria-current={selected ? 'true' : undefined}
                        aria-label={`${label} ${half === 1 ? '1st' : '2nd'} half${exists ? '' : ' (not set up)'}${isToday ? ', current period' : ''}`}
                        title={`${periodDateRange(id)}${exists ? '' : ' · not set up'}`}
                        className={cn(
                          'relative h-7 flex-1 rounded-xs text-[11px] font-semibold transition-colors',
                          selected
                            ? 'bg-accent text-on-accent'
                            : exists
                              ? 'bg-surface-3 text-fg-2 hover:bg-line-strong hover:text-fg'
                              : 'border border-dashed border-line-strong text-fg-3 hover:border-fg-3 hover:text-fg'
                        )}
                      >
                        {half}
                        {isToday && !selected && (
                          <span className="absolute -bottom-1.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-xs bg-accent" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
