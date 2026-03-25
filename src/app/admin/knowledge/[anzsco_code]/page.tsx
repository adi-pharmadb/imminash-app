"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface KnowledgeFields {
  strategic_advice: string;
  common_pitfalls: string;
  recommended_approach: string;
  tips_and_hacks: string;
  custom_notes: string;
}

const FIELD_LABELS: Record<keyof KnowledgeFields, string> = {
  strategic_advice: "Strategic Advice",
  common_pitfalls: "Common Pitfalls",
  recommended_approach: "Recommended Approach",
  tips_and_hacks: "Tips and Hacks",
  custom_notes: "Custom Notes",
};

const FIELD_PLACEHOLDERS: Record<keyof KnowledgeFields, string> = {
  strategic_advice: "Strategic advice for applicants targeting this occupation...",
  common_pitfalls: "Common mistakes applicants make when applying for this occupation...",
  recommended_approach: "Recommended approach for the best chance of success...",
  tips_and_hacks: "Tips, tricks, and hacks that give applicants an edge...",
  custom_notes: "Any other notes or observations about this occupation...",
};

/**
 * Admin knowledge edit form for a specific occupation.
 * Protected by auth + admin check via the API layer.
 */
export default function AdminKnowledgeEditPage() {
  const router = useRouter();
  const params = useParams();
  const anzscoCode = params.anzsco_code as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [occupationTitle, setOccupationTitle] = useState("");
  const [fields, setFields] = useState<KnowledgeFields>({
    strategic_advice: "",
    common_pitfalls: "",
    recommended_approach: "",
    tips_and_hacks: "",
    custom_notes: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      // Fetch occupation title
      const { data: occ } = await supabase
        .from("occupations")
        .select("title")
        .eq("anzsco_code", anzscoCode)
        .single();

      if (occ) {
        setOccupationTitle(occ.title);
      }

      // Fetch existing knowledge
      const { data: knowledge } = await supabase
        .from("agent_knowledge")
        .select("*")
        .eq("anzsco_code", anzscoCode)
        .single();

      if (knowledge) {
        setFields({
          strategic_advice: knowledge.strategic_advice ?? "",
          common_pitfalls: knowledge.common_pitfalls ?? "",
          recommended_approach: knowledge.recommended_approach ?? "",
          tips_and_hacks: knowledge.tips_and_hacks ?? "",
          custom_notes: knowledge.custom_notes ?? "",
        });
      }

      setLoading(false);
    }

    load();
  }, [anzscoCode, router]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/admin/knowledge/${anzscoCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        setSaving(false);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    }

    setSaving(false);
  };

  const handleFieldChange = (key: keyof KnowledgeFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto w-full max-w-3xl px-6 py-6">
        <button
          onClick={() => router.push("/admin/knowledge")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </button>
        <div>
          <h1 className="font-display text-xl italic text-foreground">
            {occupationTitle || anzscoCode}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ANZSCO {anzscoCode}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 space-y-6 pb-12">
        {(Object.keys(FIELD_LABELS) as Array<keyof KnowledgeFields>).map((key) => (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">
              {FIELD_LABELS[key]}
            </label>
            <textarea
              value={fields[key]}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={FIELD_PLACEHOLDERS[key]}
              className="min-h-[100px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors outline-none"
              data-testid={`field-${key}`}
            />
          </div>
        ))}

        {/* Save button and feedback */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="gap-2 rounded-xl bg-primary px-8 text-primary-foreground glow-amber"
            data-testid="save-button"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>

          {saved && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "oklch(0.72 0.17 155)" }}>
              <CheckCircle className="h-4 w-4" />
              Saved successfully
            </span>
          )}

          {error && (
            <span className="text-sm" style={{ color: "oklch(0.65 0.2 25)" }}>
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
