import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";

/**
 * POST /api/create-checkout-session
 *
 * Creates a Stripe Checkout Session for the authenticated user.
 * For the chat-first flow, accepts `conversationId` in the body and
 * wires it through as `client_reference_id` so the webhook can
 * flip the correct conversation row to paid.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Parse optional ids from request body
    let assessmentId: string | undefined;
    let conversationId: string | undefined;
    try {
      const body = await request.json();
      assessmentId = body.assessmentId;
      conversationId = body.conversationId;
    } catch {
      // No body is fine
    }

    // Block duplicate payments only when this is an assessment-first
    // checkout (legacy flow). The chat-first flow is gated by the
    // conversation row's paid_at, so we let it through.
    if (!conversationId) {
      const serviceClient = createServiceClient();
      const { data: existingPayment } = await serviceClient
        .from("payments")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "paid")
        .limit(1)
        .single();

      if (existingPayment) {
        return NextResponse.json(
          { error: "Already paid", redirectTo: "/workspace" },
          { status: 400 },
        );
      }
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://imminash-app.vercel.app";

    const successUrl = conversationId
      ? `${origin}/chat?paid=1`
      : `${origin}/value?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = conversationId
      ? `${origin}/chat`
      : `${origin}/value?payment=cancelled`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail || undefined,
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      client_reference_id: conversationId || undefined,
      metadata: {
        user_id: userId,
        assessment_id: assessmentId || "",
        conversation_id: conversationId || "",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Create a pending payment record (legacy, still used for reporting).
    const serviceClient = createServiceClient();
    await serviceClient.from("payments").insert({
      user_id: userId,
      stripe_checkout_session_id: checkoutSession.id,
      amount_cents: 19900,
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
