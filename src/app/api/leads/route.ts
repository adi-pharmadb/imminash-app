import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const leadSchema = z.object({
  email: z.string().email(),
  first_name: z.string().nullable().optional(),
  visa_status: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .insert({
        email: parsed.data.email,
        first_name: parsed.data.first_name ?? null,
        visa_status: parsed.data.visa_status ?? null,
        job_title: parsed.data.job_title ?? null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save lead" },
        { status: 500 },
      );
    }

    return NextResponse.json({ lead_id: data.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
