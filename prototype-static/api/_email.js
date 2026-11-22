const { supabaseRest } = require('./_supabase');

// Courriels transactionnels (Resend). Envoyés uniquement aux membres qui ont accepté les notifications par courriel
// (profiles.notify_email, case cochée à l'inscription ou dans Paramètres → Notifications).
// Un échec d'envoi n'interrompt jamais l'action en cours (paiement, annulation, litige…).

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SITE = (process.env.SITE_URL || 'https://www.akwaone.ca').replace(/\/$/, '');

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const money = (n) => `${Number(n || 0).toFixed(2)} $ CA`;
const itemsText = (items) => (items || []).map(i => `${i.name} x${i.qty}`).join(', ');

function layout(title, bodyHtml, cta) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#131A17;line-height:1.5">
  <div style="padding:20px 0;border-bottom:2px solid #146B4F"><img src="${SITE}/assets/logos/akwaone-logo.png" alt="AkwaOne" height="32" style="height:32px"></div>
  <h2 style="color:#146B4F;font-size:20px;margin:24px 0 12px">${escapeHtml(title)}</h2>
  ${bodyHtml}
  ${cta ? `<p style="margin:24px 0"><a href="${SITE}/${cta.href}" style="background:#146B4F;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>` : ''}
  <p style="font-size:12px;color:#777;border-top:1px solid #eee;padding-top:12px;margin-top:28px">
    AkwaOne — boutique et marketplace de la diaspora africaine au Canada. Une marque d'AJ Cleaning.<br>
    Vous recevez ce courriel car vous avez accepté les notifications par courriel. Pour ne plus les recevoir :
    <a href="${SITE}/profil.html#notifications" style="color:#146B4F">Paramètres → Notifications</a>.
  </p></div>`;
}

async function sendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.startsWith('re_') || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'AkwaOne <aide@akwaone.ca>', to, subject, html }),
    });
    if (!r.ok) console.error('email resend error:', r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) {
    console.error('email error:', e.message);
    return false;
  }
}

// Adresse d'un membre, seulement s'il a accepté les courriels.
async function consentingEmail(userId) {
  if (!userId) return null;
  try {
    const [p] = await supabaseRest('GET', `profiles?id=eq.${userId}&select=notify_email`);
    if (!p || p.notify_email === false) return null;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return u.email || null;
  } catch (e) {
    console.error('email consent error:', e.message);
    return null;
  }
}

async function notifyUser(userId, subject, title, bodyHtml, cta) {
  const to = await consentingEmail(userId);
  if (!to) return false;
  return sendEmail(to, subject, layout(title, bodyHtml, cta));
}

// ----- Événements du cahier des charges (3.10) -----
function orderBlock(o) {
  return `<p style="background:#F6F1E7;border-radius:12px;padding:12px 16px">
    <b>Commande #${o.order_number}</b> — ${escapeHtml(o.seller_name || 'AkwaOne')}<br>
    ${escapeHtml(itemsText(o.items))}<br>
    ${o.slot ? `<b>Créneau :</b> ${escapeHtml(o.slot)}<br>` : ''}
    <b>Total :</b> ${money(o.amount_cad)}${o.payment_method ? ` • ${escapeHtml(o.payment_method)}` : ''}
  </p>`;
}

async function orderConfirmed(o) {
  const boutique = o.channel === 'boutique';
  await notifyUser(o.buyer_id, `Commande #${o.order_number} confirmée — reçu AkwaOne`, 'Merci, votre commande est confirmée',
    `<p>Votre paiement a bien été reçu. Voici votre reçu :</p>${orderBlock(o)}
     ${boutique
      ? '<p>Votre commande est préparée et expédiée par l\'équipe AkwaOne. Vous serez prévenu à la livraison.</p>'
      : `<p>Votre paiement est conservé en sécurité jusqu'à la réception. Votre <b>code de réception</b> est affiché dans « Mes commandes » : donnez-le au vendeur uniquement quand tout est conforme.</p>`}`,
    { href: 'mes-commandes.html', label: 'Voir ma commande' });
  if (!boutique && o.seller_id) {
    await notifyUser(o.seller_id, `Nouvelle commande #${o.order_number} à traiter`, 'Vous avez reçu une nouvelle commande',
      `${orderBlock(o)}${o.details ? `<p><b>Précisions du client :</b> ${escapeHtml(o.details)}</p>` : ''}
       <p>Le paiement est conservé par AkwaOne. À la livraison, demandez au client son code de réception et saisissez-le dans votre tableau de bord pour recevoir le paiement.</p>`,
      { href: 'tableau-de-bord.html', label: 'Ouvrir mon tableau de bord' });
  }
}

async function orderCancelled(o) {
  await notifyUser(o.buyer_id, `Commande #${o.order_number} annulée`, 'Votre commande est annulée',
    `${orderBlock(o)}<p>Le remboursement de <b>${money(o.amount_cad)}</b> est émis sur votre moyen de paiement d'origine (sous 5 jours ouvrables).</p>`,
    { href: 'mes-commandes.html', label: 'Mes commandes' });
  if (o.seller_id && o.channel !== 'boutique') {
    await notifyUser(o.seller_id, `Commande #${o.order_number} annulée par le client`, 'Une commande a été annulée',
      `${orderBlock(o)}<p>Le client a annulé cette commande et a été remboursé. Vous n'avez rien à expédier.</p>`,
      { href: 'tableau-de-bord.html', label: 'Mon tableau de bord' });
  }
}

async function bookingReminder(o) {
  return notifyUser(o.buyer_id, `Rappel : votre rendez-vous ${o.slot ? `du ${o.slot}` : ''} avec ${o.seller_name}`, 'Votre rendez-vous approche',
    `${orderBlock(o)}<p>Annulation gratuite jusqu'à 24 h avant le créneau, depuis « Mes commandes ». Une question ? Écrivez au vendeur dans la messagerie.</p>`,
    { href: 'mes-commandes.html', label: 'Voir ma réservation' });
}

async function disputeOpened(o) {
  if (!o.seller_id) return;
  await notifyUser(o.seller_id, `Litige ouvert sur la commande #${o.order_number}`, 'Un client a ouvert un litige',
    `${orderBlock(o)}<p>Le paiement reste bloqué jusqu'à la décision de l'équipe AkwaOne. Donnez votre version et vos preuves (date d'envoi, suivi, échanges) depuis votre tableau de bord.</p>`,
    { href: 'tableau-de-bord.html', label: 'Répondre au litige' });
}

async function disputeDecided(o, decision) {
  const buyerWins = decision === 'buyer';
  await notifyUser(o.buyer_id, `Décision sur votre litige — commande #${o.order_number}`, 'Votre litige a été tranché',
    `${orderBlock(o)}<p>${buyerWins
      ? `Après examen des preuves, l'équipe AkwaOne a tranché en votre faveur : <b>${money(o.amount_cad)}</b> vous sont remboursés (sous 5 jours ouvrables).`
      : 'Après examen des preuves des deux parties, l\'équipe AkwaOne a tranché en faveur du vendeur : le paiement lui est versé.'}</p>`,
    { href: 'mes-commandes.html', label: 'Mes commandes' });
  if (o.seller_id) {
    await notifyUser(o.seller_id, `Décision sur le litige — commande #${o.order_number}`, 'Le litige a été tranché',
      `${orderBlock(o)}<p>${buyerWins
        ? 'Après examen des preuves, l\'équipe AkwaOne a tranché en faveur du client, qui est remboursé.'
        : 'Après examen des preuves, l\'équipe AkwaOne a tranché en votre faveur : le paiement vous est versé.'}</p>`,
      { href: 'tableau-de-bord.html', label: 'Mon tableau de bord' });
  }
}

async function orderDelivered(o) {
  await notifyUser(o.buyer_id, `Commande #${o.order_number} livrée`, 'Votre commande est livrée',
    `${orderBlock(o)}<p>Merci pour votre achat ! Vous pouvez maintenant laisser un avis depuis « Mes commandes ».</p>`,
    { href: 'mes-commandes.html', label: 'Laisser un avis' });
}

async function newMessage(recipientId, senderName, preview) {
  return notifyUser(recipientId, `Nouveau message de ${senderName} sur AkwaOne`, 'Vous avez un nouveau message',
    `<p><b>${escapeHtml(senderName)}</b> vous a écrit :</p>
     <p style="background:#F6F1E7;border-radius:12px;padding:12px 16px">${escapeHtml(String(preview || '').slice(0, 300))}</p>`,
    { href: 'messagerie.html', label: 'Répondre' });
}

module.exports = {
  escapeHtml, sendEmail, layout, notifyUser,
  orderConfirmed, orderCancelled, bookingReminder, disputeOpened, disputeDecided, orderDelivered, newMessage,
};
