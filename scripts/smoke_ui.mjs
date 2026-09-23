import fs from "node:fs";
import {JSDOM} from "jsdom";

const html=fs.readFileSync("index.html","utf8")
  .replace(/<script[^>]*src="\.\/app\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/market\.js[^"]*"[^>]*><\/script>/,"")
  .replace(/<script[^>]*src="\.\/ui\.js[^"]*"[^>]*><\/script>/,"");
const app=fs.readFileSync("app.js","utf8");
const market=fs.readFileSync("market.js","utf8");
const ui=fs.readFileSync("ui.js","utf8");

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

window.eval(app);
window.eval(market);
window.eval(ui);
await new Promise(r=>setTimeout(r,100));

const q=(s)=>window.document.querySelector(s);
const qa=(s)=>[...window.document.querySelectorAll(s)];
function assert(cond,msg){if(!cond)throw new Error(msg)}

// Workspace navigation: calculator, market and catalog must be isolated in intuitive tabs.
assert(q(".side-nav"),"left workspace navigation missing");
assert(qa("[data-workspace-tab]").length===3,"expected 3 workspace tabs");
assert(window.document.body.dataset.workspace==="calc","calculator must be the default workspace");
assert(!q("#workspaceGrid > section").classList.contains("workspace-hidden"),"calculator section hidden on startup");
assert(q("#marketSection").classList.contains("workspace-hidden"),"market should be hidden on calculator tab");
q('[data-workspace-tab="market"]').click();
assert(window.document.body.dataset.workspace==="market","market tab did not activate");
assert(!q("#marketSection").classList.contains("workspace-hidden"),"market section stayed hidden");
assert(q("#workspaceGrid > section").classList.contains("workspace-hidden"),"calculator stayed visible on market tab");
window.PrecificaUI.activate("calc",{scroll:false});

// Basic UI smoke: calculators must populate instead of staying blank.
assert(q("#priceChoices"),"priceChoices missing");
assert(q("#compareBody"),"compareBody missing");
assert(q("#auditCalc"),"auditCalc missing");
assert(!q("#auditCalc").textContent.includes("Erro interno"),"calculation threw during startup");
assert(q("#priceChoices").children.length===5,"expected 5 quick price scenarios");
assert(q("#compareBody").children.length===7,"expected 7 marketplace comparison rows");

// Energy auto reference must become non-zero for Praia Grande -> CPFL Piratininga.
assert(window.state.energyMode==="reference","reference energy must be default");
assert(Number((q("#distributorSelect").selectedOptions[0]?.dataset.rate)||0)>0,"ANEEL tariff was not loaded");
assert(!q("#kwhUsed").textContent.includes("0,00"),"energy rate remained zero");
assert(q("#kwhSource").textContent.includes("ANEEL"),"energy source not marked as ANEEL");

// Feed a real composite-product-like input and ensure all dashboards remain populated.
const weight=q('[data-p="weight"]');
const hours=q('[data-p="hours"]');
const minutes=q('[data-p="minutes"]');
weight.value="56.83"; weight.dispatchEvent(new window.Event("input",{bubbles:true}));
hours.value="3"; hours.dispatchEvent(new window.Event("input",{bubbles:true}));
minutes.value="49"; minutes.dispatchEvent(new window.Event("input",{bubbles:true}));
await new Promise(r=>setTimeout(r,20));

assert(!q("#resCost").textContent.includes("R$ 0,00"),"cost stayed zero after input");
assert(q("#costBreakdown").children.length>=7,"cost breakdown not rendered");
assert(q("#feeBreakdown").children.length>=6,"fee breakdown not rendered");
assert(q("#compareBody").children.length===7,"marketplace dashboard disappeared after calculation");

// Shopee button should keep scenarios and dashboard alive.
const shopee=qa("[data-ch]").find(x=>x.dataset.ch==="shopee");
shopee.click();
await new Promise(r=>setTimeout(r,10));
assert(q("#priceChoices").children.length===5,"quick scenarios disappeared on Shopee");
assert(q("#compareBody").children.length===7,"comparison rows disappeared on Shopee");
assert(!q("#auditCalc").textContent.includes("Erro interno"),"calculation error after Shopee selection");

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

console.log("UI smoke verification: OK");
