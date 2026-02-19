import { google } from "googleapis";

export interface CalendarEventInput {
  title: string;
  location?: string | null;
  isAllDay: boolean;
  start: Date;
  end: Date;
  allDayStartKey?: string;
  allDayEndKeyExclusive?: string;
}

function toKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

async function listAllCalendarIds(calendar: ReturnType<typeof google.calendar>) {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.calendarList.list({
      pageToken,
      minAccessRole: "reader",
      showHidden: false,
      maxResults: 250
    });

    for (const item of response.data.items ?? []) {
      if (item.id) ids.push(item.id);
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return ids;
}

async function listEventsForCalendar(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string
) {
  const results: CalendarEventInput[] = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.events.list({
      calendarId,
      pageToken,
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      singleEvents: true,
      maxResults: 2500,
      showDeleted: false
    });

    for (const event of response.data.items ?? []) {
      if (!event.start || !event.end || !event.summary) continue;

      const isAllDay = Boolean(event.start.date && !event.start.dateTime);
      const start = isAllDay
        ? new Date(`${event.start.date}T00:00:00Z`)
        : new Date(event.start.dateTime ?? "");
      const end = isAllDay
        ? new Date(`${event.end.date}T00:00:00Z`)
        : new Date(event.end.dateTime ?? "");

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

      results.push({
        title: event.summary,
        location: event.location,
        isAllDay,
        start,
        end,
        allDayStartKey: event.start.date ?? undefined,
        allDayEndKeyExclusive: event.end.date ?? undefined
      });
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return results;
}

export async function fetchEventsFromAllCalendars(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  const timezoneSetting = await calendar.settings.get({ setting: "timezone" });
  const timeZone = timezoneSetting.data.value ?? "UTC";

  const ids = await listAllCalendarIds(calendar);
  const timeMinIso = timeMin.toISOString();
  const timeMaxIso = timeMax.toISOString();

  const eventLists = await Promise.all(
    ids.map((id) => listEventsForCalendar(calendar, id, timeMinIso, timeMaxIso))
  );

  return {
    events: eventLists.flat(),
    timeZone,
    toDateKey: (date: Date) => toKey(date, timeZone)
  };
}
