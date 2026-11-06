/* Precifica 3D — Gestão: dashboard, financeiro e estoque de insumos */
(function(){
"use strict";

var STOCK_KEY="precifica3d-stock-v1";
var FIN_KEY="precifica3d-finance-v1";
var PRESET_KEY="precifica3d-presets-v1";
var VERSION="1.18.0";

function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return Array.from((r||document).querySelectorAll(s))}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function today(){return new Date().toISOString().slice(0,10)}
function num(v){var n=Number(String(v==null?"":v).replace(",","."));return Number.isFinite(n)?n:0}
function money(v){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(num(v))}
function fmtDate(v){if(!v)return"—";var p=String(v).slice(0,10).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:v}
function monthKey(v){var d=v?new Date(v+"T12:00:00"):new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}
function esc(v){return String(v==null?"":v).replace(/[&<>\"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function load(key,fallback){try{var v=JSON.parse(localStorage.getItem(key)||"null");return v||fallback}catch(e){return fallback}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
function toast(msg){if(window.PrecificaShell&&window.PrecificaShell.openAuth&&q("#shellToast")){var el=q("#shellToast");el.textContent=msg;el.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove("show")},2600);return}alert(msg)}

var stock=load(STOCK_KEY,{items:[],moves:[]});
if(!Array.isArray(stock.items))stock.items=[];
if(!Array.isArray(stock.moves))stock.moves=[];
var finance=load(FIN_KEY,{openingBalance:0,transactions:[]});
if(!Array.isArray(finance.transactions))finance.transactions=[];
finance.openingBalance=num(finance.openingBalance);

var INCOME_CATS=["Vendas TikTok Shop","Vendas Shopee","Vendas Diretas","Vendas Mercado Livre","Encomendas","Serviços","Bonificação","Receitas Financeiras","Outras Receitas"];
var EXPENSE_CATS=["Filamento","Embalagem","Plástico bolha","Etiquetas","Insumos pequenos","Insumos médios","Insumos grandes","Energia Elétrica","Publicidade e Propaganda","Comissões","Taxas Marketplace","DAS - Simples Nacional","Taxas Bancárias","Juros por atraso","Máquinas","Móveis","Outras Despesas"];
var STOCK_CATS=["Caixas e embalagens","Plástico bolha","Etiquetas","Fitas e adesivos","Envelopes","Ganchos e ferragens","Cordões e fios","Sinos e acessórios","Velas LED / eletrônicos","Acabamento","Limpeza e manutenção","Outros insumos"];
var UNITS=["un.","kit","rolo","pacote","m","cm","g","kg","ml","L"];
var CHANNELS=["Venda direta","Shopee","TikTok Shop","Mercado Livre","Amazon","Magalu","Consignação","Outro"];

function addNavButton(view,title,sub,icon){
  var tabs=q(".side-tabs");if(!tabs||q('[data-workspace-tab="'+view+'"]'))return;
  var b=document.createElement("button");b.className="side-tab";b.dataset.workspaceTab=view;b.setAttribute("role","tab");b.setAttribute("aria-selected","false");
  b.innerHTML='<span class="side-tab-key" aria-hidden="true">'+icon+'</span><span class="side-tab-copy"><strong>'+title+'</strong><small>'+sub+'</small></span>'+(view==="stock"?'<em class="nav-alert-badge" id="stockNavBadge">0</em>':'');
  var market=q('[data-workspace-tab="market"]');tabs.insertBefore(b,market||null);
}
function injectNavigation(){
  var tabs=q(".side-tabs");if(!tabs)return;
  var first=tabs.firstElementChild;
  if(first&&!q(".side-nav-section",tabs)){var label=document.createElement("div");label.className="side-nav-section";label.textContent="OPERAÇÃO";tabs.insertBefore(label,first)}
  addNavButton("stock","Estoque","Insumos e alertas",'<svg viewBox="0 0 24 24"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>');
  addNavButton("finance","Financeiro","Caixa, contas e DRE",'<svg viewBox="0 0 24 24"><path d="M4 6h16v13H4z"/><path d="M4 10h16M8 15h3M15 15h2"/></svg>');
  var market=q('[data-workspace-tab="market"]');
  if(market&&!q(".side-nav-section.analytics",tabs)){var label2=document.createElement("div");label2.className="side-nav-section analytics";label2.textContent="ANÁLISE E VENDAS";tabs.insertBefore(label2,market)}
}

function dashboardMarkup(){return ''+
'<div class="mg-page mg-dashboard">'+
' <div class="mg-page-head mg-page-head-dashboard"><div><span class="mg-eyebrow">PAINEL DA OPERAÇÃO</span><h2>Visão geral</h2><p>Seu negócio em uma leitura rápida: caixa, resultado, compromissos, gastos e insumos.</p></div><div class="mg-head-actions"><label class="mg-period-control">Período<select id="dashboardPeriod"><option value="1">Este mês</option><option value="3">3 meses</option><option value="6" selected>6 meses</option><option value="12">12 meses</option></select></label><button class="btn ghost" id="mgBackupBtn">Backup</button><button class="btn primary" data-open-workspace="finance">+ Lançamento</button></div></div>'+
' <div class="mg-kpis mg-kpis-6" id="mgDashboardKpis"></div>'+
' <div class="mg-dashboard-grid mg-dashboard-primary">'+
'  <section class="mg-card mg-chart-card"><div class="mg-card-head"><div><span>CAIXA</span><h3>Entradas e saídas</h3></div><button class="mg-link" data-open-workspace="finance">Abrir financeiro →</button></div><div id="mgCashChart"></div></section>'+
'  <section class="mg-card"><div class="mg-card-head"><div><span>DESPESAS</span><h3>Onde o dinheiro está indo</h3></div><button class="mg-link" data-open-workspace="finance">Detalhes →</button></div><div id="mgExpenseBreakdown"></div></section>'+
' </div>'+
' <div class="mg-dashboard-grid mg-dashboard-secondary">'+
'  <section class="mg-card"><div class="mg-card-head"><div><span>COMPROMISSOS</span><h3>Próximas contas</h3></div><button class="mg-link" data-open-workspace="finance">Ver contas →</button></div><div id="mgDashboardOpen"></div></section>'+
'  <section class="mg-card"><div class="mg-card-head"><div><span>ESTOQUE</span><h3>Insumos que pedem atenção</h3></div><button class="mg-link" data-open-workspace="stock">Abrir estoque →</button></div><div id="mgDashboardAlerts"></div></section>'+
' </div>'+
' <section class="mg-card mg-activity-card"><div class="mg-card-head"><div><span>ATIVIDADE RECENTE</span><h3>Últimas movimentações</h3></div><button class="mg-link" data-open-workspace="finance">Ver lançamentos →</button></div><div id="mgRecentFinance"></div></section>'+
' <section class="mg-card mg-actions-card"><div class="mg-card-head"><div><span>AÇÕES RÁPIDAS</span><h3>Continue de onde precisa</h3></div></div><div class="mg-quick-grid mg-quick-grid-wide">'+
'   <button data-open-workspace="calc"><i>R$</i><b>Nova precificação</b><span>Calcule custo, preço e margem.</span></button>'+
'   <button data-open-workspace="finance"><i>↗</i><b>Novo lançamento</b><span>Receita, despesa, pagar ou receber.</span></button>'+
'   <button data-open-workspace="stock"><i>▦</i><b>Movimentar insumo</b><span>Entrada, consumo ou ajuste.</span></button>'+
'   <button data-open-workspace="consignment"><i>%</i><b>Consignação</b><span>Pontos, vendas e repasses.</span></button>'+
'  </div></section>'+
'</div>'}

function stockMarkup(){return ''+
'<section class="management-view span2" id="stockSection" data-workspace-view="stock"><div class="mg-page">'+
' <div class="mg-page-head"><div><span class="mg-eyebrow">ESTOQUE OPERACIONAL</span><h2>Estoque de insumos</h2><p>Controle somente o que sustenta sua produção e expedição: caixas, plástico, etiquetas, fitas, ferragens e outros consumíveis.</p></div><div class="mg-head-actions"><button class="btn" id="stockSyncPresets">Importar catálogos da precificação</button><button class="btn primary" id="stockFocusNew">+ Novo insumo</button></div></div>'+
' <div class="mg-kpis" id="stockKpis"></div>'+
' <div class="mg-split">'+
'  <section class="mg-card"><div class="mg-card-head"><div><span>CADASTRO</span><h3>Novo insumo</h3></div></div><form id="stockItemForm" class="mg-form-grid">'+
'   <label class="mg-field span2">Nome<input id="stockName" required placeholder="Ex.: Caixa 12 × 12 × 8 cm"></label>'+
'   <label class="mg-field">Categoria<select id="stockCategory"></select></label><label class="mg-field">Unidade<select id="stockUnit"></select></label>'+
'   <label class="mg-field">Estoque atual<input id="stockQty" type="number" min="0" step="0.01" value="0"></label><label class="mg-field">Estoque mínimo<input id="stockMin" type="number" min="0" step="0.01" value="0"></label>'+
'   <label class="mg-field">Custo unitário (R$)<input id="stockCost" type="number" min="0" step="0.01" value="0"></label><label class="mg-field">Fornecedor<input id="stockSupplier" placeholder="Opcional"></label>'+
'   <label class="mg-field span2">Observações<input id="stockNotes" placeholder="Tamanho, cor, link de compra, etc."></label><button class="btn primary span2" type="submit">Cadastrar insumo</button>'+
'  </form></section>'+
'  <section class="mg-card"><div class="mg-card-head"><div><span>MOVIMENTAÇÃO</span><h3>Entrada ou consumo</h3></div></div><form id="stockMoveForm" class="mg-form-grid">'+
'   <label class="mg-field span2">Insumo<select id="moveItem" required></select></label><label class="mg-field">Tipo<select id="moveType"><option value="in">Entrada</option><option value="out">Consumo / saída</option><option value="adjust">Ajustar saldo para</option></select></label><label class="mg-field">Quantidade<input id="moveQty" type="number" min="0" step="0.01" required></label>'+
'   <label class="mg-field span2">Motivo / referência<input id="moveNote" placeholder="Ex.: compra Shopee, pedido #123, inventário"></label><button class="btn primary span2" type="submit">Registrar movimentação</button>'+
'  </form><div class="mg-stock-tip"><b>Dica</b><span>Defina o estoque mínimo pelo ponto em que você já precisa recomprar, e não apenas quando o item zerar.</span></div></section>'+
' </div>'+
' <section class="mg-card"><div class="mg-card-head"><div><span>INVENTÁRIO</span><h3>Seus insumos</h3></div><div class="mg-table-tools"><input id="stockSearch" placeholder="Buscar insumo"><select id="stockFilter"><option value="all">Todos</option><option value="low">Baixo/Crítico</option><option value="ok">Estoque OK</option></select></div></div><div class="mg-table-wrap"><table class="mg-table"><thead><tr><th>Insumo</th><th>Categoria</th><th>Saldo</th><th>Mínimo</th><th>Custo/un.</th><th>Valor em estoque</th><th>Status</th><th></th></tr></thead><tbody id="stockRows"></tbody></table></div><div class="mg-empty hidden" id="stockEmpty">Cadastre seu primeiro insumo para começar o controle.</div></section>'+
' <section class="mg-card"><div class="mg-card-head"><div><span>HISTÓRICO</span><h3>Últimas movimentações</h3></div></div><div id="stockHistory"></div></section>'+
'</div></section>'}

function financeMarkup(){return ''+
'<section class="management-view span2" id="financeSection" data-workspace-view="finance"><div class="mg-page">'+
' <div class="mg-page-head"><div><span class="mg-eyebrow">FINANCEIRO</span><h2>Controle financeiro</h2><p>Caixa, contas, lançamentos e resultado em uma visão única e organizada.</p></div><div class="mg-head-actions"><label class="mg-period-control">Período<select id="financePeriod"><option value="1">Este mês</option><option value="3">3 meses</option><option value="6" selected>6 meses</option><option value="12">12 meses</option></select></label><button class="btn ghost" id="financeBackup">Exportar</button><button class="btn primary" id="financeFocusNew">+ Novo lançamento</button></div></div>'+
' <div class="mg-fin-tabs"><button class="active" data-fin-tab="overview">Visão geral</button><button data-fin-tab="entries">Lançamentos</button><button data-fin-tab="payables">A pagar</button><button data-fin-tab="receivables">A receber</button><button data-fin-tab="cashflow">Fluxo de caixa</button><button data-fin-tab="dre">DRE</button></div>'+
' <div data-fin-pane="overview">'+
'  <div class="mg-kpis mg-kpis-6" id="financeKpis"></div>'+
'  <div class="mg-dashboard-grid mg-finance-overview-grid">'+
'   <section class="mg-card mg-chart-card"><div class="mg-card-head"><div><span>EVOLUÇÃO</span><h3>Entradas x saídas</h3></div></div><div id="financeChart"></div></section>'+
'   <section class="mg-card"><div class="mg-card-head"><div><span>DISTRIBUIÇÃO</span><h3>Despesas por categoria</h3></div></div><div id="financeExpenseBreakdown"></div></section>'+
'   <section class="mg-card"><div class="mg-card-head"><div><span>AGENDA FINANCEIRA</span><h3>Próximos compromissos</h3></div></div><div id="financeOpenSummary"></div></section>'+
'   <section class="mg-card"><div class="mg-card-head"><div><span>RESULTADO</span><h3>Leitura do período</h3></div></div><div id="financeMonthSummary"></div></section>'+
'  </div>'+
'  <section class="mg-card mg-balance-config"><div class="mg-card-head"><div><span>CONFIGURAÇÃO</span><h3>Saldo inicial do controle</h3></div></div><div class="mg-balance-row"><form id="openingBalanceForm" class="mg-inline-form"><input id="openingBalance" type="number" step="0.01"><button class="btn" type="submit">Salvar saldo</button></form><p class="mg-muted">Use o saldo real no momento em que você começou a registrar as movimentações no Precifica.</p></div></section>'+
' </div>'+
' <div data-fin-pane="entries" class="hidden"><div class="mg-split">'+
'  <section class="mg-card"><div class="mg-card-head"><div><span>NOVO LANÇAMENTO</span><h3>Registrar movimentação</h3></div></div>'+financeForm()+'</section>'+
'  <section class="mg-card"><div class="mg-card-head"><div><span>ORGANIZAÇÃO</span><h3>Como o financeiro funciona</h3></div></div><div class="mg-feature-list"><div><i>1</i><span><b>Receitas e despesas</b><small>Classificadas para alimentar gráficos e DRE.</small></span></div><div><i>2</i><span><b>Realizado x em aberto</b><small>Separe caixa efetivo de compromissos futuros.</small></span></div><div><i>3</i><span><b>Vencimentos</b><small>Contas aparecem automaticamente nas agendas.</small></span></div><div><i>4</i><span><b>Resultado gerencial</b><small>Veja contribuição, despesas e resultado sem planilha paralela.</small></span></div></div></section>'+
'  </div><section class="mg-card"><div class="mg-card-head"><div><span>HISTÓRICO</span><h3>Todos os lançamentos</h3></div><div class="mg-table-tools"><input id="finSearch" placeholder="Buscar lançamento"><select id="finTypeFilter"><option value="all">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></div></div><div id="financeEntriesTable"></div></section></div>'+
' <div data-fin-pane="payables" class="hidden"><section class="mg-card"><div class="mg-card-head"><div><span>CONTAS A PAGAR</span><h3>Despesas em aberto</h3></div></div><div id="payablesTable"></div></section></div>'+
' <div data-fin-pane="receivables" class="hidden"><section class="mg-card"><div class="mg-card-head"><div><span>CONTAS A RECEBER</span><h3>Receitas em aberto</h3></div></div><div id="receivablesTable"></div></section></div>'+
' <div data-fin-pane="cashflow" class="hidden"><section class="mg-card"><div class="mg-card-head"><div><span>FLUXO DE CAIXA</span><h3>Resumo mensal</h3></div></div><div id="cashflowTable"></div></section></div>'+
' <div data-fin-pane="dre" class="hidden"><section class="mg-card"><div class="mg-card-head"><div><span>DEMONSTRATIVO DE RESULTADO</span><h3>DRE simplificada</h3></div><select id="drePeriod"><option value="month">Mês atual</option><option value="year">Ano atual</option><option value="all">Todo período</option></select></div><div id="dreTable"></div></section></div>'+
'</div></section>'}

function financeForm(){return '<form id="financeEntryForm" class="mg-form-grid">'+
'<label class="mg-field">Tipo<select id="finType"><option value="income">Receita</option><option value="expense">Despesa</option></select></label><label class="mg-field">Status<select id="finStatus"><option value="paid">Pago / recebido</option><option value="open">Em aberto</option></select></label>'+
'<label class="mg-field span2">Descrição<input id="finDescription" required placeholder="Ex.: Venda TikTok Shop / Compra de caixas"></label><label class="mg-field">Categoria<select id="finCategory"></select></label><label class="mg-field">Valor (R$)<input id="finAmount" type="number" min="0" step="0.01" required></label>'+
'<label class="mg-field">Vencimento<input id="finDue" type="date"></label><label class="mg-field">Pagamento / recebimento<input id="finPaid" type="date"></label><label class="mg-field">Conta / banco<input id="finAccount" placeholder="Ex.: PicPay"></label><label class="mg-field">Cliente / fornecedor<input id="finParty" placeholder="Opcional"></label>'+
'<label class="mg-field">Canal<select id="finChannel"><option value="">Não se aplica</option>'+CHANNELS.map(function(x){return'<option>'+x+'</option>'}).join("")+'</select></label><label class="mg-field">Documento<input id="finDocument" placeholder="PIX, Fatura, NF..."></label><label class="mg-field span2">Observações<input id="finNotes" placeholder="Opcional"></label><button class="btn primary span2" type="submit">Salvar lançamento</button></form>'}

function injectSections(){
  var home=q("#homeSection");if(home)home.innerHTML=dashboardMarkup();
  var grid=q("#workspaceGrid");if(!grid)return;
  if(!q("#stockSection"))grid.insertAdjacentHTML("beforeend",stockMarkup());
  if(!q("#financeSection"))grid.insertAdjacentHTML("beforeend",financeMarkup());
}

function updateAuthCopy(){
  var superline=q(".auth-superline");if(superline)superline.textContent="PRECIFICAÇÃO • FINANCEIRO • ESTOQUE • VENDAS";
  var title=q(".auth-brand-pane h3");if(title)title.textContent="Sua operação de impressão 3D em um único painel.";
  var p=q(".auth-brand-pane > p");if(p)p.textContent="Precifique com segurança, acompanhe o caixa, controle insumos e organize consignação sem espalhar a gestão em várias planilhas.";
  var points=q(".auth-points-rich");if(points)points.innerHTML='<div class="auth-point"><i>✓</i><span><b>Precificação profissional</b><small>Filamento, energia, manutenção, embalagem, taxas e margem por canal.</small></span></div><div class="auth-point"><i>✓</i><span><b>Financeiro integrado</b><small>Receitas, gastos, contas a pagar/receber, fluxo de caixa e DRE.</small></span></div><div class="auth-point"><i>✓</i><span><b>Estoque de insumos</b><small>Caixas, plástico, etiquetas e consumíveis com alerta de reposição.</small></span></div><div class="auth-point"><i>✓</i><span><b>Consignação e mercado</b><small>Pontos parceiros, recebimentos, referências e histórico de rentabilidade.</small></span></div>';
}

function optionFill(el,arr){if(!el)return;el.innerHTML=arr.map(function(x){return'<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join("")}
function stockStatus(item){var qty=num(item.qty),min=num(item.min);if(qty<=0)return{key:"critical",label:"Crítico"};if(min>0&&qty<=min)return{key:"low",label:"Baixo"};return{key:"ok",label:"OK"}}
function stockStats(){var total=stock.items.length,low=0,critical=0,value=0;stock.items.forEach(function(x){var s=stockStatus(x);if(s.key!=="ok")low++;if(s.key==="critical")critical++;value+=num(x.qty)*num(x.cost)});return{total:total,low:low,critical:critical,value:value}}
function saveStock(){save(STOCK_KEY,stock);renderStock();renderDashboard()}
function saveFinance(){save(FIN_KEY,finance);renderFinance();renderDashboard()}

function renderStock(){
  var stats=stockStats(),k=q("#stockKpis");
  if(k)k.innerHTML=kpi("Insumos cadastrados",stats.total,"Itens operacionais")+kpi("Precisam de reposição",stats.low,"Baixo ou zerado",stats.low?"warn":"good")+kpi("Estoque crítico",stats.critical,"Saldo zerado",stats.critical?"danger":"good")+kpi("Valor em estoque",money(stats.value),"Custo atual dos insumos");
  var badge=q("#stockNavBadge");if(badge){badge.textContent=stats.low;badge.classList.toggle("hidden",!stats.low)}
  var move=q("#moveItem");if(move)move.innerHTML='<option value="">Selecione</option>'+stock.items.slice().sort(function(a,b){return a.name.localeCompare(b.name)}).map(function(x){return'<option value="'+x.id+'">'+esc(x.name)+' · '+num(x.qty)+' '+esc(x.unit)+'</option>'}).join("");
  var term=(q("#stockSearch")?q("#stockSearch").value:"").trim().toLowerCase(),filter=q("#stockFilter")?q("#stockFilter").value:"all";
  var rows=stock.items.filter(function(x){var s=stockStatus(x);return(!term||(x.name+" "+x.category+" "+(x.supplier||"")).toLowerCase().indexOf(term)>=0)&&(filter==="all"||(filter==="low"&&s.key!=="ok")||(filter==="ok"&&s.key==="ok"))}).sort(function(a,b){var sa=stockStatus(a).key,sb=stockStatus(b).key,rank={critical:0,low:1,ok:2};return rank[sa]-rank[sb]||a.name.localeCompare(b.name)});
  var body=q("#stockRows");if(body)body.innerHTML=rows.map(function(x){var s=stockStatus(x),pct=num(x.min)>0?Math.min(100,Math.round(num(x.qty)/num(x.min)*100)):100;return'<tr><td><b>'+esc(x.name)+'</b><small>'+esc(x.supplier||"Sem fornecedor")+'</small></td><td>'+esc(x.category)+'</td><td><b>'+num(x.qty)+' '+esc(x.unit)+'</b><div class="mg-stock-meter"><i style="width:'+pct+'%"></i></div></td><td>'+num(x.min)+' '+esc(x.unit)+'</td><td>'+money(x.cost)+'</td><td>'+money(num(x.qty)*num(x.cost))+'</td><td><span class="mg-status '+s.key+'">'+s.label+'</span></td><td class="mg-row-actions"><button data-stock-move="'+x.id+'" title="Movimentar">±</button><button data-stock-edit="'+x.id+'" title="Editar">✎</button><button data-stock-delete="'+x.id+'" title="Excluir">×</button></td></tr>'}).join("");
  var empty=q("#stockEmpty");if(empty)empty.classList.toggle("hidden",stock.items.length>0);
  var hist=q("#stockHistory");if(hist){var list=stock.moves.slice().sort(function(a,b){return String(b.at).localeCompare(String(a.at))}).slice(0,12);hist.innerHTML=list.length?'<div class="mg-timeline">'+list.map(function(m){var item=stock.items.find(function(x){return x.id===m.itemId}),name=item?item.name:(m.itemName||"Insumo removido"),sign=m.type==="in"?"+":m.type==="out"?"−":"=";return'<div><span class="mg-move-icon '+m.type+'">'+sign+'</span><p><b>'+esc(name)+'</b><small>'+esc(m.note||moveLabel(m.type))+'</small></p><strong>'+sign+(m.type==="adjust"?"":num(m.qty))+ (item?" "+esc(item.unit):"")+'</strong><time>'+fmtDate(String(m.at).slice(0,10))+'</time></div>'}).join("")+'</div>':'<div class="mg-empty">Nenhuma movimentação registrada.</div>'}
  qa("[data-stock-move]").forEach(function(b){b.onclick=function(){if(q("#moveItem"))q("#moveItem").value=b.dataset.stockMove;q("#moveQty").focus();q("#stockMoveForm").scrollIntoView({behavior:"smooth",block:"center"})}});
  qa("[data-stock-edit]").forEach(function(b){b.onclick=function(){editStock(b.dataset.stockEdit)}});
  qa("[data-stock-delete]").forEach(function(b){b.onclick=function(){deleteStock(b.dataset.stockDelete)}});
}
function moveLabel(t){return t==="in"?"Entrada":t==="out"?"Consumo / saída":"Ajuste de inventário"}
function editStock(id){var x=stock.items.find(function(i){return i.id===id});if(!x)return;var name=prompt("Nome do insumo",x.name);if(name===null)return;var qty=prompt("Estoque atual",x.qty);if(qty===null)return;var min=prompt("Estoque mínimo",x.min);if(min===null)return;var cost=prompt("Custo unitário (R$)",x.cost);if(cost===null)return;x.name=name.trim()||x.name;x.qty=Math.max(0,num(qty));x.min=Math.max(0,num(min));x.cost=Math.max(0,num(cost));saveStock();toast("Insumo atualizado.")}
function deleteStock(id){var x=stock.items.find(function(i){return i.id===id});if(!x)return;if(!confirm('Excluir "'+x.name+'" do estoque? O histórico será preservado.'))return;stock.items=stock.items.filter(function(i){return i.id!==id});saveStock()}
function addStockItem(e){e.preventDefault();var name=q("#stockName").value.trim();if(!name)return;var item={id:uid(),name:name,category:q("#stockCategory").value,unit:q("#stockUnit").value,qty:Math.max(0,num(q("#stockQty").value)),min:Math.max(0,num(q("#stockMin").value)),cost:Math.max(0,num(q("#stockCost").value)),supplier:q("#stockSupplier").value.trim(),notes:q("#stockNotes").value.trim(),createdAt:new Date().toISOString()};stock.items.push(item);if(item.qty>0)stock.moves.push({id:uid(),itemId:item.id,itemName:item.name,type:"in",qty:item.qty,note:"Saldo inicial",at:new Date().toISOString()});e.target.reset();q("#stockQty").value="0";q("#stockMin").value="0";q("#stockCost").value="0";saveStock();toast("Insumo cadastrado.")}
function addStockMove(e){e.preventDefault();var id=q("#moveItem").value,x=stock.items.find(function(i){return i.id===id});if(!x){toast("Selecione um insumo.");return}var type=q("#moveType").value,qty=Math.max(0,num(q("#moveQty").value));if(type!=="adjust"&&qty<=0){toast("Informe uma quantidade maior que zero.");return}if(type==="out"&&qty>num(x.qty)){if(!confirm("A saída é maior que o saldo atual. Quer zerar o estoque mesmo assim?"))return;qty=num(x.qty)}if(type==="in")x.qty=num(x.qty)+qty;else if(type==="out")x.qty=Math.max(0,num(x.qty)-qty);else x.qty=qty;stock.moves.push({id:uid(),itemId:x.id,itemName:x.name,type:type,qty:qty,note:q("#moveNote").value.trim(),at:new Date().toISOString()});e.target.reset();saveStock();toast("Movimentação registrada.")}
function syncPresets(){var p=load(PRESET_KEY,null),source=[];if(p){(p.packaging||[]).forEach(function(x){if(x.name&&x.name!=="Sem embalagem")source.push({name:x.name,cost:num(x.unit),category:"Caixas e embalagens"})});(p.supplies||[]).forEach(function(x){if(x.name)source.push({name:x.name,cost:num(x.unit),category:"Outros insumos"})})}if(!source.length){toast("Nenhum catálogo personalizado foi encontrado neste navegador.");return}var added=0;source.forEach(function(s){if(!stock.items.some(function(x){return x.name.toLowerCase()===s.name.toLowerCase()})){stock.items.push({id:uid(),name:s.name,category:s.category,unit:"un.",qty:0,min:0,cost:s.cost,supplier:"",notes:"Importado do catálogo da Precificação",createdAt:new Date().toISOString()});added++}});saveStock();toast(added?added+" insumo(s) importado(s).":"Os itens do catálogo já estão no estoque.")}

function paidTx(){return finance.transactions.filter(function(x){return x.status==="paid"})}
function currentBalance(){return finance.openingBalance+paidTx().reduce(function(a,x){return a+(x.type==="income"?num(x.amount):-num(x.amount))},0)}
function financeStats(){var mk=monthKey(),inc=0,exp=0,pay=0,rec=0,over=0,now=today();finance.transactions.forEach(function(x){if(x.status==="paid"&&monthKey(x.paidDate||x.dueDate||String(x.createdAt).slice(0,10))===mk){if(x.type==="income")inc+=num(x.amount);else exp+=num(x.amount)}if(x.status==="open"){if(x.type==="income")rec+=num(x.amount);else pay+=num(x.amount);if(x.dueDate&&x.dueDate<now)over+=num(x.amount)}});return{balance:currentBalance(),income:inc,expense:exp,result:inc-exp,payables:pay,receivables:rec,overdue:over}}
function kpi(label,value,sub,tone){return'<div class="mg-kpi '+(tone||'')+'"><span>'+label+'</span><b>'+value+'</b><small>'+sub+'</small></div>'}
function renderFinance(){
  var s=financeStats(),k=q("#financeKpis"),months=selectedPeriod("#financePeriod",6);
  if(k)k.innerHTML=kpi("Saldo atual",money(s.balance),"Caixa realizado",s.balance<0?"danger":"good")+kpi("Entradas no mês",money(s.income),"Receitas realizadas","good")+kpi("Saídas no mês",money(s.expense),"Despesas realizadas",s.expense?"warn":"")+kpi("Resultado do mês",money(s.result),"Entradas − saídas",s.result<0?"danger":"good")+kpi("A pagar",money(s.payables),"Despesas em aberto",s.payables?"warn":"")+kpi("A receber",money(s.receivables),"Receitas em aberto",s.receivables?"accent":"");
  if(q("#openingBalance"))q("#openingBalance").value=finance.openingBalance||0;
  renderCashChart("#financeChart",months);renderExpenseBreakdown("#financeExpenseBreakdown",months);renderOpenSummary();renderMonthSummary();renderFinanceTables();renderCashflow();renderDre();
}
function renderCashChart(selector,count){var host=q(selector);if(!host)return;var now=new Date(),months=[];for(var i=count-1;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth()-i,1),key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");months.push({key:key,label:d.toLocaleDateString("pt-BR",{month:"short"}).replace(".",""),income:0,expense:0})}paidTx().forEach(function(x){var key=monthKey(x.paidDate||x.dueDate||String(x.createdAt).slice(0,10)),m=months.find(function(z){return z.key===key});if(m)m[x.type==="income"?"income":"expense"]+=num(x.amount)});var max=Math.max(1,...months.map(function(m){return Math.max(m.income,m.expense)}));host.innerHTML='<div class="mg-legend"><span><i class="in"></i>Entradas</span><span><i class="out"></i>Saídas</span></div><div class="mg-bars">'+months.map(function(m){return'<div class="mg-bar-col"><div class="mg-bar-track"><i class="in" style="height:'+Math.max(2,m.income/max*100)+'%" title="'+money(m.income)+'"></i><i class="out" style="height:'+Math.max(2,m.expense/max*100)+'%" title="'+money(m.expense)+'"></i></div><span>'+m.label+'</span></div>'}).join("")+'</div>'}
function renderOpenSummary(){var host=q("#financeOpenSummary");if(!host)return;var now=today(),arr=finance.transactions.filter(function(x){return x.status==="open"}).sort(function(a,b){return String(a.dueDate||"9999").localeCompare(String(b.dueDate||"9999"))}).slice(0,7);host.innerHTML=arr.length?'<div class="mg-open-list">'+arr.map(function(x){var late=x.dueDate&&x.dueDate<now;return'<div><span class="mg-fin-dot '+x.type+'"></span><p><b>'+esc(x.description)+'</b><small>'+esc(x.category)+' · '+(x.dueDate?'vence '+fmtDate(x.dueDate):'sem vencimento')+'</small></p><strong class="'+(late?'late':'')+'">'+money(x.amount)+'</strong></div>'}).join("")+'</div>':'<div class="mg-empty compact">Nenhuma conta em aberto.</div>'}
function renderMonthSummary(){var h=q("#financeMonthSummary");if(!h)return;var s=financeStats(),margin=s.income>0?s.result/s.income*100:0;h.innerHTML='<div class="mg-result-big '+(s.result<0?'negative':'')+'"><b>'+money(s.result)+'</b><span>resultado realizado</span></div><div class="mg-mini-stats"><span><b>'+money(s.income)+'</b> entradas</span><span><b>'+money(s.expense)+'</b> saídas</span><span><b>'+margin.toFixed(1).replace('.',',')+'%</b> margem de caixa</span></div>'}
function txRow(x){var late=x.status==="open"&&x.dueDate&&x.dueDate<today();return'<tr><td><b>'+esc(x.description)+'</b><small>'+esc(x.party||x.channel||"")+'</small></td><td>'+esc(x.category)+'</td><td>'+esc(x.account||"—")+'</td><td>'+fmtDate(x.dueDate)+'</td><td><span class="mg-status '+(x.status==="paid"?'ok':late?'critical':'low')+'">'+(x.status==="paid"?(x.type==="income"?'Recebido':'Pago'):(late?'Vencido':'Em aberto'))+'</span></td><td class="mg-money '+x.type+'">'+(x.type==="income"?'+ ':'− ')+money(x.amount)+'</td><td class="mg-row-actions"><button data-fin-toggle="'+x.id+'" title="Alterar status">✓</button><button data-fin-delete="'+x.id+'" title="Excluir">×</button></td></tr>'}
function tableFor(arr,empty){return arr.length?'<div class="mg-table-wrap"><table class="mg-table"><thead><tr><th>Descrição</th><th>Categoria</th><th>Conta</th><th>Vencimento</th><th>Status</th><th>Valor</th><th></th></tr></thead><tbody>'+arr.map(txRow).join("")+'</tbody></table></div>':'<div class="mg-empty">'+empty+'</div>'}
function renderFinanceTables(){var term=(q("#finSearch")?q("#finSearch").value:"").trim().toLowerCase(),type=q("#finTypeFilter")?q("#finTypeFilter").value:"all",all=finance.transactions.slice().filter(function(x){return(type==="all"||x.type===type)&&(!term||(x.description+" "+x.category+" "+(x.party||"")).toLowerCase().indexOf(term)>=0)}).sort(function(a,b){return String(b.createdAt).localeCompare(String(a.createdAt))});if(q("#financeEntriesTable"))q("#financeEntriesTable").innerHTML=tableFor(all,"Nenhum lançamento registrado.");var pay=finance.transactions.filter(function(x){return x.type==="expense"&&x.status==="open"}).sort(function(a,b){return String(a.dueDate||"9999").localeCompare(String(b.dueDate||"9999"))}),rec=finance.transactions.filter(function(x){return x.type==="income"&&x.status==="open"}).sort(function(a,b){return String(a.dueDate||"9999").localeCompare(String(b.dueDate||"9999"))});if(q("#payablesTable"))q("#payablesTable").innerHTML=tableFor(pay,"Nenhuma conta a pagar em aberto.");if(q("#receivablesTable"))q("#receivablesTable").innerHTML=tableFor(rec,"Nenhuma conta a receber em aberto.");qa("[data-fin-toggle]").forEach(function(b){b.onclick=function(){toggleTx(b.dataset.finToggle)}});qa("[data-fin-delete]").forEach(function(b){b.onclick=function(){deleteTx(b.dataset.finDelete)}})}
function addFinanceEntry(e){e.preventDefault();var type=q("#finType").value,status=q("#finStatus").value,amount=Math.max(0,num(q("#finAmount").value)),desc=q("#finDescription").value.trim();if(!desc||amount<=0){toast("Informe descrição e valor.");return}var paid=q("#finPaid").value;if(status==="paid"&&!paid)paid=today();finance.transactions.push({id:uid(),type:type,status:status,description:desc,category:q("#finCategory").value,amount:amount,dueDate:q("#finDue").value,paidDate:status==="paid"?paid:"",account:q("#finAccount").value.trim(),party:q("#finParty").value.trim(),channel:q("#finChannel").value,document:q("#finDocument").value.trim(),notes:q("#finNotes").value.trim(),createdAt:new Date().toISOString()});e.target.reset();q("#finPaid").value=today();refreshFinCategories();saveFinance();toast("Lançamento salvo.")}
function toggleTx(id){var x=finance.transactions.find(function(t){return t.id===id});if(!x)return;if(x.status==="open"){x.status="paid";x.paidDate=today()}else{x.status="open";x.paidDate=""}saveFinance()}
function deleteTx(id){var x=finance.transactions.find(function(t){return t.id===id});if(!x)return;if(!confirm('Excluir o lançamento "'+x.description+'"?'))return;finance.transactions=finance.transactions.filter(function(t){return t.id!==id});saveFinance()}
function renderCashflow(){var host=q("#cashflowTable");if(!host)return;var now=new Date(),year=now.getFullYear(),rows=[],balance=finance.openingBalance;for(var m=0;m<12;m++){var key=year+"-"+String(m+1).padStart(2,"0"),inc=0,exp=0;paidTx().forEach(function(x){var k=monthKey(x.paidDate||x.dueDate||String(x.createdAt).slice(0,10));if(k===key){if(x.type==="income")inc+=num(x.amount);else exp+=num(x.amount)}});var start=balance;balance+=inc-exp;rows.push({label:new Date(year,m,1).toLocaleDateString("pt-BR",{month:"long"}),start:start,inc:inc,exp:exp,end:balance})}host.innerHTML='<div class="mg-table-wrap"><table class="mg-table"><thead><tr><th>Mês</th><th>Saldo inicial</th><th>Entradas</th><th>Saídas</th><th>Saldo final</th></tr></thead><tbody>'+rows.map(function(r){return'<tr><td><b>'+r.label.charAt(0).toUpperCase()+r.label.slice(1)+'</b></td><td>'+money(r.start)+'</td><td class="mg-money income">'+money(r.inc)+'</td><td class="mg-money expense">'+money(r.exp)+'</td><td><b>'+money(r.end)+'</b></td></tr>'}).join("")+'</tbody></table></div>'}
function isVariable(cat){return["Filamento","Embalagem","Plástico bolha","Etiquetas","Insumos pequenos","Insumos médios","Insumos grandes","Comissões","Taxas Marketplace"].indexOf(cat)>=0}
function renderDre(){var host=q("#dreTable");if(!host)return;var period=q("#drePeriod")?q("#drePeriod").value:"month",now=new Date(),filtered=paidTx().filter(function(x){var d=new Date((x.paidDate||x.dueDate||String(x.createdAt).slice(0,10))+"T12:00:00");if(period==="month")return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();if(period==="year")return d.getFullYear()===now.getFullYear();return true}),revenue=0,variable=0,expenses=0;filtered.forEach(function(x){if(x.type==="income")revenue+=num(x.amount);else if(isVariable(x.category))variable+=num(x.amount);else expenses+=num(x.amount)});var contribution=revenue-variable,profit=contribution-expenses,margin=revenue?profit/revenue*100:0;host.innerHTML='<div class="mg-dre"><div><span>Receita bruta</span><b>'+money(revenue)+'</b></div><div class="minus"><span>(−) Custos variáveis</span><b>'+money(variable)+'</b></div><div class="subtotal"><span>Margem de contribuição</span><b>'+money(contribution)+'</b></div><div class="minus"><span>(−) Despesas operacionais</span><b>'+money(expenses)+'</b></div><div class="total '+(profit<0?'negative':'')+'"><span>Resultado</span><b>'+money(profit)+'</b></div><div><span>Margem sobre receita</span><b>'+margin.toFixed(1).replace('.',',')+'%</b></div></div><p class="mg-muted">DRE gerencial simplificada com base nos lançamentos marcados como pagos/recebidos. Para obrigações fiscais e contábeis, use sua escrituração oficial.</p>'}
function refreshFinCategories(){var type=q("#finType");if(!type||!q("#finCategory"))return;optionFill(q("#finCategory"),type.value==="income"?INCOME_CATS:EXPENSE_CATS)}


function selectedPeriod(id,fallback){var el=q(id);return el?Math.max(1,num(el.value)||fallback):fallback}
function txDate(x){return x.paidDate||x.dueDate||String(x.createdAt||"").slice(0,10)}
function inLastMonths(x,months){
  var raw=txDate(x);if(!raw)return false;var d=new Date(raw+"T12:00:00"),now=new Date(),from=new Date(now.getFullYear(),now.getMonth()-(months-1),1);
  return d>=from&&d<=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59);
}
function expenseBreakdownData(months){
  var map={};paidTx().filter(function(x){return x.type==="expense"&&inLastMonths(x,months)}).forEach(function(x){var k=x.category||"Outras Despesas";map[k]=(map[k]||0)+num(x.amount)});
  return Object.keys(map).map(function(k){return{name:k,value:map[k]}}).sort(function(a,b){return b.value-a.value});
}
function renderExpenseBreakdown(selector,months){
  var host=q(selector);if(!host)return;var data=expenseBreakdownData(months),total=data.reduce(function(a,x){return a+x.value},0);
  if(!data.length){host.innerHTML='<div class="mg-empty compact"><b>Sem despesas no período.</b><span>Os lançamentos pagos aparecerão aqui por categoria.</span></div>';return}
  var top=data.slice(0,6);
  host.innerHTML='<div class="mg-expense-summary"><strong>'+money(total)+'</strong><span>total de despesas no período</span></div><div class="mg-expense-list">'+top.map(function(x){var pct=total?x.value/total*100:0;return'<div><div><b>'+esc(x.name)+'</b><span>'+money(x.value)+' · '+pct.toFixed(0)+'%</span></div><i><em style="width:'+Math.max(2,pct)+'%"></em></i></div>'}).join("")+'</div>';
}
function renderDashboardOpen(){
  var host=q("#mgDashboardOpen");if(!host)return;var now=today(),arr=finance.transactions.filter(function(x){return x.status==="open"}).sort(function(a,b){return String(a.dueDate||"9999").localeCompare(String(b.dueDate||"9999"))}).slice(0,5);
  host.innerHTML=arr.length?'<div class="mg-open-list">'+arr.map(function(x){var late=x.dueDate&&x.dueDate<now;return'<div><span class="mg-fin-dot '+x.type+'"></span><p><b>'+esc(x.description)+'</b><small>'+esc(x.category)+' · '+(x.dueDate?'vence '+fmtDate(x.dueDate):'sem vencimento')+'</small></p><strong class="'+(late?'late':'')+'">'+money(x.amount)+'</strong></div>'}).join("")+'</div>':'<div class="mg-empty compact"><b>Nenhuma conta em aberto.</b><span>Seu painel está sem compromissos pendentes.</span></div>';
}

function renderDashboard(){
  var fs=financeStats(),ss=stockStats(),k=q("#mgDashboardKpis"),months=selectedPeriod("#dashboardPeriod",6);
  if(k)k.innerHTML=kpi("Saldo atual",money(fs.balance),"Caixa realizado",fs.balance<0?"danger":"good")+kpi("Entradas no mês",money(fs.income),"Receitas realizadas","good")+kpi("Saídas no mês",money(fs.expense),"Despesas realizadas",fs.expense?"warn":"")+kpi("Resultado",money(fs.result),"No mês atual",fs.result<0?"danger":"good")+kpi("A receber",money(fs.receivables),"Contas em aberto","accent")+kpi("Alertas de insumos",ss.low,String(ss.total)+" monitorado(s)",ss.low?"warn":"good");
  renderCashChart("#mgCashChart",months);renderExpenseBreakdown("#mgExpenseBreakdown",months);renderDashboardOpen();
  var al=q("#mgDashboardAlerts");if(al){var lows=stock.items.filter(function(x){return stockStatus(x).key!=="ok"}).sort(function(a,b){return num(a.qty)-num(b.qty)}).slice(0,5);al.innerHTML=lows.length?'<div class="mg-alert-list">'+lows.map(function(x){var s=stockStatus(x);return'<div><span class="mg-alert-icon '+s.key+'">!</span><p><b>'+esc(x.name)+'</b><small>'+num(x.qty)+' '+esc(x.unit)+' disponíveis · mínimo '+num(x.min)+'</small></p><span class="mg-status '+s.key+'">'+s.label+'</span></div>'}).join("")+'</div>':'<div class="mg-empty compact"><b>Estoque sob controle.</b><span>Nenhum insumo abaixo do mínimo.</span></div>'}
  var rf=q("#mgRecentFinance");if(rf){var tx=finance.transactions.slice().sort(function(a,b){return String(b.createdAt).localeCompare(String(a.createdAt))}).slice(0,6);rf.innerHTML=tx.length?'<div class="mg-recent-list mg-recent-grid">'+tx.map(function(x){return'<div><span class="mg-fin-dot '+x.type+'"></span><p><b>'+esc(x.description)+'</b><small>'+esc(x.category)+' · '+(x.status==="paid"?'realizado':'em aberto')+'</small></p><strong class="'+x.type+'">'+(x.type==="income"?'+ ':'− ')+money(x.amount)+'</strong></div>'}).join("")+'</div>':'<div class="mg-empty compact"><b>Nenhuma movimentação ainda.</b><span>Seu histórico financeiro começará a aparecer aqui.</span></div>'}
  if(window.PrecificaShell&&window.PrecificaShell.profileUI)window.PrecificaShell.profileUI();
}

function setFinTab(name){qa("[data-fin-tab]").forEach(function(b){b.classList.toggle("active",b.dataset.finTab===name)});qa("[data-fin-pane]").forEach(function(p){p.classList.toggle("hidden",p.dataset.finPane!==name)});if(name==="entries"&&q("#finDescription"))setTimeout(function(){q("#finDescription").focus()},60)}
function backup(){var payload={version:VERSION,exportedAt:new Date().toISOString(),stock:stock,finance:finance};var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="precifica3d-gestao-"+today()+".json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}

function bind(){
  optionFill(q("#stockCategory"),STOCK_CATS);optionFill(q("#stockUnit"),UNITS);refreshFinCategories();if(q("#finPaid"))q("#finPaid").value=today();if(q("#finDue"))q("#finDue").value=today();
  if(q("#stockItemForm"))q("#stockItemForm").addEventListener("submit",addStockItem);if(q("#stockMoveForm"))q("#stockMoveForm").addEventListener("submit",addStockMove);if(q("#stockSearch"))q("#stockSearch").addEventListener("input",renderStock);if(q("#stockFilter"))q("#stockFilter").addEventListener("change",renderStock);if(q("#stockSyncPresets"))q("#stockSyncPresets").onclick=syncPresets;if(q("#stockFocusNew"))q("#stockFocusNew").onclick=function(){q("#stockName").focus();q("#stockItemForm").scrollIntoView({behavior:"smooth",block:"center"})};
  if(q("#financeEntryForm"))q("#financeEntryForm").addEventListener("submit",addFinanceEntry);if(q("#finType"))q("#finType").addEventListener("change",refreshFinCategories);if(q("#finSearch"))q("#finSearch").addEventListener("input",renderFinanceTables);if(q("#finTypeFilter"))q("#finTypeFilter").addEventListener("change",renderFinanceTables);if(q("#openingBalanceForm"))q("#openingBalanceForm").addEventListener("submit",function(e){e.preventDefault();finance.openingBalance=num(q("#openingBalance").value);saveFinance();toast("Saldo inicial atualizado.")});if(q("#drePeriod"))q("#drePeriod").addEventListener("change",renderDre);if(q("#dashboardPeriod"))q("#dashboardPeriod").addEventListener("change",renderDashboard);if(q("#financePeriod"))q("#financePeriod").addEventListener("change",renderFinance);
  qa("[data-fin-tab]").forEach(function(b){b.onclick=function(){setFinTab(b.dataset.finTab)}});if(q("#financeFocusNew"))q("#financeFocusNew").onclick=function(){setFinTab("entries")};if(q("#financeBackup"))q("#financeBackup").onclick=backup;if(q("#mgBackupBtn"))q("#mgBackupBtn").onclick=backup;
  document.addEventListener("click",function(e){var b=e.target.closest('[data-open-workspace="finance"]');if(b&&b.closest(".mg-quick-grid"))setTimeout(function(){setFinTab("entries")},80)});
}

function init(){injectNavigation();injectSections();updateAuthCopy();bind();renderStock();renderFinance();renderDashboard();}
window.PrecificaManagement={renderAll:function(){renderStock();renderFinance();renderDashboard()},stock:stock,finance:finance};
init();
})();