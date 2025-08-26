import { google, calendar_v3 } from "googleapis";
import { NextResponse } from "next/server";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
];

// Ensure that your .env variables match calendar sheet keys here exactly
const CALENDAR_IDS: { [key: string]: string | undefined } = {
  Achal: process.env.Achal_Calendar_ID,
  Neeraj: process.env.Neeraj_Calendar_ID,
  Salman: process.env.Salman_Calendar_ID,
  Vivek: process.env.Vivek_Calendar_ID,
  Jyoti: process.env.Jyoti_Calendar_ID,
  Ravi: process.env.Ravi_Calendar_ID,
  Office: process.env.Office_ID,
  Govt: process.env.Govt_Calendar_ID,
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

let parsedServiceAccountKeys: any;
try {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable.");
  }
  parsedServiceAccountKeys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  console.log("Loaded GOOGLE_SERVICE_ACCOUNT_KEY successfully");
} catch (e) {
  parsedServiceAccountKeys = undefined;
  console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:", e);
}

const authenticate = async (calendarAccount: string) => {
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
    return auth;
  } catch (error) {
    console.error("Authentication failed:", error);
    return NextResponse.json(
      { error: "Failed to authenticate with Google APIs", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const sheetName = searchParams.get("sheetName");
  const date = searchParams.get("date");
  const calendarAccount = searchParams.get("calendarAccount") || "Home";
  const timeZone = "Asia/Kolkata";

  if (action !== "getEvents") {
    return NextResponse.json({ error: "Invalid or missing action" }, { status: 400 });
  }
  if (!sheetName || !date) {
    console.error(`Missing sheetName or date in GET. sheetName: ${sheetName}, date: ${date}`);
    return NextResponse.json({ error: "Missing sheetName or date" }, { status: 400 });
  }

  const calendarId = CALENDAR_IDS[sheetName];
  if (!calendarId) {
    console.error(`Invalid calendar ID for sheetName: ${sheetName}`);
    return NextResponse.json({ error: `Invalid calendar ID for ${sheetName}` }, { status: 400 });
  }

  const auth = await authenticate(calendarAccount);
  if (auth instanceof NextResponse) return auth;

  const calendar = google.calendar({ version: "v3", auth });

  try {
    const timeMin = `${date}T00:00:00+05:30`;
    const timeMax = `${date}T23:59:59+05:30`;

    const res: { data: calendar_v3.Schema$Events } = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    const items = res.data.items || [];

    const events = items.map((evt) => ({
      start: evt.start?.dateTime || "",
      end: evt.end?.dateTime || "",
      title: evt.summary || "",
      youtubeHindi: "",
      youtubeEnglish: "",
      youtubePlaylistHindi: "",
      youtubePlaylistEnglish: "",
      timeZone,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Failed to fetch events:", errMsg);
    return NextResponse.json({ error: "Failed to fetch events", details: errMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Vivek";
  const calendarAccount = searchParams.get("calendarAccount") || "Home";

  const calendarId = CALENDAR_IDS[name];
  if (!calendarId) {
    console.error(`Invalid or missing calendar ID for name: ${name}`);
    return NextResponse.json({ error: `Invalid calendar ID for ${name}` }, { status: 400 });
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
    console.error("Invalid JSON body in POST", error);
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { action, events, selectedDate, dates, isRangeMode } = body;

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const datesToProcess = dates && dates.length > 0 ? dates : (selectedDate ? [selectedDate] : []);
  if (!datesToProcess.length) {
    return NextResponse.json({ error: "No dates specified" }, { status: 400 });
  }

  const calendar = google.calendar({ version: "v3", auth });
  const timeZone = "Asia/Kolkata";

  try {
    if (action === "addAll") {
      if (!events || !Array.isArray(events)) {
        return NextResponse.json({ error: "Events must be an array" }, { status: 400 });
      }

      let totalAdded = 0;
      for (const dateStr of datesToProcess) {
        for (const evt of events) {
          const hour = evt.start.split("T")[1].slice(0, 2);

          const slots: [string, string][] = [
            [`${dateStr}T${hour}:00:00+05:30`, `${dateStr}T${hour}:05:00+05:30`],
            [`${dateStr}T${hour}:10:00+05:30`, `${dateStr}T${hour}:50:00+05:30`],
          ];

          for (const [startTime, endTime] of slots) {
            try {
              await calendar.events.insert({
                calendarId,
                requestBody: {
                  summary: evt.title,
                  description:
                    `Hindi: ${evt.youtubeHindi || ""}\n` +
                    `English: ${evt.youtubeEnglish || ""}\n` +
                    `Playlist Hindi: ${evt.youtubePlaylistHindi || ""}\n` +
                    `Playlist English: ${evt.youtubePlaylistEnglish || ""}`,
                  start: { dateTime: startTime },
                  end: { dateTime: endTime },
                  reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 5 }] },
                },
              });
              totalAdded++;
            } catch (insertError) {
              const msg = insertError instanceof Error ? insertError.message : JSON.stringify(insertError);
              console.error(`Failed to insert event '${evt.title}': ${msg}`);
            }
          }
        }
      }

      return NextResponse.json({
        message: isRangeMode
          ? `Added ${totalAdded} events over ${datesToProcess.length} days.`
          : `Added ${totalAdded} events on ${datesToProcess[0]}.`,
      });
    } else if (action === "removeAll") {
      let totalDeleted = 0;
      for (const dateStr of datesToProcess) {
        const timeMin = `${dateStr}T00:00:00+05:30`;
        const timeMax = `${dateStr}T23:59:59+05:30`;

        let pageToken: string | undefined;
        const toDelete: calendar_v3.Schema$Event[] = [];

        do {
          const res: { data: calendar_v3.Schema$Events } = await calendar.events.list({
            calendarId,
            timeMin,
            timeMax,
            pageToken,
            singleEvents: true,
            orderBy: "startTime",
          });

          const evts = res.data.items ?? [];
          toDelete.push(...evts.filter((ev) => {
            if (!ev.start?.dateTime) return false;
            const localDate = new Date(ev.start.dateTime).toLocaleDateString("en-CA", { timeZone });
            return localDate === dateStr;
          }));

          pageToken = res.data.nextPageToken ?? undefined;
        } while (pageToken);

        for (const ev of toDelete) {
          if (ev.id) {
            try {
              await calendar.events.delete({ calendarId, eventId: ev.id });
              totalDeleted++;
            } catch (deleteError) {
              const msg = deleteError instanceof Error ? deleteError.message : JSON.stringify(deleteError);
              console.error(`Failed to delete event ID ${ev.id}: ${msg}`);
            }
          }
        }
      }

      return NextResponse.json({
        message: isRangeMode
          ? `Deleted ${totalDeleted} events over ${datesToProcess.length} days.`
          : `Deleted ${totalDeleted} events on ${datesToProcess[0]}.`,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Failed to process POST request:", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
