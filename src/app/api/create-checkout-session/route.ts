import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  stripe,
  PRICE_AUD_CENTS,
  PRODUCT_NAME,
  PRODUCT_DESCRIPTION,
} from "@/lib/stripe";

/**
 * POST /api/create-checkout-session
 *
 * Creates a Stripe Checkout Session for the authenticated user.
 * Returns the checkout URL for client-side redirect.
 */
export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Check if user already has a completed payment
    const serviceClient = createServiceClient();
    const { data: existingPayment } = await serviceClient
      .from("payments")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "paid")
      .limit(1)
      .single();

    if (existingPayment) {
      return NextResponse.json({ error: "Already paid", redirectTo: "/workspace" }, { status: 400 });
    }

    // Parse optional assessment_id from request body
    let assessmentId: string | undefined;
    try {
      const body = await request.json();
      assessmentId = body.assessmentId;
    } catch {
      // No body is fine
    }

    // Determine the origin for redirect URLs
    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://imminash-app.vercel.app";

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: PRICE_AUD_CENTS,
            product_data: {
              name: PRODUCT_NAME,
              description: PRODUCT_DESCRIPTION,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userId,
        assessment_id: assessmentId || "",
      },
      success_url: `${origin}/value?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/value?payment=cancelled`,
    });

    // Create a pending payment record
    await serviceClient.from("payments").insert({
      user_id: userId,
      stripe_checkout_session_id: checkoutSession.id,
      amount_cents: PRICE_AUD_CENTS,
      currency: "aud",
      status: "pending",
      assessment_id: assessmentId || null,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
