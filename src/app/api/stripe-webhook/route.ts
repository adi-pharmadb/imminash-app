import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/stripe-webhook
 *
 * Handles Stripe webhook events. Verifies the signature,
 * updates the legacy payments table, and (for the chat-first flow)
 * flips the conversation row to status='paid' using client_reference_id.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // In development without webhook secret, parse the event directly
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

      // Legacy payments table update.
      await serviceClient
        .from("payments")
        .update({
          status: "paid",
          stripe_payment_intent_id: paymentIntentId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_checkout_session_id", session.id);

      // Chat-first flow: flip the conversation row to paid.
      const conversationId: string | undefined =
        session.client_reference_id ||
        session.metadata?.conversation_id ||
        undefined;

      if (conversationId) {
        // Idempotent: only update if not already paid.
        const { data: existing } = await serviceClient
          .from("conversations")
          .select("id, status, paid_at")
          .eq("id", conversationId)
          .maybeSingle();

        if (existing && !existing.paid_at) {
          await serviceClient
            .from("conversations")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
        }
      }

      console.log(
        `Payment completed for user ${userId}, session ${session.id}, conversation ${conversationId ?? "none"}`,
      );
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;

      await serviceClient
        .from("payments")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_checkout_session_id", session.id);

      break;
    }

    default:
      // Unhandled event type
      break;
  }

  return NextResponse.json({ received: true });
}
