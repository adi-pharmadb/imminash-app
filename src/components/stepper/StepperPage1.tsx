"use client";

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

/**
 * Page 1: Basics - first name, age, visa status, visa expiry.
 */
export function StepperPage1({ data, onChange }: StepperPage1Props) {
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
        <Input
          data-testid="field-visaExpiry"
          value={data.visaExpiry ?? ""}
          onChange={(e) => onChange("visaExpiry", e.target.value)}
          placeholder="e.g. 03/2026"
          className="h-10"
        />
      </StepperField>
    </div>
  );
}
