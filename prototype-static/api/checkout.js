const { IS_DEMO, stripeRequest, priceOrder, siteOrigin, readJson, send } = require('./_stripe');
const { requireUser } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  try {
    // La démo se paie sans compte (Stripe en mode test) ; le site réel exige une session Supabase.
    const user = IS_DEMO ? null : await requireUser(req);
    const body = await readJson(req);
    const mode = body.mode === 'booking' ? 'booking' : 'cart';
    const { lines, fees } = priceOrder(mode, body.items);
    const origin = siteOrigin(req);
    const slot = String(body.slot || '').slice(0, 80);
    const details = String(body.details || '').slice(0, 450);

    const lineItems = lines.map(({ listing, quantity }) => ({
      quantity,
      price_data: {
        currency: 'cad',
        unit_amount: Math.round(listing.price * 100),
        product_data: { name: listing.name, description: listing.seller },
      },
    }));
    if (fees > 0) {
      lineItems.push({
        quantity: 1,
        price_data: { currency: 'cad', unit_amount: Math.round(fees * 100), product_data: { name: 'Frais de service (10 %)' } },
      });
    }

    const session = await stripeRequest('POST', '/checkout/sessions', {
      mode: 'payment',
      line_items: lineItems,
      // Moyens choisis dans le dashboard Stripe. Sans conversion de devise, tout reste en CAD et Stripe ne propose
      // que les moyens canadiens (carte, Apple Pay, Google Pay, Link, Klarna, Afterpay, Affirm dès 50 $, prélèvement DPA).
      adaptive_pricing: { enabled: false },
      payment_method_options: {
        acss_debit: {
          verification_method: 'automatic',
          mandate_options: { payment_schedule: 'sporadic', transaction_type: 'personal' },
        },
      },
      customer_email: user ? user.email : undefined,
      client_reference_id: user ? user.id : undefined,
      locale: body.lang === 'en' ? 'en' : 'fr',
      success_url: `${origin}/mes-commandes.html?paiement=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/marketplace.html?paiement=annule`,
      metadata: {
        mode,
        app_mode: IS_DEMO ? 'demo' : 'real',
        buyer_id: user ? user.id : undefined,
        items: JSON.stringify(lines.map(l => ({ id: l.listing.id, qty: l.quantity }))),
        slot,
        details,
      },
    });
    return send(res, 200, { url: session.url });
  } catch (err) {
    console.error('checkout error:', err.message);
    return send(res, err.status || 500, { error: err.status && err.status < 500 ? err.message : 'Paiement indisponible pour le moment.' });
  }
};
