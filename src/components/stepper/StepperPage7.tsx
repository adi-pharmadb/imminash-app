"use client";

import { PillSelect } from "@/components/ui/PillSelect";
import type { StepperFormData } from "@/types/assessment";
import { StepperField } from "./StepperField";

interface StepperPage7Props {
  data: Partial<StepperFormData>;
  onChange: (key: keyof StepperFormData, value: string) => void;
}

const yesNoOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const relationshipOptions = [
  { value: "Single", label: "Single" },
  { value: "Partner", label: "Have a partner" },
];

const partnerSkillsOptions = [
  { value: "Skilled", label: "Skilled assessment + competent English" },
  { value: "English", label: "Competent English only" },
  { value: "Neither", label: "Neither" },
];

/**
 * Page 7: Final details - professional year, relationship, partner skills.
 */
export function StepperPage7({ data, onChange }: StepperPage7Props) {
  const showPartnerSkills = data.relationshipStatus === "Partner";

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          Final details
        </span>
        <p className="text-sm text-muted-foreground">Last step - let's find your remaining bonus points</p>
      </div>

      <StepperField label="Completed a Professional Year?" hint="One of the easiest 5 points you can pick up.">
        <PillSelect
          options={yesNoOptions}
          value={data.professionalYear}
          onChange={(val) => onChange("professionalYear", val)}
        />
      </StepperField>

      <StepperField label="Are you single or do you have a partner?" hint="Single applicants actually get 10 bonus points. Plot twist.">
        <PillSelect
          options={relationshipOptions}
          value={data.relationshipStatus}
          onChange={(val) => onChange("relationshipStatus", val)}
        />
      </StepperField>

      {showPartnerSkills && (
        <StepperField label="Does your partner have a skills assessment and competent English?" hint="A skilled partner can add up to 10 points. Teamwork.">
          <PillSelect
            options={partnerSkillsOptions}
            value={data.partnerSkills}
            onChange={(val) => onChange("partnerSkills", val)}
          />
        </StepperField>
      )}
    </div>
  );
}
