import { google, calendar_v3 } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";

const KEYFILEPATH = join(process.cwd(), "lib", "service-account-key.json");
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
];

const CALENDAR_IDS: { [key: string]: string | undefined } = {
  Achal: process.env.Achal_Calendar_ID,
  Neeraj: process.env.Neeraj_Calendar_ID,
  Salman: process.env.Salman_Calendar_ID,
  Vivek: "5505023bb6a4f113a246f96b42d58030a696b957aeee438346699b1a82c85c9d@group.calendar.google.com", // Updated with provided ID
  Jyoti: process.env.Jyoti_Calendar_ID,
  Ravi: process.env.Ravi_Calendar_ID,
  Govt: process.env.Govt_Calendar_ID,
};

const SHEET_NAMES = Object.keys(CALENDAR_IDS).filter((name) => CALENDAR_IDS[name]);

interface Event {
  start: string;
  end: string;
  title: string;
  youtubeHindi: string;
  youtubeEnglish: string;
  timeZone: string;
}

const authenticate = async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES,
    });
    console.log("Authentication successful");
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
        keyFilePath: KEYFILEPATH,
        keyFileExists: require('fs').existsSync(KEYFILEPATH)
      },
      { status: 500 }
    );
  }
};

const ensureSheetsExist = async (sheets: ReturnType<typeof google.sheets>, spreadsheetId: string) => {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    const existingSheets = response.data.sheets?.map((sheet) => sheet.properties?.title) || [];

    for (const sheetName of SHEET_NAMES) {
      if (!existingSheets.includes(sheetName)) {
        console.log(`Creating sheet: ${sheetName}`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1:D1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [["Start - End", "Title", "YouTube Hindi", "YouTube English"]],
          },
        });
      }
    }
  } catch (error) {
    console.error("Error ensuring sheets exist:", error);
    throw new Error("Failed to ensure sheets exist");
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth; // Return error response if authentication fails

  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    return NextResponse.json(
      { error: "SPREADSHEET_ID is not set in environment variables" },
      { status: 500 }
    );
  }

  try {
    await ensureSheetsExist(sheets, spreadsheetId);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to ensure sheets exist", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }

  if (action === "getSheetNames") {
    return NextResponse.json({ sheetNames: SHEET_NAMES });
  }

  if (action === "getEvents") {
    const sheetName = searchParams.get("sheetName");
    if (!sheetName || !SHEET_NAMES.includes(sheetName)) {
      return NextResponse.json(
        { error: `Invalid or missing sheet name: ${sheetName}. Expected one of: ${SHEET_NAMES.join(", ")}` },
        { status: 400 }
      );
    }

    try {
      console.log(`Fetching events from Spreadsheet ID: ${spreadsheetId}, Sheet: ${sheetName}`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:D`,
      });

      const rows = response.data.values || [];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1); // Set to tomorrow (July 19, 2025)
      const tomorrowISO = tomorrow.toISOString().split("T")[0]; // Format as YYYY-MM-DD

      const events: Event[] = rows.slice(1).map((row, index) => {
        const [timeRange, title, youtubeHindi, youtubeEnglish] = row as [string, string, string, string];
        const startHour = String(index).padStart(2, "0");
        const defaultTimeRange = `${startHour}:00 - ${startHour}:50`;
        const [startTime, endTime] = (timeRange || defaultTimeRange).split(" - ");
        return {
          start: `${tomorrowISO}T${startTime}:00`,
          end: `${tomorrowISO}T${endTime}:00`,
          title: title || "",
          youtubeHindi:
            youtubeHindi || `https://www.youtube.com/results?search_query=${encodeURIComponent((title || "") + " in Hindi")}`,
          youtubeEnglish:
            youtubeEnglish || `https://www.youtube.com/results?search_query=${encodeURIComponent((title || "") + " in English")}`,
          timeZone: "Asia/Kolkata",
        };
      });

      return NextResponse.json({ events });
    } catch (error) {
      console.error(`Error fetching events for ${sheetName}:`, error);
      return NextResponse.json(
        {
          error: "Failed to fetch events",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ message: "Events Sheet YT API is running" });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Vivek";
  const calendarId = CALENDAR_IDS[name];

  if (!calendarId) {
    console.error(`No calendar ID found for name: ${name}`);
    return NextResponse.json(
      { error: `Invalid or missing calendar ID for ${name}. Check environment variables.` },
      { status: 400 }
    );
  }

  let body: { action: string; events?: Event[] };
  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return NextResponse.json(
      { error: "Invalid JSON in request body", details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }

  const { action, events } = body;

  if (!action) {
    return NextResponse.json({ error: "Missing action in request body" }, { status: 400 });
  }

  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth; // Return error response if authentication fails

  const calendar = google.calendar({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!spreadsheetId) {
    return NextResponse.json(
      { error: "SPREADSHEET_ID is not set in environment variables" },
      { status: 500 }
    );
  }

  try {
    if (action === "addAll") {
      if (!events || !Array.isArray(events)) {
        console.error("Invalid or missing events array:", events);
        return NextResponse.json(
          { error: "Events must be an array" },
          { status: 400 }
        );
      }

      console.log(`Adding events to calendar: ${calendarId}`);
      for (const evt of events) {
        if (!evt.title || !evt.start || !evt.timeZone) {
          console.error("Invalid event data:", evt);
          throw new Error("Missing required fields (title, start, timeZone) in one or more events.");
        }

        console.log(`Raw event data:`, evt);

        const startDateTime = new Date(evt.start);
        let endDateTime = new Date(evt.end);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          console.error("Invalid date in event:", evt);
          throw new Error("Invalid start or end date in one or more events.");
        }

        const startTimeMs = startDateTime.getTime();
        const endTimeMs = endDateTime.getTime();
        if (endTimeMs <= startTimeMs) {
          console.warn(`Adjusting end time for event: ${evt.title}, original end: ${evt.end}`);
          endDateTime = new Date(startTimeMs + 50 * 60 * 1000);
        }

        const startISO = startDateTime.toISOString();
        const endISO = endDateTime.toISOString();

        console.log(`Processed event: ${evt.title}, Start: ${startISO}, End: ${endISO}, TimeZone: ${evt.timeZone}`);

        await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: evt.title,
            description: `Hindi: ${evt.youtubeHindi || ""}\nEnglish: ${evt.youtubeEnglish || ""}`,
            start: {
              dateTime: startISO,
              timeZone: evt.timeZone,
            },
            end: {
              dateTime: endISO,
              timeZone: evt.timeZone,
            },
          },
        });
      }

      const sheetRange = `${name}!A2:D${events.length + 1}`;
      const sheetValues = events.map((evt, index) => {
        const startHour = String(index).padStart(2, "0");
        const timeRange = `${startHour}:00 - ${startHour}:50`;
        return [timeRange, evt.title, evt.youtubeHindi || "", evt.youtubeEnglish || ""];
      });

      console.log(`Updating sheet ${name} with range ${sheetRange}:`, sheetValues);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: sheetRange,
        valueInputOption: "RAW",
        requestBody: {
          values: sheetValues,
        },
      });

      return NextResponse.json({ message: "All events added to calendar and sheet updated successfully!" });
    }

    if (action === "removeAll") {
      console.log(`Removing all events from calendar: ${calendarId}`);

      let pageToken: string | undefined = undefined;
      const allEvents: calendar_v3.Schema$Event[] = [];

      do {
        const response: calendar_v3.Schema$Events = await calendar.events.list({
          calendarId,
          pageToken,
        }).then(res => res.data);

        const events = response.items || [];
        allEvents.push(...events);
        pageToken = response.nextPageToken ?? undefined;
      } while (pageToken);

      console.log(`Found ${allEvents.length} events to delete from calendar: ${calendarId}`);

      for (const evt of allEvents) {
        if (evt.id) {
          try {
            await calendar.events.delete({
              calendarId,
              eventId: evt.id,
            });
            console.log(`Deleted event: ${evt.summary} (ID: ${evt.id})`);
          } catch (deleteError) {
            console.error(`Failed to delete event ${evt.id}:`, deleteError);
          }
        } else {
          console.warn(`Event without ID found: ${JSON.stringify(evt)}`);
        }
      }

      console.log(`Clearing sheet ${name} data below headers`);
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${name}!A2:D`,
      });

      return NextResponse.json({
        message: `All ${allEvents.length} events removed from calendar and sheet cleared successfully!`
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error(`Error processing POST request for ${name}:`, error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}