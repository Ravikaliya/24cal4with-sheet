import { google } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";

const KEYFILEPATH = join(process.cwd(), "lib", "service-account-key.json");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export async function POST() {
  // Web Dev Tech Stack
  const eventTitles = [
    "HTML",
    "CSS",
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Vue.js",
    "Angular",
    "Svelte",
    "Tailwind CSS",
    "Bootstrap",
    "Node.js",
    "Express.js",
    "Django",
    "Flask",
    "Spring Boot",
    "GraphQL",
    "REST API",
    "MongoDB",
    "PostgreSQL",
    "MySQL",
    "Firebase",
    "AWS",
    "Docker",
  ];

  // Authenticate with the service account
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });

  // Initialize the Calendar API
  const calendar = google.calendar({ version: "v3", auth });

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  try {
    for (let i = 0; i < eventTitles.length; i++) {
      const title = eventTitles[i];
      const time = `${(i + 1).toString().padStart(2, "0")}:00`;

      const event = {
        summary: title,
        start: {
          dateTime: `${year}-${month}-${day}T${time}:00`,
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: `${year}-${month}-${day}T${time}:30`,
          timeZone: "Asia/Kolkata",
        },
      };

      await calendar.events.insert({
        calendarId: process.env.Calendar_ID, // Replace with your calendar ID
        requestBody: event,
      });
    }

    return NextResponse.json({ message: "All events added successfully!" });
  } catch (error) {
    console.error("Error adding all events:", error); // Log the error
    let errorMessage = "Error adding all events.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}