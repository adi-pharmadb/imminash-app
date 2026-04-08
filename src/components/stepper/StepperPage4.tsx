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

interface StepperPage4Props {
  data: Partial<StepperFormData>;
  onChange: (key: keyof StepperFormData, value: string) => void;
}

const skilledOptions = [
  { value: "Yes", label: "Yes, currently" },
  { value: "Past", label: "I was in the past" },
  { value: "No", label: "Not yet" },
];

const auExperienceOptions = [
  { value: "0", label: "None" },
  { value: "1-3", label: "1 to less than 3 years" },
  { value: "3-5", label: "3 to less than 5 years" },
  { value: "5-8", label: "5 to less than 8 years" },
  { value: "8+", label: "8 years or more" },
];

const offshoreExperienceOptions = [
  { value: "0", label: "None" },
  { value: "3-5", label: "3 to less than 5 years" },
  { value: "5-8", label: "5 to less than 8 years" },
  { value: "8+", label: "8 years or more" },
];

function getJobTitleLabel(workingSkilled: string | undefined): string {
  if (workingSkilled === "Yes") return "Current job title";
  if (workingSkilled === "Past") return "Previous job title";
  return "What role are you looking to get?";
}

function getJobTitleHint(workingSkilled: string | undefined): string {
  if (workingSkilled === "No") return "Dream big - we'll check if it's on the skilled list.";
  return "Be specific - this drives our occupation matching.";
}

function getJobTitlePlaceholder(workingSkilled: string | undefined): string {
  if (workingSkilled === "No") return "e.g. Data Analyst, Civil Engineer";
  return "e.g. Software Engineer, Registered Nurse";
}

/**
 * Page 4: Work experience - skilled status, job title (dynamic label), AU + offshore years.
 */
export function StepperPage4({ data, onChange }: StepperPage4Props) {
  const isWorking = data.workingSkilled === "Yes" || data.workingSkilled === "Past";
  const hasSkilled = !!data.workingSkilled;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Work Experience
        </span>
        <p className="text-sm text-muted-foreground">This is where the points really stack up</p>
      </div>

      <StepperField label="Working in a skilled role?" hint="This one's a big deal - it affects almost everything.">
        <PillSelect
          options={skilledOptions}
          value={data.workingSkilled}
          onChange={(val) => onChange("workingSkilled", val)}
        />
      </StepperField>

      {hasSkilled && (
        <StepperField
          label={getJobTitleLabel(data.workingSkilled)}
          hint={getJobTitleHint(data.workingSkilled)}
        >
          <Input
            data-testid="field-jobTitle"
            value={data.jobTitle ?? ""}
            onChange={(e) => onChange("jobTitle", e.target.value)}
            placeholder={getJobTitlePlaceholder(data.workingSkilled)}
            className="h-10"
          />
        </StepperField>
      )}

      {isWorking && (
        <StepperField
          label="Years of Australian work experience"
          hint="Paid work in your skilled field while in Australia. Local experience is weighted more heavily."
        >
          <Select
            value={data.australianExperience ?? null}
            onValueChange={(val) => { if (val !== null) onChange("australianExperience", val); }}
          >
            <SelectTrigger data-testid="field-australianExperience" className="h-10 w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {auExperienceOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </StepperField>
      )}

      {isWorking && (
        <StepperField
          label="Years of experience outside Australia"
          hint="Relevant skilled work performed overseas. This also contributes to your points score."
        >
          <Select
            value={data.experience ?? null}
            onValueChange={(val) => { if (val !== null) onChange("experience", val); }}
          >
            <SelectTrigger data-testid="field-experience" className="h-10 w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {offshoreExperienceOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </StepperField>
      )}
    </div>
  );
}
