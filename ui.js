/* Precifica 3D — navegação por áreas */
(function(){
"use strict";
var KEY="precifica3d-workspace-view";

function sections(){return Array.from(document.querySelectorAll("#workspaceGrid > section"))}
function tabs(){return Array.from(document.querySelectorAll("[data-workspace-tab]"))}
function validViews(){return tabs().map(function(b){return b.dataset.workspaceTab}).filter(Boolean)}
function assignViews(){
  sections().forEach(function(el){
    if(el.dataset.workspaceView)return;
    if(el.id==="homeSection")el.dataset.workspaceView="home";
    else if(el.id==="marketSection")el.dataset.workspaceView="market";
    else if(el.id==="consignmentSection")el.dataset.workspaceView="consignment";
    else if(el.id==="catalogSection")el.dataset.workspaceView="catalog";
    else if(el.id==="stockSection")el.dataset.workspaceView="stock";
    else if(el.id==="financeSection")el.dataset.workspaceView="finance";
    else el.dataset.workspaceView="calc";
  });
}
function activate(view,opts){
  opts=opts||{};assignViews();var valid=validViews();if(valid.indexOf(view)<0)view=valid.indexOf("home")>=0?"home":"calc";
  sections().forEach(function(el){el.classList.toggle("workspace-hidden",el.dataset.workspaceView!==view)});
  tabs().forEach(function(btn){var active=btn.dataset.workspaceTab===view;btn.classList.toggle("active",active);btn.setAttribute("aria-selected",active?"true":"false");btn.setAttribute("tabindex",active?"0":"-1")});
  try{localStorage.setItem(KEY,view)}catch(e){}
  document.body.dataset.workspace=view;
  if(view==="market"&&window.PrecificaMarket&&typeof window.PrecificaMarket.render==="function")window.PrecificaMarket.render();
  if(view==="consignment"&&window.PrecificaConsignment&&typeof window.PrecificaConsignment.render==="function")window.PrecificaConsignment.render();
  if((view==="stock"||view==="finance"||view==="home")&&window.PrecificaManagement&&typeof window.PrecificaManagement.renderAll==="function")window.PrecificaManagement.renderAll();
  if(opts.scroll!==false){var main=document.querySelector(".workspace-main");if(main)main.scrollIntoView({behavior:"smooth",block:"start"})}
}
function init(){
  assignViews();var valid=validViews(),saved="home";try{saved=localStorage.getItem(KEY)||"home"}catch(e){}if(valid.indexOf(saved)<0)saved=valid.indexOf("home")>=0?"home":"calc";
  tabs().forEach(function(btn){
    btn.addEventListener("click",function(){activate(btn.dataset.workspaceTab)});
    btn.addEventListener("keydown",function(e){if(["ArrowDown","ArrowUp","ArrowLeft","ArrowRight"].indexOf(e.key)<0)return;e.preventDefault();var all=tabs(),i=all.indexOf(btn),dir=(e.key==="ArrowDown"||e.key==="ArrowRight")?1:-1,next=all[(i+dir+all.length)%all.length];activate(next.dataset.workspaceTab,{scroll:false});next.focus()});
  });
  document.addEventListener("click",function(e){if(e.target.closest("#marketSaveProduct"))setTimeout(function(){activate("catalog")},0);if(e.target.closest("#resetBtn"))setTimeout(function(){activate("calc",{scroll:false})},0);var jump=e.target.closest("[data-open-workspace]");if(jump)setTimeout(function(){activate(jump.dataset.openWorkspace,{scroll:false})},0)});
  activate(saved,{scroll:false});
}
window.PrecificaUI={activate:activate};
function loadManagement(done){
  if(!document.querySelector('link[data-precifica-management]')){var l=document.createElement("link");l.rel="stylesheet";l.href="./management.css?v=1.17.0";l.dataset.precificaManagement="1";document.head.appendChild(l)}
  if(window.PrecificaManagement){done();return}
  var existing=document.querySelector('script[data-precifica-management]');if(existing){existing.addEventListener("load",done,{once:true});return}
  var s=document.createElement("script");s.src="./management.js?v=1.17.0";s.async=false;s.dataset.precificaManagement="1";s.onload=done;s.onerror=function(){console.error("Não foi possível carregar a camada de gestão do Precifica 3D.");done()};document.body.appendChild(s);
}
function boot(){loadManagement(init)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();