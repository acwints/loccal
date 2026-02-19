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
  selectedDateKey?: string | null;
  onSelectDate?: (dateKey: string) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthMeta(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    firstWeekday: firstDay.getDay(),
    daysInMonth
  };
}

export function MonthGrid({
  monthKey,
  days,
  settings,
  selectedDateKey,
  onSelectDate
}: MonthGridProps) {
  const { firstWeekday, daysInMonth } = getMonthMeta(monthKey);

  return (
    <div className="month-grid-wrap">
      <div className="weekdays">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="weekday-cell">
            {weekday}
          </div>
        ))}
      </div>
      <div className="month-grid">
        {Array.from({ length: firstWeekday }).map((_, idx) => (
          <div key={`empty-${idx}`} className="day-cell empty" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
          const dayLocations = days[dateKey] ?? [];
          const inferredCityStateLabels = Array.from(
            new Set(dayLocations.map((entry) => toCityStateLabel(entry.location)))
          );
          const hasHomeFallback = inferredCityStateLabels.length === 0 && Boolean(settings.homeLocation);
          const displayLabels =
            inferredCityStateLabels.length > 0
              ? inferredCityStateLabels
              : hasHomeFallback
                ? [toCityStateLabel(settings.homeLocation)]
                : [];
          const primaryLabel = displayLabels[0] ?? "";
          const theme = getCityTheme(primaryLabel, settings, hasHomeFallback);
          const isSelected = dateKey === selectedDateKey;

          return (
            <article key={dateKey} className={`day-cell${isSelected ? " selected" : ""}`}>
              <button
                type="button"
                className="day-button"
                aria-pressed={isSelected}
                onClick={() => onSelectDate?.(dateKey)}
                style={{
                  background: theme.background,
                  color: theme.textColor
                }}
              >
                <div className="day-cell-head">
                  <div className="day-label">{day}</div>
                  {theme.icon ? <span className="day-icon">{theme.icon}</span> : null}
                </div>
                {displayLabels.length === 0 ? (
                  <p className="none-label">No city inferred</p>
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
                    {hasHomeFallback ? <p className="home-note">Home default</p> : null}
                  </div>
                )}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
