"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PillSelect } from "@/components/ui/PillSelect";
import type { StepperFormData } from "@/types/assessment";
import { StepperField } from "./StepperField";

interface StepperPage3Props {
  data: Partial<StepperFormData>;
  onChange: (key: keyof StepperFormData, value: string) => void;
}

const degreeOptions = [
  { value: "None", label: "No additional degree" },
  { value: "PhD", label: "PhD / Doctorate" },
  { value: "Masters", label: "Master's Degree" },
  { value: "Bachelor", label: "Bachelor's Degree" },
  { value: "Diploma", label: "Diploma / Advanced Diploma" },
];

const countryOptions = [
  { value: "Australia", label: "Australia" },
  { value: "Overseas", label: "Outside Australia" },
];

/**
 * Page 3: Additional qualifications (skippable).
 */
export function StepperPage3({ data, onChange }: StepperPage3Props) {
  const hasDegree = !!data.additionalDegree && data.additionalDegree !== "None";

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Additional qualifications
        </span>
        <p className="text-sm text-muted-foreground">Got another degree? Let's count it all</p>
      </div>

      <StepperField label="Any other degree?" hint="Multiple quals can strengthen your application." optional>
        <Select
          value={data.additionalDegree ?? null}
          onValueChange={(val) => { if (val !== null) onChange("additionalDegree", val); }}
        >
          <SelectTrigger data-testid="field-additionalDegree" className="h-10 w-full">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {degreeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </StepperField>

      {hasDegree && (
        <StepperField label="What did you study?" hint="This could open up a whole different set of occupations for you.">
          <Input
            data-testid="field-additionalDegreeField"
            value={data.additionalDegreeField ?? ""}
            onChange={(e) => onChange("additionalDegreeField", e.target.value)}
            placeholder="e.g. Civil Engineering, Information Technology"
            className="h-10"
          />
        </StepperField>
      )}

      {hasDegree && (
        <StepperField label="Country of additional degree">
          <PillSelect
            options={countryOptions}
            value={data.additionalDegreeCountry}
            onChange={(val) => onChange("additionalDegreeCountry", val)}
          />
        </StepperField>
      )}
    </div>
  );
}
