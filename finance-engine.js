/* Precifica 3D — motor financeiro de precisão
   Usa decimal.js (MIT) para impedir erros binários de ponto flutuante.
   Regra: nada é arredondado no meio da conta; arredondamento ocorre só na apresentação
   ou quando uma regra comercial pedir explicitamente um preço terminado em X,90/X,99. */
(function(root,factory){
  var DecimalCtor=root&&root.Decimal;
  if(typeof module==="object"&&module.exports){
    DecimalCtor=DecimalCtor||require("./vendor/decimal.js");
    module.exports=factory(DecimalCtor);
    return;
  }
  root.PrecificaFinance=factory(DecimalCtor);
})(typeof globalThis!=="undefined"?globalThis:this,function(Decimal){
  "use strict";
  if(!Decimal)throw new Error("decimal.js não carregado.");

  Decimal.set({precision:40,rounding:Decimal.ROUND_HALF_UP,toExpNeg:-30,toExpPos:40});

  function norm(v){
    if(v instanceof Decimal)return v;
    if(v===null||v===undefined||v==="")return new Decimal(0);
    if(typeof v==="string")v=v.trim().replace(",",".");
    try{
      var x=new Decimal(v);
      return x.isFinite()?x:new Decimal(0);
    }catch(e){return new Decimal(0)}
  }
  function nonneg(v){var x=norm(v);return x.isNegative()?new Decimal(0):x}
  function rate(v){return nonneg(v).div(100)}
  function number(v){var n=norm(v).toNumber();return Number.isFinite(n)?n:0}
  function fixed(v,dp){return norm(v).toDecimalPlaces(dp==null?2:dp,Decimal.ROUND_HALF_UP).toFixed(dp==null?2:dp)}
  function cents(v){return norm(v).toDecimalPlaces(2,Decimal.ROUND_HALF_UP)}
  function safeDiv(a,b){
    a=norm(a);b=norm(b);
    return b.isZero()?new Decimal(0):a.div(b);
  }
  function sum(values){return (values||[]).reduce(function(a,x){return a.plus(norm(x))},new Decimal(0))}
  function commercialRoundUp(value,mode){
    var x=nonneg(value);
    if(mode==="none"||!mode)return x;
    if(mode==="integer")return x.ceil();
    var ending=mode==="x99"?new Decimal("0.99"):new Decimal("0.90");
    var whole=x.floor(),candidate=whole.plus(ending);
    if(candidate.lt(x))candidate=whole.plus(1).plus(ending);
    return candidate.toDecimalPlaces(2,Decimal.ROUND_HALF_UP);
  }
  function productionUnit(i){
    var outputs=nonneg(i.outputs);
    if(outputs.lte(0))throw new Error("Quantidade produzida precisa ser maior que zero.");
    var weight=nonneg(i.weightG),hours=nonneg(i.hours),watts=nonneg(i.watts);
    var spoolPrice=nonneg(i.filamentPrice),spoolWeight=nonneg(i.filamentWeightG);
    if(spoolWeight.lte(0))throw new Error("Peso do rolo precisa ser maior que zero.");
    var failMultiplier=new Decimal(1).plus(rate(i.failurePct));
    var filament=weight.times(spoolPrice.div(spoolWeight)).times(failMultiplier).div(outputs);
    var energy=hours.times(watts).div(1000).times(nonneg(i.kwhRate)).div(outputs);
    var maintenance=hours.times(nonneg(i.maintenancePerHour)).div(outputs);
    return{
      filament:filament,energy:energy,maintenance:maintenance,
      total:filament.plus(energy).plus(maintenance),
      hoursPerUnit:hours.div(outputs)
    };
  }
  function sellerResult(i){
    var price=nonneg(i.price),cost=nonneg(i.cost);
    var feePct=rate(i.feePct),extraPct=rate(i.extraPct),taxPct=rate(i.taxPct),lossPct=rate(i.lossPct);
    var marketplacePct=price.times(feePct.plus(extraPct));
    var marketplaceFixed=nonneg(i.feeFixed).plus(nonneg(i.extraFixed));
    var marketplace=marketplacePct.plus(marketplaceFixed);
    var tax=price.times(taxPct).plus(nonneg(i.taxFixed));
    var loss=price.times(lossPct),cac=nonneg(i.cac);
    var received=price.minus(marketplace).minus(tax).minus(loss).minus(cac);
    var profit=received.minus(cost);
    var margin=price.gt(0)?profit.div(price).times(100):new Decimal(0);
    var markup=cost.gt(0)?price.div(cost).minus(1).times(100):new Decimal(0);
    return{price:price,cost:cost,marketplace:marketplace,tax:tax,loss:loss,cac:cac,received:received,profit:profit,marginPct:margin,markupPct:markup};
  }
  function consignment(i){
    var cost=nonneg(i.costPerUnit),price=nonneg(i.salePrice),commission=rate(i.commissionPct),other=rate(i.otherFeesPct);
    if(commission.plus(other).gte(1))throw new Error("Comissão + taxas precisam somar menos de 100%.");
    var storeCommission=price.times(commission),otherFees=price.times(other),producerNet=price.minus(storeCommission).minus(otherFees);
    var unitProfit=producerNet.minus(cost);
    var netMargin=price.gt(0)?unitProfit.div(price):new Decimal(0);
    var roi=cost.gt(0)?unitProfit.div(cost):new Decimal(0);
    var multiplier=cost.gt(0)?price.div(cost):new Decimal(0);
    var sold=nonneg(i.soldQty),delivered=nonneg(i.deliveredQty);
    if(sold.gt(delivered))throw new Error("Vendidas não pode ser maior que entregues.");
    var desiredMargin=rate(i.desiredMarginPct),desiredProfit=nonneg(i.desiredProfit);
    var denominator=i.goalMode==="margin"
      ?new Decimal(1).minus(commission).minus(other).minus(desiredMargin)
      :new Decimal(1).minus(commission).minus(other);
    if(denominator.lte(0))throw new Error("Meta inviável: comissão, taxas e margem atingem 100% ou mais.");
    var minPrice=(i.goalMode==="margin"?cost:cost.plus(desiredProfit)).div(denominator);
    var remaining=Decimal.max(new Decimal(0),delivered.minus(sold));
    return{
      storeCommission:storeCommission,otherFees:otherFees,producerNet:producerNet,unitProfit:unitProfit,
      netMargin:netMargin,roi:roi,priceMultiplier:multiplier,minPrice:minPrice,
      suggestedPrice:commercialRoundUp(minPrice,i.rounding||"none"),
      grossSales:price.times(sold),totalStoreCommission:storeCommission.times(sold),
      totalProducerPayout:producerNet.times(sold),totalProfit:unitProfit.times(sold),
      unsoldQty:remaining,parkedCost:remaining.times(cost)
    };
  }
  function resale(i){
    var cost=nonneg(i.costPerUnit),wholesale=nonneg(i.wholesalePrice),retail=nonneg(i.retailPrice),qty=nonneg(i.qty);
    var feeValue=nonneg(i.producerFeeValue),feeMode=i.producerFeeMode==="fixed"?"fixed":"percent";
    if(feeMode==="percent"&&rate(feeValue).gte(1))throw new Error("Taxa do produtor precisa ser menor que 100%.");
    var producerFees=feeMode==="fixed"?feeValue:wholesale.times(rate(feeValue));
    var producerProfit=wholesale.minus(cost).minus(producerFees);
    var producerMargin=wholesale.gt(0)?producerProfit.div(wholesale):new Decimal(0);
    var storeProfit=retail.minus(wholesale);
    var storeMargin=retail.gt(0)?storeProfit.div(retail):new Decimal(0);
    var desiredProfit=nonneg(i.producerDesiredProfit),denom=feeMode==="fixed"?new Decimal(1):new Decimal(1).minus(rate(feeValue));
    var minWholesale=feeMode==="fixed"?cost.plus(feeValue).plus(desiredProfit):cost.plus(desiredProfit).div(denom);
    var desiredStoreMargin=rate(i.storeDesiredMarginPct);
    if(desiredStoreMargin.gte(1))throw new Error("Margem da loja precisa ser menor que 100%.");
    var suggestedRetail=wholesale.div(new Decimal(1).minus(desiredStoreMargin));
    return{
      producerRevenuePerUnit:wholesale,producerFeesPerUnit:producerFees,producerProfitPerUnit:producerProfit,
      producerMargin:producerMargin,producerTotalProfit:producerProfit.times(qty),storeInvestment:wholesale.times(qty),
      storeProfitPerUnit:storeProfit,storeMargin:storeMargin,storePotentialRevenue:retail.times(qty),
      minWholesale:minWholesale,suggestedRetail:suggestedRetail
    };
  }
  function solveSegments(opts){
    var segments=(opts.segments&&opts.segments.length?opts.segments:[0]).map(norm);
    var target=norm(opts.target),metric=opts.metric,max=norm(opts.maxPrice||10000000);
    var eps=new Decimal("0.0000000001"),candidates=[];
    function ok(x){var m=norm(metric(number(x)));return m.gte(target)}
    for(var si=0;si<segments.length;si++){
      var a=segments[si],b=si+1<segments.length?segments[si+1]:null;
      if(ok(a)){candidates.push(a);continue}
      var lo=a,hi;
      if(b){
        hi=Decimal.max(a,b.minus(eps));
        if(!ok(hi))continue;
      }else{
        hi=Decimal.max(a.plus(1),norm(opts.initialHigh||20));
        var guard=0;
        while(!ok(hi)&&guard++<120){
          hi=hi.times("1.7");
          if(!hi.isFinite()||hi.gt(max))break;
        }
        if(!ok(hi))continue;
      }
      for(var j=0;j<140;j++){
        var mid=lo.plus(hi).div(2);
        if(ok(mid))hi=mid;else lo=mid;
      }
      candidates.push(hi);
    }
    if(!candidates.length)throw new Error("Não existe preço viável com as taxas e metas atuais.");
    var best=candidates.reduce(function(a,x){return x.lt(a)?x:a},candidates[0]);
    // Preço de venda é uma moeda executável. Quando currencyStep é informado,
    // subimos para o próximo centavo e garantimos que a meta continue satisfeita.
    if(opts.currencyStep){
      var step=nonneg(opts.currencyStep);
      if(step.gt(0)){
        best=best.div(step).ceil().times(step);
        var guard=0;
        while(!ok(best)&&guard++<20)best=best.plus(step);
      }
    }
    return best;
  }
  return{
    Decimal:Decimal,norm:norm,number:number,fixed:fixed,cents:cents,rate:rate,safeDiv:safeDiv,sum:sum,
    commercialRoundUp:commercialRoundUp,productionUnit:productionUnit,sellerResult:sellerResult,
    consignment:consignment,resale:resale,solveSegments:solveSegments
  };
});
