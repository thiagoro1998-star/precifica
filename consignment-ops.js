/* Precifica 3D — gestão operacional de consignação
   Cadastro de pontos, estoque externo, vendas, recebíveis e pagamentos.
   Tudo fica local neste navegador até a camada de conta/nuvem ser conectada. */
(function(){
"use strict";

var KEY="precifica3d-consignment-stores-v2";
var AREA_KEY="precifica3d-consignment-area-v1";
var stores=[];
var selectedId=null;

function q(s){return document.querySelector(s)}
function qa(s){return Array.from(document.querySelectorAll(s))}
function n(v){var x=parseFloat(String(v==null?"":v).replace(",","."));return Number.isFinite(x)?x:0}
function i(v){return Math.max(0,Math.floor(n(v)))}
function brl(v){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number.isFinite(v)?v:0)}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]})}
function now(){return new Date().toISOString()}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function load(){
  try{var raw=localStorage.getItem(KEY);stores=raw?JSON.parse(raw):[];if(!Array.isArray(stores))stores=[]}catch(e){stores=[]}
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(stores))}catch(e){}}
function flash(t){
  var el=q("#consFlash");if(!el)return;el.textContent=t;el.classList.add("show");
  clearTimeout(flash._t);flash._t=setTimeout(function(){el.classList.remove("show")},2200);
}
function metrics(s){
  var delivered=i(s.deliveredQty),sold=i(s.soldQty),returned=i(s.returnedQty);
  var stock=Math.max(0,delivered-sold-returned);
  var price=Math.max(0,n(s.salePrice)),comm=Math.max(0,Math.min(99.99,n(s.commissionPct)))/100;
  var gross=sold*price,storeShare=gross*comm,producer=gross-storeShare;
  var paid=Math.max(0,n(s.paidAmount)),due=Math.max(0,producer-paid);
  var cost=Math.max(0,n(s.costPerUnit)),profitReceived=paid-(Math.min(sold,paid>0?sold:0)*cost);
  return{delivered:delivered,sold:sold,returned:returned,stock:stock,price:price,commission:comm,gross:gross,storeShare:storeShare,producer:producer,paid:paid,due:due,cost:cost,profitReceived:profitReceived};
}
function totals(){
  return stores.reduce(function(a,s){
    if(s.archived)return a;
    var m=metrics(s);
    a.points++;
    a.stock+=m.stock;
    a.delivered+=m.delivered;
    a.sold+=m.sold;
    a.due+=m.due;
    a.received+=m.paid;
    if(m.due>.009)a.owing++;
    if(m.producer>.009&&m.due<=.009)a.paidStores++;
    return a;
  },{points:0,stock:0,delivered:0,sold:0,due:0,received:0,owing:0,paidStores:0});
}
function status(m){
  if(m.producer>.009&&m.due<=.009)return["Pago","paid"];
  if(m.due>.009)return["A receber","due"];
  if(m.sold===0&&m.stock>0)return["Em exposição","stock"];
  if(m.stock===0)return["Sem estoque","empty"];
  return["Ativo","active"];
}
function storeById(x){return stores.find(function(s){return s.id===x})||null}
function movement(s,type,data){
  if(!Array.isArray(s.movements))s.movements=[];
  s.movements.unshift(Object.assign({id:id(),type:type,at:now()},data||{}));
  s.movements=s.movements.slice(0,100);
  s.updatedAt=now();
}
function setArea(area){
  ["dashboard","stores","simulator"].forEach(function(x){
    qa('[data-cons-area="'+x+'"]').forEach(function(b){b.classList.toggle("active",x===area)});
    qa('[data-cons-area-panel="'+x+'"]').forEach(function(p){p.classList.toggle("hidden",x!==area)});
  });
  try{localStorage.setItem(AREA_KEY,area)}catch(e){}
  if(area==="dashboard")renderDashboard();
  if(area==="stores")renderStores();
}
function renderDashboard(){
  var t=totals();
  if(q("#consDashPoints"))q("#consDashPoints").textContent=String(t.points);
  if(q("#consDashPieces"))q("#consDashPieces").textContent=String(t.stock);
  if(q("#consDashDue"))q("#consDashDue").textContent=brl(t.due);
  if(q("#consDashReceived"))q("#consDashReceived").textContent=brl(t.received);
  if(q("#consDashOwing"))q("#consDashOwing").textContent=String(t.owing);
  if(q("#consDashPaid"))q("#consDashPaid").textContent=String(t.paidStores);
  var body=q("#consStoresSummary");if(!body)return;
  var active=stores.filter(function(s){return !s.archived});
  if(!active.length){
    body.innerHTML='<tr><td colspan="8"><div class="cons-empty-state"><b>Nenhum ponto cadastrado</b><span>Adicione sua primeira loja/ponto para começar a controlar estoque e recebimentos.</span><button class="btn primary" data-go-cons-stores>Adicionar primeiro ponto</button></div></td></tr>';
  }else{
    body.innerHTML=active.map(function(s){
      var m=metrics(s),st=status(m);
      return '<tr><td><b>'+esc(s.name)+'</b><small class="table-sub">'+esc(s.address||"Sem endereço")+'</small></td>'+
        '<td>'+m.stock+' un.</td><td>'+m.sold+' un.</td><td>'+brl(m.producer)+'</td>'+
        '<td class="'+(m.due>.009?"warn":"good")+'"><b>'+brl(m.due)+'</b></td>'+
        '<td>'+brl(m.paid)+'</td><td><span class="cons-status '+st[1]+'">'+st[0]+'</span></td>'+
        '<td><button class="btn cons-mini-action" data-manage-store="'+s.id+'">Gerenciar</button></td></tr>';
    }).join("");
  }
  qa("[data-go-cons-stores]").forEach(function(b){b.onclick=function(){setArea("stores");setTimeout(function(){q("#storeName")?.focus()},0)}});
  qa("[data-manage-store]").forEach(function(b){b.onclick=function(){selectedId=b.dataset.manageStore;setArea("stores");renderStoreDetail()}});
  var alert=q("#consReceivableAlert");
  if(alert){
    if(t.owing>0)alert.innerHTML='<b>'+t.owing+' ponto(s) com valor a receber.</b> Total pendente: <strong>'+brl(t.due)+'</strong>.';
    else alert.innerHTML=t.points?'<b>Nenhum recebimento pendente.</b> Os pontos com vendas registradas estão quitados.':'Cadastre seus pontos para o painel começar a acompanhar recebíveis.';
    alert.classList.toggle("attention",t.owing>0);
  }
}
function clearStoreForm(){
  ["#storeName","#storeAddress","#storeProduct","#storeQty","#storePrice","#storeCommission","#storeCost"].forEach(function(sel){var el=q(sel);if(el)el.value=""});
  if(q("#storeSettlement"))q("#storeSettlement").value="quinzenal";
}
function importPricingCost(){
  try{
    if(document.body.dataset.calcConfirmed!=="true"){flash("Volte à Precificação e clique em Calcular antes de importar o custo.");return}
    var c=typeof costs==="function"?costs():null;
    if(!c||!Number.isFinite(c.total)||c.total<=0){flash("Faça um cálculo válido na Precificação antes de importar o custo.");return}
    q("#storeCost").value=c.total.toFixed(2);
    flash("Custo atual importado: "+brl(c.total)+".");
  }catch(e){flash("Não foi possível importar o custo agora.")}
}
function addStore(){
  var name=(q("#storeName").value||"").trim(),address=(q("#storeAddress").value||"").trim();
  var qty=i(q("#storeQty").value),price=n(q("#storePrice").value),commission=n(q("#storeCommission").value);
  if(!name){flash("Informe o nome do ponto/loja.");q("#storeName").focus();return}
  if(qty<=0){flash("Informe quantas peças foram deixadas.");q("#storeQty").focus();return}
  if(price<=0){flash("Informe o preço ao público.");q("#storePrice").focus();return}
  if(commission<0||commission>=100){flash("Revise a comissão da loja.");q("#storeCommission").focus();return}
  var s={
    id:id(),name:name,address:address,product:(q("#storeProduct").value||"").trim(),
    deliveredQty:qty,soldQty:0,returnedQty:0,salePrice:price,commissionPct:commission,
    paidAmount:0,costPerUnit:n(q("#storeCost").value),settlement:q("#storeSettlement").value,
    createdAt:now(),updatedAt:now(),archived:false,movements:[]
  };
  movement(s,"created",{qty:qty,note:"Ponto cadastrado"});
  stores.unshift(s);persist();selectedId=s.id;clearStoreForm();renderAll();renderStoreDetail();
  flash("Ponto adicionado com "+qty+" peça(s) em consignação.");
}
function renderStores(){
  var host=q("#consStoreCards");if(!host)return;
  var active=stores.filter(function(s){return !s.archived});
  if(!active.length){
    host.innerHTML='<div class="cons-empty-state"><b>Nenhum ponto cadastrado</b><span>Preencha o formulário acima e clique em “Adicionar ponto”.</span></div>';
  }else{
    host.innerHTML=active.map(function(s){
      var m=metrics(s),st=status(m);
      return '<article class="cons-store-card '+(selectedId===s.id?"selected":"")+'">'+
        '<div class="cons-store-card-head"><div><b>'+esc(s.name)+'</b><span>'+esc(s.address||"Sem endereço")+'</span></div><span class="cons-status '+st[1]+'">'+st[0]+'</span></div>'+
        '<div class="cons-store-metrics"><div><span>Em exposição</span><b>'+m.stock+'</b></div><div><span>Vendidas</span><b>'+m.sold+'</b></div><div><span>A receber</span><b>'+brl(m.due)+'</b></div></div>'+
        '<button class="btn '+(selectedId===s.id?"primary":"")+'" data-manage-store="'+s.id+'">'+(selectedId===s.id?"Gerenciando":"Gerenciar ponto")+'</button>'+
      '</article>';
    }).join("");
  }
  qa("[data-manage-store]").forEach(function(b){b.onclick=function(){selectedId=b.dataset.manageStore;renderStores();renderStoreDetail()}});
  renderStoreDetail();
}
function renderMovements(s){
  var host=q("#storeMovementList");if(!host)return;
  var arr=Array.isArray(s.movements)?s.movements:[];
  if(!arr.length){host.innerHTML='<div class="market-empty">Nenhuma movimentação registrada.</div>';return}
  var labels={created:"Ponto criado",sale:"Venda registrada",payment:"Pagamento recebido",return:"Devolução",restock:"Reposição",settled:"Quitação",edit:"Condições atualizadas"};
  host.innerHTML=arr.slice(0,12).map(function(x){
    var extra="";
    if(x.qty)extra+=" · "+x.qty+" un.";
    if(x.amount)extra+=" · "+brl(x.amount);
    return '<div class="cons-movement"><div><b>'+esc(labels[x.type]||x.type)+'</b><span>'+new Date(x.at).toLocaleString("pt-BR")+esc(extra)+'</span></div></div>';
  }).join("");
}
function renderStoreDetail(){
  var wrap=q("#consStoreDetail"),empty=q("#consStoreDetailEmpty");if(!wrap||!empty)return;
  var s=storeById(selectedId);
  if(!s||s.archived){wrap.classList.add("hidden");empty.classList.remove("hidden");return}
  empty.classList.add("hidden");wrap.classList.remove("hidden");
  var m=metrics(s),st=status(m);
  q("#detailStoreName").textContent=s.name;
  q("#detailStoreAddress").textContent=s.address||"Endereço não informado";
  q("#detailStoreProduct").textContent=s.product||"Produto não informado";
  q("#detailStoreStatus").className="cons-status "+st[1];q("#detailStoreStatus").textContent=st[0];
  q("#detailStock").textContent=m.stock+" un.";
  q("#detailSold").textContent=m.sold+" un.";
  q("#detailDue").textContent=brl(m.due);
  q("#detailPaid").textContent=brl(m.paid);
  q("#detailGross").textContent=brl(m.gross);
  q("#detailStoreShare").textContent=brl(m.storeShare);
  q("#detailProducerShare").textContent=brl(m.producer);
  q("#detailTerms").textContent=brl(m.price)+" ao público · "+(m.commission*100).toFixed(1).replace(".",",")+"% loja · acerto "+esc(s.settlement||"não definido");
  q("#editStorePrice").value=s.salePrice||"";
  q("#editStoreCommission").value=s.commissionPct||"";
  q("#editStoreAddress").value=s.address||"";
  renderMovements(s);
}
function registerSale(){
  var s=storeById(selectedId);if(!s)return;
  var qty=i(q("#movementSaleQty").value),m=metrics(s);
  if(qty<=0){flash("Informe a quantidade vendida.");return}
  if(qty>m.stock){flash("A venda não pode ser maior que o estoque em consignação.");return}
  s.soldQty=i(s.soldQty)+qty;movement(s,"sale",{qty:qty});q("#movementSaleQty").value="";persist();renderAll();flash(qty+" venda(s) registrada(s).");
}
function registerPayment(){
  var s=storeById(selectedId);if(!s)return;
  var amount=n(q("#movementPayment").value),m=metrics(s);
  if(amount<=0){flash("Informe o valor recebido.");return}
  if(m.due<=.009){flash("Este ponto não tem valor pendente.");return}
  if(amount>m.due+.01){flash("O pagamento informado é maior que o valor pendente.");return}
  s.paidAmount=n(s.paidAmount)+amount;movement(s,"payment",{amount:amount});q("#movementPayment").value="";persist();renderAll();flash("Pagamento de "+brl(amount)+" registrado.");
}
function registerReturn(){
  var s=storeById(selectedId);if(!s)return;
  var qty=i(q("#movementReturnQty").value),m=metrics(s);
  if(qty<=0){flash("Informe a quantidade devolvida.");return}
  if(qty>m.stock){flash("A devolução não pode ser maior que o estoque atual.");return}
  s.returnedQty=i(s.returnedQty)+qty;movement(s,"return",{qty:qty});q("#movementReturnQty").value="";persist();renderAll();flash(qty+" peça(s) devolvida(s).");
}
function registerRestock(){
  var s=storeById(selectedId);if(!s)return;
  var qty=i(q("#movementRestockQty").value);
  if(qty<=0){flash("Informe quantas peças serão adicionadas.");return}
  s.deliveredQty=i(s.deliveredQty)+qty;movement(s,"restock",{qty:qty});q("#movementRestockQty").value="";persist();renderAll();flash(qty+" peça(s) adicionada(s) ao ponto.");
}
function settleStore(){
  var s=storeById(selectedId);if(!s)return;var m=metrics(s);
  if(m.due<=.009){flash("Este ponto já está quitado.");return}
  s.paidAmount=m.producer;movement(s,"settled",{amount:m.due});persist();renderAll();flash("Acerto marcado como pago.");
}
function saveStoreTerms(){
  var s=storeById(selectedId);if(!s)return;
  var price=n(q("#editStorePrice").value),commission=n(q("#editStoreCommission").value);
  if(price<=0||commission<0||commission>=100){flash("Revise preço e comissão.");return}
  s.salePrice=price;s.commissionPct=commission;s.address=(q("#editStoreAddress").value||"").trim();
  movement(s,"edit",{note:"Preço/comissão/endereço atualizados"});persist();renderAll();flash("Condições do ponto atualizadas.");
}
function archiveStore(){
  var s=storeById(selectedId);if(!s)return;var m=metrics(s);
  if(m.due>.009){flash("Quite o valor pendente antes de encerrar o ponto.");return}
  if(m.stock>0&&!confirm("Ainda existem "+m.stock+" peça(s) em exposição. Encerrar mesmo assim?"))return;
  s.archived=true;s.updatedAt=now();persist();selectedId=null;renderAll();flash("Ponto encerrado.");
}
function renderAll(){renderDashboard();renderStores()}
function markSimulatorDirty(){
  var p=q("#consSimulatorPanel");if(!p)return;p.classList.remove("cons-sim-ready");
  var s=q("#consSimStatus");if(s)s.textContent="Há alterações pendentes. Clique em Calcular simulação.";
}
function calculateSimulator(){
  if(window.PrecificaConsignment&&typeof window.PrecificaConsignment.render==="function")window.PrecificaConsignment.render();
  var p=q("#consSimulatorPanel");if(p)p.classList.add("cons-sim-ready");
  var s=q("#consSimStatus");if(s)s.textContent="Calculado às "+new Date().toLocaleTimeString("pt-BR")+". Altere qualquer campo para exigir novo cálculo.";
  flash("Simulação atualizada.");
}
function initSimulatorGate(){
  var p=q("#consSimulatorPanel");if(!p)return;
  ["#quickConsResults","#consResults","#consScenarioBody","#negotiationText","#quickResaleResults","#resaleResults"].forEach(function(sel){
    var el=q(sel);if(!el)return;var wrap=(sel==="#consScenarioBody"?el.closest(".box"):sel==="#negotiationText"?el.closest(".negotiation-card"):el);if(wrap)wrap.classList.add("cons-calculated-output");
  });
  p.addEventListener("input",markSimulatorDirty);
  p.addEventListener("change",markSimulatorDirty);
  p.addEventListener("click",function(e){
    if(e.target.closest("#consCalculateNow"))return;
    if(e.target.closest(".quick-chip,[data-cons-mode],[data-cons-ui],#starterPreset,#useCalculatedCost,#useSuggestedResale"))setTimeout(markSimulatorDirty,0);
  });
  q("#consCalculateNow").onclick=calculateSimulator;
  markSimulatorDirty();
}
function init(){
  if(!q("#consignmentSection"))return;
  load();
  qa("[data-cons-area]").forEach(function(b){b.onclick=function(){setArea(b.dataset.consArea)}});
  q("#addConsStore").onclick=addStore;
  q("#importStoreCost").onclick=importPricingCost;
  q("#registerStoreSale").onclick=registerSale;
  q("#registerStorePayment").onclick=registerPayment;
  q("#registerStoreReturn").onclick=registerReturn;
  q("#registerStoreRestock").onclick=registerRestock;
  q("#settleStore").onclick=settleStore;
  q("#saveStoreTerms").onclick=saveStoreTerms;
  q("#archiveStore").onclick=archiveStore;
  initSimulatorGate();
  var area="dashboard";try{area=localStorage.getItem(AREA_KEY)||"dashboard"}catch(e){}
  if(["dashboard","stores","simulator"].indexOf(area)<0)area="dashboard";
  setArea(area);renderAll();
}
window.PrecificaConsignmentOps={render:renderAll,setArea:setArea,calculateSimulator:calculateSimulator};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();