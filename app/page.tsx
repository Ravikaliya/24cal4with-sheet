"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock10, CalendarIcon } from "lucide-react";
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
          {value?.from ? (value.to ? (
            <>
              {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
            </>
          ) : (
            format(value.from, "LLL dd, y")
          )) : (
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

const calendarAccountSheetsMap: Record<string, string[]> = {
  Home: ["Achal", "Neeraj", "Salman", "Vivek", "Jyoti", "Govt", "Ravi"],
};

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
  const calendarAccounts = Object.keys(calendarAccountSheetsMap);
  const selectedCalendarAccount = calendarAccounts[0]; // Immutable
  const isRangeMode = true; // Immutable

  const [sheetNames, setSheetNames] = useState<string[]>(calendarAccountSheetsMap[selectedCalendarAccount] || []);
  const [selectedName, setSelectedName] = useState<string>(
    selectedCalendarAccount === "Home" && calendarAccountSheetsMap.Home.includes("Ravi")
      ? "Ravi"
      : "Select a sheet"
  );

  const [events, setEvents] = useState<Event[]>([]);
  const [bulkInput, setBulkInput] = useState<string>("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(tomorrow.toISOString().split("T")[0]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const sheets = calendarAccountSheetsMap[selectedCalendarAccount] || [];
    setSheetNames(sheets);
    if (selectedCalendarAccount === "Home" && sheets.includes("Ravi")) {
      setSelectedName("Ravi");
    } else {
      setSelectedName("Select a sheet");
    }
  }, [selectedCalendarAccount]);

  const fetchTodaysEvents = useCallback(async () => {
    const res = await fetch(
      `/api/events-sheet-yt?action=getEvents&sheetName=${encodeURIComponent(selectedName)}&date=${selectedDate}`
    );
    if (!res.ok) throw new Error('Failed to fetch events');
    const data = await res.json();
    return data.events || [];
  }, [selectedName, selectedDate]);

  useEffect(() => {
    if (selectedName !== "Select a sheet") {
      (async () => {
        try {
          const fetchedEvents = await fetchTodaysEvents();
          const adjustedEvents = Array.from({ length: 24 }).map((_, index) => {
            const startHour = String(index).padStart(2, "0");
            const event = fetchedEvents[index] || {};
            const title = event.title || initialEventTitles[index] || "Empty Slot";
            return {
              start: `${selectedDate}T${startHour}:00:00`,
              end: `${selectedDate}T${startHour}:50:00`,
              title,
              youtubeHindi:
                event.youtubeHindi ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " in Hindi")}`,
              youtubeEnglish:
                event.youtubeEnglish ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " in English")}`,
              youtubePlaylistHindi:
                event.youtubePlaylistHindi ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " playlist in Hindi")}&sp=EgIQAw%3D%3D`,
              youtubePlaylistEnglish:
                event.youtubePlaylistEnglish ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " playlist in English")}&sp=EgIQAw%3D%3D`,
              timeZone: event.timeZone || "Asia/Kolkata",
            };
          });
          setEvents(adjustedEvents);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Error fetching events");
          console.error(error);
          updateEvents(selectedDate);
        }
      })();
    } else {
      updateEvents(selectedDate);
    }
  }, [fetchTodaysEvents, selectedName, selectedDate]);

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
      const url = `${endpoint}?name=${encodeURIComponent(selectedName)}&calendarAccount=${encodeURIComponent(selectedCalendarAccount)}`;
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
    const eventsToAdd = events.filter(e => e.title !== "Empty Slot");
    const datesToProcess =
      isRangeMode && dateRange?.from && dateRange?.to ? getDatesBetween(dateRange.from, dateRange.to) : [selectedDate];

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
        isRangeMode,
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
    const datesToProcess =
      isRangeMode && dateRange?.from && dateRange?.to ? getDatesBetween(dateRange.from, dateRange.to) : [selectedDate];
    if (isRangeMode && datesToProcess.length > 1) {
      const confirmed = window.confirm(
        `Are you sure you want to remove events from ${datesToProcess.length} days (${datesToProcess[0]} to ${datesToProcess[datesToProcess.length - 1]})?`
      );
      if (!confirmed) return;
    }
    await handleEventAction(
      "/api/events-sheet-yt",
      {
        action: "removeAll",
        dates: datesToProcess,
        isRangeMode,
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
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success("Copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      const startDate = new Date(range.from);
      startDate.setHours(0, 0, 0, 0);
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, "0");
      const day = String(startDate.getDate()).padStart(2, "0");
      const startDateStr = `${year}-${month}-${day}`;
      setSelectedDate(startDateStr);
      updateEvents(startDateStr);
    }
  };

  const handleSingleDateChange = (date: string) => {
    setSelectedDate(date);
    updateEvents(date);
    if (isRangeMode) setDateRange(undefined);
  };

  return (
    <div className="p-4 h-dvh">
      {/* Controls */}
      <div className="mb-4">
        <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center">
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

          {isRangeMode ? (
            <DateRangeForm value={dateRange} onChange={handleDateRangeChange} />
          ) : (
            <CalendarForm value={selectedDate} onChange={handleSingleDateChange} />
          )}

          <Input
            className="w-full"
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="Paste comma-separated data here"
          />
          <Button onClick={handleBulkPaste}>Apply Paste</Button>
          <Button variant="destructive" onClick={clearBulkInput}>
            ×
          </Button>
        </div>
        <div className="mt-2 text-sm text-gray-600 font-bold">
          {isRangeMode ? (
            dateRange?.from && dateRange?.to ? (
              <span>
                Selected range: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")} (
                {getDatesBetween(dateRange.from, dateRange.to).length} days)
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
        {events.map((event, index) => {
          const startHour = String(index).padStart(1, "0");
          return (
            <Card key={index} className="p-2 gap-1">
              <CardHeader className="p-0">
                <div className="flex justify-between items-center gap-1">
                  <Badge>
                    <Clock10 className="w-4 h-4 mr-1" />
                    {`${startHour}`}
                  </Badge>
                  <Badge>
                    <Clock10 className="w-4 h-4 mr-1" />
                    <span className="text-xs">5m-40m</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-2">
                <Input
                  value={event.title}
                  onChange={(e) => handleTitleChange(index, e.target.value)}
                  placeholder="Enter event title"
                />
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "H", url: event.youtubeHindi },
                    { label: "E", url: event.youtubeEnglish },
                    { label: "PH", url: event.youtubePlaylistHindi },
                    { label: "PE", url: event.youtubePlaylistEnglish },
                  ].map(({ label, url }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick(url)}
                      className="text-blue-500 text-sm"
                    >
                      <Badge variant="outline">{label}</Badge>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom controls */}
      <div className="flex gap-2 flex-col lg:flex-row justify-end mt-4 items-center">
        <Button
          variant="default"
          onClick={addEvents}
          disabled={isRangeMode && (!dateRange?.from || !dateRange?.to)}
        >
          {isRangeMode
            ? `Add Events to Range ${dateRange?.from && dateRange?.to ? `(${getDatesBetween(dateRange.from, dateRange.to).length} days)` : ""
            }`
            : "Add All Events"}
        </Button>
        <Button
          variant="destructive"
          onClick={removeEvents}
          disabled={isRangeMode && (!dateRange?.from || !dateRange?.to)}
        >
          {isRangeMode
            ? `Remove Events from Range ${dateRange?.from && dateRange?.to ? `(${getDatesBetween(dateRange.from, dateRange.to).length} days)` : ""
            }`
            : "Remove All Events"}
        </Button>
      </div>
    </div>
  );
}
