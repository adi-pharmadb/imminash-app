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

interface StepperPage2Props {
  data: Partial<StepperFormData>;
  onChange: (key: keyof StepperFormData, value: string) => void;
}

const educationOptions = [
  { value: "PhD", label: "PhD / Doctorate" },
  { value: "Masters", label: "Master's Degree" },
  { value: "Bachelor", label: "Bachelor's Degree" },
  { value: "Diploma", label: "Diploma / Advanced Diploma" },
  { value: "Trade", label: "Trade Qualification" },
];

const countryOptions = [
  { value: "Australia", label: "Australia" },
  { value: "Overseas", label: "Outside Australia" },
];

const yesNoOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

/**
 * Page 2: Education - level, field, university, country, conditional AU study + regional.
 */
export function StepperPage2({ data, onChange }: StepperPage2Props) {
  const showAustralianStudy = data.countryOfEducation === "Australia";
  const showRegionalStudy = data.australianStudy === "Yes";

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Education
        </span>
        <p className="text-sm text-muted-foreground">Your qualifications matter - a lot</p>
      </div>

      <StepperField label="Highest education level" hint="PhD? Masters? Either way, you worked hard for those points.">
        <Select
          value={data.educationLevel ?? null}
          onValueChange={(val) => { if (val !== null) onChange("educationLevel", val); }}
        >
          <SelectTrigger data-testid="field-educationLevel" className="h-10 w-full">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {educationOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </StepperField>

      <StepperField label="Field of study" hint="We'll match this against 1,000+ occupation codes. Be specific!">
        <Input
          data-testid="field-fieldOfStudy"
          value={data.fieldOfStudy ?? ""}
          onChange={(e) => onChange("fieldOfStudy", e.target.value)}
          placeholder="e.g. Computer Science, Nursing, Accounting"
          className="h-10"
        />
      </StepperField>

      <StepperField label="University / College name" hint="Optional - but it helps us understand your background." optional>
        <Input
          data-testid="field-universityName"
          value={data.universityName ?? ""}
          onChange={(e) => onChange("universityName", e.target.value)}
          placeholder="e.g. University of Melbourne"
          className="h-10"
        />
      </StepperField>

      <StepperField label="Country of education" hint="This changes how many years of experience they'll 'deduct'. Yes, really.">
        <PillSelect
          options={countryOptions}
          value={data.countryOfEducation}
          onChange={(val) => onChange("countryOfEducation", val)}
          data-testid="field-countryOfEducation"
        />
      </StepperField>

      {showAustralianStudy && (
        <StepperField
          label="Completed 2+ years of study in Australia?"
          hint="2 years of Aussie study = 5 free points. Quick maths."
        >
          <PillSelect
            options={yesNoOptions}
            value={data.australianStudy}
            onChange={(val) => onChange("australianStudy", val)}
          />
        </StepperField>
      )}

      {showAustralianStudy && showRegionalStudy && (
        <StepperField
          label="Was that study in a regional area?"
          hint="Studied outside a major city? That's worth 5 bonus points."
        >
          <PillSelect
            options={yesNoOptions}
            value={data.regionalStudy}
            onChange={(val) => onChange("regionalStudy", val)}
          />
        </StepperField>
      )}
    </div>
  );
}
