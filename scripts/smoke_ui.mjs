import fs from "node:fs";
import {JSDOM} from "jsdom";

process.on("uncaughtException",(err)=>{console.error(err);process.exit(1)});
process.on("unhandledRejection",(err)=>{console.error(err);process.exit(1)});

const html=fs.readFileSync("index.html","utf8")
  .replace(/<script[^>]*src="\.\/vendor\/decimal\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/finance-engine\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/app\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/market\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/consignment-math\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/consignment\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/consignment-ops\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/ui\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/manual-calc\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/shell\.js[^"]*"[^>]*><\/script>/,"");
const decimal=fs.readFileSync("vendor/decimal.js","utf8");
const finance=fs.readFileSync("finance-engine.js","utf8");
const app=fs.readFileSync("app.js","utf8");
const market=fs.readFileSync("market.js","utf8");
const consMath=fs.readFileSync("consignment-math.js","utf8");
const cons=fs.readFileSync("consignment.js","utf8");
const consOps=fs.readFileSync("consignment-ops.js","utf8");
const ui=fs.readFileSync("ui.js","utf8");
const manualCalc=fs.readFileSync("manual-calc.js","utf8");
const shell=fs.readFileSync("shell.js","utf8");

const dom=new JSDOM(html,{runScripts:"outside-only",url:"https://example.test/precifica/"});
const {window}=dom;
window.console=console;
window.fetch=async (url)=>{
  const u=String(url);
  if(u.includes("tariffs.json")){
    return {ok:true,json:async()=>({
      agents:{
        "CPFL-PIRATINING":{sigAgente:"CPFL-PIRATINING",rate:0.73969,tusd:0.39564,te:0.34405,start:"2026-01-01"},
        "ELEKTRO":{sigAgente:"ELEKTRO",rate:0.89163,tusd:0.56527,te:0.32636,start:"2026-08-27"}
      }
    })};
  }
  if(u.includes("servicodados.ibge.gov.br")){
    return {ok:true,json:async()=>[{nome:"Praia Grande"},{nome:"Santos"}]};
  }
  throw new Error("Unexpected fetch "+u);
};
window.alert=()=>{};
window.confirm=()=>true;
window.HTMLElement.prototype.scrollIntoView=()=>{};

window.eval(decimal);
window.eval(finance);
window.eval(app);
window.eval(market);
window.eval(consMath);
window.eval(cons);
window.eval(consOps);
window.eval(ui);
window.eval(manualCalc);
window.eval(shell);
console.log("SMOKE: modules evaluated");
await new Promise(r=>setTimeout(r,100));

const q=(s)=>window.document.querySelector(s);
const qa=(s)=>[...window.document.querySelectorAll(s)];
function assert(cond,msg){if(!cond)throw new Error(msg)}

console.log("SMOKE: after init wait");
// Every fresh visitor must hit the access screen first.
assert(q("#accountModal").classList.contains("show"),"login-first gate must open on fresh session");
assert(q("#accountModal").classList.contains("locked"),"fresh login gate should be locked until an access option is chosen");
assert(qa("[data-auth-tab]").length===2,"login/create access tabs missing");
assert(q("#localLoginForm")&&q("#localSignupForm"),"functional local auth forms missing");
q("#guestLogin").click();
await new Promise(r=>setTimeout(r,5));
assert(!q("#accountModal").classList.contains("show"),"guest access did not release the app");

console.log("SMOKE: auth gate ok");
// Workspace navigation: professional dashboard + all calculators remain isolated.
assert(q(".side-nav"),"left workspace navigation missing");
assert(qa("[data-workspace-tab]").length===5,"expected 5 workspace tabs");
assert(window.document.body.dataset.workspace==="home","dashboard must be the default workspace");
assert(!q("#homeSection").classList.contains("workspace-hidden"),"dashboard hidden on startup");
assert(q("#marketSection").classList.contains("workspace-hidden"),"market should be hidden on dashboard");
assert(qa("[data-open-workspace]").length>=4,"dashboard shortcuts missing");
q('[data-open-workspace="calc"]').click();
await new Promise(r=>setTimeout(r,5));
assert(window.document.body.dataset.workspace==="calc","dashboard shortcut did not open calculator");
assert(q("#homeSection").classList.contains("workspace-hidden"),"dashboard stayed visible on calculator");
q('[data-workspace-tab="market"]').click();
assert(window.document.body.dataset.workspace==="market","market tab did not activate");
assert(!q("#marketSection").classList.contains("workspace-hidden"),"market section stayed hidden");
q('[data-workspace-tab="consignment"]').click();
assert(window.document.body.dataset.workspace==="consignment","consignment tab did not activate");
assert(!q("#consignmentSection").classList.contains("workspace-hidden"),"consignment section stayed hidden");
window.PrecificaUI.activate("calc",{scroll:false});

console.log("SMOKE: navigation ok");
// Zero-state contract: no calculation data may be assumed on startup.
assert(q("#priceChoices"),"priceChoices missing");
assert(q("#compareBody"),"compareBody missing");
assert(q("#auditCalc"),"auditCalc missing");
assert(q("#filamentPreset").value==="","filament must start unselected");
assert(q("#printerPreset").value==="","printer must start unselected");
assert(q("#stateSelect").value==="","state must start unselected");
assert(q('[data-p="weight"]').value==="0","weight must start at zero");
assert(q('[data-p="hours"]').value==="0","hours must start at zero");
assert(q('[data-p="qty"]').value==="0","output quantity must start at zero");
assert(q("#targetProfit").value==="0","profit target must start at zero");
assert(q("#targetMargin").value==="0","margin target must start at zero");
assert(q("#targetMarkup").value==="0","markup target must start at zero");
assert(q("#resCost").textContent.includes("0,00"),"result cost must start zero");
assert(q("#resPrice").textContent.includes("0,00"),"result price must start zero");
assert(q("#compareBody").children.length===0,"market comparison must not calculate before confirmation");
assert(window.document.body.dataset.calcConfirmed==="false","startup must be unconfirmed");

// Clicking Calculate with missing mandatory inputs must be blocked with explicit validation.
q("#calculateNowBtn").click();
await new Promise(r=>setTimeout(r,10));
assert(window.document.body.dataset.calcConfirmed==="false","invalid zero-state calculation should not confirm");
assert(!q("#calcValidationErrors").classList.contains("hidden"),"missing-input validation was not shown");

// Feed explicit production inputs. Nothing is assumed automatically.
q("#filamentPreset").value="pla65";q("#filamentPreset").dispatchEvent(new window.Event("change",{bubbles:true}));
q("#printerPreset").value="a1";q("#printerPreset").dispatchEvent(new window.Event("change",{bubbles:true}));
q("#stateSelect").value="SP";q("#stateSelect").dispatchEvent(new window.Event("change",{bubbles:true}));
await new Promise(r=>setTimeout(r,20));
q("#citySelect").value="Praia Grande";q("#citySelect").dispatchEvent(new window.Event("change",{bubbles:true}));
q("#distributorSelect").value="0";q("#distributorSelect").dispatchEvent(new window.Event("change",{bubbles:true}));
await new Promise(r=>setTimeout(r,20));
assert(Number((q("#distributorSelect").selectedOptions[0]?.dataset.rate)||0)>0,"explicit ANEEL tariff selection did not load");
assert(q("#kwhSource").textContent.includes("ANEEL"),"energy source not marked as ANEEL");
q("#saveDefaultsBtn").click();
const savedDefaults=JSON.parse(window.localStorage.getItem("precifica3d-defaults-v1")||"null");
assert(savedDefaults&&savedDefaults.selectedFilament==="pla65","filament default was not saved");
assert(savedDefaults.selectedPrinter==="a1","printer default was not saved");
assert(savedDefaults.uf==="SP"&&savedDefaults.city==="Praia Grande","energy location defaults were not saved");

const weight=q('[data-p="weight"]');
const hours=q('[data-p="hours"]');
const minutes=q('[data-p="minutes"]');
const qty=q('[data-p="qty"]');
weight.value="56.83"; weight.dispatchEvent(new window.Event("input",{bubbles:true}));
hours.value="3"; hours.dispatchEvent(new window.Event("input",{bubbles:true}));
minutes.value="49"; minutes.dispatchEvent(new window.Event("input",{bubbles:true}));
qty.value="1"; qty.dispatchEvent(new window.Event("input",{bubbles:true}));
await new Promise(r=>setTimeout(r,20));

assert(q("#resultSection").classList.contains("calc-result-pending"),"results should stay blocked until Calculate is clicked");
assert(q("#compareBody").children.length===0,"editing inputs must not expose marketplace results");
assert(window.document.body.dataset.calcConfirmed==="false","calculation should not be confirmed automatically");
q("#calculateNowBtn").click();
await new Promise(r=>setTimeout(r,20));
assert(!q("#resultSection").classList.contains("calc-result-pending"),"Calculate button did not release results");
assert(window.document.body.dataset.calcConfirmed==="true","confirmed calculation flag missing");
assert(!q("#resCost").textContent.includes("R$ 0,00"),"cost stayed zero after confirmed calculation");
assert(q("#costBreakdown").children.length>=7,"cost breakdown not rendered");
assert(q("#feeBreakdown").children.length>=6,"fee breakdown not rendered");
assert(q("#compareBody").children.length===7,"marketplace dashboard disappeared after calculation");
assert(q("#priceChoices").children.length===5,"quick scenarios must appear only after confirmed calculation");
assert(q("#auditCalc").textContent.includes("Decimal.js"),"calculation audit must identify Decimal precision engine");
const confirmedCost=q("#resCost").textContent;
weight.value="70";weight.dispatchEvent(new window.Event("input",{bubbles:true}));
await new Promise(r=>setTimeout(r,10));
assert(q("#resultSection").classList.contains("calc-result-pending"),"editing an input must require recalculation");
q("#calculateNowBtn").click();
await new Promise(r=>setTimeout(r,20));
assert(q("#resCost").textContent!==confirmedCost,"confirmed result did not change after weight changed and recalculation");

console.log("SMOKE: manual calc flow ok");
// Shopee button should keep scenarios and dashboard alive.
const shopee=qa("[data-ch]").find(x=>x.dataset.ch==="shopee");
shopee.click();
await new Promise(r=>setTimeout(r,10));
assert(q("#resultSection").classList.contains("calc-result-pending"),"channel change should require recalculation");
assert(q("#compareBody").children.length===0,"channel change should hide stale comparison until recalculation");
assert(!q("#auditCalc").textContent.includes("Erro interno"),"calculation error after Shopee selection");
q("#calculateNowBtn").click();
await new Promise(r=>setTimeout(r,20));
assert(window.document.body.dataset.calcConfirmed==="true","recalculation after channel change was not confirmed");

console.log("SMOKE: channel recalc ok");
// Consignação: operations dashboard, stores and simulator.
window.PrecificaUI.activate("consignment",{scroll:false});
assert(q("#consDashPoints"),"consignment operations dashboard missing");
assert(qa(".cons-area-tab").length===4,"expected four dedicated consignment tabs");
assert(!q('[data-cons-area-panel="dashboard"]').classList.contains("hidden"),"consignment dashboard should open first");
assert(q("#storeQty").value==="0","new point quantity must start zero");
assert(q("#storePrice").value==="0","new point price must start zero");
assert(q("#storeCommission").value==="0","new point commission must start zero");
window.PrecificaConsignmentOps.setArea("simulator");
assert(q("#consCost").value==="0","consignment simulator cost must start zero");
assert(q("#consSalePrice").value==="0","consignment simulator sale price must start zero");
assert(q("#consCommission").value==="0","consignment simulator commission must start zero");
assert(!q(".cons-simple-only").classList.contains("hidden"),"simple consignation mode should be visible in simulator");
assert(qa("[data-cons-ui]").length===2,"simple/full selector missing");
assert(qa('.quick-chip[data-quick-key="salePrice"]').length===4,"quick price options missing");
assert(qa('.quick-chip[data-quick-key="commissionPct"]').length===4,"quick commission options missing");
assert(qa('.quick-chip[data-quick-key="deliveredQty"]').length===4,"quick quantity options missing");

q("#useCalculatedCost").click();
await new Promise(r=>setTimeout(r,10));
assert(Number(q("#consCost").value)>0,"calculated unit cost was not imported");

// Quick chips must fill the detailed fields too.
qa('.quick-chip[data-quick-key="salePrice"]').find(x=>x.dataset.quickValue==="7.90").click();
qa('.quick-chip[data-quick-key="commissionPct"]').find(x=>x.dataset.quickValue==="30").click();
qa('.quick-chip[data-quick-key="deliveredQty"]').find(x=>x.dataset.quickValue==="20").click();
assert(q("#consSalePrice").value==="7.90","quick price did not sync detailed input");
assert(q("#consCommission").value==="30","quick commission did not sync detailed input");
assert(q("#consDelivered").value==="20","quick quantity did not sync detailed input");

// Deterministic test case.
q("#consCost").value="1.50";q("#consCost").dispatchEvent(new window.Event("input",{bubbles:true}));
q("#consSalePrice").value="7.90";q("#consSalePrice").dispatchEvent(new window.Event("input",{bubbles:true}));
q("#consCommission").value="30";q("#consCommission").dispatchEvent(new window.Event("input",{bubbles:true}));
q("#consOtherFees").value="0";q("#consOtherFees").dispatchEvent(new window.Event("input",{bubbles:true}));
await new Promise(r=>setTimeout(r,10));
assert(!q("#consSimulatorPanel").classList.contains("cons-sim-ready"),"simulator should require explicit Calculate");
q("#consCalculateNow").click();
await new Promise(r=>setTimeout(r,10));
assert(q("#consSimulatorPanel").classList.contains("cons-sim-ready"),"consignment Calculate button did not release results");
assert(q("#quickConsResults").textContent.includes("R$ 2,37")||q("#quickConsResults").textContent.includes("R$ 2,37"),"quick result store commission missing");
assert(q("#quickConsResults").textContent.includes("R$ 5,53")||q("#quickConsResults").textContent.includes("R$ 5,53"),"quick result producer payout missing");
assert(q("#quickConsResults").textContent.includes("R$ 4,03")||q("#quickConsResults").textContent.includes("R$ 4,03"),"quick result producer profit missing");

// Full mode still exposes all prior features.
q('[data-cons-ui="full"]').click();
assert(!q("#consResults").classList.contains("hidden"),"full detailed results did not open");
assert(q("#consResults").textContent.includes("R$ 4,03")||q("#consResults").textContent.includes("R$ 4,03"),"detailed producer profit missing");
assert(q("#consScenarioBody").children.length===16,"scenario simulator should have 16 rows");

// Store ledger: create point, calculate its margin, then manage sales and receivables.
window.PrecificaConsignmentOps.setArea("new");
assert(qa('.store-quick[data-store-field="storeQty"]').length===4,"new-point quantity buttons missing");
assert(qa('.store-quick[data-store-field="storeCommission"]').length===4,"new-point commission buttons missing");
qa('.store-quick[data-store-field="storeQty"]').find(x=>x.dataset.storeValue==="10").click();
assert(q("#storeQty").value==="10","new-point quick quantity did not apply");
q("#storeName").value="Loja Teste";
q("#storeAddress").value="Rua Centro, 100";
q("#storeProduct").value="Chaveiro";
q("#storeQty").value="10";
q("#storePrice").value="10";
q("#storeCommission").value="30";
q("#storeCost").value="2";
q("#storeSettlement").value="quinzenal";
q("#previewStoreTerms").click();
assert(q("#storePreviewRepasse").textContent.includes("7,00"),"store unit payout preview wrong");
assert(q("#storePreviewProfit").textContent.includes("5,00"),"store unit profit preview wrong");
assert(q("#storePreviewMargin").textContent.includes("50,0"),"store net margin preview wrong");
q("#addConsStore").click();
await new Promise(r=>setTimeout(r,10));
assert(!q('[data-cons-area-panel="manage"]').classList.contains("hidden"),"adding a point should open management");
assert(q("#consDashPoints").textContent==="1","store dashboard did not count the new point");
assert(q("#detailStock").textContent.includes("10"),"initial consigned stock wrong");
assert(q("#detailUnitMargin").textContent.includes("50,0"),"managed point net margin wrong");
window.PrecificaConsignmentOps.setArea("dashboard");
assert(q("#consDashStockCost").textContent.includes("20,00"),"dashboard consigned stock cost wrong");
assert(q("#consDashPotential").textContent.includes("100,00"),"dashboard retail potential wrong");
window.PrecificaConsignmentOps.setArea("manage");
q("#movementSaleQty").value="3";q("#registerStoreSale").click();
await new Promise(r=>setTimeout(r,10));
assert(q("#detailStock").textContent.includes("7"),"stock did not fall after sale");
assert(q("#detailDue").textContent.includes("21,00"),"receivable should be R$ 21,00 after 3 sales at R$10 with 30% commission");
q("#movementPayment").value="10";q("#registerStorePayment").click();
await new Promise(r=>setTimeout(r,10));
assert(q("#detailDue").textContent.includes("11,00"),"partial payment did not reduce amount due");
q("#settleStore").click();
await new Promise(r=>setTimeout(r,10));
assert(q("#detailDue").textContent.includes("0,00"),"settling store did not clear amount due");
window.PrecificaConsignmentOps.setArea("dashboard");
assert(q("#consDashPaid").textContent==="1","paid store was not counted in dashboard");

window.PrecificaUI.activate("calc",{scroll:false});

// Engine safety: invalid 100%+ manual commission must be blocked, never produce Infinity/NaN.
q("#overridePct").value="100";q("#overridePct").dispatchEvent(new window.Event("input",{bubbles:true}));
q("#calculateNowBtn").click();
await new Promise(r=>setTimeout(r,10));
assert(window.document.body.dataset.calcConfirmed==="false","100% commission should be rejected");
assert(q("#calcValidationErrors").textContent.includes("comissão"),"invalid commission reason missing");
q("#overridePct").value="";q("#overridePct").dispatchEvent(new window.Event("input",{bubbles:true}));
q("#calculateNowBtn").click();
await new Promise(r=>setTimeout(r,20));
assert(window.document.body.dataset.calcConfirmed==="true","valid calculation did not recover after invalid commission");

console.log("SMOKE: consignment ops ok");
// Radar de Mercado: deterministic statistics + current calculator integration.
assert(q("#marketSection"),"market section missing");
assert(q("#catalogSection"),"catalog section missing");
assert(window.PrecificaMarket,"market module not initialized");
assert(window.PrecificaMarket.median([10,20,30])===20,"median calculation wrong");
assert(window.PrecificaMarket.quantile([10,20,30,40],.25)===17.5,"P25 calculation wrong");
assert(window.PrecificaMarket.quantile([10,20,30,40],.75)===32.5,"P75 calculation wrong");

for(const p of [20,30,40]){
  q("#marketAddRef").click();
  const refs=qa(".market-ref");
  const ref=refs[refs.length-1];
  const price=ref.querySelector('[data-mf="price"]');
  price.value=String(p);price.dispatchEvent(new window.Event("input",{bubbles:true}));
}
await new Promise(r=>setTimeout(r,20));
assert(q("#marketCount").textContent==="3","market valid-reference count wrong");
assert(q("#marketMedian").textContent.includes("30,00"),"market median UI wrong");
assert(q("#marketDetail").textContent.includes("P25"),"market distribution table missing");
assert(q("#marketMath").textContent.includes("Ponto de equilíbrio"),"market break-even analysis missing");

// Saving a calculated product must create a catalog snapshot.
q("#projectName").value="Quebra-cabeça teste";
q("#marketSaveProduct").click();
await new Promise(r=>setTimeout(r,10));
assert(q("#catalogRows").children.length===1,"catalog snapshot was not saved");
assert(q("#catalogRows").textContent.includes("Quebra-cabeça teste"),"catalog product name missing");
assert(window.document.body.dataset.workspace==="catalog","saving from Radar should open catalog tab");
assert(!q("#catalogSection").classList.contains("workspace-hidden"),"catalog section stayed hidden after save");

console.log("SMOKE: radar/catalog ok");
// Account screen remains available from inside the app after session entry.
assert(q("#accountModal"),"account modal missing");
q("#openAccount").click();
assert(q("#accountModal").classList.contains("show"),"account modal did not reopen");
assert(q("#guestLogin"),"guest fallback missing");
q("#closeAccount").click();
assert(!q("#accountModal").classList.contains("show"),"authenticated account modal did not close");

console.log("UI smoke verification: OK");
window.close();
process.exit(0);
