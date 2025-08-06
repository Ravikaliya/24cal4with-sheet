"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellDot, Clock10, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarForm } from "@/components/comp/InputDate";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

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

interface DateRangeFormProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

function DateRangeForm({ value, onChange }: DateRangeFormProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !value?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
              </>
            ) : (
              format(value.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
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

// Helper function to get dates between two dates - FIXED VERSION
const getDatesBetween = (startDate: Date, endDate: Date): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  current.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export default function EventsSheetYt() {
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState<string>("Select a sheet");
  const [events, setEvents] = useState<Event[]>([]);
  const [bulkInput, setBulkInput] = useState<string>("");

  const eventDurations = [5, 9, 10, 20, 30, 40];
  const [selectedEventDuration, setSelectedEventDuration] = useState<number>(eventDurations[0]);

  const calendarAccounts = ["Home", "Office", "Kaliya"];
  const [selectedCalendarAccount, setSelectedCalendarAccount] = useState<string>(calendarAccounts[0]);

  // Date management states
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(tomorrow.toISOString().split("T")[0]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isRangeMode, setIsRangeMode] = useState<boolean>(false);

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
  }, [selectedDate]);

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
            // Update end time to reflect event duration
            const startTimeDate = new Date(`${selectedDate}T${startHour}:00:00`);
            const endTimeDate = new Date(startTimeDate.getTime() + selectedEventDuration * 60 * 1000);
            const endHour = String(endTimeDate.getHours()).padStart(2, "0");
            const endMinute = String(endTimeDate.getMinutes()).padStart(2, "0");
            return {
              start: `${selectedDate}T${startHour}:00:00`,
              end: `${selectedDate}T${endHour}:${endMinute}:00`,
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
    // eslint-disable-next-line
  }, [selectedName, selectedDate, selectedEventDuration]); // rerun on duration change

  const updateEvents = (date: string) => {
    const updatedEvents = Array.from({ length: 24 }).map((_, index) => {
      const startHour = String(index).padStart(2, "0");
      const startTime = new Date(`${date}T${startHour}:00:00`);
      const endTime = new Date(startTime.getTime() + selectedEventDuration * 60 * 1000);
      const endHour = String(endTime.getHours()).padStart(2, "0");
      const endMinute = String(endTime.getMinutes()).padStart(2, "0");
      const title = initialEventTitles[index] || "Empty Slot";
      return {
        start: `${date}T${startHour}:00:00`,
        end: `${date}T${endHour}:${endMinute}:00`,
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
    const datesToProcess = isRangeMode && dateRange?.from && dateRange?.to
      ? getDatesBetween(dateRange.from, dateRange.to)
      : [selectedDate];
    if (isRangeMode && datesToProcess.length > 1) {
      const confirmed = window.confirm(
        `Are you sure you want to add events to ${datesToProcess.length} days (${datesToProcess[0]} to ${datesToProcess[datesToProcess.length - 1]})?`
      );
      if (!confirmed) return;
    }
    await handleEventAction(
      "/api/events-sheet-yt",
      {
        action: "addAll",
        events: eventsToAdd,
        dates: datesToProcess,
        isRangeMode: isRangeMode,
        eventDuration: selectedEventDuration,
      },
      `Events added to calendar for ${datesToProcess.length} day(s) and sheet updated successfully!`,
      "Failed to add events or update sheet!"
    );
  };

  const removeEvents = async () => {
    if (selectedName === "Select a sheet") {
      toast.error("Please select a sheet first!");
      return;
    }
    const datesToProcess = isRangeMode && dateRange?.from && dateRange?.to
      ? getDatesBetween(dateRange.from, dateRange.to)
      : [selectedDate];
    if (isRangeMode && datesToProcess.length > 1) {
      const confirmed = window.confirm(
        `Are you sure you want to remove events from ${datesToProcess.length} days (${datesToProcess[0]} to ${datesToProcess[datesToProcess.length - 1]})?`
      );
      if (!confirmed) return;
    }
    setSelectedEvents([]);
    await handleEventAction(
      "/api/events-sheet-yt",
      {
        action: "removeAll",
        dates: datesToProcess,
        isRangeMode: isRangeMode
      },
      `Events removed from calendar for ${datesToProcess.length} day(s) and sheet cleared successfully!`,
      "Failed to remove events or clear sheet!"
    );
    updateEvents(selectedDate);
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
      const startTime = new Date(`${selectedDate}T${startHour}:00:00`);
      const endTime = new Date(startTime.getTime() + selectedEventDuration * 60 * 1000);
      const endHour = String(endTime.getHours()).padStart(2, "0");
      const endMinute = String(endTime.getMinutes()).padStart(2, "0");
      const title = pastedTitles[index];
      return {
        start: `${selectedDate}T${startHour}:00:00`,
        end: `${selectedDate}T${endHour}:${endMinute}:00`,
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

  // Updated handler for date range changes
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      const startDate = new Date(range.from);
      startDate.setHours(0, 0, 0, 0);
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const startDateStr = `${year}-${month}-${day}`;
      setSelectedDate(startDateStr);
      updateEvents(startDateStr);
    }
  };

  // Handler for single date changes
  const handleSingleDateChange = (date: string) => {
    setSelectedDate(date);
    updateEvents(date);
    if (isRangeMode) setDateRange(undefined);
  };

  // Toggle between range and single mode
  const toggleDateMode = () => {
    setIsRangeMode(!isRangeMode);
    setDateRange(undefined);
  };

  return (
    <div className="p-4 h-dvh">
      {/* Top controls section */}
      <div className="mb-4">
        <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center">
          {/* Event duration dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">{selectedEventDuration} min</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {eventDurations.map(duration => (
                <DropdownMenuItem
                  key={duration}
                  onClick={() => setSelectedEventDuration(duration)}
                >
                  {duration} min
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Toggle between single date and date range */}
          <Button
            variant={isRangeMode ? "default" : "outline"}
            onClick={toggleDateMode}
            className="min-w-[80px]"
          >
            {isRangeMode ? "Range" : "Single"}
          </Button>
          {/* Date picker/date range picker */}
          {isRangeMode ? (
            <DateRangeForm
              value={dateRange}
              onChange={handleDateRangeChange}
            />
          ) : (
            <CalendarForm
              value={selectedDate}
              onChange={handleSingleDateChange}
            />
          )}
          <Input
            className="w-full"
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="Paste comma-separated data here"
          />
          <Button onClick={handleBulkPaste}>Apply Paste</Button>
          <Button variant="destructive" onClick={clearBulkInput}>×</Button>
        </div>
        <div className="mt-2 text-sm text-gray-600" style={{ fontWeight: "bold" }}>
          {isRangeMode ? (
            dateRange?.from && dateRange?.to ? (
              <span>
                Selected range: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                ({getDatesBetween(dateRange.from, dateRange.to).length} days)
              </span>
            ) : (
              <span>Please select a date range</span>
            )
          ) : (
            <span>Selected date: {format(new Date(selectedDate), "MMM dd, yyyy")}</span>
          )}
        </div>
      </div>
      {/* Events grid */}
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
          const timeRange = `${startHour}:00 - ${event.end.split("T")[1].slice(0, 5)}`;
          return (
            <Card key={index} className={`p-2 gap-1 ${isSelected ? "border border-green-500 bg-green-100" : ""}`}>
              <CardHeader className="p-0">
                <div className="flex sm:flex-col lg:flex-row justify-between">
                  <Badge><Clock10 className="w-4 h-4 mr-1" />{timeRange}</Badge>
                  <Badge variant="outline"><BellDot className="w-4 h-4 mr-1" />5 min</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-2">
                <Input
                  value={event.title}
                  onChange={(e) => handleTitleChange(index, e.target.value)}
                  placeholder="Enter event title"
                />
                <div className="flex gap-2 flex-wrap">
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
      {/* Bottom controls section */}
      <div className="flex gap-2 flex-col lg:flex-row justify-end mt-4 items-center">
        <div className="lg:mr-auto flex gap-2">
          {/* Calendar Account dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">{selectedCalendarAccount}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {calendarAccounts.map(acc => (
                <DropdownMenuItem
                  key={acc}
                  onClick={() => setSelectedCalendarAccount(acc)}
                >
                  {acc}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Select Sheet dropdown (existing) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">{selectedName}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="md:w-56">
              <DropdownMenuLabel>Select Sheet</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sheetNames.map((name) => (
                <DropdownMenuItem key={name} onClick={() => setSelectedName(name)}>
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          variant="default"
          onClick={addEvents}
          className={isRangeMode ? "bg-blue-600 hover:bg-blue-700" : ""}
          disabled={isRangeMode && (!dateRange?.from || !dateRange?.to)}
        >
          {isRangeMode
            ? `Add Events to Range ${dateRange?.from && dateRange?.to ? `(${getDatesBetween(dateRange.from, dateRange.to).length} days)` : ''}`
            : "Add All Events"
          }
        </Button>
        <Button
          variant="destructive"
          onClick={removeEvents}
          disabled={isRangeMode && (!dateRange?.from || !dateRange?.to)}
        >
          {isRangeMode
            ? `Remove Events from Range ${dateRange?.from && dateRange?.to ? `(${getDatesBetween(dateRange.from, dateRange.to).length} days)` : ''}`
            : "Remove All Events"
          }
        </Button>
      </div>
    </div>
  );
}
