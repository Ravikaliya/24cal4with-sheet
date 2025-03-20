"use client";

import { useState } from "react";
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

interface Event {
  title: string;
  time: string;
}

const initialEventTitles: string[] = [
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

export default function Home() {
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [eventTitles, setEventTitles] = useState<string[]>(initialEventTitles);
  const [selectedName, setSelectedName] = useState<string>("Select a name");

  const handleEventAction = async (
    endpoint: string,
    data: any,
    successMessage: string,
    errorMessage: string
  ) => {
    try {
      // Modify endpoint to include selectedName as query parameter
      const url = `${endpoint}?name=${encodeURIComponent(selectedName)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(errorMessage);
      toast.success(successMessage);
    } catch (error) {
      toast.error(errorMessage);
      console.error("Error:", error);
    }
  };

  const addEvents = async () => {
    if (selectedName === "Select a name") {
      toast.error("Please select a name first!");
      return;
    }

    const allEvents = eventTitles.map((title, index) => {
      const formattedTime = `${String(index).padStart(2, "0")}:00`;
      return {
        title,
        start: `${new Date().toISOString().split("T")[0]}T${formattedTime}:00`,
        timeZone: "Asia/Kolkata",
      };
    });

    setSelectedEvents(
      allEvents.map((event) => ({
        title: event.title,
        time: event.start.split("T")[1].split(":")[0] + ":00",
      }))
    );

    await handleEventAction(
      "/api/event-sheets",
      { action: "addAll", events: allEvents },
      "All events added successfully!",
      "Failed to add all events!"
    );
  };

  const removeEvents = async () => {
    if (selectedName === "Select a name") {
      toast.error("Please select a name first!");
      return;
    }

    setSelectedEvents([]);
    await handleEventAction(
      "/api/event-sheets",
      { action: "removeAll" },
      "All events removed successfully!",
      "Failed to remove all events!"
    );
  };

  const handleTitleChange = (index: number, newTitle: string) => {
    const updatedTitles = [...eventTitles];
    updatedTitles[index] = newTitle;
    setEventTitles(updatedTitles);
  };

  return (
    <div className="p-4 h-dvh">
      <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
        {eventTitles.map((title, index) => {
          const formattedTime = `${String(index).padStart(2, "0")}:00`;
          const isSelected = selectedEvents.some(
            (event) => event.title === title
          );

          return (
            <Card
              key={title}
              className={`cursor-pointer transition-all p-2 gap-1 ${
                isSelected ? "border border-green-500 bg-green-100" : ""
              }`}
            >
              <CardHeader className="p-0">
                <div className="flex justify-between">
                  <Badge>
                    <Clock10 className="w-4 h-4 mr-1" />
                    {formattedTime}
                  </Badge>
                  <Badge variant="outline">
                    <BellDot className="w-4 h-4 mr-1" />
                    {`10`} min
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative p-0">
                <Input
                  id="event"
                  value={title}
                  onChange={(e) => handleTitleChange(index, e.target.value)}
                  onBlur={(e) => handleTitleChange(index, e.target.value)}
                  readOnly={false} // Ensure the input is editable
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex gap-4 justify-end mt-4 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{selectedName}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Select Name</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedName("Achal")}>
              Achal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedName("Neeraj")}>
              Neeraj
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedName("Salman")}>
              Salman
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedName("Vivek")}>
              Vivek
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedName("Jyoti")}>
              Jyoti
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="default" onClick={addEvents}>
          Add All Events
        </Button>
        <Button variant="destructive" onClick={removeEvents}>
          Remove All Events
        </Button>
      </div>
    </div>
  );
}