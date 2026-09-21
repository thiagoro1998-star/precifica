import fs from "node:fs";
import {JSDOM} from "jsdom";

const html=fs.readFileSync("index.html","utf8")
  .replace(/<script[^>]*src="\.\/app\.js[^"]*"[^>]*><\/script>/,"");
const app=fs.readFileSync("app.js","utf8");

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

window.eval(app);
await new Promise(r=>setTimeout(r,80));

const q=(s)=>window.document.querySelector(s);
const qa=(s)=>[...window.document.querySelectorAll(s)];
function assert(cond,msg){if(!cond)throw new Error(msg)}

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

console.log("UI smoke verification: OK");
