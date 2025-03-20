import { google } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";

const KEYFILEPATH = join(process.cwd(), "lib", "service-account-key.json");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export async function GET(request: Request) {
  return NextResponse.json({ message: "Remove 24 Events" });
}

export async function POST(request: Request) {
  const { title, start, end, timeZone } = await request.json();

  // Authenticate with the service account
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });

  // Initialize the Calendar API
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: title,
    start: {
      dateTime: start,
      timeZone: timeZone,
    },
    end: {
      dateTime: end,
      timeZone: timeZone,
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: process.env.Calendar_ID, // Replace with your calendar ID
      requestBody: event,
    });

    console.log("Event created:", response.data); // Log the response
    return NextResponse.json({
      message: "Event added successfully!",
      link: response.data.htmlLink,
    });
  } catch (error) {
    console.error("Error creating event:", error); // Log the error
    let errorMessage = "Error adding event.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function removeAllEvents() {
  // Authenticate with the service account
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });

  // Initialize the Calendar API
  const calendar = google.calendar({ version: "v3", auth });

  try {
    // List all events in the calendar
    const response = await calendar.events.list({
      calendarId: process.env.Calendar_ID, // Replace with your calendar ID
    });

    const events = response.data.items;
    if (!events || events.length === 0) {
      return NextResponse.json({ message: "No events found to delete." });
    }

    // Delete all events
    for (const event of events) {
      if (event.id) {
        await calendar.events.delete({
          calendarId: process.env.Calendar_ID, // Replace with your calendar ID
          eventId: event.id,
        });
      }
    }

    return NextResponse.json({ message: "All events removed successfully!" });
  } catch (error) {
    console.error("Error removing events:", error); // Log the error
    let errorMessage = "Error removing events.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}