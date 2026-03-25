import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const assessmentSchema = z.object({
  profile_data: z.record(z.string(), z.unknown()),
  points_breakdown: z.record(z.string(), z.unknown()),
  total_points: z.number().int(),
  matched_occupations: z.record(z.string(), z.unknown()),
  user_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = assessmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("assessments")
      .insert({
        profile_data: parsed.data.profile_data,
        points_breakdown: parsed.data.points_breakdown,
        total_points: parsed.data.total_points,
        matched_occupations: parsed.data.matched_occupations,
        user_id: parsed.data.user_id ?? null,
        lead_id: parsed.data.lead_id ?? null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save assessment" },
        { status: 500 },
      );
    }

    return NextResponse.json({ assessment_id: data.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
