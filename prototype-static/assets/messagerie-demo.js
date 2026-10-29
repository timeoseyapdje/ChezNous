// Messagerie de la démo : conversations fictives gardées dans ce navigateur (aucun envoi réel).
document.getElementById('newChatForm').style.display = 'none';
const STORE_KEY = 'cheznous_messages_v1';
const DEFAULT_CONVERSATIONS = [
  {id:'natural-roots', name:'Natural Roots Hair Studio', unread:1, messages:[
    {from:'them', text:"Vos tresses sont prévues pour 3h, box braids mi-longues c'est bien ça ?", time:'10:40'},
    {from:'me', text:'Oui exactement, à demain !', time:'10:41'},
    {from:'them', text:'Parfait, comptez environ 3h pour les tresses.', time:'10:42'}]},
  {id:'le-baobab', name:'Épicerie Le Baobab', unread:1, messages:[
    {from:'them', text:'Commande confirmée, prête à 17h30.', time:'Hier'}]},
  {id:'cuisine-fatou', name:'Cuisine de Fatou', unread:0, messages:[
    {from:'them', text:"Merci pour votre commande, n'hésitez pas à laisser un avis vérifié.", time:'02 sept.'}]}
];

function loadConversations(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if(Array.isArray(saved) && saved.length) return saved;
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_CONVERSATIONS));
}
function saveConversations(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(conversations)); }catch(e){}
}
const escapeHtml = escapeHtmlGlobal;
function slugify(str){
  return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function initials(name){
  return name.replace(/^Client\s*:\s*/,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
}
function nowTime(){
  return new Date().toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'});
}

const conversations = loadConversations();
let activeChat = conversations[0].id;

// Les boutons « Contacter » arrivent ici avec ?avec=<nom du vendeur>.
const requested = new URLSearchParams(location.search).get('avec');
if(requested){
  const id = slugify(requested);
  if(!conversations.some(c=>c.id===id)){
    conversations.unshift({id, name:requested, unread:0, messages:[]});
    saveConversations();
  }
  activeChat = id;
}

function renderConversations(){
  document.getElementById('conversations').innerHTML = conversations.map(c=>{
    const last = c.messages[c.messages.length-1];
    return `
    <button onclick="openChat('${c.id}')" class="w-full text-left flex items-center gap-3 p-2 rounded-2xl ${activeChat===c.id?'bg-white text-ink':'bg-white/10 hover:bg-white/15'} transition">
      <span class="w-9 h-9 rounded-full bg-forest text-white text-xs font-bold flex items-center justify-center shrink-0">${escapeHtml(initials(c.name))}</span>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm leading-none truncate">${escapeHtml(c.name)}</div>
        <div class="text-xs opacity-70 truncate mt-1">${last ? escapeHtml((last.from==='me'?'Vous : ':'') + last.text) : 'Nouvelle conversation'}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] opacity-60">${last ? escapeHtml(last.time) : ''}</div>
        ${c.unread?`<span class="bg-coral text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ml-auto mt-1">${c.unread}</span>`:''}
      </div>
    </button>`;
  }).join('');
}
function renderThread(){
  const conv = conversations.find(c=>c.id===activeChat);
  document.getElementById('chatHeader').textContent = conv.name;
  const cw = document.getElementById('chatWindow');
  cw.innerHTML = conv.messages.length ? conv.messages.map(m=> m.from==='me'
    ? `<div class="bg-coral rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%] ml-auto text-white w-fit">${escapeHtml(m.text)}<div class="msg-meta opacity-70 text-right mt-0.5">${escapeHtml(m.time)}</div></div>`
    : `<div class="bg-white text-ink rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%] w-fit">${escapeHtml(m.text)}<div class="msg-meta opacity-50 mt-0.5">${escapeHtml(m.time)}</div></div>`
  ).join('') : `<div class="text-center text-xs opacity-60 py-10">Écrivez votre premier message à ${escapeHtml(conv.name)}.</div>`;
  cw.scrollTop = cw.scrollHeight;
}
function openChat(id){
  activeChat = id;
  const conv = conversations.find(c=>c.id===id);
  if(conv.unread){ conv.unread = 0; saveConversations(); }
  renderConversations();
  renderThread();
  document.getElementById('msgInput').focus();
}
function sendMessage(){
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if(!text) return;
  if(containsProhibited(text.toLowerCase())){
    showToast('Message bloqué : merci de respecter la charte de la communauté.','error');
    return;
  }
  const conv = conversations.find(c=>c.id===activeChat);
  conv.messages.push({from:'me', text, time:nowTime()});
  // La conversation active remonte en tête de liste, comme dans une vraie messagerie.
  conversations.splice(conversations.indexOf(conv),1);
  conversations.unshift(conv);
  saveConversations();
  input.value = '';
  renderConversations();
  renderThread();
  showToast('Message envoyé • Notification courriel au vendeur','success');
}
document.getElementById('msgForm').addEventListener('submit', e=>{ e.preventDefault(); sendMessage(); });
openChat(activeChat);
