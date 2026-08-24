import "server-only";

import Stripe from "stripe";

import { env } from "@/lib/env";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (!cached) {
    cached = new Stripe(env.stripeSecretKey, {
      apiVersion: "2024-06-20",
      typescript: true,
    });
  }
  return cached;
}
