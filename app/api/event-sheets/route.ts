import { google } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";

const KEYFILEPATH = join(process.cwd(), "lib", "service-account-key.json");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

// Map names to calendar IDs (add these to your .env file)
const CALENDAR_IDS = {
  Achal: process.env.Achal_Calendar_ID,
  Neeraj: process.env.Neeraj_Calendar_ID,
  Salman: process.env.Salman_Calendar_ID,
  Vivek: process.env.Vivek_Calendar_ID,
  Jyoti: process.env.Jyoti_Calendar_ID,
};

const authenticate = async () => {
  return new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });
};

export async function GET() {
  return NextResponse.json({ message: "Calendar API is running" });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Vivek"; // Default to Vivek if no name provided
  const calendarId = CALENDAR_IDS[name as keyof typeof CALENDAR_IDS] || process.env.Neeraj_Calendar_ID;

  const { action, event, events } = await request.json();
  const auth = await authenticate();
  const calendar = google.calendar({ version: "v3", auth });

  try {
    if (action === "add" && event) {
      if (!event.title || !event.start || !event.timeZone) {
        throw new Error("Missing required fields: title, start, or timeZone");
      }

      const startDateTime = new Date(event.start);
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

      const response = await calendar.events.insert({
        calendarId: calendarId!,
        requestBody: {
          summary: event.title,
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: event.timeZone,
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: event.timeZone,
          },
        },
      });

      return NextResponse.json({
        message: "Event added successfully!",
        res: response.data,
        link: response.data.htmlLink,
      });
    }

    if (action === "addAll" && events) {
      for (const evt of events) {
        if (!evt.title || !evt.start || !evt.timeZone) {
          throw new Error("Missing required fields in one or more events.");
        }
        
        const startDateTime = new Date(evt.start);
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

        await calendar.events.insert({
          calendarId: calendarId!,
          requestBody: {
            summary: evt.title,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: evt.timeZone,
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: evt.timeZone,
            },
          },
        });
      }

      return NextResponse.json({ message: "All events added successfully!" });
    }

    if (action === "removeAll") {
      try {
        const response = await calendar.events.list({
          calendarId: calendarId!,
        });
        const events = response.data.items || [];
        for (const evt of events) {
          if (evt.id) {
            await calendar.events.delete({
              calendarId: calendarId!,
              eventId: evt.id,
            });
          }
        }
        return NextResponse.json({
          message: "All events removed successfully!",
        });
      } catch (error) {
        if (error instanceof Error) {
          return NextResponse.json(
            { message: "Error removing events", error: error.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { message: "Error processing request", error: error.message },
        { status: 500 }
      );
    }
  }
}