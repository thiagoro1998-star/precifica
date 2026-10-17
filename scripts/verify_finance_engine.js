#!/usr/bin/env node
const FX=require("../finance-engine.js");

function assert(cond,msg){if(!cond)throw new Error(msg)}
function close(a,b,eps="0.000000000001"){
  const d=FX.norm(a).minus(FX.norm(b)).abs();
  assert(d.lte(FX.norm(eps)),`expected ${a} ~= ${b}; diff=${d.toString()}`);
}

// Decimal sanity: the classic JS binary-float case must be exact here.
assert(FX.norm("0.1").plus("0.2").eq("0.3"),"Decimal engine failed 0.1 + 0.2");

// Production math without intermediate rounding.
const p=FX.productionUnit({
  weightG:"56.83",hours:FX.norm(3).plus(FX.norm(49).div(60)),
  outputs:"1",filamentPrice:"65",filamentWeightG:"1000",
  watts:"95",kwhRate:"0.73969",maintenancePerHour:"0.30",failurePct:"0"
});
close(p.filament,"3.69395");
close(p.energy,FX.norm(3).plus(FX.norm(49).div(60)).times("0.095").times("0.73969"));
close(p.maintenance,FX.norm(3).plus(FX.norm(49).div(60)).times("0.30"));

// Seller result: direct.
let r=FX.sellerResult({price:"12.91",cost:"2.91",feePct:0,feeFixed:0,extraPct:0,extraFixed:0,taxPct:0,taxFixed:0,lossPct:0,cac:0});
close(r.profit,"10");

// Seller result: percentage + fixed + tax + loss + CAC.
r=FX.sellerResult({price:"50",cost:"10",feePct:"20",feeFixed:"4.50",extraPct:"2.5",extraFixed:"1.25",taxPct:"6",taxFixed:"0.20",lossPct:"1",cac:"2"});
close(r.marketplace,"17");
close(r.tax,"3.20");
close(r.loss,"0.50");
close(r.profit,"17.30");

// Consignação mandatory examples.
let c=FX.consignment({costPerUnit:"1.50",salePrice:"7.90",commissionPct:"30",otherFeesPct:"0",deliveredQty:"20",soldQty:"1",goalMode:"profit",desiredProfit:"4",desiredMarginPct:"0",rounding:"x90"});
close(c.storeCommission,"2.37");
close(c.producerNet,"5.53");
close(c.unitProfit,"4.03");
close(c.netMargin,FX.norm("4.03").div("7.90"));
close(c.priceMultiplier,FX.norm("7.90").div("1.50"));
close(c.minPrice,FX.norm("5.50").div("0.70"));
close(c.suggestedPrice,"7.90");

c=FX.consignment({costPerUnit:"0.80",salePrice:"7.90",commissionPct:"30",otherFeesPct:"0",deliveredQty:"20",soldQty:"1",goalMode:"profit",desiredProfit:"0",desiredMarginPct:"0",rounding:"none"});
close(c.unitProfit,"4.73");

// Reverse solver across a tier discontinuity.
const target=FX.norm("15");
const solved=FX.solveSegments({
  segments:[0,8,80,100,200],target,
  initialHigh:50,
  metric(price){
    const px=FX.norm(price);
    let pct,fixed,extra=0;
    if(px.lt(8)){pct=20;extra=50;fixed=0}
    else if(px.lt(80)){pct=20;fixed=4.5}
    else if(px.lt(100)){pct=14;fixed=16}
    else if(px.lt(200)){pct=14;fixed=20}
    else{pct=14;fixed=26}
    return FX.sellerResult({price:px,cost:"12",feePct:pct,feeFixed:fixed,extraPct:extra,extraFixed:0,taxPct:0,taxFixed:0,lossPct:0,cac:0}).profit;
  }
});
const solvedProfit=(()=>{
  const px=FX.norm(solved);let pct,fixed,extra=0;
  if(px.lt(8)){pct=20;extra=50;fixed=0}
  else if(px.lt(80)){pct=20;fixed=4.5}
  else if(px.lt(100)){pct=14;fixed=16}
  else if(px.lt(200)){pct=14;fixed=20}
  else{pct=14;fixed=26}
  return FX.sellerResult({price:px,cost:"12",feePct:pct,feeFixed:fixed,extraPct:extra,extraFixed:0,taxPct:0,taxFixed:0,lossPct:0,cac:0}).profit;
})();
assert(solvedProfit.gte(target),"segmented solver did not reach target");

console.log("Decimal finance verification: OK");
