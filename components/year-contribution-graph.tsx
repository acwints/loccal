import type { DayLocation } from "@/lib/loccal";
import { getCityTheme, toCityStateLabel, type LoccalSettings } from "@/lib/user-settings";

interface YearContributionGraphProps {
  year: number;
  days: Record<string, DayLocation[]>;
  settings: LoccalSettings;
  selectedDateKey?: string | null;
  onSelectDate?: (dateKey: string) => void;
  compact?: boolean;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NUMBERS = Array.from({ length: 31 }, (_, i) => i + 1);

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function YearContributionGraph({
  year,
  days,
  settings,
  selectedDateKey,
  onSelectDate,
  compact
}: YearContributionGraphProps) {
  return (
    <section className={`year-graph-card${compact ? " year-graph-compact" : ""}`} aria-labelledby="year-graph-title">
      <div className="year-graph-head">
        <div>
          <p className="eyebrow">Annual footprint</p>
          <h2 id="year-graph-title">{year}</h2>
        </div>
      </div>

      <div className="year-graph-scroll">
        <div className="year-grid-transposed" role="grid" aria-label={`Location graph for ${year}`}>
          {/* Day number header row */}
          <div className="year-grid-corner" />
          {DAY_NUMBERS.map((d) => (
            <div key={`hdr-${d}`} className="year-grid-day-hdr">
              {d}
            </div>
          ))}

          {/* Month rows */}
          {MONTH_LABELS.map((label, monthIdx) => {
            const monthDays = daysInMonth(year, monthIdx);
            return [
              <div key={`month-${monthIdx}`} className="year-grid-month-label">
                {label}
              </div>,
              ...DAY_NUMBERS.map((d) => {
                const valid = d <= monthDays;
                if (!valid) {
                  return <div key={`${monthIdx}-${d}`} className="year-grid-cell-empty" />;
                }
                const dateKey = toDateKey(year, monthIdx, d);
                const dayLocations = days[dateKey] ?? [];
                const hasHomeFallback = dayLocations.length === 0 && Boolean(settings.homeLocation);
                const locationLabel = dayLocations[0]
                  ? toCityStateLabel(dayLocations[0].location)
                  : hasHomeFallback
                    ? toCityStateLabel(settings.homeLocation)
                    : "";
                const theme = locationLabel
                  ? getCityTheme(locationLabel, settings, hasHomeFallback)
                  : { background: "var(--surface-2)", textColor: "var(--muted)", icon: "" };
                const isSelected = selectedDateKey === dateKey;
                const dateLabel = new Date(year, monthIdx, d).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric"
                });
                const tooltip = locationLabel
                  ? `${dateLabel}: ${locationLabel}`
                  : `${dateLabel}: no location`;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`year-grid-cell${isSelected ? " selected" : ""}`}
                    style={{ background: theme.background, color: theme.textColor }}
                    aria-label={tooltip}
                    title={tooltip}
                    onClick={() => onSelectDate?.(dateKey)}
                    role="gridcell"
                  >
                    <span aria-hidden="true">{locationLabel ? theme.icon : ""}</span>
                  </button>
                );
              })
            ];
          })}
        </div>
      </div>
    </section>
  );
}
