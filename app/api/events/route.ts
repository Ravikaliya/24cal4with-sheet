import { google } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";

const KEYFILEPATH = join(process.cwd(), "lib", "service-account-key.json"); // Path to your service account JSON key
const SCOPES = ["https://www.googleapis.com/auth/calendar"]; // Required scopes for Google Calendar API

// Authenticate with Google Calendar API
const authenticate = async () => {
  return new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });
};

// Handle GET request (Check API status)
export async function GET() {
  return NextResponse.json({ message: "Calendar API is running" });
}

// Handle POST request (Managing events)
export async function POST(request: Request) {
  const { action, event, events } = await request.json();
  const auth = await authenticate();
  const calendar = google.calendar({ version: "v3", auth });

  try {
    // Add a single event
    if (action === "add" && event) {
      if (!event.title || !event.start || !event.timeZone) {
        throw new Error("Missing required fields: title, start, or timeZone");
      }

      const startDateTime = new Date(event.start);
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // Add 30 minutes

      const response = await calendar.events.insert({
        calendarId: process.env.Calendar_ID!,
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

    // Add multiple events
    if (action === "addAll" && events) {
      for (const evt of events) {
        if (!evt.title || !evt.start || !evt.timeZone) {
          throw new Error("Missing required fields in one or more events.");
        }
        console.log("events : ", events);

        const startDateTime = new Date(evt.start);
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // Add 30 minutes

        await calendar.events.insert({
          calendarId: process.env.Calendar_ID!,
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

    // Remove all events
    if (action === "removeAll") {
      try {
        const response = await calendar.events.list({
          calendarId: process.env.Calendar_ID!,
        });
        const events = response.data.items || [];
        console.log("events : ", events);
        for (const evt of events) {
          if (evt.id) {
            await calendar.events.delete({
              calendarId: process.env.Calendar_ID!,
              eventId: evt.id,
            });
          }
        }
        return NextResponse.json({
          message: "All events removed successfully!",
        });
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error removing events:", error.message);
          return NextResponse.json(
            { message: "Error removing events", error: error.message },
            { status: 500 }
          );
        } else {
          console.error("Unknown error removing events:", error);
          return NextResponse.json(
            {
              message: "Unknown error occurred removing events",
              error: String(error),
            },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error handling event:", error.message);
      return NextResponse.json(
        { message: "Error processing request", error: error.message },
        { status: 500 }
      );
    } else {
      console.error("Unknown error:", error);
      return NextResponse.json(
        { message: "Unknown error occurred", error: String(error) },
        { status: 500 }
      );
    }
  }
}
