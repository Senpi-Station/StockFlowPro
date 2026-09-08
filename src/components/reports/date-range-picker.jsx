"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, toDate } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

function resolveRange(preset, now, customStart, customEnd) {
  if (preset === "today") return { label: "today", start: startOfDay(now), end: now };
  if (preset === "week") return { label: "this week", start: startOfWeek(now), end: now };
  if (preset === "month") return { label: "this month", start: startOfMonth(now), end: now };
  if (preset === "year") return { label: "this year", start: startOfYear(now), end: now };
  const start = customStart ? startOfDay(toDate(customStart)) : startOfDay(addDaysFromNow(now, -30));
  const end = customEnd ? endOfDay(toDate(customEnd)) : now;
  return { label: "custom", start, end };
}

function addDaysFromNow(now, days) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d;
}

function inputValue(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Date range selector. Calls onChange with { label, start, end }.
 */
export function DateRangePicker({ value, onChange, presets = RANGE_PRESETS }) {
  const now = new Date();
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const apply = (presetValue) => {
    const range = resolveRange(presetValue, now, customStart, customEnd);
    onChange({ preset: presetValue, ...range });
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <Button
            key={p.value}
            type="button"
            size="sm"
            variant={value?.preset === p.value ? "default" : "outline"}
            className={cn(value?.preset === p.value && "pointer-events-none")}
            onClick={() => apply(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {value?.preset === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="report-from" className="text-xs">From</Label>
            <Input
              id="report-from"
              type="date"
              value={customStart || inputValue(value.start)}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-to" className="text-xs">To</Label>
            <Input
              id="report-to"
              type="date"
              value={customEnd || inputValue(value.end)}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 w-40"
            />
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => apply("custom")}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}