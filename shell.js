/* Precifica 3D — shell, dashboard e acesso local */
(function(){
"use strict";

var PROFILE_KEY="precifica3d-local-profile-v1";
var ACCOUNT_KEY="precifica3d-local-account-v1";
var SESSION_KEY="precifica3d-auth-session-v1";

function q(s){return document.querySelector(s)}
function qa(s){return Array.from(document.querySelectorAll(s))}
function brl(v){var n=Number(v);return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number.isFinite(n)?n:0)}
function parseBrlText(t){
  var s=String(t||"").replace(/[^0-9,.-]/g,"").replace(/\./g,"").replace(",",".");
  var n=Number(s);return Number.isFinite(n)?n:0;
}
function readJSON(key,session){
  try{return JSON.parse((session?sessionStorage:localStorage).getItem(key))||null}catch(e){return null}
}
function writeJSON(key,value,session){
  try{(session?sessionStorage:localStorage).setItem(key,JSON.stringify(value));return true}catch(e){return false}
}
function loadProfile(){return readJSON(PROFILE_KEY,false)}
function loadAccount(){return readJSON(ACCOUNT_KEY,false)}
function loadSession(){return readJSON(SESSION_KEY,true)}
function saveProfile(p){writeJSON(PROFILE_KEY,p,false)}
function toast(msg){
  var el=q("#shellToast");if(!el)return;
  el.textContent=msg;el.classList.add("show");
  clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove("show")},2800);
}
async function hashPassword(value){
  var text=String(value||"");
  if(window.crypto&&window.crypto.subtle&&window.TextEncoder){
    var bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest("SHA-256",bytes);
    return Array.from(new Uint8Array(hash)).map(function(b){return b.toString(16).padStart(2,"0")}).join("");
  }
  // Fallback apenas para navegadores muito antigos; não é usado quando Web Crypto existe.
  var h=2166136261;
  for(var i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return "fallback-"+(h>>>0).toString(16);
}
function normalizeEmail(v){return String(v||"").trim().toLowerCase()}
function setAuthenticated(profile,kind){
  writeJSON(SESSION_KEY,{active:true,kind:kind||"local",at:new Date().toISOString()},true);
  if(profile)saveProfile(profile);
  document.body.classList.remove("auth-locked");
  var modal=q("#accountModal");if(modal){modal.classList.remove("locked");modal.classList.remove("show");modal.setAttribute("aria-hidden","true")}
  profileUI();
}
function openAuth(force){
  var m=q("#accountModal");if(!m)return;
  m.classList.add("show");
  m.setAttribute("aria-hidden","false");
  if(force&&!loadSession()){m.classList.add("locked");document.body.classList.add("auth-locked")}
}
function closeAuth(){
  if(!loadSession()){toast("Entre, crie um acesso ou use o modo visitante para continuar.");return}
  var m=q("#accountModal");if(m){m.classList.remove("show");m.setAttribute("aria-hidden","true")}
}
function setAuthTab(tab){
  qa("[data-auth-tab]").forEach(function(b){b.classList.toggle("active",b.dataset.authTab===tab)});
  qa("[data-auth-panel]").forEach(function(p){p.classList.toggle("hidden",p.dataset.authPanel!==tab)});
}
function profileUI(){
  var account=loadAccount(),profile=loadProfile(),session=loadSession();
  var name=account&&account.name?account.name:(profile&&profile.name?profile.name:(session&&session.kind==="guest"?"Visitante":"Modo local"));
  var sub=account&&account.email?account.email:(profile&&profile.email?profile.email:"Dados salvos neste navegador");
  var nameEl=q("#profileName"),subEl=q("#profileSub"),hero=q("#dashProfile");
  if(nameEl)nameEl.textContent=name;
  if(subEl)subEl.textContent=sub;
  if(hero)hero.textContent=name==="Modo local"?"Seu espaço local":name;
}
function renderSavedUser(){
  var account=loadAccount(),legacy=loadProfile(),card=q("#savedUserCard");
  if(!card)return;
  if(account){
    card.classList.add("hidden");
    if(q("#loginEmail"))q("#loginEmail").value=account.email||"";
    var hint=q("#loginHint");if(hint)hint.textContent="Acesso local encontrado neste navegador. Digite sua senha para entrar.";
    return;
  }
  if(legacy&&(legacy.name||legacy.email)){
    card.classList.remove("hidden");
    q("#savedUserName").textContent=legacy.name||"Maker";
    q("#savedUserEmail").textContent=legacy.email||"Perfil criado em versão anterior";
  }else card.classList.add("hidden");
}
async function signup(e){
  e.preventDefault();
  var name=(q("#signupName").value||"").trim(),email=normalizeEmail(q("#signupEmail").value),pass=q("#signupPassword").value||"";
  if(name.length<2){toast("Informe seu nome.");return}
  if(!email||email.indexOf("@")<1){toast("Informe um e-mail válido.");return}
  if(pass.length<6){toast("A senha precisa ter pelo menos 6 caracteres.");return}
  var hash=await hashPassword(pass);
  var account={name:name,email:email,passwordHash:hash,createdAt:new Date().toISOString(),storage:"local"};
  writeJSON(ACCOUNT_KEY,account,false);
  saveProfile({name:name,email:email,savedAt:new Date().toISOString()});
  q("#signupPassword").value="";
  setAuthenticated(account,"local");
  toast("Acesso local criado. Seus dados continuam somente neste navegador.");
}
async function login(e){
  e.preventDefault();
  var account=loadAccount();
  if(!account){toast("Ainda não existe um acesso local neste navegador. Clique em Criar acesso.");setAuthTab("signup");return}
  var email=normalizeEmail(q("#loginEmail").value),pass=q("#loginPassword").value||"";
  if(email!==normalizeEmail(account.email)){toast("E-mail diferente do acesso salvo neste navegador.");return}
  var hash=await hashPassword(pass);
  if(hash!==account.passwordHash){toast("Senha incorreta.");return}
  q("#loginPassword").value="";
  setAuthenticated(account,"local");
  toast("Bem-vindo ao Precifica 3D.");
}
function useLegacyProfile(){
  var legacy=loadProfile();if(!legacy)return;
  setAuthenticated(legacy,"legacy");
  toast("Perfil anterior carregado. Você pode criar um acesso com senha pelo menu da conta.");
}
function guestLogin(){
  setAuthenticated({name:"Visitante",email:""},"guest");
  toast("Modo visitante ativo. Os dados continuam neste navegador.");
}
function countCatalog(){
  try{var c=JSON.parse(localStorage.getItem("precifica3d-catalog-v1")||"[]");return Array.isArray(c)?c.length:0}catch(e){return 0}
}
function countMarketRefs(){
  try{var m=JSON.parse(localStorage.getItem("precifica3d-market-v1")||"{}");return m&&Array.isArray(m.refs)?m.refs.filter(function(x){return Number(String(x.price||"").replace(",","."))>0}).length:0}catch(e){return 0}
}
function updateDashboard(){
  var cost=parseBrlText((q("#resCost")||{}).textContent),price=parseBrlText((q("#resPrice")||{}).textContent),profit=parseBrlText((q("#resProfit")||{}).textContent);
  var margin=((q("#resMargin")||{}).textContent)||"0%";
  var a=q("#dashCost"),b=q("#dashPrice"),c=q("#dashProfit"),d=q("#dashCatalog"),e=q("#dashRefs"),f=q("#dashMargin");
  if(a)a.textContent=brl(cost);if(b)b.textContent=brl(price);if(c)c.textContent=brl(profit);
  if(d)d.textContent=String(countCatalog());if(e)e.textContent=String(countMarketRefs());if(f)f.textContent=margin||"0%";
}
function initDashboardButtons(){
  qa("[data-open-workspace]").forEach(function(btn){btn.addEventListener("click",function(){if(window.PrecificaUI)window.PrecificaUI.activate(btn.dataset.openWorkspace)})});
}
function initAuth(){
  var open=q("#openAccount"),dashOpen=q("#dashOpenAccount"),close=q("#closeAccount");
  if(open)open.onclick=function(){openAuth(false)};
  if(dashOpen)dashOpen.onclick=function(){openAuth(false)};
  if(close)close.onclick=closeAuth;
  qa("[data-auth-tab]").forEach(function(b){b.onclick=function(){setAuthTab(b.dataset.authTab)}});
  var loginForm=q("#localLoginForm"),signupForm=q("#localSignupForm");
  if(loginForm)loginForm.addEventListener("submit",login);
  if(signupForm)signupForm.addEventListener("submit",signup);
  if(q("#useSavedUser"))q("#useSavedUser").onclick=useLegacyProfile;
  if(q("#guestLogin"))q("#guestLogin").onclick=guestLogin;
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeAuth()});
  renderSavedUser();
  setAuthTab(loadAccount()?"login":"signup");
  if(!loadSession())openAuth(true);
  else profileUI();
}
function initObservers(){
  document.addEventListener("precifica:calculated",function(){setTimeout(updateDashboard,0)});
  document.addEventListener("precifica:catalog-changed",function(){setTimeout(updateDashboard,0)});
}
function init(){
  initDashboardButtons();initAuth();initObservers();updateDashboard();profileUI();
}
window.PrecificaShell={updateDashboard:updateDashboard,openAuth:openAuth,profileUI:profileUI};
init();
})();