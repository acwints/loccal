import React from "react";
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

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface WeekCell {
  date: Date;
  dateKey: string;
}

/** Build a grid of weeks (rows) × 7 weekdays (columns) for the given year. */
function buildWeeks(year: number): WeekCell[][] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  // Start from the Sunday on or before Jan 1
  const startDay = jan1.getDay(); // 0=Sun
  const gridStart = new Date(year, 0, 1 - startDay);

  // End on the Saturday on or after Dec 31
  const endDay = dec31.getDay();
  const gridEnd = new Date(year, 11, 31 + (6 - endDay));

  const weeks: WeekCell[][] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const week: WeekCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      week.push({
        date: new Date(cursor),
        dateKey: toDateKey(cursor),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

/** Determine month label for each week row (show label on first week that contains a day from that month). */
function getMonthLabels(weeks: WeekCell[][], year: number): (string | null)[] {
  const labels: (string | null)[] = new Array(weeks.length).fill(null);
  const shown = new Set<number>();

  for (let wi = 0; wi < weeks.length; wi++) {
    for (const cell of weeks[wi]) {
      if (cell.date.getFullYear() === year) {
        const m = cell.date.getMonth();
        if (!shown.has(m)) {
          shown.add(m);
          labels[wi] = MONTH_LABELS[m];
          break;
        }
      }
    }
  }
  return labels;
}

export function YearContributionGraph({
  year,
  days,
  settings,
  selectedDateKey,
  onSelectDate,
  compact
}: YearContributionGraphProps) {
  const weeks = buildWeeks(year);
  const monthLabels = getMonthLabels(weeks, year);

  return (
    <section className={`year-graph-card${compact ? " year-graph-compact" : ""}`} aria-labelledby="year-graph-title">
      <div className="year-graph-head">
        <div>
          <p className="eyebrow">Annual footprint</p>
          <h2 id="year-graph-title">{year}</h2>
        </div>
      </div>

      <div className="year-graph-scroll">
        <div className="year-grid-github" role="grid" aria-label={`Location graph for ${year}`}>
          {/* Row 1: corner + 7 weekday headers */}
          <div className="year-grid-corner" />
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="year-grid-day-hdr">{label}</div>
          ))}

          {/* Week rows: month label + 7 day cells per row */}
          {weeks.map((week, wi) => (
            <React.Fragment key={`week-${wi}`}>
              <div className="year-grid-month-label">
                {monthLabels[wi] ?? ""}
              </div>
              {week.map((cell, dow) => {
                const inYear = cell.date.getFullYear() === year;

                if (!inYear) {
                  return <div key={`${wi}-${dow}`} className="year-grid-cell-empty" />;
                }

                const dayLocations = days[cell.dateKey] ?? [];
                const hasHomeFallback = dayLocations.length === 0 && Boolean(settings.homeLocation);
                const locationLabel = dayLocations[0]
                  ? toCityStateLabel(dayLocations[0].location)
                  : hasHomeFallback
                    ? toCityStateLabel(settings.homeLocation)
                    : "";
                const theme = locationLabel
                  ? getCityTheme(locationLabel, settings, hasHomeFallback)
                  : { background: "var(--surface-2)", textColor: "var(--muted)", icon: "" };
                const isSelected = selectedDateKey === cell.dateKey;
                const dateLabel = cell.date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric"
                });
                const tooltip = locationLabel
                  ? `${dateLabel}: ${locationLabel}`
                  : `${dateLabel}: no location`;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    className={`year-grid-cell${isSelected ? " selected" : ""}`}
                    style={{ background: theme.background, color: theme.textColor }}
                    aria-label={tooltip}
                    title={tooltip}
                    onClick={() => onSelectDate?.(cell.dateKey)}
                    role="gridcell"
                  >
                    <span aria-hidden="true">{locationLabel ? theme.icon : ""}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
