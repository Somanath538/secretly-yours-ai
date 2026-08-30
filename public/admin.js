let token = sessionStorage.getItem("secretly_admin_token") || "";
let allMessages = [];

const $ = id => document.getElementById(id);
const login = $("login"), dashboard = $("dashboard");

function showDashboard() {
  login.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadMessages();
}
if (token) showDashboard();

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const r = await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:$("password").value})});
  const d = await r.json();
  if (!r.ok) return alert(d.error || "Wrong password.");
  token=d.token; sessionStorage.setItem("secretly_admin_token",token); showDashboard();
});

$("logout").onclick=async()=>{await fetch("/api/admin/logout",{method:"POST",headers:{"x-admin-token":token}});sessionStorage.removeItem("secretly_admin_token");token="";location.reload()};
$("refresh").onclick=loadMessages;
$("search").oninput=renderMessages;

async function loadMessages(){
  const r=await fetch("/api/admin/messages",{headers:{"x-admin-token":token}});
  if(r.status===401){sessionStorage.removeItem("secretly_admin_token");location.reload();return}
  allMessages=await r.json();
  $("count").textContent=allMessages.length;
  $("people").textContent=new Set(allMessages.map(x=>x.recipientName.toLowerCase())).size;
  renderMessages();
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderMessages(){
  const q=$("search").value.toLowerCase();
  const list=allMessages.filter(m=>(m.senderName+" "+m.recipientName+" "+m.message).toLowerCase().includes(q));
  $("messages").innerHTML=list.length?list.map(m=>`
    <article class="msg">
      <div class="meta"><span>💌 From: ${esc(m.senderName)}</span><span>💗 To: ${esc(m.recipientName)}</span></div>
      <p>${esc(m.message)}</p><div class="date">${esc(m.createdAt)}</div>
    </article>`).join(""):`<p style="color:#988995;font-size:13px">No messages yet. Share your confession link and wait for the chaos. 👀</p>`;
}

$("chatForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const q=$("question").value.trim(); if(!q)return;
  addBubble(q,"user"); $("question").value="";
  addBubble("Thinking about the feelings... 💭","ai");
  const bubbles=[...document.querySelectorAll(".bubble.ai")]; const thinking=bubbles[bubbles.length-1];
  try{
    const r=await fetch("/api/admin/chat",{method:"POST",headers:{"Content-Type":"application/json","x-admin-token":token},body:JSON.stringify({question:q})});
    const d=await r.json(); if(!r.ok) throw new Error(d.error);
    thinking.textContent=d.answer;
  }catch(err){thinking.textContent=err.message||"AI couldn't answer right now."}
});
function addBubble(text,type){const b=document.createElement("div");b.className="bubble "+type;b.textContent=text;$("chat").appendChild(b);$("chat").scrollTop=$("chat").scrollHeight}
