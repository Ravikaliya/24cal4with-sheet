import { google } from "googleapis";
import { join } from "path";
import { NextResponse } from "next/server";

const KEYFILEPATH = join(process.cwd(), "lib", "service-account-key.json");
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const authenticate = async () => {
  try {
    return new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES,
    });
  } catch (error) {
    console.error("Authentication failed:", error);
    throw new Error("Failed to authenticate with Google APIs");
  }
};

export async function POST(request: Request) {
  const auth = await authenticate();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!spreadsheetId) {
    return NextResponse.json(
      { message: "SPREADSHEET_ID is not set in environment variables" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return NextResponse.json(
      { message: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { name, age, phone } = body;

  if (!name || !age || !phone) {
    return NextResponse.json(
      { message: "Missing required fields: name, age, phone" },
      { status: 400 }
    );
  }

  const sheetName = "FormData"; // Define a specific sheet for this data

  try {
    // Ensure the sheet exists
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    const existingSheets = response.data.sheets?.map((sheet: any) => sheet.properties.title) || [];

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

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:C1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["Name", "Age", "Phone"]],
        },
      });
    }

    // Append the form data
    const values = [[name, age, phone]];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:C`,
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    });

    return NextResponse.json({ message: "Data added to sheet successfully!" });
  } catch (error) {
    console.error("Error adding data to sheet:", error);
    if (error instanceof Error && "response" in error) {
      const apiError = error as any;
      return NextResponse.json(
        { message: "Failed to add data to sheet", error: apiError.response?.data?.error?.message || error.message },
        { status: apiError.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { message: "Error adding data to sheet", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}