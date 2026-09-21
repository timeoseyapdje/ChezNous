import { NextRequest, NextResponse } from "next/server";
import { stripe, PLATFORM_COMMISSION_BPS } from "@/lib/stripe";

// Expects: { amountCad: number, sellerStripeAccountId: string, description: string, plan?: "basique"|"pro"|"premium" }
// sellerStripeAccountId comes from Stripe Connect onboarding (see /api/connect/onboard, to be added
// once Stripe Connect is enabled on the account).
export async function POST(req: NextRequest) {
  const { amountCad, sellerStripeAccountId, description, plan } = await req.json();

  if (!amountCad || !sellerStripeAccountId) {
    return NextResponse.json(
      { error: "amountCad and sellerStripeAccountId are required" },
      { status: 400 }
    );
  }

  const commissionBps = PLATFORM_COMMISSION_BPS[plan as keyof typeof PLATFORM_COMMISSION_BPS] ?? 1500;
  const amountInCents = Math.round(amountCad * 100);
  const applicationFee = Math.round((amountInCents * commissionBps) / 10000);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: { name: description ?? "Commande Chez Nous" },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: sellerStripeAccountId },
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/panier`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout route error:", err);
    return NextResponse.json(
      { error: "Stripe n'est pas configure. Ajoutez STRIPE_SECRET_KEY dans .env.local." },
      { status: 503 }
    );
  }
}
