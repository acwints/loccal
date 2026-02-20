import type { DayLocation } from "@/lib/loccal";
import { getCityTheme, toCityStateLabel, type LoccalSettings } from "@/lib/user-settings";

interface YearContributionGraphProps {
  year: number;
  days: Record<string, DayLocation[]>;
  settings: LoccalSettings;
  selectedDateKey?: string | null;
  onSelectDate?: (dateKey: string) => void;
}

interface ContributionCell {
  date: Date;
  dateKey: string;
  inYear: boolean;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeekMonday(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const mondayIndex = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayIndex);
  return result;
}

function endOfWeekSunday(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const mondayIndex = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() + (6 - mondayIndex));
  return result;
}

function buildCellsForYear(year: number) {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const start = startOfWeekMonday(jan1);
  const end = endOfWeekSunday(dec31);

  const cells: ContributionCell[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const inYear = cursor.getFullYear() === year;
    cells.push({
      date: new Date(cursor),
      dateKey: toDateKey(cursor),
      inYear
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

export function YearContributionGraph({
  year,
  days,
  settings,
  selectedDateKey,
  onSelectDate
}: YearContributionGraphProps) {
  const cells = buildCellsForYear(year);
  const weekCount = Math.ceil(cells.length / 7);
  const weekColumns = Array.from({ length: weekCount }, (_, weekIndex) =>
    cells.slice(weekIndex * 7, weekIndex * 7 + 7)
  );

  const monthPositions = new Map<number, number>();
  for (let weekIndex = 0; weekIndex < weekColumns.length; weekIndex += 1) {
    const week = weekColumns[weekIndex];
    const firstInYear = week.find((cell) => cell.inYear);
    if (!firstInYear) continue;
    const month = firstInYear.date.getMonth();
    if (!monthPositions.has(month)) {
      monthPositions.set(month, weekIndex);
    }
  }

  return (
    <section className="year-graph-card" aria-labelledby="year-graph-title">
      <div className="year-graph-head">
        <div>
          <p className="eyebrow">Annual footprint</p>
          <h2 id="year-graph-title">{year} Location Contribution Graph</h2>
        </div>
      </div>

      <div className="year-graph-scroll">
        <div className="year-graph-months" style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}>
          {MONTH_LABELS.map((label, month) => (
            <span key={label} style={{ gridColumn: (monthPositions.get(month) ?? 0) + 1 }}>
              {label}
            </span>
          ))}
        </div>
        <div className="year-graph-body">
          <div className="year-graph-axis" aria-hidden="true">
            <span className="year-graph-axis-mon">Mon</span>
            <span className="year-graph-axis-sun">Sun</span>
          </div>
          <div className="year-graph-grid" role="grid" aria-label={`Location graph for ${year}`}>
            {weekColumns.map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="year-graph-week" role="rowgroup">
                {week.map((cell) => {
                  const dayLocations = cell.inYear ? days[cell.dateKey] ?? [] : [];
                  const hasHomeFallback = cell.inYear && dayLocations.length === 0 && Boolean(settings.homeLocation);
                  const locationLabel = dayLocations[0]
                    ? toCityStateLabel(dayLocations[0].location)
                    : hasHomeFallback
                      ? toCityStateLabel(settings.homeLocation)
                      : "";
                  const theme = locationLabel
                    ? getCityTheme(locationLabel, settings, hasHomeFallback)
                    : { background: "#eef2f6", textColor: "#98a2b3", icon: "" };
                  const isSelected = selectedDateKey === cell.dateKey;
                  const dateLabel = cell.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  });
                  const tooltip = cell.inYear
                    ? locationLabel
                      ? `${dateLabel}: ${locationLabel}`
                      : `${dateLabel}: no location`
                    : "";

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      className={`year-graph-cell${isSelected ? " selected" : ""}${cell.inYear ? "" : " out"}`}
                      style={cell.inYear ? { background: theme.background, color: theme.textColor } : undefined}
                      aria-label={tooltip || "Out of year range"}
                      title={tooltip}
                      data-tooltip={tooltip || undefined}
                      onClick={() => {
                        if (cell.inYear) onSelectDate?.(cell.dateKey);
                      }}
                      disabled={!cell.inYear}
                      role="gridcell"
                    >
                      <span aria-hidden="true">{locationLabel ? theme.icon : ""}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
