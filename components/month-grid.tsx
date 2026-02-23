import { SectionToolbar } from "@/components/section-toolbar";
import type { DayLocation } from "@/lib/loccal";
import {
  getCityTheme,
  toCityStateLabel,
  type LoccalSettings
} from "@/lib/user-settings";

interface MonthGridProps {
  monthKey: string;
  days: Record<string, DayLocation[]>;
  settings: LoccalSettings;
  title?: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  overlaps?: Record<
    string,
    {
      friendIds: string[];
      friendNames: string[];
      cities: string[];
    }
  >;
  selectedDateKey?: string | null;
  onSelectDate?: (dateKey: string) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarCell {
  key: string;
  day: number;
  dateKey: string;
}

function buildCalendarCells(monthKey: string): CalendarCell[] {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthLastDay = new Date(year, month - 1, 0);
  const prevMonthDate = prevMonthLastDay.getDate();
  const prevMonthYear = prevMonthLastDay.getFullYear();
  const prevMonthMonth = prevMonthLastDay.getMonth() + 1;
  const cells: CalendarCell[] = [];

  for (let offset = firstWeekday - 1; offset >= 0; offset--) {
    const day = prevMonthDate - offset;
    const dateKey = `${prevMonthYear}-${String(prevMonthMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      key: `prev-${dateKey}`,
      day,
      dateKey
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
    cells.push({
      key: dateKey,
      day,
      dateKey
    });
  }

  // Fill trailing cells from next month to complete the last row
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const nextMonth = new Date(year, month, 1);
    const nextMonthYear = nextMonth.getFullYear();
    const nextMonthNum = nextMonth.getMonth() + 1;
    const trailingCount = 7 - remainder;
    for (let day = 1; day <= trailingCount; day++) {
      const dateKey = `${nextMonthYear}-${String(nextMonthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({
        key: `next-${dateKey}`,
        day,
        dateKey
      });
    }
  }

  return cells;
}

export function MonthGrid({
  monthKey,
  days,
  settings,
  title,
  onPrevMonth,
  onNextMonth,
  overlaps,
  selectedDateKey,
  onSelectDate
}: MonthGridProps) {
  const calendarCells = buildCalendarCells(monthKey);

  return (
    <div className="month-grid-wrap">
      {title ? (
        <SectionToolbar title={title}>
          <button type="button" className="ghost-btn" onClick={onPrevMonth}>
            Previous
          </button>
          <button type="button" className="ghost-btn" onClick={onNextMonth}>
            Next
          </button>
        </SectionToolbar>
      ) : null}
      <div className="weekdays">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="weekday-cell">
            {weekday}
          </div>
        ))}
      </div>
      <div className="month-grid">
        {calendarCells.map((cell) => {
          const { dateKey, day, key } = cell;
          const dayLocations = days[dateKey] ?? [];
          const inferredCityStateLabels = Array.from(
            new Set(dayLocations.map((entry) => toCityStateLabel(entry.location)))
          );
          const hasHomeFallback =
            inferredCityStateLabels.length === 0 && Boolean(settings.homeLocation);
          const displayLabels =
            inferredCityStateLabels.length > 0
              ? inferredCityStateLabels
              : hasHomeFallback
                ? [toCityStateLabel(settings.homeLocation)]
                : [];
          const primaryLabel = displayLabels[0] ?? "";
          const theme = getCityTheme(primaryLabel, settings, hasHomeFallback);
          const isSelected = dateKey === selectedDateKey;
          const overlap = overlaps?.[dateKey];
          const hasOverlap = Boolean(overlap);

          return (
            <article
              key={key}
              className={`day-cell${isSelected ? " selected" : ""}${hasOverlap ? " overlap" : ""}`}
            >
              <button
                type="button"
                className="day-button"
                aria-pressed={isSelected}
                onClick={() => {
                  onSelectDate?.(dateKey);
                }}
                style={{
                  background: theme.background,
                  color: theme.textColor,
                  cursor: "pointer"
                }}
              >
                <div className="day-cell-head">
                  <div className="day-label">{day}</div>
                  <div className="day-status-stack">
                    {hasHomeFallback ? <span className="day-status-chip">Home</span> : null}
                    {hasOverlap ? <span className="day-status-chip overlap">Match</span> : null}
                  </div>
                </div>
                {displayLabels.length === 0 ? (
                  <p className="none-label">&nbsp;</p>
                ) : (
                  <div className="city-list">
                    {displayLabels.slice(0, 3).map((cityLabel) => (
                      <span key={`${dateKey}-${cityLabel}`} className="city-pill">
                        {cityLabel}
                      </span>
                    ))}
                    {displayLabels.length > 3 ? (
                      <p className="extra">+{displayLabels.length - 3} more</p>
                    ) : null}
                  </div>
                )}
                {hasOverlap ? (
                  <p className="overlap-note">
                    Match with {overlap?.friendNames.length ?? 0} friend
                    {(overlap?.friendNames.length ?? 0) === 1 ? "" : "s"}
                  </p>
                ) : null}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
