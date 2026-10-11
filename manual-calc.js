/* Precifica 3D — cálculo manual confirmado
   O motor pode preparar valores internamente, mas o usuário só recebe o resultado
   depois de clicar em Calcular / Recalcular. */
(function(){
"use strict";

var ready=false;
function q(s){return document.querySelector(s)}
function qa(s){return Array.from(document.querySelectorAll(s))}
function stampText(){
  return "Calculado às "+new Date().toLocaleTimeString("pt-BR")+". Se você alterar qualquer campo acima, será necessário recalcular.";
}
function setPending(reason){
  var section=q("#resultSection"),button=q("#calculateNowBtn"),status=q("#calcCommitStatus");
  if(!section||!button)return;
  ready=false;
  section.classList.add("calc-result-pending");
  button.textContent="Calcular preço e resultados";
  if(reason==="dirty")button.textContent="Recalcular com as alterações";
  if(status)status.textContent=reason==="dirty"?"Alterações pendentes. Os números abaixo ficam bloqueados até você recalcular.":"Preencha os dados acima e clique em Calcular para liberar os resultados.";
  document.body.dataset.calcConfirmed="false";
}
function confirmCalculation(){
  try{
    if(typeof calc==="function")calc();
    var section=q("#resultSection"),button=q("#calculateNowBtn"),status=q("#calcCommitStatus");
    if(section)section.classList.remove("calc-result-pending");
    ready=true;
    document.body.dataset.calcConfirmed="true";
    if(button)button.textContent="Recalcular";
    if(status)status.textContent=stampText();
    document.dispatchEvent(new CustomEvent("precifica:calculated"));
    setTimeout(function(){section?.scrollIntoView({behavior:"smooth",block:"start"})},30);
  }catch(e){
    var status=q("#calcCommitStatus");if(status)status.textContent="Não foi possível calcular. Revise os campos destacados e tente novamente.";
  }
}
function relevantTarget(el){
  if(!el||!el.closest)return false;
  var section=el.closest('[data-workspace-view="calc"],#projectSection,#materialSection,#printerSection,#finalSection,#taxSection,#pricingSection,#resultSection');
  if(!section)return false;
  if(el.closest("#resultSection"))return false;
  if(el.closest("#calculateNowBtn"))return false;
  if(el.closest(".modal"))return false;
  return true;
}
function init(){
  var button=q("#calculateNowBtn");if(!button)return;
  button.addEventListener("click",confirmCalculation);
  document.addEventListener("input",function(e){if(relevantTarget(e.target))setPending("dirty")},true);
  document.addEventListener("change",function(e){if(relevantTarget(e.target))setPending("dirty")},true);
  document.addEventListener("click",function(e){
    if(e.target.closest("#resetBtn,#importBtn")){setTimeout(function(){setPending("dirty")},0);return}
    if(!relevantTarget(e.target))return;
    var b=e.target.closest("button");
    if(!b)return;
    if(b.matches("#exportBtn,#importBtn,#resetBtn"))return;
    setTimeout(function(){setPending("dirty")},0);
  },true);
  setPending("initial");
}
window.PrecificaManualCalc={calculate:confirmCalculation,setPending:setPending,isReady:function(){return ready}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();