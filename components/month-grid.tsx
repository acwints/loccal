import type { DayLocation } from "@/lib/loccal";

interface MonthGridProps {
  monthKey: string;
  days: Record<string, DayLocation[]>;
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

export function MonthGrid({ monthKey, days, selectedDateKey, onSelectDate }: MonthGridProps) {
  const { firstWeekday, daysInMonth } = getMonthMeta(monthKey);

  function toCityOnlyLabel(location: string) {
    const [city] = location.split(",");
    return city?.trim() || location;
  }

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
          const cityLabels = Array.from(
            new Set(dayLocations.map((entry) => toCityOnlyLabel(entry.location)))
          );
          const isSelected = dateKey === selectedDateKey;

          return (
            <article key={dateKey} className={`day-cell${isSelected ? " selected" : ""}`}>
              <button type="button" className="day-button" onClick={() => onSelectDate?.(dateKey)}>
                <div className="day-label">{day}</div>
                {cityLabels.length === 0 ? (
                  <p className="none-label">No city inferred</p>
                ) : (
                  <div className="city-list">
                    {cityLabels.slice(0, 3).map((cityLabel) => (
                      <span key={`${dateKey}-${cityLabel}`} className="city-pill">
                        {cityLabel}
                      </span>
                    ))}
                    {cityLabels.length > 3 ? (
                      <p className="extra">+{cityLabels.length - 3} more</p>
                    ) : null}
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
