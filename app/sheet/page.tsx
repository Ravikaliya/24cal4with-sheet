"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SheetForm() {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to submit form");
      const data = await res.json();
      toast.success(data.message);
      setFormData({ name: "", age: "", phone: "" }); // Reset form
    } catch (error) {
      toast.error("Error submitting form");
      console.error(error);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add to Sheet</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter name"
            required
          />
        </div>
        <div>
          <label htmlFor="age" className="block text-sm font-medium">
            Age
          </label>
          <Input
            id="age"
            name="age"
            type="number"
            value={formData.age}
            onChange={handleChange}
            placeholder="Enter age"
            required
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Phone
          </label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
            required
          />
        </div>
        <Button type="submit" variant="default">
          Submit
        </Button>
      </form>
    </div>
  );
}