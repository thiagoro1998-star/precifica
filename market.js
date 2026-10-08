/* Precifica 3D — Radar de Mercado e Catálogo
   Módulo isolado do motor central. Usa somente dados observados pelo usuário + matemática determinística.
*/
(function(){
"use strict";
var MARKET_KEY="precifica3d-market-v1";
var CATALOG_KEY="precifica3d-catalog-v1";
var marketState={refs:[],ownUrl:""};
var catalog=[];

function mnum(v){var x=parseFloat(String(v==null?"":v).replace(",","."));return Number.isFinite(x)?x:0}
function mid(){return "m"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]})}
function mbrl(v){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number.isFinite(v)?v:0)}
function mpct(v){return (Number.isFinite(v)?v:0).toFixed(1).replace(".",",")+"%"}
function todayISO(){return new Date().toISOString().slice(0,10)}
function loadJSON(key,fallback){try{var x=JSON.parse(localStorage.getItem(key));return x||fallback}catch(e){return fallback}}
function persist(){localStorage.setItem(MARKET_KEY,JSON.stringify(marketState));localStorage.setItem(CATALOG_KEY,JSON.stringify(catalog))}
function sortedNums(a){return a.filter(function(x){return Number.isFinite(x)}).slice().sort(function(a,b){return a-b})}
function quantile(values,q){
 var a=sortedNums(values);if(!a.length)return null;if(a.length===1)return a[0];
 var pos=(a.length-1)*q,base=Math.floor(pos),rest=pos-base;
 return a[base]+((a[base+1]!==undefined?a[base+1]:a[base])-a[base])*rest
}
function median(a){return quantile(a,.5)}
function mean(a){var v=sortedNums(a);return v.length?v.reduce(function(s,x){return s+x},0)/v.length:null}
function currentCalc(){
 try{
  var c=costs(), price;
  if(state.priceMode==="margin")price=priceForMargin(mnum(document.querySelector("#targetMargin").value),state.channel);
  else if(state.priceMode==="markup")price=c.total*(1+mnum(document.querySelector("#targetMarkup").value)/100);
  else price=priceFor(target(),state.channel);
  var r=resultAt(price,state.channel),p=productionSummary();
  var grams=p.details.reduce(function(a,x){return a+(x.weight/Math.max(1,x.outputs))},0);
  var hours=p.hoursPerUnit||0;
  return{ok:true,cost:c.total,price:price,profit:r.profit,margin:r.margin,markup:r.markup,channel:state.channel,
         channelName:(channels.find(function(x){return x[0]===state.channel})||["",""])[1],hours:hours,grams:grams,
         fees:r.f.total,tax:r.taxv,received:r.received};
 }catch(e){return{ok:false,error:String(e&&e.message||e),cost:0,price:0,profit:0,margin:0,channel:"direct",channelName:"Venda direta",hours:0,grams:0}}
}
function getStats(){
 var valid=marketState.refs.filter(function(r){return mnum(r.price)>0});
 var prices=valid.map(function(r){return mnum(r.price)});
 var buyer=valid.map(function(r){return mnum(r.price)+mnum(r.shipping)});
 var ratings=valid.map(function(r){var x=mnum(r.rating);return x>0?x:NaN});
 var sold=valid.map(function(r){var x=mnum(r.sold);return x>=0&&String(r.sold||"")!==""?x:NaN});
 return{
  n:valid.length,min:prices.length?Math.min.apply(null,prices):null,p25:quantile(prices,.25),median:median(prices),
  mean:mean(prices),p75:quantile(prices,.75),max:prices.length?Math.max.apply(null,prices):null,
  buyerMedian:median(buyer),ratingMedian:median(ratings),soldMedian:median(sold)
 }
}
function platformFromUrl(url){
 var u=String(url||"").toLowerCase();
 if(u.indexOf("shopee")>=0)return"Shopee";
 if(u.indexOf("mercadolivre")>=0||u.indexOf("mercadolibre")>=0)return"Mercado Livre";
 if(u.indexOf("amazon")>=0)return"Amazon";
 if(u.indexOf("magazineluiza")>=0||u.indexOf("magalu")>=0)return"Magalu";
 if(u.indexOf("tiktok")>=0)return"TikTok Shop";
 return"Outro";
}
function badge(text,type){return '<span class="market-badge '+(type||"")+'">'+esc(text)+'</span>'}
function renderRefs(){
 var host=document.querySelector("#marketRefs");if(!host)return;
 if(!marketState.refs.length){
  host.innerHTML='<div class="market-empty">Nenhuma referência ainda. Adicione anúncios reais que você encontrou no mercado. O Radar não inventa preço de concorrente.</div>';
  return;
 }
 host.innerHTML=marketState.refs.map(function(r){
  return '<div class="market-ref" data-ref="'+r.id+'">'+
   '<div class="market-ref-head"><b>'+esc(r.title||"Referência de mercado")+'</b>'+badge(r.platform||"Outro","source")+'<button class="icon market-del" data-id="'+r.id+'" title="Excluir">🗑</button></div>'+
   '<div class="market-ref-grid">'+
    '<div><label>Plataforma</label><select data-mf="platform" data-id="'+r.id+'">'+["Shopee","Mercado Livre","Amazon","Magalu","TikTok Shop","Loja própria","Outro"].map(function(x){return '<option '+(x===r.platform?"selected":"")+'>'+x+'</option>'}).join("")+'</select></div>'+
    '<div><label>Preço anunciado (R$)</label><input class="input" inputmode="decimal" type="number" min="0" step="0.01" data-mf="price" data-id="'+r.id+'" value="'+esc(r.price)+'"></div>'+
    '<div><label>Frete ao comprador (R$)</label><input class="input" inputmode="decimal" type="number" min="0" step="0.01" data-mf="shipping" data-id="'+r.id+'" value="'+esc(r.shipping)+'"></div>'+
    '<div><label>Avaliação <span class="muted">(opcional)</span></label><input class="input" inputmode="decimal" type="number" min="0" max="5" step="0.1" data-mf="rating" data-id="'+r.id+'" value="'+esc(r.rating)+'"></div>'+
    '<div><label>Vendas exibidas <span class="muted">(opcional)</span></label><input class="input" inputmode="numeric" type="number" min="0" step="1" data-mf="sold" data-id="'+r.id+'" value="'+esc(r.sold)+'"></div>'+
    '<div><label>Data observada</label><input class="input" type="date" data-mf="capturedAt" data-id="'+r.id+'" value="'+esc(r.capturedAt||todayISO())+'"></div>'+
    '<div class="market-wide"><label>Título / identificação <span class="muted">(opcional)</span></label><input class="input" data-mf="title" data-id="'+r.id+'" value="'+esc(r.title)+'" placeholder="Ex.: Kit 3 vasos decorativos"></div>'+
    '<div class="market-wide"><label>URL da fonte <span class="muted">(recomendado)</span></label><input class="input" inputmode="url" data-mf="url" data-id="'+r.id+'" value="'+esc(r.url)+'" placeholder="Cole o link do anúncio"></div>'+
   '</div>'+
   '<div class="hint">Desembolso observado ao comprador: <b>'+mbrl(mnum(r.price)+mnum(r.shipping))+'</b>. O frete é mostrado separado e não é tratado automaticamente como receita do vendedor.</div>'+
  '</div>'
 }).join("");
 host.querySelectorAll("[data-mf]").forEach(function(el){
  el.addEventListener("input",function(){
   var r=marketState.refs.find(function(x){return x.id===el.dataset.id});if(!r)return;
   r[el.dataset.mf]=el.value;
   if(el.dataset.mf==="url" && (!r.platform||r.platform==="Outro"))r.platform=platformFromUrl(el.value);
   persist();renderMarket();
  })
 });
 host.querySelectorAll(".market-del").forEach(function(b){b.onclick=function(){marketState.refs=marketState.refs.filter(function(x){return x.id!==b.dataset.id});persist();renderMarket()}});
}
function renderMarket(){
 var calc=currentCalc(),s=getStats();
 var count=document.querySelector("#marketCount"),med=document.querySelector("#marketMedian"),range=document.querySelector("#marketRange"),avg=document.querySelector("#marketAverage");
 if(count)count.textContent=String(s.n);
 if(med)med.textContent=s.median===null?"—":mbrl(s.median);
 if(range)range.textContent=s.n?mbrl(s.min)+" → "+mbrl(s.max):"—";
 if(avg)avg.textContent=s.mean===null?"—":mbrl(s.mean);

 var summary=document.querySelector("#marketMath");
 if(summary){
  if(!calc.ok){summary.innerHTML='<div class="note"><b>Complete/corrija a calculadora primeiro.</b> O Radar depende do custo calculado pelo motor principal.</div>'}
  else{
   var breakEven=priceFor(0,state.channel),marketProfit=s.median===null?null:resultAt(s.median,state.channel).profit;
   var profitHour=marketProfit===null||calc.hours<=0?null:marketProfit/calc.hours;
   var position="Sem referências suficientes",posType="";
   if(s.n){
    if(calc.price<s.p25){position="Seu preço calculado está abaixo do 1º quartil observado";posType="good"}
    else if(calc.price>s.p75){position="Seu preço calculado está acima do 3º quartil observado";posType="warn"}
    else {position="Seu preço calculado está dentro dos 50% centrais observados";posType="good"}
   }
   var marketSafety=s.median===null?"Adicione referências para comparar":(s.median<breakEven?"A mediana observada está ABAIXO do seu ponto de equilíbrio":"A mediana observada está ACIMA do seu ponto de equilíbrio");
   summary.innerHTML=
    '<div class="market-kpis">'+
      '<div class="market-kpi"><span>Ponto de equilíbrio · '+esc(calc.channelName)+'</span><b>'+mbrl(breakEven)+'</b></div>'+
      '<div class="market-kpi"><span>Seu preço calculado</span><b>'+mbrl(calc.price)+'</b></div>'+
      '<div class="market-kpi"><span>Lucro no preço mediano observado</span><b class="'+(marketProfit!==null&&marketProfit<0?"bad":"good")+'">'+(marketProfit===null?"—":mbrl(marketProfit))+'</b></div>'+
      '<div class="market-kpi"><span>Lucro/hora no preço mediano</span><b>'+(profitHour===null?"—":mbrl(profitHour)+"/h")+'</b></div>'+
    '</div>'+
    '<div class="market-signals">'+
      '<div>'+badge(position,posType)+'</div>'+
      '<div>'+badge(marketSafety,s.median!==null&&s.median<breakEven?"bad":"")+'</div>'+
      (s.n<3?'<div>'+badge("Base pequena: use 3+ referências para quartis mais úteis","warn")+'</div>':"")+
    '</div>'+
    (s.n?'<div class="market-formula"><b>Matemática aberta</b><br>Mediana dos preços anunciados: <b>'+mbrl(s.median)+'</b>. '+
      'Faixa central P25–P75: <b>'+mbrl(s.p25)+' – '+mbrl(s.p75)+'</b>. '+
      'Se você vendesse no preço mediano pelo canal <b>'+esc(calc.channelName)+'</b>, o motor aplicaria as mesmas taxas/impostos/CAC/reservas da calculadora e sobraria <b>'+mbrl(marketProfit)+'</b> líquido.</div>':"");
  }
 }

 var details=document.querySelector("#marketDetail");
 if(details){
  if(!s.n)details.innerHTML='<div class="market-empty">O comparativo aparece quando houver pelo menos uma referência válida.</div>';
  else{
   details.innerHTML='<div class="table"><table><thead><tr><th>Métrica</th><th>Valor observado</th><th>Leitura</th></tr></thead><tbody>'+
    '<tr><td>Menor preço</td><td>'+mbrl(s.min)+'</td><td>Extremo inferior da amostra</td></tr>'+
    '<tr><td>P25</td><td>'+mbrl(s.p25)+'</td><td>25% das referências estão até este preço</td></tr>'+
    '<tr><td>Mediana</td><td><b>'+mbrl(s.median)+'</b></td><td>Metade abaixo / metade acima</td></tr>'+
    '<tr><td>P75</td><td>'+mbrl(s.p75)+'</td><td>75% das referências estão até este preço</td></tr>'+
    '<tr><td>Maior preço</td><td>'+mbrl(s.max)+'</td><td>Extremo superior da amostra</td></tr>'+
    '<tr><td>Preço médio</td><td>'+mbrl(s.mean)+'</td><td>Média simples; mais sensível a extremos</td></tr>'+
    '<tr><td>Mediana com frete</td><td>'+mbrl(s.buyerMedian)+'</td><td>Desembolso do comprador; não é receita automática do vendedor</td></tr>'+
    (s.ratingMedian!==null?'<tr><td>Avaliação mediana</td><td>'+s.ratingMedian.toFixed(1).replace(".",",")+'/5</td><td>Apenas referências com avaliação informada</td></tr>':"")+
    (s.soldMedian!==null?'<tr><td>Vendas exibidas · mediana</td><td>'+Math.round(s.soldMedian)+'</td><td>Dado descritivo; períodos dos anúncios podem ser diferentes</td></tr>':"")+
   '</tbody></table></div>';
  }
 }
 renderRefs();
 renderCatalog();
}
function addRef(){
 marketState.refs.push({id:mid(),platform:"Outro",title:"",url:"",price:"",shipping:"0",rating:"",sold:"",capturedAt:todayISO()});
 persist();renderMarket();
 var refs=document.querySelectorAll(".market-ref");if(refs.length)refs[refs.length-1].scrollIntoView({behavior:"smooth",block:"center"})
}
function currentSnapshot(){
 var c=currentCalc(),s=getStats(),name=(document.querySelector("#projectName")||{}).value||"Produto sem nome";
 if(!c.ok||c.cost<=0)return null;
 return{id:mid(),name:name.trim()||"Produto sem nome",savedAt:new Date().toISOString(),channel:c.channel,channelName:c.channelName,
  cost:c.cost,price:c.price,profit:c.profit,margin:c.margin,markup:c.markup,hours:c.hours,grams:c.grams,
  profitHour:c.hours>0?c.profit/c.hours:null,marketN:s.n,marketMedian:s.median,marketP25:s.p25,marketP75:s.p75,refs:marketState.refs.map(function(x){return Object.assign({},x)})}
}
function saveProduct(){
 var snap=currentSnapshot();
 if(!snap){alert("Preencha peso/custos antes de salvar o produto.");return}
 catalog.unshift(snap);persist();renderCatalog();
 var el=document.querySelector("#catalogSection");if(el)el.scrollIntoView({behavior:"smooth",block:"start"})
}
function renderCatalog(){
 var host=document.querySelector("#catalogRows"),stats=document.querySelector("#catalogStats");if(!host||!stats)return;
 if(!catalog.length){
  stats.innerHTML='<div class="market-kpi"><span>Produtos salvos</span><b>0</b></div><div class="market-kpi"><span>Lucro médio / un.</span><b>—</b></div><div class="market-kpi"><span>Margem média</span><b>—</b></div><div class="market-kpi"><span>Lucro/hora médio</span><b>—</b></div>';
  host.innerHTML='<tr><td colspan="8" class="muted">Nenhum produto salvo ainda. Salve um cálculo para começar seu histórico.</td></tr>';return;
 }
 var avgProfit=catalog.reduce(function(a,x){return a+mnum(x.profit)},0)/catalog.length;
 var avgMargin=catalog.reduce(function(a,x){return a+mnum(x.margin)},0)/catalog.length;
 var ph=catalog.filter(function(x){return Number.isFinite(x.profitHour)});
 var avgPH=ph.length?ph.reduce(function(a,x){return a+x.profitHour},0)/ph.length:null;
 stats.innerHTML='<div class="market-kpi"><span>Produtos salvos</span><b>'+catalog.length+'</b></div>'+
  '<div class="market-kpi"><span>Lucro médio / un.</span><b>'+mbrl(avgProfit)+'</b></div>'+
  '<div class="market-kpi"><span>Margem média simples</span><b>'+mpct(avgMargin)+'</b></div>'+
  '<div class="market-kpi"><span>Lucro/hora médio</span><b>'+(avgPH===null?"—":mbrl(avgPH)+"/h")+'</b></div>';
 host.innerHTML=catalog.map(function(x){
   return '<tr><td><b>'+esc(x.name)+'</b><div class="muted">'+new Date(x.savedAt).toLocaleDateString("pt-BR")+'</div></td>'+
   '<td>'+esc(x.channelName)+'</td><td>'+mbrl(x.cost)+'</td><td>'+mbrl(x.price)+'</td><td class="good"><b>'+mbrl(x.profit)+'</b></td>'+
   '<td>'+mpct(x.margin)+'</td><td>'+(x.profitHour==null?"—":mbrl(x.profitHour)+"/h")+'</td>'+
   '<td><button class="icon catalog-del" data-id="'+x.id+'" title="Excluir">🗑</button></td></tr>'
 }).join("");
 host.querySelectorAll(".catalog-del").forEach(function(b){b.onclick=function(){catalog=catalog.filter(function(x){return x.id!==b.dataset.id});persist();renderCatalog()}});
}
function exportBusinessData(){
 var blob=new Blob([JSON.stringify({schema:1,exportedAt:new Date().toISOString(),market:marketState,catalog:catalog},null,2)],{type:"application/json"});
 var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="precifica3d-negocio.json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},0)
}
function initMarket(){
 var m=loadJSON(MARKET_KEY,{refs:[],ownUrl:""}),c=loadJSON(CATALOG_KEY,[]);
 marketState=m&&Array.isArray(m.refs)?m:{refs:[],ownUrl:""};
 catalog=Array.isArray(c)?c:[];
 var add=document.querySelector("#marketAddRef"),clear=document.querySelector("#marketClear"),save=document.querySelector("#marketSaveProduct"),exp=document.querySelector("#marketExport");
 if(add)add.onclick=addRef;
 if(clear)clear.onclick=function(){if(confirm("Limpar todas as referências de mercado atuais?")){marketState.refs=[];persist();renderMarket()}};
 if(save)save.onclick=saveProduct;
 if(exp)exp.onclick=exportBusinessData;
 document.addEventListener("input",function(e){if(!e.target.closest("#marketSection"))setTimeout(renderMarket,0)});
 document.addEventListener("change",function(e){if(!e.target.closest("#marketSection"))setTimeout(renderMarket,0)});
 document.addEventListener("click",function(e){if(e.target.closest("[data-ch],[data-price-mode],[data-scenario]"))setTimeout(renderMarket,0)});
 renderMarket()
}
window.PrecificaMarket={median:median,quantile:quantile,mean:mean,currentCalc:currentCalc,getStats:getStats,render:renderMarket};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initMarket);else initMarket();
})();