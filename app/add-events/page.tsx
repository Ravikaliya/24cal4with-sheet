"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellDot, Clock10 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<
    { title: string; time: string }[]
  >([]);
  const eventNotification = "5";

  const eventTitles = [
    "HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js",
    "Vue.js", "Angular", "Svelte", "Tailwind CSS", "Bootstrap", "Node.js",
    "Express.js", "Django", "Flask", "Spring Boot", "GraphQL", "REST API",
    "MongoDB", "PostgreSQL", "MySQL", "Firebase", "AWS", "Docker"
  ];

  const toggleEvent = async (title: string, time: string) => {
    setSelectedEvents((prevEvents) => {
      const isAlreadySelected = prevEvents.some((event) => event.title === title);
      if (isAlreadySelected) {
        removeEventFromCalendar(title, time);
        return prevEvents.filter((event) => event.title !== title);
      } else {
        addEventToCalendar(title, time);
        return [...prevEvents, { title, time }];
      }
    });
  };

  const addEventToCalendar = async (title: string, time: string) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const event = {
      title,
      start: `${year}-${month}-${day}T${time}:00`,
      end: `${year}-${month}-${day}T${time}:30`,
      timeZone: "Asia/Kolkata",
    };

    try {
      const res = await fetch("/api/add-24-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!res.ok) throw new Error("Failed to add event");
      toast("Event has been created", {
        description: `${title} scheduled at ${time}`,
        action: {
          label: "Undo",
          onClick: () => console.log("Undo event creation"),
        },
      });
    } catch (error) {
      toast.error("Failed to add event to calendar.");
      console.error("Error:", error);
    }
  };

  const removeEventFromCalendar = async (title: string, time: string) => {
    try {
      const res = await fetch("/api/remove-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, time }),
      });
      if (!res.ok) throw new Error("Failed to remove event");
      toast.success(`Event '${title}' removed successfully`);
    } catch (error) {
      toast.error("Failed to remove event.");
      console.error("Error:", error);
    }
  };

  const addAllEvents = async () => {
    try {
      const res = await fetch("/api/add-all-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to add all events");
      toast.success("All events added successfully");
    } catch (error) {
      toast.error("Failed to add all events.");
      console.error("Error:", error);
    }
  };

  const removeAllEvents = async () => {
    try {
      const res = await fetch("/api/remove-all-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to remove events");
      toast.success("All events removed successfully");
    } catch (error) {
      toast.error("Failed to remove events.");
      console.error("Error:", error);
    }
  };

  return (
    <div className={`p-4 h-dvh ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
      <div className="mb-4 flex justify-between items-center">
        <Switch checked={isDarkMode} onCheckedChange={() => setIsDarkMode(!isDarkMode)} />
      </div>

      <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
        {eventTitles.map((title, index) => {
          const eventHour = index + 1;
          const formattedTime = `${eventHour.toString().padStart(2, "0")}:00`;
          const isSelected = selectedEvents.some((event) => event.title === title);

          return (
            <Card
              key={index}
              className={`cursor-pointer transition-all p-2 gap-1 ${
                isSelected ? "border-2 border-green-500 bg-green-100" : ""
              }`}
              onClick={() => toggleEvent(title, formattedTime)}
            >
              <CardHeader className="p-0">
                <div className="flex justify-between">
                  <Badge>
                    <Clock10 className="w-4 h-4 mr-1" />
                    {formattedTime}
                  </Badge>
                  <Badge variant="outline">
                    <BellDot className="w-4 h-4 mr-1" />
                    {eventNotification} min
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative p-0">
                <Input id="event" value={title} readOnly />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="destructive" onClick={removeAllEvents}>Remove All Events</Button>
        <Button variant="default" onClick={addAllEvents}>Add All Events</Button>
      </div>
    </div>
  );
}
