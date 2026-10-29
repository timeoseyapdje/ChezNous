// Pages réservées aux utilisateurs connectés : sans session, on les masque de la navigation
// et un accès direct renvoie vers la connexion, qui ramène ensuite à la page demandée.
const PRIVATE_PAGES = ['mes-commandes.html','messagerie.html','tableau-de-bord.html'];
function isLoggedIn(){
  try{ return localStorage.getItem('cheznous_logged_in')==='1'; }catch(e){ return false; }
}
(function guardPrivatePages(){
  const page = location.pathname.split('/').pop() || 'index.html';
  if(PRIVATE_PAGES.includes(page) && !isLoggedIn()){
    location.replace('connexion.html?retour=' + encodeURIComponent(page + location.search));
    return;
  }
  const style = document.createElement('style');
  // Malik reste caché tant que le bandeau cookies ou une fenêtre est ouvert, sinon il les recouvre sur mobile.
  const overlays = ['#cookieBanner','#cartModal','#stripeModal','#bookingModal','#profileModal','#orderModal','#notifMenu','#deliverMenu'];
  style.textContent = overlays.map(o=>`body:has(${o}:not(.hidden)) #chatLauncher, body:has(${o}:not(.hidden)) #chatPanel`).join(',') + '{display:none !important}';
  // Menus déroulants de l'en-tête partagé (notifications, ville) : défini ici pour que toutes les pages l'aient.
  style.textContent += '.dropdown-panel{position:absolute;top:calc(100% + 8px);right:0;width:280px;max-width:calc(100vw - 32px);background:#fff;border-radius:16px;box-shadow:0 20px 40px -12px rgba(0,0,0,.35);padding:8px;z-index:50}';
  if(!isLoggedIn()){
    const nav = PRIVATE_PAGES.map(p=>`header a[href^="${p}"], #mobileMenu a[href^="${p}"], footer a[href^="${p}"]`).join(',');
    style.textContent += `${nav}, header div:has(> #roleSelect){display:none !important}`;
  }
  document.head.appendChild(style);
})();

function getCategoryVendorCount(catId){
  return new Set(CATALOG.filter(p=>p.cat===catId).map(p=>p.seller)).size;
}
function getTopListings(n){
  return [...CATALOG].sort((a,b)=> (b.rating*Math.log(b.reviews+1)) - (a.rating*Math.log(a.reviews+1))).slice(0,n);
}
function getSponsoredListings(){
  return CATALOG.filter(p=>p.plan==='premium');
}

const CUR = {
  CAD: { rate: 1, label: 'CAD — Dollar canadien', fmt: v => `${v.toFixed(2)} $` },
  USD: { rate: 0.73, label: 'USD — Dollar américain', fmt: v => `${v.toFixed(2)} $US` },
  EUR: { rate: 0.68, label: 'EUR — Euro', fmt: v => `${v.toFixed(2)} €` },
  XOF: { rate: 446, label: 'XOF — Franc CFA (Afrique de l\'Ouest)', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FCFA` },
  XAF: { rate: 446, label: 'XAF — Franc CFA (Afrique centrale)', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FCFA` },
  NGN: { rate: 1120, label: 'NGN — Naira nigérian', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} ₦` },
  GHS: { rate: 10.9, label: 'GHS — Cedi ghanéen', fmt: v => `${v.toFixed(2)} GH₵` },
  ZAR: { rate: 13.4, label: 'ZAR — Rand sud-africain', fmt: v => `${v.toFixed(2)} R` },
  EGP: { rate: 36, label: 'EGP — Livre égyptienne', fmt: v => `${v.toFixed(2)} EGP` },
  MAD: { rate: 7.3, label: 'MAD — Dirham marocain', fmt: v => `${v.toFixed(2)} DH` },
  DZD: { rate: 98, label: 'DZD — Dinar algérien', fmt: v => `${v.toFixed(2)} DA` },
  TND: { rate: 2.3, label: 'TND — Dinar tunisien', fmt: v => `${v.toFixed(3)} DT` },
  LYD: { rate: 3.6, label: 'LYD — Dinar libyen', fmt: v => `${v.toFixed(3)} LD` },
  KES: { rate: 94, label: 'KES — Shilling kényan', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} KSh` },
  TZS: { rate: 1900, label: 'TZS — Shilling tanzanien', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} TSh` },
  UGX: { rate: 2700, label: 'UGX — Shilling ougandais', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} USh` },
  RWF: { rate: 990, label: 'RWF — Franc rwandais', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FRw` },
  BIF: { rate: 2130, label: 'BIF — Franc burundais', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FBu` },
  ETB: { rate: 88, label: 'ETB — Birr éthiopien', fmt: v => `${v.toFixed(2)} Br` },
  SOS: { rate: 415, label: 'SOS — Shilling somalien', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} Sh.So.` },
  DJF: { rate: 103, label: 'DJF — Franc djiboutien', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} Fdj` },
  SDG: { rate: 440, label: 'SDG — Livre soudanaise', fmt: v => `${v.toFixed(2)} SDG` },
  SSP: { rate: 950, label: 'SSP — Livre sud-soudanaise', fmt: v => `${v.toFixed(2)} SSP` },
  ERN: { rate: 11, label: 'ERN — Nakfa érythréen', fmt: v => `${v.toFixed(2)} Nfk` },
  GMD: { rate: 51, label: 'GMD — Dalasi gambien', fmt: v => `${v.toFixed(2)} D` },
  GNF: { rate: 6300, label: 'GNF — Franc guinéen', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} FG` },
  SLE: { rate: 16.5, label: 'SLE — Leone sierra-léonais', fmt: v => `${v.toFixed(2)} Le` },
  LRD: { rate: 137, label: 'LRD — Dollar libérien', fmt: v => `${v.toFixed(2)} L$` },
  CVE: { rate: 74, label: 'CVE — Escudo cap-verdien', fmt: v => `${v.toFixed(2)} $` },
  STN: { rate: 16.8, label: 'STN — Dobra santoméen', fmt: v => `${v.toFixed(2)} Db` },
  AOA: { rate: 660, label: 'AOA — Kwanza angolais', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} Kz` },
  MZN: { rate: 47, label: 'MZN — Metical mozambicain', fmt: v => `${v.toFixed(2)} MT` },
  ZMW: { rate: 19, label: 'ZMW — Kwacha zambien', fmt: v => `${v.toFixed(2)} ZK` },
  MWK: { rate: 1270, label: 'MWK — Kwacha malawite', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} MK` },
  ZWL: { rate: 12, label: 'ZWL — Dollar zimbabwéen', fmt: v => `${v.toFixed(2)} Z$` },
  BWP: { rate: 10, label: 'BWP — Pula botswanais', fmt: v => `${v.toFixed(2)} P` },
  NAD: { rate: 13.4, label: 'NAD — Dollar namibien', fmt: v => `${v.toFixed(2)} N$` },
  LSL: { rate: 13.4, label: 'LSL — Loti lesothan', fmt: v => `${v.toFixed(2)} L` },
  SZL: { rate: 13.4, label: 'SZL — Lilangeni eswatinien', fmt: v => `${v.toFixed(2)} E` },
  MGA: { rate: 3200, label: 'MGA — Ariary malgache', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} Ar` },
  KMF: { rate: 340, label: 'KMF — Franc comorien', fmt: v => `${Math.round(v).toLocaleString('fr-FR')} CF` },
  SCR: { rate: 9.9, label: 'SCR — Roupie seychelloise', fmt: v => `${v.toFixed(2)} SR` },
  MUR: { rate: 34, label: 'MUR — Roupie mauricienne', fmt: v => `${v.toFixed(2)} Rs` },
  MRU: { rate: 29, label: 'MRU — Ouguiya mauritanien', fmt: v => `${v.toFixed(2)} UM` }
};

function getCurrency(){
  try{ return localStorage.getItem('cheznous_currency') || 'CAD'; }catch(e){ return 'CAD'; }
}
function setCurrency(c){
  try{ localStorage.setItem('cheznous_currency', c); }catch(e){}
  window.currency = c;
  if(typeof onCurrencyChange === 'function') onCurrencyChange();
}
function fmt(amountCad){
  const c = CUR[window.currency] || CUR.CAD;
  return c.fmt(amountCad * c.rate);
}
function renderCurrencyOptions(){
  const sel = document.getElementById('currencySelect');
  if(!sel) return;
  const groups = {
    'Amérique du Nord / Europe': ['CAD','USD','EUR'],
    'Afrique': Object.keys(CUR).filter(k=>!['CAD','USD','EUR'].includes(k))
  };
  sel.innerHTML = Object.entries(groups).map(([label, codes])=>`
    <optgroup label="${label}">
      ${codes.map(code=>`<option value="${code}" class="text-ink">${CUR[code].label}</option>`).join('')}
    </optgroup>
  `).join('');
  sel.value = window.currency;
}

const LANGS = { fr: 'Français', en: 'English' };
function getLangPersisted(){
  try{ return localStorage.getItem('cheznous_lang') || 'fr'; }catch(e){ return 'fr'; }
}
function persistLang(l){
  try{ localStorage.setItem('cheznous_lang', l); }catch(e){}
}
// Moteur de traduction commun à toutes les pages : chaque nœud texte et attribut visible
// est traduit via I18N_EN, y compris le contenu injecté après coup (observer).
const I18N_ATTRS = ['placeholder','title','aria-label','alt'];
const I18N_PATTERNS = [
  [/^1 résultat$/, '1 result'],
  [/^(\d+) résultats?$/, '$1 results'],
  [/^(\d+) avis vérifiés$/, '$1 verified reviews'],
  [/^(\d+) avis$/, '$1 reviews'],
  [/^(\d+) vendeurs?$/, '$1 sellers'],
  [/^(\d+) article\(s\)$/, '$1 item(s)'],
  [/^Panier — (\d+) article\(s\)$/, 'Cart — $1 item(s)'],
  [/^Plusieurs vendeurs — Panier — (\d+) article\(s\)$/, 'Several sellers — Cart — $1 item(s)'],
  [/^Payer (.+)$/, 'Pay $1'],
  [/^Écrivez votre premier message à (.+)\.$/, 'Write your first message to $1.'],
  [/^Vous : (.+)$/, 'You: $1'],
  [/^Bonjour, (.+)$/, 'Hello, $1'],
  [/^(.+) • (.+) • à partir de (.+)$/, '$1 • $2 • from $3'],
  [/^(.+) — (.+)$/, '$1 — $2'],
  [/^(.+) • Acheteuse? vérifiée?$/, '$1 • Verified buyer'],
];
const i18nTextOriginals = new WeakMap();
const i18nAttrOriginals = new WeakMap();
let i18nObserver = null;

function translateFr(fr){
  const key = fr.replace(/\s+/g,' ').trim();
  if(!key) return null;
  if(typeof I18N_EN !== 'undefined' && I18N_EN[key]) return I18N_EN[key];
  for(const [re, rep] of I18N_PATTERNS){
    const m = key.match(re);
    // Les parties capturées (noms de catégories, etc.) sont elles-mêmes traduites si possible.
    if(m) return rep.replace(/\$(\d)/g, (_, i)=> translateFr(m[i]) || m[i]);
  }
  return null;
}
function i18nTranslateTextNode(node, lang){
  if(!i18nTextOriginals.has(node)) i18nTextOriginals.set(node, node.nodeValue);
  const original = i18nTextOriginals.get(node);
  let next = original;
  if(lang==='en'){
    const en = translateFr(original);
    if(en){
      const lead = original.match(/^\s*/)[0], trail = original.match(/\s*$/)[0];
      next = lead + en + trail;
    }
  }
  if(node.nodeValue !== next) node.nodeValue = next;
}
function i18nTranslateElementAttrs(el, lang){
  for(const attr of I18N_ATTRS){
    if(!el.hasAttribute(attr)) continue;
    let originals = i18nAttrOriginals.get(el);
    if(!originals){ originals = {}; i18nAttrOriginals.set(el, originals); }
    if(!(attr in originals)) originals[attr] = el.getAttribute(attr);
    const value = lang==='en' ? (translateFr(originals[attr]) || originals[attr]) : originals[attr];
    if(el.getAttribute(attr) !== value) el.setAttribute(attr, value);
  }
}
function i18nTranslateTree(root, lang){
  if(root.nodeType === 3){ i18nTranslateTextNode(root, lang); return; }
  if(root.nodeType !== 1) return;
  if(root.closest && root.closest('script,style,textarea,[translate="no"]')) return;
  i18nTranslateElementAttrs(root, lang);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n){
      if(n.nodeType===1) return /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.tagName) || n.getAttribute('translate')==='no' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n;
  while((n = walker.nextNode())){
    if(n.nodeType===3) i18nTranslateTextNode(n, lang);
    else i18nTranslateElementAttrs(n, lang);
  }
}
function applyI18n(lang){
  document.documentElement.lang = lang;
  if(!document.body) return;
  if(!window.__i18nTitleFr) window.__i18nTitleFr = document.title;
  document.title = lang==='en' ? (translateFr(window.__i18nTitleFr) || window.__i18nTitleFr) : window.__i18nTitleFr;
  if(i18nObserver) i18nObserver.disconnect();
  i18nTranslateTree(document.body, lang);
  i18nObserver = new MutationObserver(mutations=>{
    const current = getLangPersisted();
    for(const m of mutations) m.addedNodes.forEach(node=>i18nTranslateTree(node, current));
  });
  i18nObserver.observe(document.body, {childList:true, subtree:true});
  const sel = document.getElementById('langSelect');
  if(sel) sel.value = lang;
}
// Version par défaut ; l'accueil et la marketplace la redéfinissent pour leurs propres rendus.
function setLang(l){
  persistLang(l);
  applyI18n(l);
}
document.addEventListener('DOMContentLoaded', ()=>applyI18n(getLangPersisted()));

function renderLangOptions(){
  const sel = document.getElementById('langSelect');
  if(!sel) return;
  sel.innerHTML = Object.entries(LANGS).map(([code,label])=>`<option value="${code}" class="text-ink">${label}</option>`).join('');
  sel.value = getLangPersisted();
}

function getCart(){
  try{ return JSON.parse(localStorage.getItem('cheznous_cart') || '[]'); }catch(e){ return []; }
}
function setCart(cart){
  try{ localStorage.setItem('cheznous_cart', JSON.stringify(cart)); }catch(e){}
}
function cartCount(cart){
  return cart.reduce((s,c)=>s+c.qty, 0);
}

// Cache des commandes de la personne connectée, rempli depuis Supabase par « Mes commandes » et le retour de paiement.
function getOrders(){
  try{
    const raw = localStorage.getItem('cheznous_orders');
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return [];
}
function setOrders(orders){
  try{ localStorage.setItem('cheznous_orders', JSON.stringify(orders)); }catch(e){}
}
function generateReleaseCode(){
  return Math.random().toString(36).slice(2,8).toUpperCase();
}
function getDisputes(){
  try{ return JSON.parse(localStorage.getItem('cheznous_disputes') || '[]'); }catch(e){ return []; }
}
function setDisputes(list){
  try{ localStorage.setItem('cheznous_disputes', JSON.stringify(list)); }catch(e){}
}
function openDispute(orderId, buyerProof){
  const disputes = getDisputes();
  disputes.unshift({id:Date.now(), orderId, buyerProof, sellerProof:'', status:'ouvert', date:new Date().toLocaleDateString('fr-CA')});
  setDisputes(disputes);
  const orders = getOrders().map(o=> o.id===orderId ? {...o, escrowStatus:'litige'} : o);
  setOrders(orders);
}
function releaseEscrow(orderId, codeEntered){
  const orders = getOrders();
  const order = orders.find(o=>o.id===orderId);
  if(!order || order.releaseCode !== codeEntered.trim().toUpperCase()) return false;
  const updated = orders.map(o=> o.id===orderId ? {...o, escrowStatus:'libéré', status:'terminée'} : o);
  setOrders(updated);
  return true;
}

function normalizeText(str){
  return String(str).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}
const PROHIBITED_WORDS = ['merde','putain','connard','connasse','conasse','salope','pute','batard','negre','negresse'];
const PROHIBITED_PREFIXES = ['encul'];
const PROHIBITED_PHRASES = ['sale noir','sale arabe'];
// Comparaison mot par mot : « dispute » ou « computer » ne contiennent pas un mot interdit,
// mais des lettres isolées sont recollées pour attraper « m e r d e ».
function containsProhibited(text){
  const words = normalizeText(text).replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
  const merged = [];
  let run = '';
  for(const w of words){
    if(w.length===1){ run += w; continue; }
    if(run){ merged.push(run); run = ''; }
    merged.push(w);
  }
  if(run) merged.push(run);
  const isBad = w => [w, w.replace(/s$/,'')].some(v => PROHIBITED_WORDS.includes(v) || PROHIBITED_PREFIXES.some(p=>v.startsWith(p)));
  const sentence = ' ' + merged.join(' ') + ' ';
  return merged.some(isBad) || PROHIBITED_PHRASES.some(p=>sentence.includes(' '+p+' '));
}

function safeUrl(url){
  return /^(https?:\/\/|assets\/)/i.test(String(url||'')) ? String(url) : '';
}
function getSellerListings(){
  try{ return JSON.parse(localStorage.getItem('cheznous_seller_catalog') || '[]'); }catch(e){ return []; }
}
// Les annonces publiées depuis le tableau de bord vendeur s'ajoutent au catalogue de démo.
function getAllListings(){
  const ids = new Set(CATALOG.map(p=>p.id));
  const fromSellers = getSellerListings().filter(p=>p && !ids.has(p.id)).map(p=>({
    tags:[], desc:'', rating:5, reviews:0, plan:'basique', ...p,
    cover: safeUrl(p.cover) || 'https://images.unsplash.com/photo-1506617420156-8e4536971650?q=80&w=800&auto=format&fit=crop',
    image: safeUrl(p.image) || 'https://i.pravatar.cc/100?img=48'
  }));
  return [...CATALOG, ...fromSellers];
}
function orderTotal(o){
  return typeof o.total==='number' ? o.total : o.price;
}

const CITIES = ['Toronto','Montréal','Vancouver','Calgary','Ottawa','Québec','Winnipeg','Edmonton'];

function getDeliverCity(){
  try{ return localStorage.getItem('cheznous_city') || 'Toronto'; }catch(e){ return 'Toronto'; }
}
function setDeliverCity(city){
  try{ localStorage.setItem('cheznous_city', city); }catch(e){}
  const label = document.getElementById('deliverCityLabel');
  if(label) label.textContent = city;
  const menu = document.getElementById('deliverMenu');
  if(menu) menu.classList.add('hidden');
  const cityFilter = document.getElementById('filterCity');
  if(cityFilter && typeof filterMarket==='function'){ cityFilter.value = city; filterMarket(); }
}
function hasChosenDeliverCity(){
  try{ return !!localStorage.getItem('cheznous_city'); }catch(e){ return false; }
}
function toggleDeliverMenu(){
  const menu = document.getElementById('deliverMenu');
  if(!menu) return;
  if(menu.classList.contains('hidden')){
    menu.innerHTML = CITIES.map(c=>`<button onclick="setDeliverCity('${c}')" class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand text-ink text-sm">${c}</button>`).join('');
  }
  menu.classList.toggle('hidden');
}

// Notifications calculées à partir des commandes et des messages non lus de la personne connectée.
function getNotifications(){
  if(!isLoggedIn()) return [];
  const list = [];
  getOrders().slice(0,5).forEach(o=>{
    const total = fmt(orderTotal(o));
    if(o.status==='annulée') list.push({id:`o${o.id}-annulee`, icon:'rotate-ccw', text:`Commande annulée chez ${o.seller} — remboursement de ${total} en cours`, time:o.date});
    else if(o.escrowStatus==='litige') list.push({id:`o${o.id}-litige`, icon:'alert-triangle', text:`Litige ouvert sur votre commande chez ${o.seller}`, time:o.date});
    else if(o.status==='terminée' && !o.review) list.push({id:`o${o.id}-avis`, icon:'star', text:`Laissez un avis pour ${o.seller}`, time:o.date});
    else if(o.status==='confirmée') list.push({id:`o${o.id}-confirmee`, icon:'check-circle', text:`Commande confirmée chez ${o.seller} (${total})`, time:o.date});
    else if(o.status==='en attente') list.push({id:`o${o.id}-attente`, icon:'clock', text:`Commande en attente chez ${o.seller}`, time:o.date});
  });
  try{
    const convs = JSON.parse(localStorage.getItem('cheznous_messages_v1') || '[]');
    convs.filter(c=>c.unread).forEach(c=>{
      const last = c.messages[c.messages.length-1];
      list.push({id:`m${c.id}-${c.messages.length}`, icon:'message-circle', text:`Nouveau message de ${c.name}`, time:last ? last.time : '', href:`messagerie.html?avec=${encodeURIComponent(c.id)}`});
    });
  }catch(e){}
  return list;
}
function getReadNotifs(){
  try{ return JSON.parse(localStorage.getItem('cheznous_read_notifs') || '[]'); }catch(e){ return []; }
}
function setReadNotifs(ids){
  try{ localStorage.setItem('cheznous_read_notifs', JSON.stringify(ids)); }catch(e){}
}
function unreadNotifCount(){
  const read = getReadNotifs();
  return getNotifications().filter(n=>!read.includes(n.id)).length;
}
function refreshNotifBadge(){
  const badge = document.getElementById('notifBadge');
  if(!badge) return;
  const count = unreadNotifCount();
  badge.textContent = count;
  badge.classList.toggle('hidden', count===0);
}
function toggleNotifMenu(){
  const menu = document.getElementById('notifMenu');
  if(!menu) return;
  const opening = menu.classList.contains('hidden');
  if(opening){
    const read = getReadNotifs();
    const notifs = getNotifications();
    menu.innerHTML = notifs.length ? notifs.map(n=>`
      <a href="${n.href || 'mes-commandes.html'}" class="flex gap-3 px-3 py-2.5 rounded-lg hover:bg-sand ${read.includes(n.id)?'opacity-50':''}">
        <i data-lucide="${n.icon}" class="w-4 h-4 text-forest shrink-0 mt-0.5"></i>
        <div>
          <div class="text-sm text-ink">${escapeHtmlGlobal(n.text)}</div>
          <div class="text-[11px] opacity-50 text-ink">${escapeHtmlGlobal(n.time)}</div>
        </div>
      </a>
    `).join('') : `<div class="px-3 py-4 text-sm text-ink opacity-60 text-center">Aucune notification</div>`;
    // Seulement les icônes du menu : redessiner toute la page remplacerait l'icône de la cloche qu'on vient de cliquer.
    if(typeof lucide !== 'undefined') lucide.createIcons({root:menu});
    setReadNotifs(notifs.map(n=>n.id));
    refreshNotifBadge();
  }
  menu.classList.toggle('hidden');
}

document.addEventListener('keydown', function(e){
  if(e.key==='Enter' && e.target && e.target.id==='chatInput') sendChat();
});
// composedPath() garde le chemin du clic même si l'élément cliqué a été remplacé entre-temps (icônes redessinées).
document.addEventListener('click', function(e){
  const path = e.composedPath();
  const deliverMenu = document.getElementById('deliverMenu');
  const deliverBtn = document.getElementById('deliverBtn');
  if(deliverMenu && !deliverMenu.classList.contains('hidden') && !path.includes(deliverMenu) && !path.includes(deliverBtn)){
    deliverMenu.classList.add('hidden');
  }
  const notifMenu = document.getElementById('notifMenu');
  const notifBtn = document.getElementById('notifBtn');
  if(notifMenu && !notifMenu.classList.contains('hidden') && !path.includes(notifMenu) && !path.includes(notifBtn)){
    notifMenu.classList.add('hidden');
  }
});

function ensureCartModal(){
  if(document.getElementById('cartModal')) return;
  const div = document.createElement('div');
  div.innerHTML = `
    <div id="cartModal" class="fixed inset-0 z-[90] hidden">
      <div class="absolute inset-0 bg-ink/50" onclick="closeCart()"></div>
      <div class="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-white flex flex-col">
        <div class="p-5 border-b border-line flex items-center justify-between">
          <h3 class="font-display text-xl font-bold">Panier</h3>
          <button onclick="closeCart()" class="w-8 h-8 rounded-full bg-sand flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
        <div id="cartItems" class="flex-1 overflow-auto p-5 space-y-4"></div>
        <div class="p-5 border-t border-line space-y-3">
          <div class="flex justify-between text-sm"><span class="opacity-60">Sous-total</span><span id="cartSubtotal" class="font-semibold">0.00 $</span></div>
          <button onclick="window.location.href='marketplace.html?checkout=1'" class="w-full bg-coral hover:brightness-95 text-white rounded-full py-3 font-bold">Passer à la caisse</button>
          <p class="text-center text-[11px] opacity-50">Livraison estimée 3 à 5 jours ouvrables</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div.firstElementChild);
}
function renderCartGeneric(){
  const cart = getCart();
  const box = document.getElementById('cartItems');
  if(!box) return;
  if(cart.length===0){
    box.innerHTML = `<div class="text-center py-10 opacity-50 text-sm">Votre panier est vide.</div>`;
  } else {
    const listings = getAllListings();
    box.innerHTML = cart.map(c=>{
      const p = listings.find(x=>x.id===c.id);
      if(!p) return '';
      return `
      <div class="flex gap-3 items-center">
        <img src="${escapeHtmlGlobal(p.cover)}" loading="lazy" class="w-16 h-16 rounded-lg object-cover shrink-0">
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm truncate">${escapeHtmlGlobal(p.name)}</div>
          <div class="text-xs opacity-60">${fmt(p.price)} x ${c.qty}</div>
        </div>
      </div>`;
    }).join('');
  }
  const all = getAllListings();
  const subtotal = cart.reduce((s,c)=>{ const p = all.find(x=>x.id===c.id); return s + (p?p.price*c.qty:0); }, 0);
  const sub = document.getElementById('cartSubtotal');
  if(sub) sub.textContent = fmt(subtotal);
  if(typeof lucide !== 'undefined') lucide.createIcons();
}
if(typeof window.refreshCartBadge === 'undefined'){
  window.refreshCartBadge = function(){
    const el = document.getElementById('cartCount');
    if(el) el.textContent = cartCount(getCart());
  };
}
if(typeof window.openCart === 'undefined'){
  window.openCart = function(){
    ensureCartModal();
    renderCartGeneric();
    document.getElementById('cartModal').classList.remove('hidden');
  };
  window.closeCart = function(){
    const m = document.getElementById('cartModal');
    if(m) m.classList.add('hidden');
  };
}

const CATEGORIES = [
  {id:'epicerie', label:'Épicerie africaine', icon:'shopping-basket'},
  {id:'mode', label:'Mode & tissus', icon:'shirt'},
  {id:'beaute', label:'Beauté & cheveux afro', icon:'sparkles'},
  {id:'artisanat', label:'Artisanat & décoration', icon:'palette'},
  {id:'cuisine', label:'Cuisine maison & traiteur', icon:'utensils'},
  {id:'services', label:'Services communautaires', icon:'users'}
];

function renderSiteHeader(active){
  const navLink = (href, label, key)=> `<a href="${href}" class="shrink-0 hover:opacity-80 font-medium whitespace-nowrap ${active===key?'opacity-100 underline underline-offset-4':''}">${label}</a>`;
  return `
  <header class="bg-ink text-white">
    <div class="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
      <a href="index.html" class="flex items-center gap-2 shrink-0">
        <div class="w-9 h-9 rounded-lg bg-white text-ink flex items-center justify-center font-display font-black">C</div>
        <div class="leading-none">
          <div class="font-display font-bold text-lg">chez nous</div>
          <div class="text-[9px] opacity-60 tracking-wider">DIASPORA AFRICAINE • CANADA</div>
        </div>
      </a>
      <div class="relative shrink-0">
        <button id="deliverBtn" onclick="toggleDeliverMenu()" class="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-white/10">
          <i data-lucide="map-pin" class="w-4 h-4"></i>
          <div class="text-left leading-tight">
            <div class="text-[10px]">Livrer à</div>
            <div class="font-semibold" id="deliverCityLabel">Toronto</div>
          </div>
        </button>
        <div id="deliverMenu" class="dropdown-panel hidden"></div>
      </div>
      <div class="flex-1 min-w-[220px] flex bg-white rounded-md overflow-hidden">
        <select id="heroCategory" class="hidden sm:block bg-sand text-ink text-xs px-2 border-r border-line outline-none max-w-[160px]">
          <option value="">Toutes catégories</option>
          ${CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}
        </select>
        <input id="heroSearch" onkeydown="if(event.key==='Enter')goToMarketplaceGlobal()" placeholder="Rechercher un produit, un plat, un service..." class="flex-1 px-3 py-2 text-sm text-ink outline-none min-w-0">
        <button onclick="goToMarketplaceGlobal()" class="bg-forest hover:brightness-110 text-white px-4 flex items-center justify-center shrink-0">
          <i data-lucide="search" class="w-4 h-4"></i>
        </button>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 text-xs min-w-0 ml-auto" style="max-width:100%">
        <select id="currencySelect" onchange="setCurrency(this.value)" class="bg-transparent text-xs font-medium outline-none cursor-pointer max-w-[120px]"></select>
        <select id="langSelect" onchange="setLang(this.value)" class="bg-transparent text-xs font-medium outline-none cursor-pointer"></select>
        <button id="accountBtn" class="text-left leading-tight hover:opacity-80"></button>
        <div class="relative">
          <button id="notifBtn" onclick="toggleNotifMenu()" class="relative hover:opacity-80">
            <i data-lucide="bell" class="w-5 h-5"></i>
            <span id="notifBadge" class="absolute -top-1 -right-1 bg-coral text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center hidden">0</span>
          </button>
          <div id="notifMenu" class="dropdown-panel hidden"></div>
        </div>
        <button id="cartLauncher" onclick="openCart()" class="relative flex items-center hover:opacity-80">
          <i data-lucide="shopping-cart" class="w-6 h-6"></i>
          <span id="cartCount" class="absolute -top-2 -right-2 bg-forest text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">0</span>
        </button>
      </div>
    </div>
    <div class="border-t border-white/10 bg-forestDark">
      <div class="max-w-[1400px] mx-auto px-4 md:px-6 h-11 flex items-center gap-5 overflow-x-auto no-scrollbar text-sm">
        ${navLink('index.html','Accueil','accueil')}
        ${navLink('marketplace.html','Marketplace','marketplace')}
        ${navLink('mes-commandes.html','Mes commandes','commandes')}
        ${navLink('messagerie.html','Messagerie','messagerie')}
        <div id="navDashboardLink" style="display:contents"></div>
        ${navLink('contact.html','Contact','contact')}
        <div class="hidden md:flex items-center gap-2 ml-auto shrink-0">
          <span class="text-[10px] font-semibold opacity-60">RÔLE</span>
          <select id="roleSelect" onchange="changeRoleGlobal(this.value)" class="bg-transparent text-xs font-medium outline-none cursor-pointer">
            <option value="buyer" class="text-ink">Acheteur</option>
            <option value="seller" class="text-ink">Vendeur</option>
            <option value="admin" class="text-ink">Administrateur</option>
          </select>
        </div>
        ${navLink('devenir-vendeur.html','Vendre sur Chez Nous','vendre')}
      </div>
    </div>
  </header>`;
}

function goToMarketplaceGlobal(){
  const el = document.getElementById('heroSearch');
  const catEl = document.getElementById('heroCategory');
  const params = new URLSearchParams();
  if(el && el.value) params.set('q', el.value);
  if(catEl && catEl.value) params.set('categorie', catEl.value);
  window.location.href = 'marketplace.html' + (params.toString() ? '?'+params.toString() : '');
}

function getCurrentUser(){
  try{
    const u = JSON.parse(localStorage.getItem('cheznous_user'));
    if(u && u.email) return u;
  }catch(e){}
  return null;
}
function saveCurrentUser(user){
  try{ localStorage.setItem('cheznous_user', JSON.stringify(user)); }catch(e){}
}
// Pour une connexion sans nom saisi : « awa.diallo@mail.ca » devient « Awa Diallo ».
function nameFromEmail(email){
  return email.split('@')[0].split(/[._-]+/).filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join(' ') || email;
}
function userFirstName(user){
  return user ? user.name.split(/\s+/)[0] : '';
}
function userInitials(user){
  return user ? user.name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') : '';
}
function escapeHtmlGlobal(str){
  return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function updateAccountButtonGlobal(){
  const btn = document.getElementById('accountBtn');
  if(!btn) return;
  let loggedIn = false;
  try{ loggedIn = localStorage.getItem('cheznous_logged_in')==='1'; }catch(e){}
  if(loggedIn){
    btn.onclick = ()=>{ window.location.href='mes-commandes.html'; };
    const first = userFirstName(getCurrentUser());
    btn.innerHTML = `<div class="text-[10px]">${first ? 'Bonjour, ' + escapeHtmlGlobal(first) : 'Bonjour'}</div><div class="font-semibold">Comptes & Commandes</div>`;
  } else {
    btn.onclick = ()=>{ window.location.href='connexion.html'; };
    btn.innerHTML = `<div class="font-semibold">Se connecter</div>`;
  }
}

function changeRoleGlobal(role){
  if(!isRoleAllowed(role)) role = 'buyer';
  persistRole(role);
  if(role==='admin' || role==='seller'){
    window.location.href = 'tableau-de-bord.html';
  } else {
    window.location.href = 'index.html';
  }
}

function initSiteHeader(active){
  renderCurrencyOptions();
  renderLangOptions();
  refreshNotifBadge();
  refreshCartBadge();
  updateAccountButtonGlobal();
  const cityLabel = document.getElementById('deliverCityLabel');
  if(cityLabel) cityLabel.textContent = getDeliverCity();
  restrictRoleSelect();
  const dashSlot = document.getElementById('navDashboardLink');
  if(dashSlot && getRolePersisted()!=='buyer'){
    dashSlot.innerHTML = `<a href="tableau-de-bord.html" class="shrink-0 hover:opacity-80 font-medium whitespace-nowrap ${active==='dashboard'?'underline underline-offset-4':''}">Tableau de bord</a>`;
  }
  if(typeof lucide !== 'undefined') lucide.createIcons();
}

const CHAT_AVATAR_URL = 'assets/malik-airpods.jpg';
const CHAT_AVATAR_GUIDE_URL = 'assets/malik-classic.jpg';

function renderChatWidget(){
  if(document.getElementById('chatLauncher')) return;
  const div = document.createElement('div');
  div.innerHTML = `
  <button id="chatLauncher" onclick="toggleChat()" class="fixed z-[65] rounded-full shadow-xl border-none p-0 overflow-hidden" style="bottom:96px;right:20px;width:60px;height:60px;background:#146B4F" title="Discuter avec Malik">
    <img src="${CHAT_AVATAR_URL}" class="w-full h-full object-cover" style="object-position:50% 12%">
  </button>
  <div id="chatPanel" class="fixed z-[70] bg-white rounded-2xl shadow-2xl flex-col overflow-hidden hidden" style="bottom:164px;right:20px;width:360px;max-width:92vw;height:500px;max-height:70vh">
    <div class="bg-forest text-white p-4 flex items-center gap-3 shrink-0">
      <img src="${CHAT_AVATAR_URL}" class="w-10 h-10 rounded-full object-cover border-2 border-white" style="object-position:50% 12%">
      <div class="flex-1">
        <div class="font-display font-bold text-sm">Malik</div>
        <div class="text-[11px] opacity-70">Assistant Chez Nous</div>
      </div>
      <button onclick="toggleChat()" class="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-2"></div>
    <div id="chatChips" class="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar shrink-0"></div>
    <div class="p-3 border-t border-line flex gap-2 shrink-0">
      <input id="chatInput" placeholder="Écrivez votre question..." class="flex-1 border border-line rounded-full px-4 py-2 text-sm outline-none">
      <button onclick="sendChat()" class="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center shrink-0"><i data-lucide="send" class="w-4 h-4"></i></button>
    </div>
  </div>`;
  while(div.firstElementChild){ document.body.appendChild(div.firstElementChild); }
  if(typeof lucide !== 'undefined') lucide.createIcons();
}

let chatStarted = false;
function toggleChat(){
  renderChatWidget();
  const panel = document.getElementById('chatPanel');
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  panel.style.display = opening ? 'flex' : 'none';
  if(opening && !chatStarted){
    chatStarted = true;
    addBotMessage("Bonjour, je suis Malik, l'assistant Chez Nous. Je peux vous guider ou répondre à vos questions sur les commandes, la vente ou la livraison.");
    renderChatChips();
  }
  if(typeof lucide !== 'undefined') lucide.createIcons();
}
function addBotMessage(html){
  const box = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'bg-sand text-ink rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[82%] leading-relaxed';
  el.innerHTML = html;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}
function addUserMessage(text){
  const box = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'bg-ink text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm max-w-[82%] ml-auto leading-relaxed';
  el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}
function renderChatChips(){
  const chips = ['Comment commander ?','Devenir vendeur','Livraison & retours','Visite guidée'];
  document.getElementById('chatChips').innerHTML = chips.map(c=>`<button class="border border-line rounded-full px-3 py-1.5 text-xs font-semibold bg-white hover:bg-sand whitespace-nowrap shrink-0" onclick="askChip(this.textContent)">${c}</button>`).join('');
}
function askChip(text){ handleUserInput(text); }
function sendChat(){
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if(!text) return;
  input.value = '';
  handleUserInput(text);
}
function handleUserInput(text){
  addUserMessage(text);
  const m = text.toLowerCase();
  if(containsProhibited(m)){
    setTimeout(()=>{ addBotMessage("Merci de rester respectueux, ce message ne peut pas être traité. Consultez notre <a href='charte-communaute.html' class='underline text-forest'>charte de la communauté</a>."); }, 300);
    return;
  }
  if(/visite guid/.test(m)){
    setTimeout(()=>{ addBotMessage("La visite guidée est disponible sur la page d'accueil. <a href='index.html' class='underline text-forest'>Retourner à l'accueil</a>"); }, 400);
    return;
  }
  setTimeout(()=>{ addBotMessage(getBotAnswer(m)); }, 400);
}
const BOT_INTENTS = [
  {key:'hello', re:/bonjour|salut|^hello|^hi\b|^hey\b|coucou/},
  {key:'sell', re:/vend(re|eur)|abonnement|commission|\bsell|seller|vendor|subscription|\bplan/},
  {key:'delivery', re:/livrai|exp[ée]di|d[ée]lai|shipping|deliver|\bship/},
  {key:'returns', re:/retour|rembours|annul|return|refund|cancel/},
  {key:'payment', re:/paiement|stripe|carte|payer|escrow|litige|payment|\bpay\b|card|dispute/},
  {key:'categories', re:/cat[ée]gor|produit|service|product/},
  {key:'order', re:/panier|commander|acheter|\border|\bbuy|\bcart|purchase/},
  {key:'account', re:/compte|connex|inscri|account|log ?in|sign ?(in|up)|register/},
  {key:'reviews', re:/avis|note|[ée]toile|review|rating|star/},
  {key:'privacy', re:/cookie|confidentialit|donn[ée]e|rgpd|lprpde|vie priv[ée]e|privacy|gdpr|\bdata\b/},
  {key:'contact', re:/contact|support|aide|humain|t[ée]l[ée]phone|\bhelp|human|phone/},
  {key:'thanks', re:/merci|thank/}
];
const BOT_ANSWERS = {
  fr:{
    hello:"Bonjour ! Comment puis-je vous aider : commander, devenir vendeur, livraison ou paiement ?",
    sell:"Pour vendre sur Chez Nous, choisissez une formule : Basique (gratuit, 15% de commission), Pro (129$/an, 10%) ou Premium (299$/an, 6%). Détails sur la page <a href='devenir-vendeur.html' class='underline text-forest'>Devenir vendeur</a>.",
    delivery:"Les délais varient selon le vendeur : 24 à 72h pour la cuisine maison, 3 à 5 jours pour les produits. Voir notre page <a href='livraison.html' class='underline text-forest'>Livraison</a>.",
    returns:"Un service peut être annulé gratuitement jusqu'à 24h avant. Pour les produits, voir notre page <a href='retours-remboursement.html' class='underline text-forest'>Retours & remboursements</a>.",
    payment:"Vos paiements sont retenus de façon sécurisée jusqu'à confirmation de réception avec votre code de livraison. En cas de litige, notre équipe tranche après examen des preuves des deux parties.",
    categories:"Six catégories sont disponibles : Épicerie africaine, Mode & tissus, Beauté & cheveux afro, Artisanat & décoration, Cuisine maison & traiteur, et Services communautaires.",
    order:"Parcourez la <a href='marketplace.html' class='underline text-forest'>boutique</a>, ajoutez un produit au panier, puis finalisez votre achat.",
    account:"Cliquez sur « Se connecter » en haut de la page pour gérer votre profil et vos commandes.",
    reviews:"Seuls les acheteurs ayant réellement payé peuvent laisser un avis, pour garantir des avis fiables.",
    privacy:"Vos données sont protégées conformément à la LPRPDE, au RGPD et au CCPA. Détails sur notre page <a href='confidentialite.html' class='underline text-forest'>Confidentialité</a>.",
    contact:"Vous pouvez contacter notre équipe via la page <a href='contact.html' class='underline text-forest'>Contact</a>, ou par courriel à aide@cheznous.ca.",
    thanks:"Avec plaisir ! N'hésitez pas si vous avez d'autres questions.",
    fallback:"Je ne suis pas certain de comprendre. Essayez : commander, devenir vendeur, livraison, retours, paiement ou catégories. Pour une réponse humaine : <a href='contact.html' class='underline text-forest'>contactez notre équipe</a>."
  },
  en:{
    hello:"Hello! How can I help: ordering, becoming a seller, delivery or payment?",
    sell:"To sell on Chez Nous, pick a plan: Basic (free, 15% commission), Pro ($129/year, 10%) or Premium ($299/year, 6%). Details on the <a href='devenir-vendeur.html' class='underline text-forest'>Become a seller</a> page.",
    delivery:"Delivery times depend on the seller: 24 to 72h for home cooking, 3 to 5 days for products. See our <a href='livraison.html' class='underline text-forest'>Delivery</a> page.",
    returns:"A service can be cancelled for free up to 24h before. For products, see our <a href='retours-remboursement.html' class='underline text-forest'>Returns & refunds</a> page.",
    payment:"Your payment is held securely until you confirm receipt with your delivery code. In case of a dispute, our team decides after reviewing evidence from both sides.",
    categories:"Six categories are available: African grocery, Fashion & fabrics, Afro beauty & hair, Crafts & decor, Home cooking & catering, and Community services.",
    order:"Browse the <a href='marketplace.html' class='underline text-forest'>marketplace</a>, add a product to your cart, then check out.",
    account:"Click « Sign in » at the top of the page to manage your profile and orders.",
    reviews:"Only buyers who actually paid can leave a review, so reviews stay trustworthy.",
    privacy:"Your data is protected under PIPEDA, GDPR and CCPA. Details on our <a href='confidentialite.html' class='underline text-forest'>Privacy</a> page.",
    contact:"You can reach our team through the <a href='contact.html' class='underline text-forest'>Contact</a> page, or by email at aide@cheznous.ca.",
    thanks:"You're welcome! Let me know if you have other questions.",
    fallback:"I'm not sure I understand. Try: ordering, becoming a seller, delivery, returns, payment or categories. For a human answer: <a href='contact.html' class='underline text-forest'>contact our team</a>."
  }
};
function getBotAnswer(m){
  const english = getLangPersisted()==='en' || /\b(how|what|where|when|can|do|does|is|the|my|i|you|hello|hi|thanks?)\b/.test(m) && !/\b(je|tu|vous|le|la|les|mon|ma|est|comment)\b/.test(m);
  const answers = BOT_ANSWERS[english ? 'en' : 'fr'];
  const intent = BOT_INTENTS.find(i=>i.re.test(m));
  return answers[intent ? intent.key : 'fallback'];
}

const ROLE_RANK = {buyer:0, seller:1, admin:2};
// Rôle attribué par Supabase (mis en cache par assets/auth.js) : la vue choisie ne peut jamais le dépasser.
function getServerRole(){
  try{ return localStorage.getItem('cheznous_server_role') || 'buyer'; }catch(e){ return 'buyer'; }
}
function isRoleAllowed(role, serverRole = getServerRole()){
  return role in ROLE_RANK && ROLE_RANK[role] <= (ROLE_RANK[serverRole] ?? 0);
}
function getRolePersisted(){
  let r = 'buyer';
  try{ r = localStorage.getItem('cheznous_role') || 'buyer'; }catch(e){}
  return isRoleAllowed(r) ? r : 'buyer';
}
function restrictRoleSelect(){
  const sel = document.getElementById('roleSelect');
  if(!sel) return;
  [...sel.options].forEach(o=>{ if(!isRoleAllowed(o.value)) o.remove(); });
  sel.value = getRolePersisted();
}
function persistRole(r){
  try{ localStorage.setItem('cheznous_role', r); }catch(e){}
}

window.currency = getCurrency();
