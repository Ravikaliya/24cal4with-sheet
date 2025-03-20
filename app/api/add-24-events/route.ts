import { google } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";

const KEYFILEPATH = join(process.cwd(), "lib", "service-account-key.json");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export async function GET(request: Request) {
  return NextResponse.json({ message: "Add 24 Events" });
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
    summary: title, // Use the title from the frontend
    start: {
      dateTime: start, // Use the start time from the frontend
      timeZone: timeZone, // Use the timeZone from the frontend
    },
    end: {
      dateTime: end, // Use the end time from the frontend
      timeZone: timeZone, // Use the timeZone from the frontend
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: process.env.Calendar_ID, // Replace with your calendar ID
      requestBody: event, // Use 'requestBody' instead of 'resource'
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
