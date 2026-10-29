const esc = escapeHtmlGlobal;
// Les conversations vivent dans Supabase (table messages, RLS : chacun ne lit que ses échanges).
let me = null;
let conversations = [];
let activeChat = null;
let thread = [];

function initials(name){
  return String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
}
function timeLabel(iso){
  const d = new Date(iso);
  const sameDay = d.toDateString()===new Date().toDateString();
  return sameDay ? clockTime(d) : d.toLocaleDateString('fr-CA',{day:'2-digit',month:'short'});
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cache lu par la cloche de notifications sur les autres pages.
function cacheUnread(){
  try{
    localStorage.setItem('cheznous_messages_v1', JSON.stringify(conversations.filter(c=>c.unread).map(c=>({
      id:c.id, name:c.name, unread:c.unread, messages:[{text:c.lastBody, time:timeLabel(c.lastAt)}]
    }))));
  }catch(e){}
  refreshNotifBadge();
}

async function loadConversations(){
  const { data, error } = await sb.rpc('my_conversations');
  if(error){ showToast('Messagerie indisponible pour le moment.','error'); return; }
  const pending = conversations.filter(c=>!c.lastAt && !data.some(r=>r.partner_id===c.id));
  conversations = [...pending, ...data.map(r=>({id:r.partner_id, name:r.partner_name, lastBody:r.last_body, lastFromMe:r.last_from_me, lastAt:r.last_at, unread:Number(r.unread)}))];
  cacheUnread();
  renderConversations();
}

function renderConversations(){
  const box = document.getElementById('conversations');
  if(!conversations.length){
    box.innerHTML = `<div class="text-xs opacity-60 p-2">Aucune conversation. Saisissez le courriel d'un membre pour lui écrire.</div>`;
    return;
  }
  box.innerHTML = conversations.map(c=>`
    <button onclick="openChat('${c.id}')" class="w-full text-left flex items-center gap-3 p-2 rounded-2xl ${activeChat===c.id?'bg-white text-ink':'bg-white/10 hover:bg-white/15'} transition">
      <span class="w-9 h-9 rounded-full bg-forest text-white text-xs font-bold flex items-center justify-center shrink-0">${esc(initials(c.name))}</span>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm leading-none truncate">${esc(c.name)}</div>
        <div class="text-xs opacity-70 truncate mt-1">${c.lastAt ? esc((c.lastFromMe?'Vous : ':'') + c.lastBody) : 'Nouvelle conversation'}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[11px] opacity-60">${c.lastAt ? esc(timeLabel(c.lastAt)) : ''}</div>
        ${c.unread?`<span class="bg-coral text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ml-auto mt-1">${c.unread}</span>`:''}
      </div>
    </button>`).join('');
}

function renderThread(){
  const conv = conversations.find(c=>c.id===activeChat);
  const form = document.getElementById('msgForm');
  form.style.display = conv ? '' : 'none';
  document.getElementById('chatHeader').textContent = conv ? conv.name : 'Messagerie';
  const cw = document.getElementById('chatWindow');
  if(!conv){
    cw.innerHTML = `<div class="text-center text-xs opacity-60 py-10">Choisissez une conversation ou écrivez à un membre avec son courriel.</div>`;
    return;
  }
  cw.innerHTML = thread.length ? thread.map(m=> m.sender_id===me
    ? `<div class="bg-coral rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%] ml-auto text-white w-fit">${esc(m.body)}<div class="msg-meta opacity-70 text-right mt-0.5">${esc(timeLabel(m.created_at))}${m.read_at?' • Lu':''}</div></div>`
    : `<div class="bg-white text-ink rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%] w-fit">${esc(m.body)}<div class="msg-meta opacity-50 mt-0.5">${esc(timeLabel(m.created_at))}</div></div>`
  ).join('') : `<div class="text-center text-xs opacity-60 py-10">Écrivez votre premier message à ${esc(conv.name)}.</div>`;
  cw.scrollTop = cw.scrollHeight;
}

async function openChat(id){
  activeChat = id;
  renderConversations();
  const { data, error } = await sb.from('messages').select('*')
    .or(`and(sender_id.eq.${me},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${me})`)
    .order('created_at', { ascending:true }).limit(500);
  if(error){ showToast('Impossible de charger cette conversation.','error'); return; }
  thread = data;
  renderThread();
  const conv = conversations.find(c=>c.id===id);
  if(conv && conv.unread){
    await sb.rpc('mark_conversation_read', { partner:id });
    conv.unread = 0;
    cacheUnread();
    renderConversations();
  }
  document.getElementById('msgInput').focus();
}

async function startConversation(id, name){
  if(!conversations.some(c=>c.id===id)) conversations.unshift({id, name, lastBody:'', lastAt:null, unread:0});
  await openChat(id);
}

async function sendMessage(){
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if(!text || !activeChat) return;
  if(text.length > 2000){ showToast('Message trop long (2000 caractères maximum).','error'); return; }
  if(containsProhibited(text)){
    showToast('Message bloqué : merci de respecter la charte de la communauté.','error');
    return;
  }
  input.value = '';
  const { data, error } = await sb.from('messages').insert({ sender_id:me, recipient_id:activeChat, body:text }).select().single();
  if(error){ input.value = text; showToast("Le message n'a pas pu être envoyé.",'error'); return; }
  thread.push(data);
  renderThread();
  await loadConversations();
}

document.getElementById('msgForm').addEventListener('submit', e=>{ e.preventDefault(); sendMessage(); });
document.getElementById('newChatForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const email = document.getElementById('newChatEmail').value.trim();
  const { data, error } = await sb.rpc('find_member_by_email', { member_email:email });
  if(error || !data || !data.length){ showToast('Aucun membre trouvé avec ce courriel.','error'); return; }
  document.getElementById('newChatEmail').value = '';
  await startConversation(data[0].id, data[0].full_name);
});

// Message reçu en direct : on l'ajoute au fil ouvert, sinon on met à jour la liste et le compteur.
function subscribeToIncoming(){
  sb.channel('messages-' + me)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`recipient_id=eq.${me}` }, async payload=>{
      const m = payload.new;
      if(m.sender_id===activeChat){
        thread.push(m);
        renderThread();
        await sb.rpc('mark_conversation_read', { partner:activeChat });
      }
      await loadConversations();
    })
    .subscribe();
}

(async ()=>{
  const { profile } = await authReady;
  if(!profile || !sb){ renderThread(); return; }
  me = profile.id;
  await loadConversations();
  // Les boutons « Contacter » passent ?avec=<identifiant du membre> ; les vendeurs de démo n'ont pas encore de compte.
  const requested = new URLSearchParams(location.search).get('avec');
  if(requested && UUID_RE.test(requested)){
    const { data:name } = await sb.rpc('member_name', { member:requested });
    if(name) await startConversation(requested, name);
    else showToast('Ce membre est introuvable.','error');
  } else if(requested){
    showToast(`${esc(requested)} est une boutique de démonstration sans compte : la messagerie avec elle ouvrira quand la boutique sera inscrite.`,'info');
  }
  if(!activeChat && conversations.length) await openChat(conversations[0].id);
  else if(!activeChat) renderThread();
  subscribeToIncoming();
})();
