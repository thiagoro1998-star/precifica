const assert=require("node:assert/strict");
const M=require("../consignment-math.js");
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);

// Teste 1
let r=M.consignment({costPerUnit:1.50,salePrice:7.90,commissionPct:30,otherFeesPct:0,deliveredQty:10,soldQty:1,goalMode:"profit",desiredProfit:0,desiredMarginPct:0,rounding:"none"});
assert.equal(r.ok,true);
near(r.storeCommission,2.37);
near(r.producerNet,5.53);
near(r.unitProfit,4.03);
near(r.netMargin,4.03/7.90);
near(r.priceMultiplier,7.90/1.50);

// Teste 2
r=M.consignment({costPerUnit:1.50,salePrice:7.90,commissionPct:30,otherFeesPct:0,deliveredQty:10,soldQty:0,goalMode:"profit",desiredProfit:4,desiredMarginPct:0,rounding:"x90"});
near(r.minPrice,5.50/.70);
near(r.suggestedPrice,7.90);

// Teste 3
r=M.consignment({costPerUnit:.80,salePrice:7.90,commissionPct:30,otherFeesPct:0,deliveredQty:10,soldQty:1,goalMode:"profit",desiredProfit:0,desiredMarginPct:0,rounding:"none"});
near(r.storeCommission,2.37);
near(r.producerNet,5.53);
near(r.unitProfit,4.73);

// Validações
r=M.consignment({costPerUnit:1,salePrice:10,commissionPct:50,otherFeesPct:20,deliveredQty:1,soldQty:1,goalMode:"margin",desiredMarginPct:30,rounding:"none"});
assert.equal(r.ok,false);
r=M.consignment({costPerUnit:1,salePrice:10,commissionPct:20,otherFeesPct:0,deliveredQty:1,soldQty:2,goalMode:"profit",desiredProfit:1,rounding:"none"});
assert.equal(r.ok,false);

// Arredondamento nunca abaixo do mínimo
assert.ok(M.commercialRoundUp(7.991,"x99")>=7.991);
near(M.commercialRoundUp(7.857142857,"x90"),7.90);

// Revenda percentual
let w=M.resale({costPerUnit:2,wholesalePrice:5,retailPrice:8,qty:10,producerFeeMode:"percent",producerFeeValue:10,producerDesiredProfit:2,storeDesiredMarginPct:30});
assert.equal(w.ok,true);near(w.producerFeesPerUnit,.5);near(w.producerProfitPerUnit,2.5);near(w.minWholesale,4/.9);

// Revenda fixa
w=M.resale({costPerUnit:2,wholesalePrice:5,retailPrice:8,qty:10,producerFeeMode:"fixed",producerFeeValue:.5,producerDesiredProfit:2,storeDesiredMarginPct:30});
near(w.producerFeesPerUnit,.5);near(w.minWholesale,4.5);

// Zero seguro
r=M.consignment({costPerUnit:0,salePrice:0,commissionPct:0,otherFeesPct:0,deliveredQty:0,soldQty:0,goalMode:"profit",desiredProfit:0,desiredMarginPct:0,rounding:"none"});
for(const v of [r.netMargin,r.roi,r.priceMultiplier])assert.ok(Number.isFinite(v));

console.log("Consignment math verification: OK");