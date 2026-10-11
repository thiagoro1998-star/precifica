/* Precifica 3D — professional app shell / dashboard / account preview */
(function(){
"use strict";

var PROFILE_KEY="precifica3d-local-profile-v1";
function q(s){return document.querySelector(s)}
function qa(s){return Array.from(document.querySelectorAll(s))}
function brl(v){var n=Number(v);return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number.isFinite(n)?n:0)}
function parseBrlText(t){
  var s=String(t||"").replace(/[^0-9,.-]/g,"").replace(/\./g,"").replace(",",".");
  var n=Number(s);return Number.isFinite(n)?n:0;
}
function loadProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY))||null}catch(e){return null}}
function saveProfile(p){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(p))}catch(e){}}
function toast(msg){
  var el=q("#shellToast");if(!el)return;
  el.textContent=msg;el.classList.add("show");
  clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove("show")},2600);
}
function openAuth(){var m=q("#accountModal");if(m)m.classList.add("show")}
function closeAuth(){var m=q("#accountModal");if(m)m.classList.remove("show")}
function setAuthTab(tab){
  qa("[data-auth-tab]").forEach(function(b){b.classList.toggle("active",b.dataset.authTab===tab)});
  qa("[data-auth-panel]").forEach(function(p){p.classList.toggle("hidden",p.dataset.authPanel!==tab)});
}
function profileUI(){
  var p=loadProfile(),name=p&&p.name?p.name:"Modo local";
  var sub=p&&p.email?p.email:"Dados salvos neste navegador";
  var nameEl=q("#profileName"),subEl=q("#profileSub"),hero=q("#dashProfile");
  if(nameEl)nameEl.textContent=name;
  if(subEl)subEl.textContent=sub;
  if(hero)hero.textContent=p&&p.name?p.name:"Seu espaço local";
}
function storeLocalProfile(){
  var name=(q("#localProfileName")||{}).value||"";
  var email=(q("#localProfileEmail")||{}).value||"";
  saveProfile({name:name.trim()||"Maker",email:email.trim(),savedAt:new Date().toISOString()});
  profileUI();closeAuth();toast("Perfil local salvo neste navegador.");
}
function countCatalog(){
  try{
    var c=JSON.parse(localStorage.getItem("precifica3d-catalog-v1")||"[]");
    return Array.isArray(c)?c.length:0;
  }catch(e){return 0}
}
function countMarketRefs(){
  try{
    var m=JSON.parse(localStorage.getItem("precifica3d-market-v1")||"{}");
    return m&&Array.isArray(m.refs)?m.refs.filter(function(x){return Number(String(x.price||"").replace(",","."))>0}).length:0;
  }catch(e){return 0}
}
function updateDashboard(){
  var cost=parseBrlText((q("#resCost")||{}).textContent);
  var price=parseBrlText((q("#resPrice")||{}).textContent);
  var profit=parseBrlText((q("#resProfit")||{}).textContent);
  var margin=((q("#resMargin")||{}).textContent)||"0%";
  var a=q("#dashCost"),b=q("#dashPrice"),c=q("#dashProfit"),d=q("#dashCatalog"),e=q("#dashRefs"),f=q("#dashMargin");
  if(a)a.textContent=brl(cost);
  if(b)b.textContent=brl(price);
  if(c)c.textContent=brl(profit);
  if(d)d.textContent=String(countCatalog());
  if(e)e.textContent=String(countMarketRefs());
  if(f)f.textContent=margin||"0%";
}
function initDashboardButtons(){
  qa("[data-open-workspace]").forEach(function(btn){
    btn.addEventListener("click",function(){
      if(window.PrecificaUI)window.PrecificaUI.activate(btn.dataset.openWorkspace);
    });
  });
}
function initAuth(){
  var open=q("#openAccount"),close=q("#closeAccount"),local=q("#saveLocalProfile");
  if(open)open.onclick=openAuth;
  if(close)close.onclick=closeAuth;
  if(local)local.onclick=storeLocalProfile;
  qa("[data-auth-tab]").forEach(function(b){b.onclick=function(){setAuthTab(b.dataset.authTab)}});
  qa(".cloud-auth-form").forEach(function(form){
    form.addEventListener("submit",function(e){
      e.preventDefault();
      toast("Login em nuvem ainda não está conectado. Nenhuma senha foi enviada ou salva.");
    });
  });
  var modal=q("#accountModal");
  if(modal)modal.addEventListener("click",function(e){if(e.target===modal)closeAuth()});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeAuth()});
  var p=loadProfile();
  if(p){
    if(q("#localProfileName"))q("#localProfileName").value=p.name||"";
    if(q("#localProfileEmail"))q("#localProfileEmail").value=p.email||"";
  }
  profileUI();
}
function initObservers(){
  var target=q("#resultSection");
  if(target&&window.MutationObserver){
    new MutationObserver(function(){updateDashboard()}).observe(target,{subtree:true,childList:true,characterData:true});
  }
  document.addEventListener("input",function(){setTimeout(updateDashboard,0)});
  document.addEventListener("change",function(){setTimeout(updateDashboard,0)});
}
function init(){
  initDashboardButtons();
  initAuth();
  initObservers();
  updateDashboard();
  setAuthTab("login");
}
window.PrecificaShell={updateDashboard:updateDashboard,openAuth:openAuth};
init();
})();