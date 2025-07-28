"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellDot, Clock10 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarForm } from "@/components/comp/InputDate";

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

const initialEventTitles: string[] = [
  "HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular",
  "Svelte", "Tailwind CSS", "Bootstrap", "Node.js", "Express.js", "Django", "Flask",
  "Spring Boot", "GraphQL", "REST API", "MongoDB", "PostgreSQL", "MySQL", "Firebase",
  "AWS", "Docker",
];

const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Copied to clipboard using fallback!");
    }
  } catch (error) {
    toast.error("Failed to copy to clipboard");
    console.error("Clipboard error:", error);
  }
};

export default function EventsSheetYt() {
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState<string>("Select a sheet");
  const [events, setEvents] = useState<Event[]>([]);
  const [bulkInput, setBulkInput] = useState<string>("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(tomorrow.toISOString().split("T")[0]);

  useEffect(() => {
    const fetchSheetNames = async () => {
      try {
        const res = await fetch("/api/events-sheet-yt?action=getSheetNames");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch sheet names");
        }
        const data = await res.json();
        setSheetNames(data.sheetNames || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error fetching sheet names");
        console.error(error);
      }
    };
    fetchSheetNames();

    updateEvents(selectedDate);
  }, []);

  useEffect(() => {
    if (selectedName !== "Select a sheet") {
      const fetchEvents = async () => {
        try {
          const res = await fetch(
            `/api/events-sheet-yt?action=getEvents&sheetName=${encodeURIComponent(selectedName)}&date=${selectedDate}`
          );
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to fetch events");
          }
          const data = await res.json();
          const fetchedEvents = data.events || [];

          const adjustedEvents = Array.from({ length: 24 }).map((_, index) => {
            const startHour = String(index).padStart(2, "0");
            const event = fetchedEvents[index] || {};
            const title = event.title || initialEventTitles[index] || "Empty Slot";
            return {
              start: `${selectedDate}T${startHour}:00:00`,
              end: `${selectedDate}T${startHour}:50:00`,
              title: title,
              youtubeHindi: event.youtubeHindi || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " in Hindi")}`,
              youtubeEnglish: event.youtubeEnglish || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " in English")}`,
              youtubePlaylistHindi: event.youtubePlaylistHindi || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " playlist in Hindi")}&sp=EgIQAw%3D%3D`,
              youtubePlaylistEnglish: event.youtubePlaylistEnglish || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " playlist in English")}&sp=EgIQAw%3D%3D`,
              timeZone: event.timeZone || "Asia/Kolkata",
            };
          });
          setEvents(adjustedEvents);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Error fetching events");
          console.error(error);
        }
      };
      fetchEvents();
    } else {
      updateEvents(selectedDate);
    }
  }, [selectedName, selectedDate]);

  const updateEvents = (date: string) => {
    const updatedEvents = Array.from({ length: 24 }).map((_, index) => {
      const startHour = String(index).padStart(2, "0");
      const title = initialEventTitles[index] || "Empty Slot";
      return {
        start: `${date}T${startHour}:00:00`,
        end: `${date}T${startHour}:50:00`,
        title,
        youtubeHindi: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " in Hindi")}`,
        youtubeEnglish: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " in English")}`,
        youtubePlaylistHindi: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " playlist in Hindi")}&sp=EgIQAw%3D%3D`,
        youtubePlaylistEnglish: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " playlist in English")}&sp=EgIQAw%3D%3D`,
        timeZone: "Asia/Kolkata",
      };
    });
    setEvents(updatedEvents);
  };

  const handleEventAction = async (
    endpoint: string,
    data: Record<string, unknown>,
    successMessage: string,
    errorMessage: string
  ) => {
    try {
      const url = `${endpoint}?name=${encodeURIComponent(selectedName)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || errorMessage);
      toast.success(successMessage);
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || errorMessage);
      console.error("Error in handleEventAction:", error);
    }
  };

  const addEvents = async () => {
    if (selectedName === "Select a sheet") {
      toast.error("Please select a sheet first!");
      return;
    }

    const eventsToAdd = events.filter((e) => e.title !== "Empty Slot");
    setSelectedEvents(eventsToAdd);
    await handleEventAction(
      "/api/events-sheet-yt",
      { action: "addAll", events: eventsToAdd },
      "All events added to calendar and sheet updated successfully!",
      "Failed to add events or update sheet!"
    );
  };

  const removeEvents = async () => {
    if (selectedName === "Select a sheet") {
      toast.error("Please select a sheet first!");
      return;
    }

    setSelectedEvents([]);
    await handleEventAction(
      "/api/events-sheet-yt",
      // CHANGE: Pass selectedDate to the backend for conditional deletion
      { action: "removeAll", selectedDate: selectedDate },
      "All events removed from calendar and sheet cleared successfully!",
      "Failed to remove events or clear sheet!"
    );
    // After removal, re-fetch or re-initialize events to reflect empty state
    updateEvents(selectedDate); // Re-populate with default "Empty Slot" events
  };

  const handleTitleChange = (index: number, newTitle: string) => {
    const updatedEvents = [...events];
    updatedEvents[index] = {
      ...updatedEvents[index],
      title: newTitle,
      youtubeHindi: `https://www.youtube.com/results?search_query=${encodeURIComponent(newTitle + " in Hindi")}`,
      youtubeEnglish: `https://www.youtube.com/results?search_query=${encodeURIComponent(newTitle + " in English")}`,
      youtubePlaylistHindi: `https://www.youtube.com/results?search_query=${encodeURIComponent(newTitle + " playlist in Hindi")}&sp=EgIQAw%3D%3D`,
      youtubePlaylistEnglish: `https://www.youtube.com/results?search_query=${encodeURIComponent(newTitle + " playlist in English")}&sp=EgIQAw%3D%3D`,
    };
    setEvents(updatedEvents);
  };

  const handleBulkPaste = () => {
    if (!bulkInput.trim()) {
      toast.error("Please paste some data first");
      return;
    }

    const items = bulkInput.split(",");
    const pastedTitles: string[] = [];

    for (const item of items) {
      const trimmedItem = item.trim();
      if (trimmedItem) {
        const words = trimmedItem.replace(/[()]/g, "").split(/\s+/);
        const title = words.slice(0, 2).join(" ");
        pastedTitles.push(title);
      }
      if (pastedTitles.length >= 24) break;
    }

    while (pastedTitles.length < 24) {
      pastedTitles.push(initialEventTitles[pastedTitles.length] || "Empty Slot");
    }

    const updatedEvents = Array.from({ length: 24 }).map((_, index) => {
      const startHour = String(index).padStart(2, "0");
      const title = pastedTitles[index];
      return {
        start: `${selectedDate}T${startHour}:00:00`,
        end: `${selectedDate}T${startHour}:50:00`,
        title,
        youtubeHindi: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " in Hindi")}`,
        youtubeEnglish: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " in English")}`,
        youtubePlaylistHindi: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " playlist in Hindi")}&sp=EgIQAw%3D%3D`,
        youtubePlaylistEnglish: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " playlist in English")}&sp=EgIQAw%3D%3D`,
        timeZone: "Asia/Kolkata",
      };
    });

    setEvents(updatedEvents);
    setBulkInput("");
    toast.success("Events updated from pasted data");
  };

  const clearBulkInput = () => {
    setBulkInput("");
    updateEvents(selectedDate);
    toast.success("Input cleared and events reset");
  };

  const handleLinkClick = (url: string) => {
    copyToClipboard(url);
  };

  return (
    <div className="p-4 h-dvh">
      <div className="mb-4">
        <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center">
          <Input
            className="w-full"
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="Paste comma-separated data here"
          />
          <CalendarForm
            value={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              updateEvents(date);
            }}
          />
          <Button onClick={handleBulkPaste}>Apply Paste</Button>
          <Button variant="outline" onClick={clearBulkInput}>x</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-6 gap-4">
        {Array.from({ length: 24 }).map((_, index) => {
          const event = events[index] || {
            start: `${selectedDate}T${String(index).padStart(2, "0")}:00:00`,
            end: `${selectedDate}T${String(index).padStart(2, "0")}:50:00`,
            title: initialEventTitles[index] || "Empty Slot",
            youtubeHindi: `https://www.youtube.com/results?search_query=${encodeURIComponent((initialEventTitles[index] || "Empty Slot") + " in Hindi")}`,
            youtubeEnglish: `https://www.youtube.com/results?search_query=${encodeURIComponent((initialEventTitles[index] || "Empty Slot") + " in English")}`,
            youtubePlaylistHindi: `https://www.youtube.com/results?search_query=${encodeURIComponent((initialEventTitles[index] || "Empty Slot") + " playlist in Hindi")}&sp=EgIQAw%3D%3D`,
            youtubePlaylistEnglish: `https://www.youtube.com/results?search_query=${encodeURIComponent((initialEventTitles[index] || "Empty Slot") + " playlist in English")}&sp=EgIQAw%3D%3D`,
            timeZone: "Asia/Kolkata",
          };
          const isSelected = selectedEvents.some((e) => e.title === event.title && event.title !== "Empty Slot");
          const startHour = String(index).padStart(2, "0");
          const timeRange = `${startHour}:00 - ${startHour}:50`;

          return (
            <Card key={index} className={`p-2 gap-1 ${isSelected ? "border border-green-500 bg-green-100" : ""}`}>
              <CardHeader className="p-0">
                <div className="flex sm:flex-col lg:flex-row justify-between">
                  <Badge><Clock10 className="w-4 h-4 mr-1" />{timeRange}</Badge>
                  <Badge variant="outline"><BellDot className="w-4 h-4 mr-1" />10 min</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-2">
                <Input
                  value={event.title}
                  onChange={(e) => handleTitleChange(index, e.target.value)}
                  placeholder="Enter event title"
                />
                <div className="flex gap-2">
                  <a
                    href={event.youtubeHindi}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleLinkClick(event.youtubeHindi)}
                    className="text-blue-500 text-sm"
                  >
                    <Badge variant="outline">H</Badge>
                  </a>
                  <a
                    href={event.youtubeEnglish}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleLinkClick(event.youtubeEnglish)}
                    className="text-blue-500 text-sm"
                  >
                    <Badge variant="outline">E</Badge>
                  </a>
                  <a
                    href={event.youtubePlaylistHindi}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleLinkClick(event.youtubePlaylistHindi)}
                    className="text-blue-500 text-sm"
                  >
                    <Badge variant="outline">PH</Badge>
                  </a>
                  <a
                    href={event.youtubePlaylistEnglish}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleLinkClick(event.youtubePlaylistEnglish)}
                    className="text-blue-500 text-sm"
                  >
                    <Badge variant="outline">PE</Badge>
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex gap-2 flex-col lg:flex-row justify-end mt-4 items-center">
        <div className="lg:mr-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">{selectedName}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="md:w-56">
              <DropdownMenuLabel>Select Sheet</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sheetNames.map((name) => (
                <DropdownMenuItem key={name} onClick={() => setSelectedName(name)}>{name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button variant="default" onClick={addEvents}>Add All Events</Button>
        <Button variant="destructive" onClick={removeEvents}>Remove All Events</Button>
      </div>
    </div>
  );
}
