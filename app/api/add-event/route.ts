import { google } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";

const KEYFILEPATH = join(process.cwd(), "lib", "service-account-key.json");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export async function GET(request: Request) {
  return NextResponse.json({ message: "Add Single Events" });
}

export async function POST(request: Request) {
  const { eventTitle } = await request.json();

  // Authenticate with the service account
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });

  // Initialize the Calendar API
  const calendar = google.calendar({ version: "v3", auth });

  // Get current date and time in IST
  const today = new Date();
  const currentHour = today.getHours();
  const eventStart = new Date(today.setHours(currentHour, 0, 0));
  const eventEnd = new Date(today.setHours(currentHour, 5, 0));

  const event = {
    summary: eventTitle,
    start: {
      dateTime: eventStart.toISOString(),
      timeZone: "Asia/Kolkata", // IST time zone
    },
    end: {
      dateTime: eventEnd.toISOString(),
      timeZone: "Asia/Kolkata", // IST time zone
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
