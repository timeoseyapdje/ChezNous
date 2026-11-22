const { IS_DEMO, stripeRequest, priceOrder, siteOrigin, readJson, send } = require('./_stripe');
const { requireUser, supabaseRest } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  try {
    // La démo se paie sans compte (Stripe en mode test) ; le site réel exige une session Supabase.
    const user = IS_DEMO ? null : await requireUser(req);
    const body = await readJson(req);
    const mode = body.mode === 'booking' ? 'booking' : 'cart';
    const { lines, fees, shippingBySeller } = await priceOrder(mode, body.items);
    if (user && lines.some(l => l.listing.sellerId === user.id)) return send(res, 400, { error: 'Vous ne pouvez pas acheter votre propre annonce.' });
    const origin = siteOrigin(req);
    const slot = String(body.slot || '').slice(0, 80);
    const details = String(body.details || '').slice(0, 450);
    // Date réelle du créneau (pour le rappel 24 h avant) : acceptée seulement dans les 4 prochains jours.
    const slotTime = Date.parse(body.slotAt || '');
    const slotAt = mode === 'booking' && slotTime > Date.now() && slotTime < Date.now() + 4 * 86400000 ? new Date(slotTime).toISOString() : '';
    // Le prix payé voyage avec la session : la commande enregistrée après paiement reprend exactement ce montant.
    const items = JSON.stringify(lines.map(l => ({
      id: l.listing.id, qty: l.quantity, p: l.unitPrice,
      ...(l.listing.custom ? { n: l.listing.name, s: l.listing.seller, t: l.listing.type } : {}),
    })));
    // Stripe limite chaque métadonnée à 500 caractères.
    if (items.length > 500) return send(res, 400, { error: 'Panier trop volumineux : réglez-le en deux fois.' });

    const lineItems = lines.map(({ listing, quantity, unitPrice }) => ({
      quantity,
      price_data: {
        currency: 'cad',
        unit_amount: Math.round(unitPrice * 100),
        product_data: { name: listing.name, description: listing.seller },
      },
    }));
    for (const [seller, amount] of Object.entries(shippingBySeller)) {
      if (amount > 0) lineItems.push({ quantity: 1, price_data: { currency: 'cad', unit_amount: Math.round(amount * 100), product_data: { name: `Livraison — ${seller}` } } });
    }
    if (fees > 0) {
      lineItems.push({
        quantity: 1,
        price_data: { currency: 'cad', unit_amount: Math.round(fees * 100), product_data: { name: 'Frais de service (10 %)' } },
      });
    }

    // Cartes enregistrées dans Mon profil : proposées directement au paiement.
    let customer;
    if (user) {
      const rows = await supabaseRest('GET', `payment_accounts?user_id=eq.${user.id}&select=stripe_customer_id`).catch(() => null);
      customer = (rows && rows[0] && rows[0].stripe_customer_id) || undefined;
    }

    const session = await stripeRequest('POST', '/checkout/sessions', {
      mode: 'payment',
      customer,
      line_items: lineItems,
      // Codes promo créés dans le tableau de bord Stripe (Produits → Coupons) : champ « Ajouter un code » au paiement.
      allow_promotion_codes: true,
      // Moyens choisis dans le dashboard Stripe. Sans conversion de devise, tout reste en CAD et Stripe ne propose
      // que les moyens canadiens (carte, Apple Pay, Google Pay, Link, Klarna, Afterpay, Affirm dès 50 $, prélèvement DPA).
      adaptive_pricing: { enabled: false },
      payment_method_options: {
        acss_debit: {
          verification_method: 'automatic',
          mandate_options: { payment_schedule: 'sporadic', transaction_type: 'personal' },
        },
      },
      customer_email: !customer && user ? user.email : undefined,
      client_reference_id: user ? user.id : undefined,
      locale: body.lang === 'en' ? 'en' : 'fr',
      success_url: `${origin}/mes-commandes.html?paiement=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/marketplace.html?paiement=annule`,
      metadata: {
        mode,
        app_mode: IS_DEMO ? 'demo' : 'real',
        buyer_id: user ? user.id : undefined,
        items,
        slot,
        slot_at: slotAt || undefined,
        details,
      },
    });
    return send(res, 200, { url: session.url });
  } catch (err) {
    console.error('checkout error:', err.message);
    return send(res, err.status || 500, { error: err.status && err.status < 500 ? err.message : 'Paiement indisponible pour le moment.' });
  }
};
