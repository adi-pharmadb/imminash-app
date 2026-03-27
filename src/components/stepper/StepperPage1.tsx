"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StepperFormData } from "@/types/assessment";
import { StepperField } from "./StepperField";

interface StepperPage1Props {
  data: Partial<StepperFormData>;
  onChange: (key: keyof StepperFormData, value: string | number) => void;
}

const visaOptions = [
  { value: "500", label: "500 - Student Visa" },
  { value: "485", label: "485 - Temporary Graduate" },
  { value: "482", label: "482 - Temporary Skill Shortage" },
  { value: "Other", label: "Other" },
];

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

/** Parse stored "MM/YYYY" into parts. */
function parseExpiry(val: string | undefined): { month: string; year: string } {
  if (!val) return { month: "", year: "" };
  const [m, y] = val.split("/");
  return { month: m || "", year: y || "" };
}

/** Check if a MM/YYYY value is in the past. */
function isExpiryInPast(month: string, year: string): boolean {
  if (!month || !year || year.length < 4) return false;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (isNaN(y) || isNaN(m)) return false;
  return y < currentYear || (y === currentYear && m < currentMonth);
}

/**
 * Page 1: Basics - first name, age, visa status, visa expiry.
 */
export function StepperPage1({ data, onChange }: StepperPage1Props) {
  const { month: expiryMonth, year: expiryYear } = parseExpiry(data.visaExpiry);
  const isPast = isExpiryInPast(expiryMonth, expiryYear);

  // Generate year options: current year to +10
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => {
      const y = String(currentYear + i);
      return { value: y, label: y };
    });
  }, []);

  function handleExpiryChange(part: "month" | "year", value: string) {
    const m = part === "month" ? value : expiryMonth;
    const y = part === "year" ? value : expiryYear;
    // Always store partial value so selections aren't wiped out
    onChange("visaExpiry", `${m}/${y}`);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Let&apos;s get to know you
        </span>
        <p className="text-sm text-muted-foreground">The basics - takes 30 seconds</p>
      </div>

      <StepperField label="First name" hint="So we can stop calling you 'applicant'.">
        <Input
          data-testid="field-firstName"
          value={data.firstName ?? ""}
          onChange={(e) => onChange("firstName", e.target.value)}
          placeholder="Your first name"
          className="h-10"
          autoFocus
        />
      </StepperField>

      <StepperField label="Age" hint="The sweet spot is 25-32 (up to 30 points).">
        <Input
          data-testid="field-age"
          type="number"
          value={data.age ?? ""}
          onChange={(e) => onChange("age", Number(e.target.value))}
          placeholder="e.g. 28"
          className="h-10"
          min={15}
          max={65}
        />
      </StepperField>

      <StepperField label="Current visa" hint="Each visa has different rules - we'll tailor everything to yours.">
        <Select
          value={data.visaStatus ?? null}
          onValueChange={(val) => { if (val !== null) onChange("visaStatus", val); }}
        >
          <SelectTrigger data-testid="field-visaStatus" className="h-10 w-full">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {visaOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </StepperField>

      <StepperField label="Visa expiry (month / year)" hint="Helps us flag any timing constraints.">
        <div className="flex gap-3" data-testid="field-visaExpiry">
          <Select
            value={expiryMonth || null}
            onValueChange={(val) => { if (val !== null) handleExpiryChange("month", val); }}
          >
            <SelectTrigger className="h-10 flex-1">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={expiryYear || null}
            onValueChange={(val) => { if (val !== null) handleExpiryChange("year", val); }}
          >
            <SelectTrigger className="h-10 flex-1">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isPast && (
          <p className="mt-1.5 text-xs" style={{ color: "oklch(0.65 0.2 25)" }}>
            This date is in the past. Please select a current or future expiry date.
          </p>
        )}
      </StepperField>
    </div>
  );
}
