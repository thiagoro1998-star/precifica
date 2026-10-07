/* Precifica 3D — matemática pura de Consignação e Revenda */
(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.PrecificaConsignmentMath=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  function n(v){
    var x=Number(v);
    return Number.isFinite(x)?x:0;
  }
  function nonneg(v){return Math.max(0,n(v))}
  function pct(v){return nonneg(v)/100}
  function safeDiv(a,b){return b>0?a/b:0}
  function round2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}

  function commercialRoundUp(value,mode){
    value=nonneg(value);
    if(mode==="none")return value;
    if(mode==="integer")return Math.ceil(value-1e-12);
    var ending=mode==="x99"?0.99:0.90;
    var whole=Math.floor(value+1e-12);
    var candidate=whole+ending;
    if(candidate+1e-9<value)candidate=whole+1+ending;
    return round2(candidate);
  }

  function validateConsignment(i){
    var errors=[];
    var c=pct(i.commissionPct),t=pct(i.otherFeesPct),m=pct(i.desiredMarginPct);
    if(nonneg(i.costPerUnit)!==n(i.costPerUnit))errors.push("Custo unitário inválido.");
    if(nonneg(i.salePrice)!==n(i.salePrice))errors.push("Preço de venda inválido.");
    if(c+t>=1)errors.push("Comissão + outras taxas precisam somar menos de 100%.");
    if(i.goalMode==="margin"&&c+t+m>=1)errors.push("Comissão + taxas + margem desejada precisam somar menos de 100%.");
    if(nonneg(i.soldQty)>nonneg(i.deliveredQty))errors.push("A quantidade vendida não pode ser maior que a entregue.");
    return errors;
  }

  function consignment(i){
    var errors=validateConsignment(i);
    if(errors.length)return{ok:false,errors:errors};

    var cost=nonneg(i.costPerUnit);
    var price=nonneg(i.salePrice);
    var commissionRate=pct(i.commissionPct);
    var feesRate=pct(i.otherFeesPct);
    var sold=nonneg(i.soldQty);
    var delivered=nonneg(i.deliveredQty);
    var desiredProfit=nonneg(i.desiredProfit);
    var desiredMargin=pct(i.desiredMarginPct);

    var storeCommission=price*commissionRate;
    var otherFees=price*feesRate;
    var producerNet=price-storeCommission-otherFees;
    var unitProfit=producerNet-cost;
    var netMargin=safeDiv(unitProfit,price);
    var roi=safeDiv(unitProfit,cost);
    var priceMultiplier=safeDiv(price,cost);

    var denominator=i.goalMode==="margin"
      ?1-commissionRate-feesRate-desiredMargin
      :1-commissionRate-feesRate;
    var minPrice=denominator>0
      ?(i.goalMode==="margin"?cost:(cost+desiredProfit))/denominator
      :0;
    var suggested=commercialRoundUp(minPrice,i.rounding||"x90");

    var remaining=Math.max(0,delivered-sold);
    return{
      ok:true,errors:[],
      storeCommission:storeCommission,
      otherFees:otherFees,
      producerNet:producerNet,
      unitProfit:unitProfit,
      netMargin:netMargin,
      roi:roi,
      priceMultiplier:priceMultiplier,
      minPrice:minPrice,
      suggestedPrice:suggested,
      grossSales:price*sold,
      totalStoreCommission:storeCommission*sold,
      totalProducerPayout:producerNet*sold,
      totalProfit:unitProfit*sold,
      unsoldQty:remaining,
      parkedCost:remaining*cost
    };
  }

  function validateResale(i){
    var errors=[];
    var margin=pct(i.storeDesiredMarginPct);
    if(margin>=1)errors.push("A margem desejada da loja precisa ser menor que 100%.");
    if(i.producerFeeMode==="percent"&&pct(i.producerFeeValue)>=1)errors.push("As taxas percentuais do produtor precisam ser menores que 100%.");
    return errors;
  }

  function resale(i){
    var errors=validateResale(i);
    if(errors.length)return{ok:false,errors:errors};

    var cost=nonneg(i.costPerUnit);
    var wholesale=nonneg(i.wholesalePrice);
    var retail=nonneg(i.retailPrice);
    var qty=nonneg(i.qty);
    var feeValue=nonneg(i.producerFeeValue);
    var feeMode=i.producerFeeMode==="fixed"?"fixed":"percent";
    var producerFees=feeMode==="fixed"?feeValue:wholesale*pct(feeValue);
    var producerProfit=wholesale-cost-producerFees;
    var producerMargin=safeDiv(producerProfit,wholesale);
    var storeProfit=retail-wholesale;
    var storeMargin=safeDiv(storeProfit,retail);
    var desiredProfit=nonneg(i.producerDesiredProfit);
    var minWholesale=feeMode==="fixed"
      ?cost+feeValue+desiredProfit
      :(1-pct(feeValue)>0?(cost+desiredProfit)/(1-pct(feeValue)):0);
    var desiredStoreMargin=pct(i.storeDesiredMarginPct);
    var suggestedRetail=1-desiredStoreMargin>0?wholesale/(1-desiredStoreMargin):0;

    return{
      ok:true,errors:[],
      producerRevenuePerUnit:wholesale,
      producerFeesPerUnit:producerFees,
      producerProfitPerUnit:producerProfit,
      producerMargin:producerMargin,
      producerTotalProfit:producerProfit*qty,
      storeInvestment:wholesale*qty,
      storeProfitPerUnit:storeProfit,
      storeMargin:storeMargin,
      storePotentialRevenue:retail*qty,
      minWholesale:minWholesale,
      suggestedRetail:suggestedRetail
    };
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
