import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

// Configure this URL in the Stripe Dashboard (or via `stripe listen` locally)
// once STRIPE_WEBHOOK_SECRET is set.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!process.env.STRIPE_WEBHOOK_SECRET || !signature) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 503 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Invalid Stripe webhook signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      await supabase.from("orders").update({ status: "confirmee" }).eq("stripe_session_id", session.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      await supabase.from("orders").update({ status: "remboursee" }).eq("stripe_charge_id", charge.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
