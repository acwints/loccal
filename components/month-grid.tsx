import type { DayLocation } from "@/lib/loccal";

interface MonthGridProps {
  monthKey: string;
  days: Record<string, DayLocation[]>;
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

export function MonthGrid({ monthKey, days }: MonthGridProps) {
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

          return (
            <article key={dateKey} className="day-cell">
              <div className="day-label">{day}</div>
              {dayLocations.length === 0 ? (
                <p className="none-label">No location inferred</p>
              ) : (
                <div className="location-list">
                  {dayLocations.slice(0, 3).map((entry) => (
                    <details key={`${dateKey}-${entry.location}`} className="location-item">
                      <summary>{entry.location}</summary>
                      <ul>
                        {entry.details.map((detail, detailIdx) => (
                          <li key={`${entry.location}-${detailIdx}`}>{detail}</li>
                        ))}
                      </ul>
                    </details>
                  ))}
                  {dayLocations.length > 3 ? (
                    <p className="extra">+{dayLocations.length - 3} more</p>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
