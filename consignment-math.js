/* Precifica 3D — matemática de Consignação e Revenda
   Todas as contas financeiras passam pelo motor Decimal para evitar erros de ponto flutuante. */
(function(root,factory){
  var FX=root&&root.PrecificaFinance;
  if(typeof module==="object"&&module.exports){
    FX=FX||require("./finance-engine.js");
    module.exports=factory(FX);
    return;
  }
  root.PrecificaConsignmentMath=factory(FX);
})(typeof globalThis!=="undefined"?globalThis:this,function(FX){
  "use strict";
  if(!FX)throw new Error("Motor financeiro de precisão não carregado.");

  function n(v){return FX.number(v)}
  function nonneg(v){return Math.max(0,n(v))}
  function pct(v){return nonneg(v)/100}
  function safeDiv(a,b){return b>0?a/b:0}

  function commercialRoundUp(value,mode){return FX.number(FX.commercialRoundUp(value,mode))}

  function validateConsignment(i){
    var errors=[],c=FX.rate(i.commissionPct),t=FX.rate(i.otherFeesPct),m=FX.rate(i.desiredMarginPct);
    if(n(i.costPerUnit)<0)errors.push("Custo unitário inválido.");
    if(n(i.salePrice)<0)errors.push("Preço de venda inválido.");
    if(c.plus(t).gte(1))errors.push("Comissão + outras taxas precisam somar menos de 100%.");
    if(i.goalMode==="margin"&&c.plus(t).plus(m).gte(1))errors.push("Comissão + taxas + margem desejada precisam somar menos de 100%.");
    if(nonneg(i.soldQty)>nonneg(i.deliveredQty))errors.push("A quantidade vendida não pode ser maior que a entregue.");
    return errors;
  }

  function consignment(i){
    var errors=validateConsignment(i);
    if(errors.length)return{ok:false,errors:errors};
    try{
      var r=FX.consignment(i);
      return{
        ok:true,errors:[],
        storeCommission:n(r.storeCommission),
        otherFees:n(r.otherFees),
        producerNet:n(r.producerNet),
        unitProfit:n(r.unitProfit),
        netMargin:n(r.netMargin),
        roi:n(r.roi),
        priceMultiplier:n(r.priceMultiplier),
        minPrice:n(r.minPrice),
        suggestedPrice:n(r.suggestedPrice),
        grossSales:n(r.grossSales),
        totalStoreCommission:n(r.totalStoreCommission),
        totalProducerPayout:n(r.totalProducerPayout),
        totalProfit:n(r.totalProfit),
        unsoldQty:n(r.unsoldQty),
        parkedCost:n(r.parkedCost)
      };
    }catch(e){return{ok:false,errors:[String(e&&e.message||e)]}}
  }

  function validateResale(i){
    var errors=[];
    if(FX.rate(i.storeDesiredMarginPct).gte(1))errors.push("A margem desejada da loja precisa ser menor que 100%.");
    if(i.producerFeeMode==="percent"&&FX.rate(i.producerFeeValue).gte(1))errors.push("As taxas percentuais do produtor precisam ser menores que 100%.");
    return errors;
  }

  function resale(i){
    var errors=validateResale(i);
    if(errors.length)return{ok:false,errors:errors};
    try{
      var r=FX.resale(i);
      return{
        ok:true,errors:[],
        producerRevenuePerUnit:n(r.producerRevenuePerUnit),
        producerFeesPerUnit:n(r.producerFeesPerUnit),
        producerProfitPerUnit:n(r.producerProfitPerUnit),
        producerMargin:n(r.producerMargin),
        producerTotalProfit:n(r.producerTotalProfit),
        storeInvestment:n(r.storeInvestment),
        storeProfitPerUnit:n(r.storeProfitPerUnit),
        storeMargin:n(r.storeMargin),
        storePotentialRevenue:n(r.storePotentialRevenue),
        minWholesale:n(r.minWholesale),
        suggestedRetail:n(r.suggestedRetail)
      };
    }catch(e){return{ok:false,errors:[String(e&&e.message||e)]}}
  }

  function scenarioStatus(unitProfit,margin,healthyThresholdPct){
    var threshold=pct(healthyThresholdPct==null?20:healthyThresholdPct);
    if(unitProfit<0)return"loss";
    if(margin<threshold)return"tight";
    return"healthy";
  }

  return{
    commercialRoundUp:commercialRoundUp,
    validateConsignment:validateConsignment,
    consignment:consignment,
    validateResale:validateResale,
    resale:resale,
    scenarioStatus:scenarioStatus,
    _safeDiv:safeDiv
  };
});
