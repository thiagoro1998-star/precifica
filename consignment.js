/* Precifica 3D — UI de Consignação e Revenda */
(function(){
"use strict";
var M=window.PrecificaConsignmentMath;
if(!M)return;

var KEY="precifica3d-consignment-v1";
var SAVED_KEY="precifica3d-consignment-saved-v1";
var defaults={
  mode:"consignment",
  uiMode:"simple",
  costPerUnit:"",
  salePrice:"7.90",
  commissionPct:"30",
  otherFeesPct:"0",
  deliveredQty:"20",
  soldQty:"0",
  goalMode:"profit",
  desiredProfit:"4",
  desiredMarginPct:"40",
  settlement:"quinzenal",
  settlementCustom:"",
  rounding:"x90",
  wholesalePrice:"",
  retailPrice:"",
  resaleQty:"20",
  producerFeeMode:"percent",
  producerFeeValue:"0",
  producerDesiredProfit:"4",
  storeDesiredMarginPct:"30",
  scenarioCommissions:["20","30","40","50"],
  scenarioPrices:["5.90","7.90","9.90","12.90"],
  healthyThresholdPct:"20",
  imported:false
};

function clone(x){return JSON.parse(JSON.stringify(x))}
function load(k,f){
  try{
    var raw=localStorage.getItem(k);
    if(!raw)return clone(f);
    var parsed=JSON.parse(raw);
    if(Array.isArray(f))return Array.isArray(parsed)?parsed:clone(f);
    return Object.assign({},f,parsed||{});
  }catch(e){return clone(f)}
}
var state=load(KEY,defaults);
var saved=load(SAVED_KEY,[]);

function normalize(){
  if(state.uiMode!=="simple"&&state.uiMode!=="full")state.uiMode="simple";
  if(!Array.isArray(state.scenarioCommissions)||state.scenarioCommissions.length!==4)state.scenarioCommissions=clone(defaults.scenarioCommissions);
  if(!Array.isArray(state.scenarioPrices)||state.scenarioPrices.length!==4)state.scenarioPrices=clone(defaults.scenarioPrices);
  if(!state.goalMode)state.goalMode="profit";
  if(!state.rounding)state.rounding="x90";
  if(!state.settlement)state.settlement="quinzenal";
  if(!state.mode)state.mode="consignment";
}
normalize();

function persist(){localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(SAVED_KEY,JSON.stringify(saved))}
function q(s){return document.querySelector(s)}
function qa(s){return Array.from(document.querySelectorAll(s))}
function n(v){var x=parseFloat(String(v==null?"":v).replace(",","."));return Number.isFinite(x)?x:0}
function brl(v){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number.isFinite(v)?v:0)}
function pct(v){return ((Number.isFinite(v)?v:0)*100).toFixed(2).replace(/,?0+$/,"").replace(".",",")+"%"}
function xfmt(v){return (Number.isFinite(v)?v:0).toFixed(2).replace(".",",")+"x"}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]})}
function tone(profit,margin){if(profit<0)return"bad";if(margin<n(state.healthyThresholdPct)/100)return"warn";return"good"}
function statusLabel(t){return t==="loss"?"Prejuízo":t==="tight"?"Apertado":"Saudável"}
function almost(a,b){return Math.abs(n(a)-n(b))<1e-9}

function field(id,key){
  var el=q(id);if(!el)return;
  el.value=state[key]??"";
  el.addEventListener("input",function(){
    state[key]=el.value;
    if(key==="costPerUnit")state.imported=false;
    persist();render();
  });
  el.addEventListener("change",function(){state[key]=el.value;persist();render()});
}

function inputArray(id,key,placeholder){
  var host=q(id);if(!host)return;
  if(!Array.isArray(state[key])||state[key].length!==4)state[key]=clone(defaults[key]);
  host.innerHTML=state[key].map(function(v,i){
    return '<input class="input scenario-mini" type="number" min="0" step="0.01" inputmode="decimal" data-array="'+key+'" data-i="'+i+'" value="'+esc(v)+'" placeholder="'+placeholder+'">';
  }).join("");
  host.querySelectorAll("input").forEach(function(el){
    el.addEventListener("input",function(){state[key][+el.dataset.i]=el.value;persist();renderScenarioTable()});
  });
}

function useCalculatedCost(){
  try{
    var c=typeof costs==="function"?costs():null;
    if(!c||!Number.isFinite(c.total)||c.total<=0){flash("Preencha a aba Precificação primeiro para importar o custo.");return}
    state.costPerUnit=String(c.total);
    state.imported=true;
    syncFields();persist();render();
    flash("Custo importado: "+brl(c.total)+" por unidade.");
  }catch(e){flash("Não foi possível importar o custo agora.")}
}

function settlementText(){
  return state.settlement==="personalizada"?(state.settlementCustom||"personalizado"):state.settlement;
}
function consInput(priceOverride,commissionOverride){
  return{
    costPerUnit:n(state.costPerUnit),
    salePrice:priceOverride==null?n(state.salePrice):priceOverride,
    commissionPct:commissionOverride==null?n(state.commissionPct):commissionOverride,
    otherFeesPct:n(state.otherFeesPct),
    deliveredQty:n(state.deliveredQty),
    soldQty:n(state.soldQty),
    goalMode:state.goalMode,
    desiredProfit:n(state.desiredProfit),
    desiredMarginPct:n(state.desiredMarginPct),
    rounding:state.rounding
  };
}
function resaleInput(){
  return{
    costPerUnit:n(state.costPerUnit),
    wholesalePrice:n(state.wholesalePrice),
    retailPrice:n(state.retailPrice),
    qty:n(state.resaleQty),
    producerFeeMode:state.producerFeeMode,
    producerFeeValue:n(state.producerFeeValue),
    producerDesiredProfit:n(state.producerDesiredProfit),
    storeDesiredMarginPct:n(state.storeDesiredMarginPct)
  };
}

function stat(label,value,klass,hint){
  return '<div class="cons-stat '+(klass||"")+'"><span>'+label+'</span><b>'+value+'</b>'+(hint?'<small>'+hint+'</small>':"")+'</div>';
}
function quickStat(label,value,klass){
  return '<div class="quick-result '+(klass||"")+'"><span>'+label+'</span><b>'+value+'</b></div>';
}

function renderQuickActive(){
  qa(".quick-chip").forEach(function(btn){
    var key=btn.dataset.quickKey,val=btn.dataset.quickValue;
    btn.classList.toggle("active",String(state[key])===String(val)||almost(state[key],val));
  });
}

function renderConsignment(){
  var r=M.consignment(consInput());
  var err=q("#consErrors");
  if(!r.ok){
    err.classList.remove("hidden");
    err.innerHTML=r.errors.map(function(x){return "• "+esc(x)}).join("<br>");
    q("#consResults").innerHTML="";
    q("#quickConsResults").innerHTML='<div class="quick-empty">Corrija os campos inválidos para ver o resultado.</div>';
    q("#negotiationText").textContent="Corrija os campos acima para gerar o resumo.";
    renderScenarioTable();return;
  }
  err.classList.add("hidden");
  var cls=tone(r.unitProfit,r.netMargin);

  if(n(state.costPerUnit)<=0){
    q("#quickConsResults").innerHTML='<div class="quick-empty"><b>Falta o custo da peça.</b> Digite acima ou clique em “Usar custo calculado”.</div>';
  }else{
    q("#quickConsResults").innerHTML=
      quickStat("Loja ganha / venda",brl(r.storeCommission),"store")+
      quickStat("Você recebe / venda",brl(r.producerNet),"producer")+
      quickStat("Seu lucro / venda",brl(r.unitProfit),cls)+
      quickStat("Sua margem",pct(r.netMargin),cls)+
      quickStat("Preço mínimo p/ meta",brl(r.minPrice),"accent");
  }

  q("#consResults").innerHTML=
    '<div class="cons-stats">'+
    stat("Preço ao público",brl(n(state.salePrice)))+
    stat("Comissão da loja / un.",brl(r.storeCommission))+
    stat("Repasse líquido / un.",brl(r.producerNet))+
    stat("Outras taxas / un.",brl(r.otherFees))+
    stat("Custo / un.",brl(n(state.costPerUnit)))+
    stat("Lucro líquido / un.",brl(r.unitProfit),cls)+
    stat("Margem líquida real",pct(r.netMargin),cls,"Lucro líquido ÷ preço ao público")+
    stat("Retorno sobre custo",pct(r.roi),cls,"Lucro líquido ÷ custo")+
    stat("Multiplicador preço/custo",xfmt(r.priceMultiplier),"","Preço ao público ÷ custo")+
    stat("Preço mínimo exato",brl(r.minPrice))+
    stat("Preço sugerido",brl(r.suggestedPrice),"accent")+
    stat("Faturamento vendido",brl(r.grossSales))+
    stat("Comissão total loja",brl(r.totalStoreCommission))+
    stat("Repasse total produtor",brl(r.totalProducerPayout))+
    stat("Lucro líquido total",brl(r.totalProfit),cls)+
    stat("Não vendidas",String(r.unsoldQty))+
    stat("Custo parado na loja",brl(r.parkedCost),r.parkedCost>0?"warn":"")+
    '</div>';

  q("#negotiationText").textContent=
    'Preço ao público: '+brl(n(state.salePrice))+'. Comissão da loja: '+n(state.commissionPct).toFixed(0)+'%, equivalente a '+brl(r.storeCommission)+' por venda. Repasse ao produtor: '+brl(r.producerNet)+' por unidade. Acerto '+settlementText()+'. Produtos não vendidos continuam pertencendo ao produtor.';
  renderScenarioTable();
}

function suggestedResaleFromGoal(){
  var cost=n(state.costPerUnit),fee=n(state.producerFeeValue),profit=n(state.producerDesiredProfit),margin=n(state.storeDesiredMarginPct)/100;
  var wholesale=state.producerFeeMode==="fixed"
    ?cost+fee+profit
    :(1-fee/100>0?(cost+profit)/(1-fee/100):0);
  var retail=1-margin>0?wholesale/(1-margin):0;
  return{wholesale:wholesale,retail:retail};
}

function renderResale(){
  var r=M.resale(resaleInput());
  var err=q("#resaleErrors");
  if(!r.ok){
    err.classList.remove("hidden");err.innerHTML=r.errors.map(function(x){return "• "+esc(x)}).join("<br>");
    q("#resaleResults").innerHTML="";
  }else{
    err.classList.add("hidden");
    var cls=tone(r.producerProfitPerUnit,r.producerMargin);
    q("#resaleResults").innerHTML=
      '<div class="cons-stats">'+
      stat("Receita produtor / un.",brl(r.producerRevenuePerUnit))+
      stat("Taxas produtor / un.",brl(r.producerFeesPerUnit))+
      stat("Lucro líquido produtor / un.",brl(r.producerProfitPerUnit),cls)+
      stat("Margem líquida produtor",pct(r.producerMargin),cls)+
      stat("Lucro total produtor",brl(r.producerTotalProfit),cls)+
      stat("Investimento total loja",brl(r.storeInvestment))+
      stat("Lucro bruto loja / un.",brl(r.storeProfitPerUnit),tone(r.storeProfitPerUnit,r.storeMargin))+
      stat("Margem da loja",pct(r.storeMargin),tone(r.storeProfitPerUnit,r.storeMargin),"Lucro da loja ÷ preço ao consumidor")+
      stat("Faturamento potencial loja",brl(r.storePotentialRevenue))+
      stat("Atacado mínimo produtor",brl(r.minWholesale),"accent")+
      stat("Varejo p/ margem da loja",brl(r.suggestedRetail),"accent")+
      '</div>';
  }

  var s=suggestedResaleFromGoal();
  if(n(state.costPerUnit)<=0){
    q("#quickResaleResults").innerHTML='<div class="quick-empty"><b>Falta o custo da peça.</b> Digite acima ou importe da Precificação.</div>';
  }else{
    q("#quickResaleResults").innerHTML=
      quickStat("Atacado mínimo",brl(s.wholesale),"accent")+
      quickStat("Varejo sugerido",brl(s.retail),"producer")+
      quickStat("Lucro produtor / un.",brl(n(state.producerDesiredProfit)),"good")+
      quickStat("Margem da loja",n(state.storeDesiredMarginPct).toFixed(0)+"%","store");
  }
}

function useSuggestedResale(){
  var s=suggestedResaleFromGoal();
  if(n(state.costPerUnit)<=0){flash("Informe o custo da peça primeiro.");return}
  state.wholesalePrice=s.wholesale.toFixed(2);
  state.retailPrice=s.retail.toFixed(2);
  syncFields();persist();render();
  flash("Preços sugeridos aplicados.");
}

function renderScenarioTable(){
  var body=q("#consScenarioBody");if(!body)return;
  var rows=[];
  state.scenarioCommissions.forEach(function(c){
    state.scenarioPrices.forEach(function(p){
      var r=M.consignment(consInput(n(p),n(c)));
      if(!r.ok)return;
      var st=M.scenarioStatus(r.unitProfit,r.netMargin,n(state.healthyThresholdPct));
      rows.push('<tr><td>'+brl(n(p))+'</td><td>'+n(c).toFixed(0)+'%</td><td>'+brl(r.storeCommission)+'</td><td>'+brl(r.producerNet)+'</td><td class="'+tone(r.unitProfit,r.netMargin)+'">'+brl(r.unitProfit)+'</td><td>'+pct(r.netMargin)+'</td><td><span class="cons-badge '+st+'">'+statusLabel(st)+'</span></td></tr>');
    });
  });
  body.innerHTML=rows.join("");
}

function renderSaved(){
  var host=q("#consSaved");if(!host)return;
  if(!saved.length){host.innerHTML='<div class="market-empty">Nenhum cenário salvo ainda.</div>';return}
  host.innerHTML=saved.map(function(x){
    return '<div class="cons-saved"><div><b>'+esc(x.name)+'</b><small>'+esc(x.modeLabel)+' · '+new Date(x.savedAt).toLocaleString("pt-BR")+'</small></div><div><b>'+brl(x.price)+'</b><small>Lucro/un. '+brl(x.profit)+'</small></div><button class="icon cons-delete" data-id="'+x.id+'" aria-label="Excluir cenário">🗑</button></div>';
  }).join("");
  qa(".cons-delete").forEach(function(b){
    b.onclick=function(){saved=saved.filter(function(x){return x.id!==b.dataset.id});persist();renderSaved()};
  });
}

function render(){
  qa("[data-cons-mode]").forEach(function(b){b.classList.toggle("active",b.dataset.consMode===state.mode)});
  qa("[data-cons-ui]").forEach(function(b){b.classList.toggle("active",b.dataset.consUi===state.uiMode)});
  qa(".cons-simple-only").forEach(function(el){el.classList.toggle("hidden",state.uiMode!=="simple")});
  qa(".cons-full-only").forEach(function(el){el.classList.toggle("hidden",state.uiMode!=="full")});

  q("#consignmentMode").classList.toggle("hidden",state.mode!=="consignment");
  q("#resaleMode").classList.toggle("hidden",state.mode!=="resale");
  q("#goalProfitWrap").classList.toggle("hidden",state.goalMode!=="profit");
  q("#goalMarginWrap").classList.toggle("hidden",state.goalMode!=="margin");
  q("#settlementCustomWrap").classList.toggle("hidden",state.settlement!=="personalizada");
  q("#producerFeeLabel").textContent=state.producerFeeMode==="fixed"?"Taxa fixa do produtor (R$/un.)":"Taxas do produtor (% do atacado)";
  q("#consCostOrigin").textContent=state.imported?"Importado da calculadora principal":"Valor manual";

  renderQuickActive();
  if(state.mode==="consignment")renderConsignment();else renderResale();
  renderSaved();
}

function setQuick(key,value){
  state[key]=String(value);
  if(key==="desiredProfit")state.goalMode="profit";
  syncFields();persist();render();
}
function applyStarterPreset(){
  state.salePrice="7.90";
  state.commissionPct="30";
  state.otherFeesPct="0";
  state.deliveredQty="20";
  state.soldQty="0";
  state.goalMode="profit";
  state.desiredProfit="4";
  state.settlement="quinzenal";
  state.rounding="x90";
  state.healthyThresholdPct="20";
  syncFields();persist();render();
  flash("Exemplo rápido aplicado. Agora ajuste só o custo se precisar.");
}
function openFull(){state.uiMode="full";persist();render();setTimeout(function(){q(".cons-full-only:not(.hidden)")?.scrollIntoView({behavior:"smooth",block:"start"})},0)}

function saveScenario(){
  var name=prompt("Nome do cenário:",state.mode==="consignment"?"Consignação":"Revenda / Atacado");if(name===null)return;
  var r=state.mode==="consignment"?M.consignment(consInput()):M.resale(resaleInput());
  if(!r.ok){flash("Corrija os campos inválidos antes de salvar.");return}
  saved.unshift({
    id:Date.now().toString(36),
    name:name||"Cenário",
    savedAt:new Date().toISOString(),
    mode:state.mode,
    modeLabel:state.mode==="consignment"?"Consignação":"Revenda / Atacado",
    price:state.mode==="consignment"?n(state.salePrice):n(state.wholesalePrice),
    profit:state.mode==="consignment"?r.unitProfit:r.producerProfitPerUnit,
    snapshot:clone(state)
  });
  persist();renderSaved();flash("Cenário salvo.");
}

function clearSection(){
  if(!confirm("Restaurar os valores iniciais desta área? A Precificação principal não será alterada."))return;
  var keepMode=state.mode,keepUi=state.uiMode;
  state=clone(defaults);state.mode=keepMode;state.uiMode=keepUi;
  persist();syncFields();render();flash("Valores iniciais restaurados.");
}

function syncFields(){
  var map={
    consCost:"costPerUnit",consSalePrice:"salePrice",consCommission:"commissionPct",consOtherFees:"otherFeesPct",
    consDelivered:"deliveredQty",consSold:"soldQty",consDesiredProfit:"desiredProfit",consDesiredMargin:"desiredMarginPct",
    consSettlementCustom:"settlementCustom",resaleWholesale:"wholesalePrice",resaleRetail:"retailPrice",resaleQty:"resaleQty",
    producerFeeValue:"producerFeeValue",producerDesiredProfit:"producerDesiredProfit",storeDesiredMargin:"storeDesiredMarginPct",
    healthyThreshold:"healthyThresholdPct"
  };
  Object.keys(map).forEach(function(id){var el=q("#"+id);if(el)el.value=state[map[id]]??""});
  q("#consGoalMode").value=state.goalMode;
  q("#consSettlement").value=state.settlement;
  q("#consRounding").value=state.rounding;
  q("#producerFeeMode").value=state.producerFeeMode;
  inputArray("#scenarioCommissions","scenarioCommissions","%");
  inputArray("#scenarioPrices","scenarioPrices","R$");
}

function copySummary(){
  var t=q("#negotiationText").textContent;
  function done(){q("#copySummary").textContent="Copiado!";setTimeout(function(){q("#copySummary").textContent="Copiar resumo"},1300)}
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(done).catch(function(){fallbackCopy(t);done()});
  }else{fallbackCopy(t);done()}
}
function fallbackCopy(t){var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy")}catch(e){}ta.remove()}
function flash(t){var el=q("#consFlash");if(!el)return;el.textContent=t;el.classList.add("show");setTimeout(function(){el.classList.remove("show")},2200)}

function init(){
  if(!q("#consignmentSection"))return;

  qa("[data-cons-mode]").forEach(function(b){b.onclick=function(){state.mode=b.dataset.consMode;persist();render()}});
  qa("[data-cons-ui]").forEach(function(b){b.onclick=function(){state.uiMode=b.dataset.consUi;persist();render()}});
  qa(".quick-chip").forEach(function(b){b.onclick=function(){setQuick(b.dataset.quickKey,b.dataset.quickValue)}});

  var fields={
    consCost:"costPerUnit",consSalePrice:"salePrice",consCommission:"commissionPct",consOtherFees:"otherFeesPct",
    consDelivered:"deliveredQty",consSold:"soldQty",consDesiredProfit:"desiredProfit",consDesiredMargin:"desiredMarginPct",
    consSettlementCustom:"settlementCustom",resaleWholesale:"wholesalePrice",resaleRetail:"retailPrice",resaleQty:"resaleQty",
    producerFeeValue:"producerFeeValue",producerDesiredProfit:"producerDesiredProfit",storeDesiredMargin:"storeDesiredMarginPct",
    healthyThreshold:"healthyThresholdPct"
  };
  Object.keys(fields).forEach(function(id){field("#"+id,fields[id])});

  [["#consGoalMode","goalMode"],["#consSettlement","settlement"],["#consRounding","rounding"],["#producerFeeMode","producerFeeMode"]].forEach(function(x){
    var el=q(x[0]);el.value=state[x[1]];
    el.onchange=function(){state[x[1]]=el.value;persist();render()};
  });

  q("#useCalculatedCost").onclick=useCalculatedCost;
  q("#consSave").onclick=saveScenario;
  q("#consClear").onclick=clearSection;
  q("#copySummary").onclick=copySummary;
  q("#starterPreset").onclick=applyStarterPreset;
  q("#openFullConsignment").onclick=openFull;
  q("#openFullResale").onclick=openFull;
  q("#useSuggestedResale").onclick=useSuggestedResale;

  syncFields();persist();render();
}

window.PrecificaConsignment={
  render:render,
  useCalculatedCost:useCalculatedCost,
  applyStarterPreset:applyStarterPreset
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();