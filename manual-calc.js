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
function showValidation(errors){
  var box=q("#calcValidationErrors");if(!box)return;
  if(!errors||!errors.length){box.classList.add("hidden");box.innerHTML="";return}
  box.innerHTML="<b>Revise antes de calcular:</b><ul>"+errors.map(function(x){return "<li>"+String(x)+"</li>"}).join("")+"</ul>";
  box.classList.remove("hidden");
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
  showValidation([]);
}
function confirmCalculation(){
  try{
    var validation=window.PrecificaPricingEngine&&typeof window.PrecificaPricingEngine.validate==="function"?window.PrecificaPricingEngine.validate():{ok:true,errors:[]};
    if(!validation.ok){
      document.body.dataset.calcConfirmed="false";
      ready=false;
      showValidation(validation.errors);
      var status=q("#calcCommitStatus");if(status)status.textContent="Faltam dados obrigatórios. Corrija os itens abaixo e clique em Calcular novamente.";
      q("#calcCommitCard")?.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    showValidation([]);
    document.body.dataset.calcConfirmed="true";
    if(typeof calc==="function")calc();
    var section=q("#resultSection"),button=q("#calculateNowBtn"),status=q("#calcCommitStatus");
    if(section)section.classList.remove("calc-result-pending");
    ready=true;
    if(button)button.textContent="Recalcular";
    if(status)status.textContent=stampText();
    document.dispatchEvent(new CustomEvent("precifica:calculated"));
    setTimeout(function(){section?.scrollIntoView({behavior:"smooth",block:"start"})},30);
  }catch(e){
    document.body.dataset.calcConfirmed="false";
    ready=false;
    if(typeof calc==="function")calc();
    showValidation([String(e&&e.message||e)]);
    var status=q("#calcCommitStatus");if(status)status.textContent="O motor bloqueou o cálculo porque encontrou uma condição inválida.";
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