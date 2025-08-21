import { google, calendar_v3 } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";
import { existsSync } from "fs";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
];

const serviceAccountKeys = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
// const serviceAccountKeys = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
//   ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
//   : undefined;

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

const authenticate = async (calendarAccount: string) => {
  if (calendarAccount !== "Home") {
    calendarAccount = "Home"; // force to Home only
  }

  const keyFilePath =
    (serviceAccountKeys && typeof serviceAccountKeys === "object" && serviceAccountKeys[calendarAccount])
    || SERVICE_ACCOUNT_KEYS[calendarAccount];
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
  return NextResponse.json({ message: "Google Calendar integration API is running." });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Vivek";
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
  };

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON in request body", details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }

  const { action, events, selectedDate, dates, isRangeMode } = body;

  if (!action) {
    return NextResponse.json({ error: "Missing action in request body" }, { status: 400 });
  }

  const datesToProcess = dates && dates.length > 0 ? dates : (selectedDate ? [selectedDate] : []);
  if (datesToProcess.length === 0) {
    return NextResponse.json({ error: "No valid dates provided" }, { status: 400 });
  }

  const calendar = google.calendar({ version: "v3", auth });
  const timeZone = "Asia/Kolkata";

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
          // Extract hour from event start
          const hour = evt.start.split("T")[1].slice(0, 2);

          // First event: 5 minutes from HH:00 to HH:05
          const start1 = `${dateStr}T${hour}:00:00`;
          const end1 = `${dateStr}T${hour}:05:00`;

          // Second event: 40 minutes from HH:10 to HH:50
          const start2 = `${dateStr}T${hour}:10:00`;
          const end2 = `${dateStr}T${hour}:50:00`;

          for (const [startTime, endTime] of [[start1, end1], [start2, end2]]) {
            try {
              await calendar.events.insert({
                calendarId,
                requestBody: {
                  summary: evt.title,
                  description:
                    `Hindi: ${evt.youtubeHindi || ""}\n` +
                    `English: ${evt.youtubeEnglish || ""}\n` +
                    `Playlist (Hindi): ${evt.youtubePlaylistHindi || ""}\n` +
                    `Playlist (English): ${evt.youtubePlaylistEnglish || ""}`,
                  start: { dateTime: new Date(startTime).toISOString(), timeZone: evt.timeZone },
                  end: { dateTime: new Date(endTime).toISOString(), timeZone: evt.timeZone },
                  reminders: {
                    useDefault: false,
                    overrides: [{ method: "popup", minutes: 5 }],
                  },
                },
              });
              totalEventsAdded++;
              console.log(`Added event '${evt.title}' on ${dateStr} from ${startTime} to ${endTime}`);
            } catch (insertError) {
              console.error(`Failed to insert event '${evt.title}' on ${dateStr} from ${startTime} to ${endTime}:`, insertError);
            }
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

        // Use Asia/Kolkata timezone explicit date range
        const searchStart = `${dateStr}T00:00:00+05:30`;
        const searchEnd = `${dateStr}T23:59:59+05:30`;

        let pageToken: string | undefined = undefined;
        const eventsToDelete: calendar_v3.Schema$Event[] = [];

        do {
          try {
            const response: calendar_v3.Schema$Events = await calendar.events.list({
              calendarId,
              pageToken,
              timeMin: searchStart,
              timeMax: searchEnd,
              singleEvents: true,
              orderBy: "startTime",
            }).then((res) => res.data);

            const fetchedEvents = response.items || [];

            // Filter events exactly matching the date in timezone
            const filteredEvents = fetchedEvents.filter((event) => {
              if (!event.start?.dateTime) return false;
              const eventStart = new Date(event.start.dateTime);
              // Convert to Asia/Kolkata local date string
              const localDateStr = eventStart.toLocaleDateString("en-CA", {
                timeZone, // "en-CA" outputs yyyy-mm-dd format
              });
              return localDateStr === dateStr;
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
            console.warn(`Event without ID found for ${dateStr}, cannot delete: ${evt.summary || "Unknown event"}`);
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
