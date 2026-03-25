"use client";

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

interface StepperPage6Props {
  data: Partial<StepperFormData>;
  onChange: (key: keyof StepperFormData, value: string) => void;
}

const englishOptions = [
  { value: "Superior", label: "Superior (IELTS 8 / PTE 79)" },
  { value: "Proficient", label: "Proficient (IELTS 7 / PTE 65)" },
  { value: "Competent", label: "Competent (IELTS 6 / PTE 50)" },
  { value: "Not taken", label: "Haven't taken a test yet" },
];

const yesNoOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

/**
 * Page 6: English test score + NAATI/CCL credential.
 */
export function StepperPage6({ data, onChange }: StepperPage6Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          English & Languages
        </span>
        <p className="text-sm text-muted-foreground">Up to 25 bonus points hiding here</p>
      </div>

      <StepperField label="English test score band" hint="20 points just for being good at English? Yes. Superior = 20 bonus points.">
        <Select
          value={data.englishScore ?? null}
          onValueChange={(val) => { if (val !== null) onChange("englishScore", val); }}
        >
          <SelectTrigger data-testid="field-englishScore" className="h-10 w-full">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {englishOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </StepperField>

      <StepperField label="Passed NAATI / CCL?" hint="Speak another language? That's literally worth 5 points here.">
        <PillSelect
          options={yesNoOptions}
          value={data.naatiCcl}
          onChange={(val) => onChange("naatiCcl", val)}
        />
      </StepperField>
    </div>
  );
}
