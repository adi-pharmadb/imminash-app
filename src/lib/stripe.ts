import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

export const PRICE_AUD_CENTS = 19900; // $199.00 AUD
export const PRODUCT_NAME = "ACS Skill Assessment Document Package";
export const PRODUCT_DESCRIPTION =
  "Employment reference letters, supporting statement, CPD log, and document checklist - all ANZSCO-aligned and ACS-ready.";
