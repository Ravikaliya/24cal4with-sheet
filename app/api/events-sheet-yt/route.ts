import { google, calendar_v3 } from "googleapis";
import { NextResponse } from "next/server";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
];

// Map sheet/account names to calendar ID environment variables
const CALENDAR_IDS: { [key: string]: string | undefined } = {
  Achal: process.env.Achal_Calendar_ID,
  Neeraj: process.env.Neeraj_Calendar_ID,
  Salman: process.env.Salman_Calendar_ID,
  Vivek: process.env.Vivek_Calendar_ID,
  Jyoti: process.env.Jyoti_Calendar_ID,
  Ravi: process.env.Ravi_Calendar_ID,
  Govt: process.env.Govt_Calendar_ID,
  // Office: process.env.Office_Calendar_ID, // removed as per your setup
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

// Parse and cache service account keys JSON from environment variable
let parsedServiceAccountKeys: any;
try {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable.");
  }
  parsedServiceAccountKeys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
} catch (e) {
  parsedServiceAccountKeys = undefined;
  console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:", e);
}

// Google API authentication helper
const authenticate = async (calendarAccount: string) => {
  // Force calendarAccount to "Home" or adjust per your logic
  if (calendarAccount !== "Home") calendarAccount = "Home";

  // Support both nested keys { Home: {...} } or flat single key {...}
  const serviceAccount = parsedServiceAccountKeys?.[calendarAccount] || parsedServiceAccountKeys;

  if (!serviceAccount) {
    console.error(`Missing service account credentials for ${calendarAccount}`);
    return NextResponse.json(
      { error: `Service account credentials missing for ${calendarAccount}` },
      { status: 500 }
    );
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: SCOPES,
    });
    console.log(`Authentication successful for ${calendarAccount}`);
    return auth;
  } catch (error) {
    console.error("Authentication failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.stack);
    }
    return NextResponse.json(
      {
        error: "Failed to authenticate with Google APIs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// GET handler for fetching events
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const sheetName = searchParams.get("sheetName");
  const date = searchParams.get("date");

  if (action !== "getEvents") {
    return NextResponse.json({ error: "Invalid or missing action" }, { status: 400 });
  }
  if (!sheetName || !date) {
    return NextResponse.json({ error: "Missing sheetName or date" }, { status: 400 });
  }

  const calendarId = CALENDAR_IDS[sheetName];
  if (!calendarId) {
    return NextResponse.json({ error: `Invalid calendar ID for ${sheetName}` }, { status: 400 });
  }

  const calendarAccount = "Home"; // adjust if you support multiple accounts
  const auth = await authenticate(calendarAccount);
  if (auth instanceof NextResponse) return auth;

  const calendar = google.calendar({ version: "v3", auth });
  const timeZone = "Asia/Kolkata";

  try {
    // Define the date time range for event fetch (full day in Asia/Kolkata)
    const timeMin = `${date}T00:00:00+05:30`;
    const timeMax = `${date}T23:59:59+05:30`;

    const eventsResponse = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    const items = eventsResponse.data.items || [];

    const events = items.map((evt) => ({
      start: evt.start?.dateTime || "",
      end: evt.end?.dateTime || "",
      title: evt.summary || "",
      youtubeHindi: "", // You could parse from description if structured
      youtubeEnglish: "",
      youtubePlaylistHindi: "",
      youtubePlaylistEnglish: "",
      timeZone,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST handler for adding/removing events
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Vivek";
  const calendarAccount = "Home";

  const calendarId = CALENDAR_IDS[name];
  if (!calendarId) {
    return NextResponse.json(
      { error: `Invalid or missing calendar ID for ${name}. Check environment variables.` },
      { status: 400 }
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

      let totalEventsAdded = 0;

      for (const dateStr of datesToProcess) {
        for (const evt of events) {
          const hour = evt.start.split("T")[1].slice(0, 2);

          const start1 = `${dateStr}T${hour}:00:00`;
          const end1 = `${dateStr}T${hour}:05:00`;
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
                  reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 5 }] },
                },
              });
              totalEventsAdded++;
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
      let totalDeletedEvents = 0;

      for (const dateStr of datesToProcess) {
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
            }).then(res => res.data);

            const fetchedEvents = response.items || [];

            const filteredEvents = fetchedEvents.filter((event) => {
              if (!event.start?.dateTime) return false;
              const eventStart = new Date(event.start.dateTime);
              const localDateStr = eventStart.toLocaleDateString("en-CA", { timeZone });
              return localDateStr === dateStr;
            });

            eventsToDelete.push(...filteredEvents);
            pageToken = response.nextPageToken ?? undefined;
          } catch (listError) {
            console.error(`Failed to list events for ${dateStr}:`, listError);
            break;
          }
        } while (pageToken);

        for (const evt of eventsToDelete) {
          if (evt.id) {
            try {
              await calendar.events.delete({ calendarId, eventId: evt.id });
              totalDeletedEvents++;
            } catch (deleteError: any) {
              if (deleteError.code === 404) {
                console.warn(`Event ${evt.id} not found for ${dateStr}, likely already deleted.`);
              } else if (deleteError.code === 403) {
                console.error(`Permission denied to delete event ${evt.id} for ${dateStr}`);
              } else {
                console.error(`Failed to delete event ${evt.id} for ${dateStr}:`, deleteError.message);
              }
            }
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
    return NextResponse.json(
      { error: "Failed to process request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
