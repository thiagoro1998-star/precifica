
var $=function(s){return document.querySelector(s)}, $$=function(s){return Array.from(document.querySelectorAll(s))};
function num(v){var x=parseFloat(String(v==null?"":v).replace(",","."));return Number.isFinite(x)?x:0}
function brl(v){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number.isFinite(v)?v:0)}
function pc(v){return (Number.isFinite(v)?v:0).toFixed(1).replace(".",",")+"%"}
function id(){return Math.random().toString(36).slice(2,9)}
var KEY="precifica3d-presets-v1";
var def={
 filaments:[{id:"pla65",name:"PLA 1 kg — R$ 65",material:"PLA",price:65,weight:1000}],
 printers:[
  {id:"a1",name:"Bambu Lab A1",watts:95,maintenance:.30},{id:"a1mini",name:"Bambu Lab A1 Mini",watts:70,maintenance:.25},
  {id:"p1p",name:"Bambu Lab P1P",watts:110,maintenance:.35},{id:"p1s",name:"Bambu Lab P1S",watts:120,maintenance:.40},
  {id:"x1c",name:"Bambu Lab X1 Carbon",watts:125,maintenance:.50},{id:"e3se",name:"Creality Ender 3 V3 SE",watts:120,maintenance:.25},
  {id:"e3ke",name:"Creality Ender 3 V3 KE",watts:140,maintenance:.30},{id:"k1c",name:"Creality K1C",watts:160,maintenance:.40},
  {id:"kobra3",name:"Anycubic Kobra 3",watts:130,maintenance:.30},{id:"neptune4pro",name:"Elegoo Neptune 4 Pro",watts:150,maintenance:.30}
 ],
 packaging:[
  {id:"none",name:"Sem embalagem",unit:0},{id:"opp",name:"Saquinho OPP",unit:.15},{id:"bubbleenv",name:"Envelope bolha",unit:.80},
  {id:"boxsmall",name:"Caixinha pequena",unit:1.50},{id:"blackbag",name:"Saquinho preto para envio",unit:.30},{id:"bubble",name:"Plástico bolha",unit:.25}
 ],
 supplies:[
  {id:"keyring",name:"Argola de chaveiro",unit:.18},{id:"carabiner",name:"Mosquetão de chaveiro",unit:.60},
  {id:"earhook",name:"Gancho de brinco",unit:.12},{id:"ring",name:"Argolinha metálica",unit:.08},
  {id:"magnet",name:"Ímã neodímio",unit:.50},{id:"screw",name:"Parafuso",unit:.10},{id:"felt",name:"Feltro",unit:.15},{id:"tape",name:"Fita dupla face",unit:.20}
 ]
};
function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){try{var x=JSON.parse(localStorage.getItem(KEY));return x?Object.assign(clone(def),x):clone(def)}catch(e){return clone(def)}}
function save(){localStorage.setItem(KEY,JSON.stringify(presets))}
var presets=load();
var state={
 mode:"equal",pieces:[{id:id(),name:"",weight:"",hours:"",minutes:0,qty:1,slicerCost:""}],energyMode:"bill",
 selectedFilament:presets.filaments[0]?presets.filaments[0].id:"",selectedPrinter:presets.printers[0]?presets.printers[0].id:"",
 packaging:[],supplies:[],channel:"direct",priceMode:"suggest",
 channelOpts:{amazonCategory:"Casa",amazonPlan:"individual",magaluPromo:false,magaluItemFee:false,tiktokShipping:false,tiktokAffiliate:0}
};
var ufs=["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
// Tarifas B1 residenciais sem tributos. Só usamos referências verificadas/identificáveis.
// Praia Grande/SP pode ter registros de atendimento de mais de uma distribuidora; por isso o usuário escolhe a distribuidora.
var energyRefs={
 "SP|Praia Grande":[
   {id:"elektro",name:"Neoenergia Elektro — B1 ANEEL",rate:.8916,source:"ANEEL REH 3.605/2026 · vigente desde 27/08/2026 · sem tributos"},
   {id:"cpflp",name:"CPFL Piratininga — B1 ANEEL",rate:.7397,source:"ANEEL REH 3.543/2025 · vigência 2026 · sem tributos"}
 ]
};
var amazonCats={"Comidas e bebidas":10,"Indústria e Ciência":12,"Brinquedos e jogos":12,"Casa":12,"Papelaria e Escritório":13,"Ferramentas e Construção":11,"Eletrônicos portáteis":13,"Roupas e acessórios":14,"Joias":14,"Livros":15,"Demais categorias":15};
var channels=[["direct","Venda direta"],["shopee","Shopee"],["mlclassic","ML Clássico"],["mlpremium","ML Premium"],["amazon","Amazon"],["magalu","Magalu"],["tiktok","TikTok Shop"]];

function options60(v){var s="";for(var i=0;i<60;i++)s+='<option '+(String(v)==String(i)?"selected":"")+'>'+i+"</option>";return s}
function options100(v){var s="";for(var i=1;i<=100;i++)s+='<option '+(Number(v)==i?"selected":"")+'>'+i+"</option>";return s}
function renderPieces(){
 var host=$("#pieces");host.innerHTML="";
 state.pieces.forEach(function(p,i){
  var d=document.createElement("div");d.className="piece";
  d.innerHTML='<div class="pieceGrid"><div><label>'+(state.mode==="equal"?"Nome da peça":"Componente / fatiamento")+' <span class="muted">(opcional)</span></label><input class="input" data-p="name" data-id="'+p.id+'" placeholder="'+(state.mode==="equal"?"Peça "+(i+1):"Ex.: Moldura / Encaixes")+'" value="'+(p.name||"")+'"></div>'+
   '<div><label>'+(state.mode==="equal"?"Peso total do fatiador (g)":"Peso total deste fatiamento (g)")+'</label><input class="input" type="number" min="0" step="0.01" data-p="weight" data-id="'+p.id+'" value="'+p.weight+'"></div>'+
   '<div><label>Horas totais</label><input class="input" type="number" min="0" max="999" step="1" data-p="hours" data-id="'+p.id+'" value="'+p.hours+'"></div>'+
   '<div><label>Minutos</label><select data-p="minutes" data-id="'+p.id+'">'+options60(p.minutes)+'</select></div>'+
   '<div><label>'+(state.mode==="equal"?"Produtos gerados":"Produtos finais atendidos")+'</label><select data-p="qty" data-id="'+p.id+'">'+options100(p.qty)+'</select></div>'+
   '<div><label>Custo no fatiador <span class="muted">(R$ opc.)</span></label><input class="input" type="number" min="0" step="0.01" data-p="slicerCost" data-id="'+p.id+'" value="'+(p.slicerCost||"")+'" placeholder="Ex.: 2,79"></div>'+
   '<button class="icon" data-del="'+p.id+'" title="Excluir">🗑</button></div>'+
   '<div class="hint" style="margin-top:7px">'+(state.mode==="equal"?"Peso e tempo são da mesa inteira; o sistema divide pela quantidade de produtos gerados.":"Cada linha representa um fatiamento/componente do MESMO produto final. Ex.: moldura + encaixes. O custo por produto soma todas as linhas, dividindo cada uma apenas pelo número de produtos finais que aquele fatiamento atende.")+'</div>';
  host.appendChild(d);
 });
 $$("[data-p]").forEach(function(el){el.oninput=function(e){var p=state.pieces.find(function(x){return x.id===e.target.dataset.id});p[e.target.dataset.p]=e.target.value;calc()}});
 $$("[data-del]").forEach(function(b){b.onclick=function(){if(state.pieces.length>1){state.pieces=state.pieces.filter(function(x){return x.id!==b.dataset.del});renderPieces();calc()}}});
}
function renderSelects(){
 var f=$("#filamentPreset");f.innerHTML=presets.filaments.map(function(x){return '<option value="'+x.id+'">'+x.name+"</option>"}).join("");
 if(!presets.filaments.some(function(x){return x.id===state.selectedFilament}))state.selectedFilament=presets.filaments[0]?presets.filaments[0].id:"";
 f.value=state.selectedFilament;
 var p=$("#printerPreset");p.innerHTML=presets.printers.map(function(x){return '<option value="'+x.id+'">'+x.name+"</option>"}).join("");
 if(!presets.printers.some(function(x){return x.id===state.selectedPrinter}))state.selectedPrinter=presets.printers[0]?presets.printers[0].id:"";
 p.value=state.selectedPrinter;syncPrinter();renderRows("packaging");renderRows("supplies");
}
function syncPrinter(){var p=presets.printers.find(function(x){return x.id===state.selectedPrinter});if(p){$("#printerWatts").value=p.watts;$("#maintenanceHour").value=p.maintenance}}
function renderRows(kind){
 var arr=state[kind], cat=presets[kind==="packaging"?"packaging":"supplies"], host=$(kind==="packaging"?"#packagingRows":"#supplyRows");host.innerHTML="";
 if(!arr.length)host.innerHTML='<div class="hint" style="margin-bottom:8px">Nenhum item adicionado.</div>';
 arr.forEach(function(r){
  var d=document.createElement("div");d.className="item";
  d.innerHTML='<select data-rsel="'+kind+'" data-id="'+r.id+'">'+cat.map(function(x){return '<option value="'+x.id+'" '+(x.id===r.presetId?"selected":"")+'>'+x.name+"</option>"}).join("")+'</select>'+
   '<input class="input" data-runit="'+kind+'" data-id="'+r.id+'" type="number" min="0" step="0.001" value="'+r.unit+'">'+
   '<input class="input" data-rqty="'+kind+'" data-id="'+r.id+'" type="number" min="0" step="1" value="'+r.qty+'">'+
   '<button class="icon" data-rdel="'+kind+'" data-id="'+r.id+'">🗑</button>';
  host.appendChild(d);
 });
 $$('[data-rsel="'+kind+'"]').forEach(function(x){x.onchange=function(e){var r=arr.find(function(y){return y.id===e.target.dataset.id}),p=cat.find(function(y){return y.id===e.target.value});r.presetId=p.id;r.unit=p.unit;renderRows(kind);calc()}});
 $$('[data-runit="'+kind+'"]').forEach(function(x){x.oninput=function(e){arr.find(function(y){return y.id===e.target.dataset.id}).unit=num(e.target.value);calc()}});
 $$('[data-rqty="'+kind+'"]').forEach(function(x){x.oninput=function(e){arr.find(function(y){return y.id===e.target.dataset.id}).qty=Math.max(0,num(e.target.value));calc()}});
 $$('[data-rdel="'+kind+'"]').forEach(function(x){x.onclick=function(e){state[kind]=arr.filter(function(y){return y.id!==e.currentTarget.dataset.id});renderRows(kind);calc()}});
}
function addRow(kind){var cat=presets[kind==="packaging"?"packaging":"supplies"];if(!cat.length)return;state[kind].push({id:id(),presetId:cat[0].id,unit:cat[0].unit,qty:1});renderRows(kind);calc()}

function meta(ch){
 var m={direct:["Alta","Sem taxa por padrão","Configuração do usuário"],shopee:["Referência","20/09/2026","Confirme no Seller Center"],mlclassic:["Alta","20/09/2026","Universidade de Vendedores Mercado Livre"],mlpremium:["Alta","20/09/2026","Universidade de Vendedores Mercado Livre"],amazon:["Alta","19/09/2026","Amazon Brasil"],magalu:["Referência","20/09/2026","Condições variam por conta/categoria"],tiktok:["Alta","15/07/2026","TikTok Shop Seller University"]};return m[ch]
}
function renderMarkets(){
 $("#marketTabs").innerHTML=channels.map(function(c){return '<button class="tab '+(state.channel===c[0]?"active":"")+'" data-ch="'+c[0]+'">'+c[1]+"</button>"}).join("");
 $$("[data-ch]").forEach(function(b){b.onclick=function(){state.channel=b.dataset.ch;renderMarkets();renderChannel();calc()}});
 renderChannel();
}
function renderChannel(){
 var m=meta(state.channel), name=channels.find(function(x){return x[0]===state.channel})[1];
 $("#channelInfo").innerHTML="<b>"+name+"</b> · Precisão: <b>"+m[0]+"</b> · Vigência: <b>"+m[1]+"</b><br>"+m[2];
 var h="";
 if(state.channel==="amazon"){
  h='<div class="row"><div class="f s6"><label>Categoria</label><select id="amazonCat">'+Object.keys(amazonCats).map(function(k){return '<option '+(state.channelOpts.amazonCategory===k?"selected":"")+'>'+k+"</option>"}).join("")+'</select></div><div class="f s6"><label>Plano</label><select id="amazonPlan"><option value="individual" '+(state.channelOpts.amazonPlan==="individual"?"selected":"")+'>Individual · R$ 2/item</option><option value="professional" '+(state.channelOpts.amazonPlan==="professional"?"selected":"")+'>Profissional · mensalidade separada</option></select></div></div>';
 }else if(state.channel==="magalu"){
  h='<label class="check"><input type="checkbox" id="magaluPromo" '+(state.channelOpts.magaluPromo?"checked":"")+'> Novo seller elegível à condição de 9,9%</label><label class="check" style="margin-top:8px"><input type="checkbox" id="magaluItemFee" '+(state.channelOpts.magaluItemFee?"checked":"")+'> Minha categoria cobra tarifa por item de R$ 5,50</label>';
 }else if(state.channel==="tiktok"){
  h='<label class="check"><input type="checkbox" id="tiktokShipping" '+(state.channelOpts.tiktokShipping?"checked":"")+'> Programa de Taxas de Envio (+6%, teto R$50)</label><div style="margin-top:8px"><label>Afiliado (%) — opcional</label><input class="input" id="tiktokAffiliate" type="number" min="0" step="0.1" value="'+state.channelOpts.tiktokAffiliate+'"></div>';
 }else if(state.channel==="mlclassic"||state.channel==="mlpremium"){
  h='<div class="neutral">Faixa oficial: Clássico 10–14% e Premium 15–19%. Sem categoria, o Precifica usa o teto conservador (14% ou 19%).</div>';
 }else if(state.channel==="shopee"){
  h='<div class="neutral">Tabela por faixa de preço. O motor já conhece a mudança anunciada para 01/10/2026 na faixa de R$ 8 a R$ 79,99.</div>';
 }else{
  h='<div class="neutral">Venda direta começa em 0% e R$0. Taxa de maquininha/link pode ser informada no avançado.</div>';
 }
 $("#channelOptions").innerHTML=h;
 var a=$("#amazonCat");if(a)a.onchange=function(){state.channelOpts.amazonCategory=a.value;calc()};
 var ap=$("#amazonPlan");if(ap)ap.onchange=function(){state.channelOpts.amazonPlan=ap.value;calc()};
 var mp=$("#magaluPromo");if(mp)mp.onchange=function(){state.channelOpts.magaluPromo=mp.checked;calc()};
 var mf=$("#magaluItemFee");if(mf)mf.onchange=function(){state.channelOpts.magaluItemFee=mf.checked;calc()};
 var ts=$("#tiktokShipping");if(ts)ts.onchange=function(){state.channelOpts.tiktokShipping=ts.checked;calc()};
 var ta=$("#tiktokAffiliate");if(ta)ta.oninput=function(){state.channelOpts.tiktokAffiliate=num(ta.value);calc()};
}
function productionSummary(){
 var f=presets.filaments.find(function(x){return x.id===state.selectedFilament}),cg=f?f.price/Math.max(1,f.weight):0,e=erate(),
     watts=num($("#printerWatts").value),maintRate=num($("#maintenanceHour").value),fail=1+failRate()/100;
 var filament=0,energy=0,maintenance=0,totalWeight=0,totalHours=0,slicerRef=0,hasSlicerRef=false,details=[];
 var rows=state.mode==="equal"?state.pieces.slice(0,1):state.pieces;
 rows.forEach(function(p,i){
   var q=Math.max(1,num(p.qty)),w=num(p.weight),h=num(p.hours)+num(p.minutes)/60;
   var fil=w*cg*fail/q, en=h*watts/1000*e.rate/q, ma=h*maintRate/q, sr=num(p.slicerCost)/q;
   filament+=fil;energy+=en;maintenance+=ma;totalWeight+=w;totalHours+=h;
   if(num(p.slicerCost)>0){slicerRef+=sr;hasSlicerRef=true}
   details.push({name:p.name||("Fatiamento "+(i+1)),weight:w,hours:h,outputs:q,filament:fil,energy:en,maintenance:ma,slicerRef:num(p.slicerCost)>0?sr:null});
 });
 return{filament:filament,energy:energy,maintenance:maintenance,totalWeight:totalWeight,totalHours:totalHours,slicerRef:hasSlicerRef?slicerRef:null,details:details,hoursPerUnit:details.reduce(function(a,x){return a+x.hours/x.outputs},0)}
}
function totals(){
 var p=productionSummary();
 return{weight:p.totalWeight,hours:p.totalHours,units:1}
}
function costs(){
 var p=productionSummary(),pack=state.packaging.reduce(function(s,x){return s+num(x.unit)*num(x.qty)},0),
     sup=state.supplies.reduce(function(s,x){return s+num(x.unit)*num(x.qty)},0),fr=num($("#sellerFreight").value),pp=post();
 return{filament:p.filament,energy:p.energy,maintenance:p.maintenance,packaging:pack,supplies:sup,freight:fr,post:pp,
 total:p.filament+p.energy+p.maintenance+pack+sup+fr+pp,projectEnergy:p.details.reduce(function(a,x){return a+x.energy*x.outputs},0),
 hoursPerUnit:p.hoursPerUnit,slicerRef:p.slicerRef,productionDetails:p.details}
}
function simples(rbt,industry){if(rbt<=0)return 0;var a=industry?[[180000,.045,0],[360000,.078,5940],[720000,.10,13860],[1800000,.112,22500],[3600000,.147,85500],[4800000,.30,720000]]:[[180000,.04,0],[360000,.073,5940],[720000,.095,13860],[1800000,.107,22500],[3600000,.143,87300],[4800000,.19,378000]];var row=a.find(function(x){return rbt<=x[0]})||a[a.length-1];return Math.max(0,(rbt*row[1]-row[2])/rbt*100)}
function tax(){
 var p=$("#taxProfile").value,rate=num($("#manualTaxRate").value),fixed=0,note="Manual / 0%";
 if(p==="simplesCommerce"||p==="simplesIndustry"){rate=simples(num($("#rbt12").value),p==="simplesIndustry");note="Simples calculado por RBT12"}
 if(p.indexOf("mei")===0){var monthly=p==="meiService"?86.05:p==="meiBoth"?87.05:82.05;if($("#meiAllocate").checked)fixed=monthly/Math.max(1,num($("#meiOrders").value));note="MEI: "+brl(monthly)+"/mês"+(fixed?" · "+brl(fixed)+"/pedido rateado":"")}
 if(p==="cpf"&&num($("#manualTaxRate").value)===0){rate=0;note="CPF: sem alíquota automática"}
 return{rate:rate,fixed:fixed,note:note}
}
function cac(){return $("#adsOn").checked&&num($("#adsOrders").value)>0?num($("#adsSpend").value)/num($("#adsOrders").value):0}
function loss(){return $("#lossReserve").value==="custom"?num($("#lossCustom").value):num($("#lossReserve").value)}
function shopee(price){var oct=Date.now()>=new Date("2026-10-01T00:00:00-03:00").getTime();if(price<8)return{percent:20,fixed:price*.5};if(price<80)return{percent:20,fixed:oct?4.5:4};if(price<100)return{percent:14,fixed:16};if(price<200)return{percent:14,fixed:20};return{percent:14,fixed:26}}
function ml(price,premium){var fixed=0;if(price<12.5)fixed=price*.5;else if(price<29)fixed=6.25;else if(price<50)fixed=6.5;else if(price<79)fixed=6.75;return{percent:premium?19:14,fixed:fixed}}
function fee(price,ch){
 var percent=0,fixed=0,extra=0;
 if(ch==="shopee"){var s=shopee(price);percent=s.percent;fixed=s.fixed}
 else if(ch==="mlclassic"||ch==="mlpremium"){var m=ml(price,ch==="mlpremium");percent=m.percent;fixed=m.fixed}
 else if(ch==="amazon"){percent=amazonCats[state.channelOpts.amazonCategory]||15;fixed=state.channelOpts.amazonPlan==="individual"?2:0}
 else if(ch==="magalu"){percent=state.channelOpts.magaluPromo?9.9:18;fixed=state.channelOpts.magaluItemFee?5.5:0}
 else if(ch==="tiktok"){if(price<50){percent=10;fixed=4}else{percent=6;fixed=6}if(state.channelOpts.tiktokShipping)extra+=Math.min(price*.06,50);extra+=price*num(state.channelOpts.tiktokAffiliate)/100}
 if($("#overridePct").value!=="")percent=num($("#overridePct").value);fixed+=num($("#overrideFixed").value);
 return{percent:percent,fixed:fixed,extra:extra,total:price*percent/100+fixed+extra}
}
function resultAt(price,ch){
 var c=costs(),f=fee(price,ch),tx=tax(),taxv=price*tx.rate/100+tx.fixed,los=price*loss()/100,ad=cac(),profit=price-c.total-f.total-taxv-los-ad;
 return{price:price,c:c,f:f,taxv:taxv,loss:los,ads:ad,profit:profit,received:price-f.total-taxv-los-ad,margin:price?profit/price*100:0,markup:c.total?(price/c.total-1)*100:0}
}
function priceFor(target,ch){var lo=0,hi=Math.max(20,costs().total+target+20),i;for(i=0;i<60&&resultAt(hi,ch).profit<target;i++)hi*=1.7;for(i=0;i<80;i++){var mid=(lo+hi)/2;if(resultAt(mid,ch).profit>=target)hi=mid;else lo=mid}return hi}
function priceForMargin(targetPct,ch){
 var target=Math.max(0,Math.min(95,num(targetPct)))/100,lo=0,hi=Math.max(20,costs().total*3+20),i;
 for(i=0;i<60&&resultAt(hi,ch).margin/100<target;i++)hi*=1.7;
 for(i=0;i<80;i++){var mid=(lo+hi)/2;if(resultAt(mid,ch).margin/100>=target)hi=mid;else lo=mid}
 return hi
}
function suggested(){
 var c=costs(),p=$("#suggestProfile").value,m=p==="economic"?1.7:p==="strong"?4.5:2.8,f=p==="economic"?5:p==="strong"?20:10,h=p==="economic"?1.5:p==="strong"?4:2.5;return Math.max(f,c.total*m,c.hoursPerUnit*h)
}
function target(){
 if(state.priceMode==="suggest")return suggested();
 if(state.priceMode==="profit")return num($("#targetProfit").value);
 return 0
}
function line(k,v){return '<div class="line"><span class="muted">'+k+'</span><b>'+brl(v)+"</b></div>"}
function calc(){
 var fil=presets.filaments.find(function(x){return x.id===state.selectedFilament});if(fil){$("#filPrice").textContent=brl(fil.price);$("#filWeight").textContent=fil.weight+" g";$("#filCostG").textContent=brl(fil.price/Math.max(1,fil.weight))+"/g";$("#material").value=fil.material||"PLA"}
 var e=erate(),c=costs();$("#kwhUsed").textContent=brl(e.rate)+"/kWh";$("#kwhSource").textContent=e.source;$("#energyCost").textContent=brl(c.projectEnergy);
 var tx=tax();if($("#taxProfile").value.indexOf("simples")===0)$("#simplesRate").value=tx.rate.toFixed(2).replace(".",",")+"%";$("#taxInfo").innerHTML="<b>"+tx.note+"</b><br>Taxa de marketplace é calculada separadamente e não é imposto.";
 var cv=cac();$("#cacHint").textContent=cv?"CAC calculado: "+brl(cv)+" por pedido.":"Sem histórico, CAC = R$ 0.";
 $("#suggestProfit").textContent=brl(suggested());
 var tp=target(),price;
 if(state.priceMode==="margin")price=priceForMargin(num($("#targetMargin").value),state.channel);
 else if(state.priceMode==="markup")price=costs().total*(1+num($("#targetMarkup").value)/100);
 else price=priceFor(tp,state.channel);
 var r=resultAt(price,state.channel);
 // O comparativo entre canais usa a MESMA meta de lucro líquido alcançada no canal principal.
 tp=r.profit;
 $("#resCost").textContent=brl(c.total);$("#resPrice").textContent=brl(price);$("#resReceived").textContent=brl(r.received);$("#resProfit").textContent=brl(r.profit);$("#resMargin").textContent=pc(r.margin);$("#resMarkup").textContent=pc(r.markup);
 $("#stickyChannel").textContent=channels.find(function(x){return x[0]===state.channel})[1];$("#stickyPrice").textContent=brl(price);
 $("#costBreakdown").innerHTML=line("Filamento",c.filament)+line("Energia",c.energy)+line("Reserva manutenção",c.maintenance)+line("Pós-processamento",c.post)+line("Embalagens",c.packaging)+line("Insumos",c.supplies)+line("Frete",c.freight)+line("TOTAL",c.total);
 $("#feeBreakdown").innerHTML=line("Comissão ("+r.f.percent.toFixed(1)+"%)",price*r.f.percent/100)+line("Taxa fixa",r.f.fixed)+line("Extras do canal",r.f.extra)+line("Imposto",r.taxv)+line("CAC Ads",r.ads)+line("Reserva perdas",r.loss);
 var ff=presets.filaments.find(function(x){return x.id===state.selectedFilament}),cg=ff?ff.price/Math.max(1,ff.weight):0,er=erate();
 var det=c.productionDetails.map(function(x){
   return "<div style='margin-top:6px'><b>"+x.name+"</b>: "+x.weight.toFixed(2).replace(".",",")+" g; "+x.hours.toFixed(2).replace(".",",")+" h; atende "+x.outputs+" produto(s) → filamento <b>"+brl(x.filament)+"</b>, energia <b>"+brl(x.energy)+"</b>, manutenção <b>"+brl(x.maintenance)+"</b>"+(x.slicerRef!==null?", fatiador <b>"+brl(x.slicerRef)+"</b>":"")+"</div>";
 }).join("");
 var ref=c.slicerRef!==null?("<div style='margin-top:8px'><b>Conferência com o fatiador:</b> "+brl(c.slicerRef)+" de custo de material informado × nosso filamento "+brl(c.filament)+" → diferença <b>"+brl(c.filament-c.slicerRef)+"</b>.</div>"):"";
 $("#auditCalc").innerHTML="<b>Auditoria do custo por produto final</b>"+det+
 "<div style='margin-top:8px'>Filamento usado no cálculo: <b>"+brl(cg)+"/g</b>. Energia: <b>"+brl(er.rate)+"/kWh</b>. Manutenção: <b>"+brl(num($("#maintenanceHour").value))+"/h</b>.</div>"+ref+
 "<div class='muted' style='margin-top:7px'>Importante: o “Custo” do Bambu Studio é referência de FILAMENTO do perfil; ele não inclui nossa energia, manutenção, embalagem, taxa do marketplace nem lucro.</div>";
 $("#scenarioChannel").textContent="Cenários em "+channels.find(function(x){return x[0]===state.channel})[1];
 var sc=[["Equilíbrio",0],["+ R$ 5",5],["+ R$ 10",10],["+ R$ 20",20],["+ R$ 30",30]];
 $("#priceChoices").innerHTML=sc.map(function(x){return '<button class="choice" data-scenario="'+x[1]+'"><div class="lab">'+x[0]+'</div><div class="price">'+brl(priceFor(x[1],state.channel))+"</div></button>"}).join("");
 $$("[data-scenario]").forEach(function(b){b.onclick=function(){state.priceMode="profit";$$("[data-price-mode]").forEach(function(x){x.classList.toggle("active",x.dataset.priceMode==="profit")});showMode();$("#targetProfit").value=b.dataset.scenario;calc()}});
 $("#compareBody").innerHTML=channels.map(function(x){var p=priceFor(tp,x[0]),rr=resultAt(p,x[0]),mm=meta(x[0]);return "<tr><td><b>"+x[1]+"</b></td><td>"+brl(p)+"</td><td>"+brl(rr.f.total)+"</td><td>"+brl(rr.received)+'</td><td class="good"><b>'+brl(rr.profit)+"</b></td><td>"+pc(rr.margin)+'</td><td><span class="badge '+(mm[0]==="Alta"?"h":"")+'">'+mm[0]+"</span></td></tr>"}).join("");
}
function showMode(){["suggest","profit","margin","markup"].forEach(function(m){$("#"+m+"Box").classList.toggle("hidden",state.priceMode!==m)})}
function updateDistributorOptions(){
 var uf=$("#stateSelect").value||"",city=$("#citySelect").value||"",sel=$("#distributorSelect");
 if(!sel)return;
 var refs=energyRefs[uf+"|"+city]||[];
 if(!refs.length){
   sel.innerHTML='<option value="">Nenhuma tarifa verificada cadastrada para esta cidade</option>';
   $("#energyRefHint").textContent="Não vou inventar uma tarifa estadual. Use “Da conta” (mais preciso) ou Manual.";
 }else{
   sel.innerHTML='<option value="">Selecione sua distribuidora</option>'+refs.map(function(x){return '<option value="'+x.id+'" data-rate="'+x.rate+'" data-source="'+x.source+'">'+x.name+" · "+brl(x.rate)+"/kWh</option>"}).join("");
   $("#energyRefHint").textContent="Escolha a distribuidora que aparece na sua conta. Os valores B1 são referências ANEEL sem tributos; a sua fatura continua sendo a opção mais precisa.";
 }
 calc()
}
async function cities(uf){
 var c=$("#citySelect");c.innerHTML="<option>Carregando...</option>";
 try{
   var res=await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+uf+"/municipios"),arr=await res.json();
   c.innerHTML='<option value="">Selecione a cidade</option>'+arr.map(function(x){return "<option>"+x.nome+"</option>"}).join("");
   if(uf==="SP")c.value="Praia Grande";
 }catch(e){c.innerHTML='<option value="">Cidade indisponível</option>'}
 updateDistributorOptions()
}
function stateInit(){var s=$("#stateSelect");s.innerHTML=ufs.map(function(x){return "<option>"+x+"</option>"}).join("");s.value="SP";cities("SP")}

function editor(kind){
 var key=kind==="filament"?"filaments":kind==="printer"?"printers":kind==="packaging"?"packaging":"supplies",host=$("#"+kind+"Editor"),arr=presets[key];host.innerHTML="";
 arr.forEach(function(x,i){
  var d=document.createElement("div");d.className="preset";
  if(kind==="filament")d.innerHTML='<div class="row"><div class="f s6"><label>Nome</label><input class="input" data-edit="name" data-kind="'+kind+'" data-i="'+i+'" value="'+x.name+'"></div><div class="f s6"><label>Material</label><select data-edit="material" data-kind="'+kind+'" data-i="'+i+'">'+["PLA","PETG","ABS","ASA","TPU","Outro"].map(function(m){return "<option "+(x.material===m?"selected":"")+">"+m+"</option>"}).join("")+'</select></div><div class="f s6"><label>Preço do rolo</label><input class="input" type="number" data-edit="price" data-kind="'+kind+'" data-i="'+i+'" value="'+x.price+'"></div><div class="f s6"><label>Peso (g)</label><input class="input" type="number" data-edit="weight" data-kind="'+kind+'" data-i="'+i+'" value="'+x.weight+'"></div></div>';
  else if(kind==="printer")d.innerHTML='<div class="row"><div class="f s6"><label>Nome</label><input class="input" data-edit="name" data-kind="'+kind+'" data-i="'+i+'" value="'+x.name+'"></div><div class="f s3"><label>Consumo (W)</label><input class="input" type="number" data-edit="watts" data-kind="'+kind+'" data-i="'+i+'" value="'+x.watts+'"></div><div class="f s3"><label>Manutenção R$/h</label><input class="input" type="number" step=".01" data-edit="maintenance" data-kind="'+kind+'" data-i="'+i+'" value="'+x.maintenance+'"></div></div>';
  else d.innerHTML='<div class="row"><div class="f s6"><label>Nome</label><input class="input" data-edit="name" data-kind="'+kind+'" data-i="'+i+'" value="'+x.name+'"></div><div class="f s6"><label>Custo unitário salvo</label><input class="input" type="number" step=".001" data-edit="unit" data-kind="'+kind+'" data-i="'+i+'" value="'+x.unit+'"></div></div><div class="calcbox"><b>Calculadora do lote</b><div class="row" style="margin-top:8px"><div class="f s6"><label>Valor pago no pacote/lote</label><input class="input" type="number" step=".01" data-lotp="'+kind+'" data-i="'+i+'"></div><div class="f s6"><label>Quantidade comprada</label><input class="input" type="number" step="1" data-lotq="'+kind+'" data-i="'+i+'"></div></div><div class="hint" data-lotr="'+kind+'" data-i="'+i+'">Preencha os dois campos.</div></div>';
  d.innerHTML+='<button class="btn" style="margin-top:9px" data-delpre="'+kind+'" data-i="'+i+'">Excluir</button>';host.appendChild(d)
 });
 $$("[data-edit]").forEach(function(el){el.oninput=function(e){var k=e.target.dataset.kind,i=+e.target.dataset.i,kk=k==="filament"?"filaments":k==="printer"?"printers":k==="packaging"?"packaging":"supplies",prop=e.target.dataset.edit;presets[kk][i][prop]=["price","weight","watts","maintenance","unit"].indexOf(prop)>=0?num(e.target.value):e.target.value;save();renderSelects();calc()}});
 $$("[data-delpre]").forEach(function(b){b.onclick=function(){var k=b.dataset.delpre,i=+b.dataset.i,kk=k==="filament"?"filaments":k==="printer"?"printers":k==="packaging"?"packaging":"supplies";if(presets[kk].length>1){presets[kk].splice(i,1);save();editor(k);renderSelects();calc()}}});
 $$("[data-lotp],[data-lotq]").forEach(function(el){el.oninput=function(e){var k=e.target.dataset.lotp||e.target.dataset.lotq,i=+e.target.dataset.i,p=num(document.querySelector('[data-lotp="'+k+'"][data-i="'+i+'"]').value),q=num(document.querySelector('[data-lotq="'+k+'"][data-i="'+i+'"]').value),out=document.querySelector('[data-lotr="'+k+'"][data-i="'+i+'"]');if(q>0){var u=p/q;out.innerHTML="Custo unitário: <b>"+brl(u)+'</b> <button class="btn" style="padding:5px 8px" data-useunit>Usar</button>';out.querySelector("[data-useunit]").onclick=function(){var kk=k==="packaging"?"packaging":"supplies";presets[kk][i].unit=u;save();editor(k);renderSelects();calc()}}else out.textContent="Preencha os dois campos."}});
}
function init(){
 renderPieces();renderSelects();renderMarkets();stateInit();
 $$("[data-mode]").forEach(function(b){b.onclick=function(){state.mode=b.dataset.mode;$$("[data-mode]").forEach(function(x){x.classList.toggle("active",x===b)});if(state.mode==="equal")state.pieces=state.pieces.slice(0,1);renderPieces();calc()}});
 $("#addPiece").onclick=function(){state.pieces.push({id:id(),name:"",weight:"",hours:"",minutes:0,qty:1,slicerCost:""});state.mode="different";$$("[data-mode]").forEach(function(x){x.classList.toggle("active",x.dataset.mode==="different")});renderPieces();calc()};
 $("#filamentPreset").onchange=function(){state.selectedFilament=this.value;calc()};$("#printerPreset").onchange=function(){state.selectedPrinter=this.value;syncPrinter();calc()};
 $("#addPackaging").onclick=function(){addRow("packaging")};$("#addSupply").onclick=function(){addRow("supplies")};
 $$("[data-open]").forEach(function(b){b.onclick=function(){var mid=b.dataset.open,k=mid.indexOf("filament")>=0?"filament":mid.indexOf("printer")>=0?"printer":mid.indexOf("packaging")>=0?"packaging":"supply";editor(k);$("#"+mid).classList.add("open")}});
 $$("[data-close]").forEach(function(b){b.onclick=function(){b.closest(".modal").classList.remove("open")}});$$(".modal").forEach(function(m){m.onclick=function(e){if(e.target===m)m.classList.remove("open")}});
 $("#addFilamentPreset").onclick=function(){presets.filaments.push({id:id(),name:"Novo filamento",material:"PLA",price:65,weight:1000});save();editor("filament");renderSelects()};
 $("#addPrinterPreset").onclick=function(){presets.printers.push({id:id(),name:"Minha impressora",watts:100,maintenance:.25});save();editor("printer");renderSelects()};
 $("#addPackagingPreset").onclick=function(){presets.packaging.push({id:id(),name:"Nova embalagem",unit:0});save();editor("packaging");renderSelects()};
 $("#addSupplyPreset").onclick=function(){presets.supplies.push({id:id(),name:"Novo insumo",unit:0});save();editor("supply");renderSelects()};
 $$(".energyMode").forEach(function(b){b.onclick=function(){state.energyMode=b.dataset.energy;$$(".energyMode").forEach(function(x){x.classList.toggle("active",x===b)});$("#energyBill").classList.toggle("hidden",state.energyMode!=="bill");$("#energyReference").classList.toggle("hidden",state.energyMode!=="reference");$("#energyManual").classList.toggle("hidden",state.energyMode!=="manual");calc()}});
 $("#stateSelect").onchange=function(){cities(this.value)};$("#citySelect").onchange=updateDistributorOptions;$("#distributorSelect").onchange=calc;
 $("#failurePreset").onchange=function(){$("#failureCustomWrap").classList.toggle("hidden",this.value!=="custom");calc()};$("#postProcess").onchange=function(){$("#postCustom").classList.toggle("hidden",this.value!=="custom");calc()};$("#lossReserve").onchange=function(){$("#lossCustom").classList.toggle("hidden",this.value!=="custom");calc()};
 $("#taxProfile").onchange=function(){$("#simplesBox").classList.toggle("hidden",this.value.indexOf("simples")!==0);calc()};$("#meiAllocate").onchange=function(){$("#meiOrdersWrap").classList.toggle("hidden",!this.checked);calc()};$("#adsOn").onchange=function(){$("#adsBox").classList.toggle("hidden",!this.checked);calc()};
 $$("[data-price-mode]").forEach(function(b){b.onclick=function(){state.priceMode=b.dataset.priceMode;$$("[data-price-mode]").forEach(function(x){x.classList.toggle("active",x===b)});showMode();calc()}});
 ["material","printerWatts","maintenanceHour","billValue","billKwh","manualKwh","sellerFreight","postCustom","rbt12","manualTaxRate","meiOrders","adsSpend","adsOrders","lossCustom","suggestProfile","targetProfit","targetMargin","targetMarkup","overridePct","overrideFixed"].forEach(function(i){var el=$("#"+i);if(el){el.oninput=calc;if(el.tagName==="SELECT")el.onchange=calc}});
 $("#resetBtn").onclick=function(){state.pieces=[{id:id(),name:"",weight:"",hours:"",minutes:0,qty:1,slicerCost:""}];state.packaging=[];state.supplies=[];$("#projectName").value="";$("#billValue").value="";$("#billKwh").value="";$("#sellerFreight").value=0;renderPieces();renderRows("packaging");renderRows("supplies");calc()};
 $("#exportBtn").onclick=function(){var blob=new Blob([JSON.stringify(presets,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="precifica3d-presets.json";a.click();URL.revokeObjectURL(a.href)};
 $("#importBtn").onclick=function(){$("#importFile").click()};$("#importFile").onchange=async function(e){try{var x=JSON.parse(await e.target.files[0].text());presets=Object.assign(clone(def),x);save();renderSelects();calc();alert("Presets importados.")}catch(err){alert("Arquivo inválido.")}};
}
init();calc();
