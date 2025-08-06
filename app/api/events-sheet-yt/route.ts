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
      fields: 'sheets.properties.title'
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
          range: `${sheetName}!A1:F1`,
        });

        const currentHeaders = headerCheckResponse.data.values?.[0] || [];
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

  // ADD notificationDuration to the body definition
  let body: {
    action: string;
    events?: Event[];
    selectedDate?: string;
    dates?: string[];
    isRangeMode?: boolean;
    eventDuration?: number;
    notificationDuration?: number;
  };

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON in request body", details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }

  const {
    action, events, selectedDate, dates, isRangeMode,
    eventDuration, notificationDuration,
  } = body;

  if (!action) {
    return NextResponse.json({ error: "Missing action in request body" }, { status: 400 });
  }

  const datesToProcess = dates && dates.length > 0 ? dates : (selectedDate ? [selectedDate] : []);
  if (datesToProcess.length === 0) {
    return NextResponse.json({ error: "No valid dates provided" }, { status: 400 });
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
    await ensureSheetsExistAndHaveHeaders(sheets, spreadsheetId);

    if (action === "addAll") {
      if (!events || !Array.isArray(events)) {
        return NextResponse.json(
          { error: "Events must be an array" },
          { status: 400 }
        );
      }

      console.log(`Adding events to calendar: ${calendarId} for ${datesToProcess.length} date(s): ${datesToProcess.join(", ")}`);

      let totalEventsAdded = 0;

      for (const dateStr of datesToProcess) {
        console.log(`Processing events for date: ${dateStr}`);

        for (const [index, evt] of events.entries()) {
          const eventForDate = {
            ...evt,
            start: evt.start.replace(/^\d{4}-\d{2}-\d{2}/, dateStr),
            end: evt.end.replace(/^\d{4}-\d{2}-\d{2}/, dateStr)
          };

          // Calculate event start and end based on eventDuration
          const startDateTime = new Date(eventForDate.start);
          const durationMinutes = typeof eventDuration === "number" ? eventDuration : 50;
          const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

          if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            console.error(`Invalid date for event: ${eventForDate.title} on ${dateStr}`);
            continue;
          }

          const startISO = startDateTime.toISOString();
          const endISO = endDateTime.toISOString();

          console.log(
            `Creating event '${eventForDate.title}' [${startISO} ... ${endISO}] with reminder ${notificationDuration}min before`
          );

          try {
            await calendar.events.insert({
              calendarId,
              requestBody: {
                summary: eventForDate.title,
                description: `Hindi: ${eventForDate.youtubeHindi || ""}\nEnglish: ${eventForDate.youtubeEnglish || ""}\nPlaylist (Hindi): ${eventForDate.youtubePlaylistHindi || ""}\nPlaylist (English): ${eventForDate.youtubePlaylistEnglish || ""}`,
                start: { dateTime: startISO, timeZone: eventForDate.timeZone },
                end: { dateTime: endISO, timeZone: eventForDate.timeZone },
                // assign notificationDuration as custom notification
                reminders: {
                  useDefault: false,
                  overrides: [
                    {
                      method: "popup",
                      minutes: typeof notificationDuration === "number" ? notificationDuration : 5,
                    },
                  ],
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

      const referenceDate = datesToProcess[0];
      const sheetRange = `${name}!A2:F${events.length + 1}`;
      const sheetValues = events.map((evt, index) => {
        const startHour = String(index).padStart(2, "0");
        const startTime = new Date(`${referenceDate}T${startHour}:00:00`);
        const endTime = new Date(startTime.getTime() + ((eventDuration || 50) * 60 * 1000));
        const endHour = String(endTime.getHours()).padStart(2, "0");
        const endMinute = String(endTime.getMinutes()).padStart(2, "0");
        const timeRange = `${startHour}:00 - ${endHour}:${endMinute}`;
        return [
          timeRange,
          evt.title,
          evt.youtubeHindi || "",
          evt.youtubeEnglish || "",
          evt.youtubePlaylistHindi || "",
          evt.youtubePlaylistEnglish || "",
        ];
      });

      console.log(`Updating sheet ${name} with range ${sheetRange}`);

      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: sheetRange,
          valueInputOption: "RAW",
          requestBody: {
            values: sheetValues,
          },
        });
        console.log(`Sheet ${name} updated successfully`);
      } catch (sheetError) {
        console.error(`Failed to update sheet ${name}:`, sheetError);
      }

      const message = isRangeMode
        ? `${totalEventsAdded} events added to calendar across ${datesToProcess.length} days (${datesToProcess[0]} to ${datesToProcess[datesToProcess.length - 1]}) and sheet updated successfully!`
        : `${totalEventsAdded} events added to calendar for ${referenceDate} and sheet updated successfully!`;

      return NextResponse.json({ message });
    }

    // ... keep your removeAll action with your logs and comments ...
    if (action === "removeAll") {
      console.log(`Attempting to remove events from calendar: ${calendarId} for ${datesToProcess.length} date(s): ${datesToProcess.join(", ")}`);

      let totalDeletedEvents = 0;
      const deletionResults: { [date: string]: number } = {};

      for (const dateStr of datesToProcess) {
        console.log(`Processing deletion for date: ${dateStr}`);

        // FIXED: Get a wider time range and filter more precisely
        const searchStart = new Date(dateStr);
        searchStart.setDate(searchStart.getDate() - 1); // Start from previous day
        const searchEnd = new Date(dateStr);
        searchEnd.setDate(searchEnd.getDate() + 2); // End at next day

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

            // FIXED: Filter events that match our target date precisely
            const filteredEvents = fetchedEvents.filter(event => {
              if (!event.start?.dateTime) return false;
              const eventStart = new Date(event.start.dateTime);
              const eventYear = eventStart.getFullYear();
              const eventMonth = String(eventStart.getMonth() + 1).padStart(2, '0');
              const eventDay = String(eventStart.getDate()).padStart(2, '0');
              const eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`;

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
        deletionResults[dateStr] = 0;

        // Delete each filtered event
        for (const evt of eventsToDelete) {
          if (evt.id) {
            try {
              await calendar.events.delete({
                calendarId,
                eventId: evt.id,
              });
              deletionResults[dateStr]++;
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

      console.log(`Clearing sheet ${name} data below headers`);
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${name}!A2:F`,
        });
        console.log(`Sheet ${name} cleared successfully`);
      } catch (clearError) {
        console.error(`Failed to clear sheet ${name}:`, clearError);
      }

      const deletionSummary = Object.entries(deletionResults)
        .map(([date, count]) => `${date}: ${count} events`)
        .join(", ");

      const message = isRangeMode
        ? `${totalDeletedEvents} events removed from calendar across ${datesToProcess.length} days (${deletionSummary}) and sheet cleared successfully!`
        : `${totalDeletedEvents} events removed from calendar for ${datesToProcess[0]} and sheet cleared successfully!`;

      return NextResponse.json({ message });
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
