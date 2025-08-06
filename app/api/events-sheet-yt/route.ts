import { google, calendar_v3 } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";
import { existsSync } from "fs";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
];

// Paths for service account keys by calendar account
const SERVICE_ACCOUNT_KEYS: Record<string, string> = {
  Home: join(process.cwd(), "lib", "service-account-home.json"),
  // Office removed per request
};

// Mapping of sheet/account name to calendar ID env vars (Office removed)
const CALENDAR_IDS: { [key: string]: string | undefined } = {
  Achal: process.env.Achal_Calendar_ID,
  Neeraj: process.env.Neeraj_Calendar_ID,
  Salman: process.env.Salman_Calendar_ID,
  Vivek: process.env.Vivek_Calendar_ID,
  Jyoti: process.env.Jyoti_Calendar_ID,
  Ravi: process.env.Ravi_Calendar_ID,
  Govt: process.env.Govt_Calendar_ID,
  // Office: process.env.Office_Calendar_ID,  // removed
};

// Valid sheet names for API usage
const SHEET_NAMES = Object.keys(CALENDAR_IDS).filter((name) => CALENDAR_IDS[name]);

interface Event {
  start: string;
  end: string;
  title: string;
  youtubeHindi: string;
  youtubeEnglish: string;
  youtubePlaylistHindi: string;
  youtubePlaylistEnglish: string;
  timeZone: string;
}

// Authenticate using google.auth.GoogleAuth with correct service account JSON based on calendar account
const authenticate = async (calendarAccount: string) => {
  if (calendarAccount !== "Home") {
    calendarAccount = "Home"; // force to Home only
  }

  const keyFilePath = SERVICE_ACCOUNT_KEYS[calendarAccount];
  if (!keyFilePath || !existsSync(keyFilePath)) {
    console.error(`Missing service account JSON for ${calendarAccount} at ${keyFilePath}`);
    return NextResponse.json({
      error: `Service account credentials missing for ${calendarAccount}`,
    }, { status: 500 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: SCOPES,
    });
    console.log(`Authentication successful for ${calendarAccount}`);
    return auth;
  } catch (error) {
    console.error("Authentication failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.stack);
    }
    return NextResponse.json({
      error: "Failed to authenticate with Google APIs",
      details: error instanceof Error ? error.message : String(error),
      keyFilePath,
      keyFileExists: existsSync(keyFilePath),
    }, { status: 500 });
  }
};

export async function GET(request: Request) {
  // Simple readiness message or extend as needed
  return NextResponse.json({ message: "Google Calendar integration API is running." });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Vivek";
  // Remove calendarAccount param usage; force Home
  const calendarAccount = "Home";

  const calendarId = CALENDAR_IDS[name];
  if (!calendarId) {
    return NextResponse.json(
      { error: `Invalid or missing calendar ID for ${name}. Check environment variables.` },
      { status: 400 },
    );
  }

  const auth = await authenticate(calendarAccount);
  if (auth instanceof NextResponse) return auth;

  let body: {
    action: string;
    events?: Event[];
    selectedDate?: string;
    dates?: string[];
    isRangeMode?: boolean;
    eventDuration?: number;
  };

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON in request body", details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }

  const { action, events, selectedDate, dates, isRangeMode, eventDuration } = body;

  if (!action) {
    return NextResponse.json({ error: "Missing action in request body" }, { status: 400 });
  }

  const datesToProcess = dates && dates.length > 0 ? dates : (selectedDate ? [selectedDate] : []);
  if (datesToProcess.length === 0) {
    return NextResponse.json({ error: "No valid dates provided" }, { status: 400 });
  }

  const calendar = google.calendar({ version: "v3", auth });

  try {
    if (action === "addAll") {
      if (!events || !Array.isArray(events)) {
        return NextResponse.json({ error: "Events must be an array" }, { status: 400 });
      }

      console.log(`Adding events to calendar: ${calendarId} for ${datesToProcess.length} date(s): ${datesToProcess.join(", ")}`);

      let totalEventsAdded = 0;

      for (const dateStr of datesToProcess) {
        console.log(`Processing events for date: ${dateStr}`);

        for (const evt of events) {
          const eventForDate = {
            ...evt,
            start: evt.start.replace(/^\d{4}-\d{2}-\d{2}/, dateStr),
            end: evt.end.replace(/^\d{4}-\d{2}-\d{2}/, dateStr),
          };

          const startDateTime = new Date(eventForDate.start);
          const durationMinutes = typeof eventDuration === "number" ? eventDuration : 50;
          const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

          if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            console.error(`Invalid date for event: ${eventForDate.title} on ${dateStr}`);
            continue;
          }

          const startISO = startDateTime.toISOString();
          const endISO = endDateTime.toISOString();

          console.log(`Creating event '${eventForDate.title}' [${startISO} ... ${endISO}]`);

          try {
            await calendar.events.insert({
              calendarId,
              requestBody: {
                summary: eventForDate.title,
                description:
                  `Hindi: ${eventForDate.youtubeHindi || ""}\n` +
                  `English: ${eventForDate.youtubeEnglish || ""}\n` +
                  `Playlist (Hindi): ${eventForDate.youtubePlaylistHindi || ""}\n` +
                  `Playlist (English): ${eventForDate.youtubePlaylistEnglish || ""}`,
                start: { dateTime: startISO, timeZone: eventForDate.timeZone },
                end: { dateTime: endISO, timeZone: eventForDate.timeZone },
                reminders: {
                  useDefault: false,
                  overrides: [{ method: "popup", minutes: 5 }],
                },
              },
            });
            totalEventsAdded++;
            console.log(`Added event: ${eventForDate.title} on ${dateStr}`);
          } catch (insertError) {
            console.error(`Failed to insert event: ${eventForDate.title} on ${dateStr}:`, insertError);
          }
        }
      }

      const message = isRangeMode
        ? `${totalEventsAdded} events added to calendar across ${datesToProcess.length} days successfully!`
        : `${totalEventsAdded} events added to calendar for ${datesToProcess[0]} successfully!`;

      return NextResponse.json({ message });
    }

    if (action === "removeAll") {
      console.log(`Attempting to remove events from calendar: ${calendarId} for ${datesToProcess.length} date(s): ${datesToProcess.join(", ")}`);

      let totalDeletedEvents = 0;

      for (const dateStr of datesToProcess) {
        console.log(`Processing deletion for date: ${dateStr}`);

        const searchStart = new Date(dateStr);
        searchStart.setDate(searchStart.getDate() - 1);
        const searchEnd = new Date(dateStr);
        searchEnd.setDate(searchEnd.getDate() + 2);

        let pageToken: string | undefined = undefined;
        const eventsToDelete: calendar_v3.Schema$Event[] = [];

        do {
          try {
            const response: calendar_v3.Schema$Events = await calendar.events.list({
              calendarId,
              pageToken,
              timeMin: searchStart.toISOString(),
              timeMax: searchEnd.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
            }).then(res => res.data);

            const fetchedEvents = response.items || [];
            const filteredEvents = fetchedEvents.filter(event => {
              if (!event.start?.dateTime) return false;
              const eventStart = new Date(event.start.dateTime);
              const eventDateStr = eventStart.toISOString().split("T")[0];
              console.log(`Event: ${event.summary}, Event Date: ${eventDateStr}, Target Date: ${dateStr}`);
              return eventDateStr === dateStr;
            });

            eventsToDelete.push(...filteredEvents);
            pageToken = response.nextPageToken ?? undefined;
          } catch (listError) {
            console.error(`Failed to list events for ${dateStr}:`, listError);
            break;
          }
        } while (pageToken);

        console.log(`Found ${eventsToDelete.length} events to delete for ${dateStr}`);

        for (const evt of eventsToDelete) {
          if (evt.id) {
            try {
              await calendar.events.delete({
                calendarId,
                eventId: evt.id,
              });
              totalDeletedEvents++;
              console.log(`Deleted event: ${evt.summary} (ID: ${evt.id}) for ${dateStr} at ${evt.start?.dateTime}`);
            } catch (deleteError: any) {
              if (deleteError.code === 404) {
                console.warn(`Event ${evt.id} not found for ${dateStr}, likely already deleted.`);
              } else if (deleteError.code === 403) {
                console.error(`Permission denied to delete event ${evt.id} for ${dateStr}`);
              } else {
                console.error(`Failed to delete event ${evt.id} for ${dateStr}:`, deleteError.message);
              }
            }
          } else {
            console.warn(`Event without ID found for ${dateStr}, cannot delete: ${evt.summary || 'Unknown event'}`);
          }
        }
      }

      const message = isRangeMode
        ? `${totalDeletedEvents} events removed from calendar across ${datesToProcess.length} days successfully!`
        : `${totalDeletedEvents} events removed from calendar for ${datesToProcess[0]} successfully!`;

      return NextResponse.json({ message });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error(`Error processing POST request for ${name}:`, error);
    return NextResponse.json({
      error: "Failed to process request",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
