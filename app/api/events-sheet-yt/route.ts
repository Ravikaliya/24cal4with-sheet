import { google, calendar_v3 } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";
import { existsSync } from 'fs';

const KEYFILEPATH = join(process.cwd(), "lib", "service-account-key.json");
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
];

const CALENDAR_IDS: { [key: string]: string | undefined } = {
  Achal: process.env.Achal_Calendar_ID,
  Neeraj: process.env.Neeraj_Calendar_ID,
  Salman: process.env.Salman_Calendar_ID,
  Vivek: process.env.Vivek_Calendar_ID,
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
  youtubePlaylistHindi: string;
  youtubePlaylistEnglish: string;
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
        keyFileExists: existsSync(KEYFILEPATH)
      },
      { status: 500 }
    );
  }
};

const SHEETS_HEADERS = ["Start - End", "Title", "YouTube Hindi", "YouTube English", "YouTube Playlist Hindi", "YouTube Playlist English"];

const ensureSheetsExistAndHaveHeaders = async (sheets: ReturnType<typeof google.sheets>, spreadsheetId: string) => {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title' // Request only sheet titles to minimize data transfer
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
        // New sheet, so headers must be added
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1:F1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [SHEETS_HEADERS],
          },
        });
      } else {
        // Sheet exists, check if headers are present
        const headerCheckResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A1:F1`, // Check only the header row
        });

        const currentHeaders = headerCheckResponse.data.values?.[0] || [];
        // Simple check: if the first header is missing or doesn't match
        if (currentHeaders.length === 0 || currentHeaders[0] !== SHEETS_HEADERS[0]) {
          console.log(`Sheet '${sheetName}' exists but headers are missing or incorrect, re-adding them.`);
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1:F1`,
            valueInputOption: "RAW",
            requestBody: {
              values: [SHEETS_HEADERS],
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Error ensuring sheets exist and have headers:", error);
    throw new Error("Failed to ensure sheets exist and have headers");
  }
};


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth;

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    return NextResponse.json(
      { error: "SPREADSHEET_ID is not set in environment variables" },
      { status: 500 }
    );
  }

  try {
    // CHANGE: Use the updated function to also ensure headers
    await ensureSheetsExistAndHaveHeaders(sheets, spreadsheetId);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to ensure sheets exist and have headers", details: error instanceof Error ? error.message : String(error) },
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
        range: `${sheetName}!A:F`,
      });

      const rows = response.data.values || [];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString().split("T")[0];

      // CHANGE: Skip the header row if present, otherwise proceed normally
      const dataRows = rows[0] && rows[0][0] === SHEETS_HEADERS[0] ? rows.slice(1) : rows;


      const events: Event[] = dataRows.map((row, index) => {
        const [
          timeRange,
          title,
          youtubeHindi,
          youtubeEnglish,
          youtubePlaylistHindi,
          youtubePlaylistEnglish,
        ] = row as [string, string, string, string, string, string];
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
          youtubePlaylistHindi:
            youtubePlaylistHindi || `https://www.youtube.com/results?search_query=${encodeURIComponent((title || "") + " playlist in Hindi")}&sp=EgIQAw%3D%3D`,
          youtubePlaylistEnglish:
            youtubePlaylistEnglish || `https://www.youtube.com/results?search_query=${encodeURIComponent((title || "") + " playlist in English")}&sp=EgIQAw%3D%3D`,
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
    return NextResponse.json(
      { error: `Invalid or missing calendar ID for ${name}. Check environment variables.` },
      { status: 400 }
    );
  }

  // CHANGE: Added selectedDate to the body type
  let body: { action: string; events?: Event[]; selectedDate?: string };
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON in request body", details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }

  const { action, events, selectedDate } = body; // Destructure selectedDate
  if (!action) {
    return NextResponse.json({ error: "Missing action in request body" }, { status: 400 });
  }

  const auth = await authenticate();
  if (auth instanceof NextResponse) return auth;

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
    // Ensure sheet headers are present before any operations
    await ensureSheetsExistAndHaveHeaders(sheets, spreadsheetId);

    if (action === "addAll") {
      if (!events || !Array.isArray(events)) {
        return NextResponse.json(
          { error: "Events must be an array" },
          { status: 400 }
        );
      }

      console.log(`Adding events to calendar: ${calendarId}`);
      for (const evt of events) {
        const startDateTime = new Date(evt.start);
        let endDateTime = new Date(evt.end);
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          throw new Error("Invalid start or end date in one or more events.");
        }
        if (endDateTime.getTime() <= startDateTime.getTime()) {
          endDateTime = new Date(startDateTime.getTime() + 50 * 60 * 1000);
        }
        const startISO = startDateTime.toISOString();
        const endISO = endDateTime.toISOString();

        await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: evt.title,
            description: `Hindi: ${evt.youtubeHindi || ""}\nEnglish: ${evt.youtubeEnglish || ""}\nPlaylist (Hindi): ${evt.youtubePlaylistHindi || ""}\nPlaylist (English): ${evt.youtubePlaylistEnglish || ""}`,
            start: { dateTime: startISO, timeZone: evt.timeZone },
            end: { dateTime: endISO, timeZone: evt.timeZone },
          },
        });
      }

      const sheetRange = `${name}!A2:F${events.length + 1}`; // Target cells below headers
      const sheetValues = events.map((evt, index) => {
        const startHour = String(index).padStart(2, "0");
        const timeRange = `${startHour}:00 - ${startHour}:50`;
        return [
          timeRange,
          evt.title,
          evt.youtubeHindi || "",
          evt.youtubeEnglish || "",
          evt.youtubePlaylistHindi || "",
          evt.youtubePlaylistEnglish || "",
        ];
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
      if (!selectedDate) {
        return NextResponse.json({ error: "selectedDate is required for removeAll action." }, { status: 400 });
      }

      console.log(`Attempting to remove events from calendar: ${calendarId} for date: ${selectedDate}`);

      const startOfDay = new Date(`${selectedDate}T00:00:00Z`); // Start of selected day in UTC
      const endOfDay = new Date(`${selectedDate}T23:59:59Z`);   // End of selected day in UTC

      let pageToken: string | undefined = undefined;
      const eventsToDelete: calendar_v3.Schema$Event[] = [];

      // Loop to fetch events for the selected date page by page
      do {
        const response: calendar_v3.Schema$Events = await calendar.events.list({
          calendarId,
          pageToken,
          timeMin: startOfDay.toISOString(), // Filter events starting from the beginning of the selected day
          timeMax: endOfDay.toISOString(),   // Filter events ending by the end of the selected day
          singleEvents: true, // Expand recurring events into individual instances
          orderBy: 'startTime',
        }).then(res => res.data);

        const fetchedEvents = response.items || [];
        eventsToDelete.push(...fetchedEvents);
        pageToken = response.nextPageToken ?? undefined;
      } while (pageToken);

      console.log(`Found ${eventsToDelete.length} events to delete from calendar for ${selectedDate}`);

      // Delete each event found for the specific date
      for (const evt of eventsToDelete) {
        if (evt.id) {
          try {
            await calendar.events.delete({
              calendarId,
              eventId: evt.id,
            });
            console.log(`Deleted event: ${evt.summary} (ID: ${evt.id}) for date ${selectedDate}`);
          } catch (deleteError: any) { // Use any for error type if not sure, or more specific Google API error types
            // A common error for deletion is 404 if event is already deleted, or 403 for permissions
            if (deleteError.code === 404) {
              console.warn(`Event ${evt.id} not found, likely already deleted.`);
            } else {
              console.error(`Failed to delete event ${evt.id}:`, deleteError.message, deleteError.errors);
            }
          }
        } else {
          console.warn(`Event without ID found, cannot delete: ${JSON.stringify(evt)}`);
        }
      }

      console.log(`Clearing sheet ${name} data below headers`);
      // CHANGE: Ensure this clears only data below the header row (A2:F)
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${name}!A2:F`,
      });

      return NextResponse.json({
        message: `All ${eventsToDelete.length} events removed from calendar for ${selectedDate} and sheet cleared successfully!`
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
