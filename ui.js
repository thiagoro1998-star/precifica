/* Precifica 3D — navegação por áreas
   Mantém a calculadora, Radar e Catálogo separados em abas sem alterar o motor financeiro.
*/
(function(){
"use strict";
var KEY="precifica3d-workspace-view";
var VALID=["calc","market","catalog"];

function sections(){
  return Array.from(document.querySelectorAll("#workspaceGrid > section"));
}
function assignViews(){
  sections().forEach(function(el){
    if(el.id==="marketSection") el.dataset.workspaceView="market";
    else if(el.id==="catalogSection") el.dataset.workspaceView="catalog";
    else el.dataset.workspaceView="calc";
  });
}
function activate(view,opts){
  opts=opts||{};
  if(VALID.indexOf(view)<0)view="calc";
  assignViews();
  sections().forEach(function(el){
    el.classList.toggle("workspace-hidden",el.dataset.workspaceView!==view);
  });
  document.querySelectorAll("[data-workspace-tab]").forEach(function(btn){
    var active=btn.dataset.workspaceTab===view;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-selected",active?"true":"false");
    btn.setAttribute("tabindex",active?"0":"-1");
  });
  try{localStorage.setItem(KEY,view)}catch(e){}
  document.body.dataset.workspace=view;
  if(view==="market" && window.PrecificaMarket && typeof window.PrecificaMarket.render==="function"){
    window.PrecificaMarket.render();
  }
  if(opts.scroll!==false){
    var main=document.querySelector(".workspace-main");
    if(main) main.scrollIntoView({behavior:"smooth",block:"start"});
  }
}
function init(){
  assignViews();
  var saved="calc";
  try{saved=localStorage.getItem(KEY)||"calc"}catch(e){}
  if(VALID.indexOf(saved)<0)saved="calc";
  document.querySelectorAll("[data-workspace-tab]").forEach(function(btn){
    btn.addEventListener("click",function(){activate(btn.dataset.workspaceTab)});
    btn.addEventListener("keydown",function(e){
      if(e.key!=="ArrowDown"&&e.key!=="ArrowUp"&&e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
      e.preventDefault();
      var tabs=Array.from(document.querySelectorAll("[data-workspace-tab]"));
      var i=tabs.indexOf(btn),dir=(e.key==="ArrowDown"||e.key==="ArrowRight")?1:-1;
      var next=tabs[(i+dir+tabs.length)%tabs.length];
      activate(next.dataset.workspaceTab,{scroll:false});next.focus();
    });
  });
  document.addEventListener("click",function(e){
    if(e.target.closest("#marketSaveProduct")) setTimeout(function(){activate("catalog")},0);
    if(e.target.closest("#resetBtn")) setTimeout(function(){activate("calc",{scroll:false})},0);
  });
  activate(saved,{scroll:false});
}
window.PrecificaUI={activate:activate};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();