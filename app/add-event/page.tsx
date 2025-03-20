"use client"; // Mark this as a Client Component

import { useState } from "react";

export default function AddEventPage() {
  const [eventTitle, setEventTitle] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/add-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventTitle }),
      });

      const result = await response.json();
      console.log(result);
      setStatus(result.message);
      console.log("Event created:", result.link);
    } catch (error) {
      setStatus("Error adding event.");
      console.error("Error:", error);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">
          Add Event to Google Calendar
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Event Title"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="w-full bg-green-500 text-white px-4 py-2 rounded"
          >
            Add Event
          </button>
        </form>
        {status && <p className="mt-4 text-center">{status}</p>}
      </div>
    </div>
  );
}
