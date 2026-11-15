// Animação das etapas. Todo número exibido vem de app/motor.js; aqui só há desenho e tempo.
// A animação é uma função pura do tempo t (segundos): render(t) pinta o quadro, e o controlador só move t.
import { EAP, DISC, PADRAO, cronograma, medicao, previsao, diario, janelas, climaDoDia, linhaDeBase, dataDe, fuzzy } from './motor.js';

/* ---------- utilitários ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo3 = x => 1 - Math.pow(1 - x, 3);
const eio = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const ei2 = x => x * x;
const lerp = (a, b, u) => a + (b - a) * u;
const vis = (t, a, b, fi = .5, fo = .4) => seg(t, a, a + fi) * (1 - seg(t, b - fo, b));
const dt = d => { const [y, m, da] = dataDe(d).split('-'); return `${da}/${m}/${y}`; };
const dcurta = d => dt(d).slice(0, 5);
const n1 = v => v.toFixed(1).replace('.', ',');
const n2 = v => v.toFixed(2).replace('.', ',');
const milhar = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const digita = (s, u) => s.slice(0, Math.round(s.length * clamp(u)));
const NS = 'http://www.w3.org/2000/svg';
const q = (sel, r = document) => r.querySelector(sel);
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, u) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
const AC_ESC = '#0a5a59', AZUL = '#4a78c2', AZUL_ESC = '#26457f', VERM = '#c8453a', VERM_ESC = '#7d2820', BASEC = '#a7adb3', AC = '#0e7c7b', AC_CL = '#e3f1f0', AC_MED = '#b7dcda', TINTA = '#1d2a2d', APOIO = '#5f6e72';

function mk(tag, attrs, parent, cls) { const e = document.createElement(tag); if (cls) e.className = cls; for (const k in attrs || {}) e[k] = attrs[k]; if (parent) parent.appendChild(e); return e; }
function sv(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function tx(parent, x, y, s, attrs = {}) { const e = sv('text', { x, y, ...attrs }, parent); e.textContent = s; return e; }
// atributo SVG com cache: só escreve quando o valor muda
function A(e, o) { const c = e._a || (e._a = {}); for (const k in o) { let v = o[k]; if (typeof v === 'number') v = Math.round(v * 100) / 100; if (c[k] !== v) { c[k] = v; e.setAttribute(k, v); } } }
// estilo HTML com cache
function U(e, o) {
  let k = ''; for (const n in o) k += n + o[n] + '|';
  if (e._k === k) return; e._k = k;
  const st = e.style;
  if ('o' in o) { st.opacity = Math.round(o.o * 1000) / 1000; st.visibility = o.o <= 0.002 ? 'hidden' : 'visible'; }
  if ('x' in o || 'y' in o || 's' in o) st.transform = `translate(${Math.round((o.x || 0) * 100) / 100}px,${Math.round((o.y || 0) * 100) / 100}px) scale(${Math.round((o.s == null ? 1 : o.s) * 1000) / 1000})`;
  for (const n of ['w', 'h', 'l', 't']) if (n in o) st[{ w: 'width', h: 'height', l: 'left', t: 'top' }[n]] = Math.round(o[n] * 100) / 100 + 'px';
  if ('r' in o) st.borderRadius = o.r + 'px';
  if ('bg' in o) st.backgroundColor = o.bg;
  if ('bc' in o) st.borderColor = o.bc;
  if ('fs' in o) st.fontSize = o.fs + 'px';
  if ('pe' in o) st.pointerEvents = o.pe;
}

/* ---------- roteiro ---------- */
const CENAS = [0, 7, 15, 26, 43, 50.5, 60];
const DUR = 60;
const CAPS = [
  'O cronograma é feito no Project, como sempre.',
  'A programação da semana vai para o diário de obra.',
  'O campo lança o dia: avanço, efetivo e ocorrências. A chuva e o vento do dia entram da série meteorológica.',
  'A revisão assistida calcula sobre o que o diário trouxe.',
  'O resultado é uma proposta de revisão, item por item, com o motivo.',
  'As mudanças aceitas voltam para o cronograma.',
];
const NOMES = ['Cronograma', 'Programação da semana', 'Diário de campo', 'Revisão assistida', 'Proposta', 'Volta ao cronograma'];
const PARADAS = [6.8, 14.6, 25.4, 29.5, 33.5, 38.4, 42.4, 49.8, 59.6];            // quadros assentados, para quem reduz movimento
const PARADA_DO_CAP = [0, 1, 2, 3, 7, 8];
const BEATS = [[26, 30], [30, 34], [34, 39], [39, 43]];
const SUBS = [
  ['Semana de 04/07/2026 a 10/07/2026', 7.6, 15.4], ['Diário de campo, até 04/07/2026', 15.2, 25.8],
  ['1 · Ritmo medido contra o planejado', 26, 30], ['2 · Chuva e vento nas semanas à frente', 30, 34],
  ['3 · Monte Carlo: data de término', 34, 39], ['4 · Lógica fuzzy: onde fica o pulmão', 39, 43],
  ['Proposta de revisão, na data de status', 43.2, 50.4],
];
const RESTR = ['Projeto aprovado', 'Predecessora concluída', 'Material disponível'];

/* ---------- layouts (coordenadas de projeto; a cena inteira é ajustada à janela) ---------- */
const LY = {
  wide: {
    W: 1200, H: 640, cap: { l: 100, t: 18, w: 1000, fs: 22 },
    winA: { x: 192, y: 108, s: 1.2 }, winB: { x: 28, y: 118, s: .42 }, winC: { x: 205, y: 80, s: 1.16 },
    sup: { x: 330, y: 100, w: 846, h: 520 }, subOff: { l: 250, t: 25 },
    cards: [0, 1, 2].map(k => ({ x: 354 + k * 274, y: 196, w: 250, h: 290 })),
    card: { discTop: 18, nomeTop: 52, restrTop: 122, rowH: 32, pillTop: 238, pad: 18 },
    tags: [0, 1, 2].map(k => ({ x: 354, y: 230 + k * 52, w: 240, h: 40 })),
    phone: { x: 640, y: 152, s: 1 }, cont: { x: 925, y: 290 },
    beat: { x: 378, y: 176, w: 750, h: 410 },
    lista: { x: 380, y: 176, w: 740, rh: 64, gap: 12 },
    fim: { x: 0, y: 574, w: 1200 }, call: { dy: 26 },
  },
  tall: {
    W: 380, H: 700, cap: { l: 14, t: 8, w: 352, fs: 15 },
    winA: { x: 16, y: 170, s: .82 }, winB: { x: 14, y: 98, s: .3 }, winC: { x: 16, y: 104, s: .82 },
    sup: { x: 10, y: 230, w: 360, h: 462 }, subOff: { l: 24, t: 46 },
    cards: [0, 1, 2].map(k => ({ x: 22, y: 296 + k * 128, w: 336, h: 122 })),
    card: { discTop: 8, nomeTop: 32, restrTop: 62, rowH: 18, pillTop: 86, pad: 14 },
    tags: [0, 1, 2].map(k => ({ x: 22 + k * 114, y: 312, w: 108, h: 28 })),
    phone: { x: 22, y: 352, s: .74 }, cont: { x: 214, y: 400 },
    beat: { x: 22, y: 296, w: 336, h: 380 },
    lista: { x: 22, y: 292, w: 336, rh: 66, gap: 8 },
    fim: { x: 0, y: 452, w: 380 }, call: { dy: 18 },
  },
};

/* ---------- números: calculados uma vez, direto do motor ---------- */
function calcular() {
  const p = { ...PADRAO, n: 2000 };
  const cr = cronograma(p), med = medicao(p), pv = previsao(p), di = diario(p), lb = linhaDeBase();
  const L = Object.fromEntries(cr.linhas.map(l => [l.id, l]));
  const emExec = cr.linhas.filter(l => l.status === 'em execução').map(l => l.id);
  // caminho crítico da linha de base (o Project o mostra em vermelho): folga zero na passagem de volta
  const suc = Object.fromEntries(EAP.map(a => [a.id, EAP.filter(b => b.pred.includes(a.id)).map(b => b.id)]));
  const tarde = {}; const lf = id => tarde[id] != null ? tarde[id] : (tarde[id] = suc[id].length ? Math.min(...suc[id].map(s => lf(s) - lb.dur[s])) : lb.fimObra);
  const critBase = new Set(EAP.filter(a => lf(a.id) - lb.fim[a.id] < 0.5).map(a => a.id));
  const linhas = EAP.map(a => { const l = L[a.id]; return { id: a.id, nome: a.nome, disc: a.disc, bi: lb.ini[a.id], bf: lb.fim[a.id], ri: l.inicio, rf: l.fim, rp: l.concluido, rc: l.status !== 'concluída' && l.critica, sp: l.status === 'concluída' ? 1 : 0, sc: critBase.has(a.id), pulm: l.pulmao, status: l.status }; });
  // dias do diário na tarefa de fechamentos: um dia de chuva isolado e os vizinhos
  const reg6 = di.registros.filter(g => g.id === 6), chuvas = reg6.filter(g => g.ocorrencia === 'chuva').map(g => g.dia);
  const ini6 = Math.min(...reg6.map(g => g.dia));
  const alvo = [...chuvas].reverse().find(d => !chuvas.includes(d - 1) && !chuvas.includes(d + 1) && d - 2 >= ini6) ?? chuvas[0];
  const dias = [alvo - 2, alvo - 1, alvo, alvo + 1].map(d => {
    const g = reg6.find(x => x.dia === d) || { avanco: 0, efetivo: 0, ocorrencia: null }, c = climaDoDia(d, p);
    return { dia: d, data: dt(d), avanco: g.avanco * 100, efetivo: g.efetivo, oc: g.ocorrencia, mm: c.mm, raj: c.rajada, chuva: c.chuva };
  });
  // ritmo medido por disciplina
  const ritmo = Object.entries(med.ritmo).map(([k, v]) => ({ k, nome: DISC[k], media: v.media, semanas: v.semanas, ok: v.semanas >= 4 })).sort((a, b) => b.ok - a.ok || b.semanas - a.semanas);
  // semanas à frente e tarefas sensíveis ao clima
  const semanas = cr.semanas.filter(s => s.dia >= p.corte).slice(0, 12);
  const sens = cr.linhas.filter(l => (l.ceuAberto || l.icamento) && l.status !== 'concluída');
  const curto = { 5: 'Cobertura', 6: 'Fechamentos', 11: 'Geradores', 14: 'Água gelada' };
  // histograma: 400 pontos, cada um vale 5 dos 2.000 cenários
  const H = pv.histograma, NP = 400, raw = H.faixas.map(f => f * NP), base = raw.map(Math.floor);
  let sobra = NP - base.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0]).slice(0, sobra).forEach(([, i]) => base[i]++);
  let seq = []; base.forEach((c, b) => { for (let i = 0; i < c; i++) seq.push(b); });
  let s = 7; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = seq.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [seq[i], seq[j]] = [seq[j], seq[i]]; }
  const cont = new Array(base.length).fill(0); const pontos = seq.map(b => ({ b, k: cont[b]++ }));
  // grade fuzzy: onde caem as tarefas críticas em aberto
  const atv = Object.fromEntries(pv.atividades.map(x => [x.id, x]));
  const bk = t => t < .25 ? 0 : t < .75 ? 1 : 2;
  const crit = cr.linhas.filter(l => l.status !== 'concluída' && l.critica).map(l => { const imp = atv[l.id].indice, pr = Math.min(0.4, 0.4 * l.variacao / Math.max(1, l.duracao * 0.3)); return { id: l.id, ci: bk(imp), cj: bk(pr / 0.4), pulm: l.pulmao, exp: l.exposicao }; });
  const celulas = [0, 1, 2].map(ci => [0, 1, 2].map(cj => fuzzy([0, .5, 1][ci], [0, .2, .4][cj])));   // ci 0 = criticidade baixa
  const act = med.atividades.filter(a => emExec.includes(a.id));
  return {
    p, cr, med, pv, lb, linhas, emExec, dias, ritmo, semanas, sens, curto, H, pontos, crit, celulas, act,
    registros: di.registros.length, corte: p.corte, nCenarios: pv.n,
    fimBase: lb.fimObra, fimRev: cr.fimRevisado, p50: pv.prazo.p50, p80: pv.prazo.p80, pulmao: cr.pulmaoProjeto,
    climaDias: sens.reduce((t, l) => t + l.diasClima, 0),
  };
}

/* ---------- estado ---------- */
let N = null, mode = null, ly = null, esc = 1;
let t = 0, tocando = false, ultimo = 0, quadroId = 0, parada = 0;
const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = {};   // elementos vivos da cena montada

/* ---------- montagem ---------- */
function montar() {
  const cena = q('#cena'); cena.innerHTML = '';
  mode = innerWidth <= 760 ? 'tall' : 'wide'; ly = LY[mode];
  cena.style.width = ly.W + 'px'; cena.style.height = ly.H + 'px';
  const tall = mode === 'tall'; cena.classList.toggle('tall', tall);
  // legenda
  R.leg = mk('div', { id: 'legenda' }, cena); U(R.leg, { l: ly.cap.l, t: ly.cap.t, w: ly.cap.w, fs: ly.cap.fs, x: 0 });
  R.legp = CAPS.map(c => mk('p', { textContent: c }, R.leg));
  // superfície da ferramenta
  const sp = ly.sup; R.sup = mk('div', {}, cena, 'ferr'); U(R.sup, { l: sp.x, t: sp.y, w: sp.w, h: sp.h });
  const chip = mk('div', {}, R.sup, 'chip'); R.chip = [mk('span', { textContent: 'Diário de obra integrado' }, chip), mk('span', { textContent: 'Revisão assistida' }, chip)];
  R.subs = SUBS.map(s => { const e = mk('div', { textContent: s[0] }, R.sup, 'sub'); U(e, { l: ly.subOff.l, t: ly.subOff.t }); return e; });
  // gantt do Project
  montarGantt(cena);
  // cartões
  R.cards = N.emExec.map((id, k) => {
    const c = mk('div', {}, cena, 'card'), cd = ly.card;
    const a = EAP.find(x => x.id === id);
    R['d' + k] = mk('span', { textContent: DISC[a.disc] }, c, 'c-disc');
    R['n' + k] = mk('div', { textContent: a.nome }, c, 'c-nome');
    const rs = mk('div', {}, c, 'c-restr');
    const cx = RESTR.map(txt => { const d = mk('div', {}, rs); const b = mk('span', {}, d, 'cx'); b.innerHTML = '<svg viewBox="0 0 12 12"><path d="M2 6.5l2.6 2.6L10 3.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="14" stroke-dashoffset="14"/></svg>'; mk('span', { textContent: txt }, d); return b; });
    const pill = mk('div', { textContent: 'Liberada' }, c, 'c-pill');
    return { el: c, disc: R['d' + k], nome: R['n' + k], rs, cx, pill, id };
  });
  // celular e contador
  const f = mk('div', {}, cena, 'fone'); R.fone = f;
  f.innerHTML = '<div class="f-in"><div class="f-topo"><span>Diário de obra</span><b class="v0"></b></div><div class="f-tarefa">Fechamentos e envoltória</div>' +
    '<div class="f-campo"><span>Avanço do dia</span><b class="v1"></b></div><div class="f-campo"><span>Efetivo</span><b class="v2"></b></div>' +
    '<div class="f-campo"><span>Ocorrência</span><b class="v3"></b></div>' +
    '<div class="f-clima"><div class="fc-tit"><span>Série meteorológica</span></div><div class="fc-em">preenchida sem digitar</div><div class="fc-lin"><span>Chuva do dia</span><b class="v4"></b></div><div class="fc-lin"><span>Rajada</span><b class="v5"></b></div></div><div class="f-aviso"></div></div><div class="f-ok">Lançado no diário</div>';
  R.fv = [0, 1, 2, 3, 4, 5].map(i => q('.v' + i, f)); R.fcl = q('.f-clima', f); R.fav = q('.f-aviso', f); R.fok = q('.f-ok', f);
  R.cont = mk('div', {}, cena, 'contador'); R.contN = mk('b', {}, R.cont); R.contT = mk('span', { innerHTML: `lançamentos no diário<br><small style="color:#93a0a4;font-size:13px">um por tarefa e por dia, em ${N.corte} dias de obra, até ${dt(N.corte)}</small>` }, R.cont);
  // gráficos das quatro batidas
  const b = ly.beat; R.graf = sv('svg', { width: b.w, height: b.h, viewBox: `0 0 ${b.w} ${b.h}` }, cena); R.graf.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;overflow:hidden`;
  R.beats = [beatRitmo, beatClima, beatMC, beatFuzzy].map((fn, i) => { const g = sv('g', {}, R.graf); return { g, upd: fn(g, b.w, b.h, i) }; });
  // lista da proposta
  montarLista(cena);
  // fichas finais
  R.fim = mk('div', { id: 'fim' }, cena); U(R.fim, { l: ly.fim.x, t: ly.fim.y, w: ly.fim.w });
  R.fim.innerHTML = `<div class="tres"><div><i style="background:${BASEC}"></i><span>Término na linha de base <b>${dt(N.fimBase)}</b></span></div><div><i style="background:${AZUL_ESC}"></i><span>Revisado <b>${dt(Math.round(N.fimRev))}</b></span></div><div><i style="background:${AC}"></i><span>8 em 10 cenários <b>${dt(Math.round(N.p80))}</b>, pulmão de ${n1(N.pulmao)} dias</span></div></div><div class="bts"><button class="bt p" id="bt-fim-rep">Repetir</button><button class="bt" id="bt-fim-fontes">Ver as fontes e premissas</button></div>`;
  R.fimT = [...R.fim.querySelectorAll('.tres>div')]; R.fimB = q('.bts', R.fim);
  q('#bt-fim-rep').onclick = () => repetir(); q('#bt-fim-fontes').onclick = () => abrirFontes();
  R.call = mk('div', {}, cena, 'rotulo'); R.call.style.cssText += 'color:#0a5a59;font-weight:600;font-size:13px;text-align:center';
  R.call.innerHTML = `Semana de ${dt(N.corte)} a ${dt(N.corte + 6)}<i style="display:block;width:2px;height:${ly.call.dy - 14}px;background:${AC};margin:3px auto 0"></i>`;
  ajustar();
}

/* ----- gantt do Project ----- */
function montarGantt(cena) {
  const tall = mode === 'tall';
  const GW = tall ? 424 : 680, GH = 410, X0 = tall ? 26 : 282, PX = (GW - X0 - 8) / 500, RH = 13, R0 = 28, SH = GH - 44;
  const g = R.g = { GW, GH, X0, PX, RH, R0 };
  R.win = mk('div', {}, cena, 'win'); U(R.win, { w: GW, h: GH });
  R.win.innerHTML = '<div class="w-tit"><span>Obra A - Data center</span><span class="w-ctl"><i></i><i></i><i></i></span></div><div class="w-fita"><b>Arquivo</b><span>Tarefa</span><span>Recurso</span><span>Relatório</span><span>Projeto</span><span>Exibição</span></div>';
  const svg = sv('svg', { class: 'w-svg', width: GW, height: SH, viewBox: `0 0 ${GW} ${SH}` }, R.win);
  const X = d => X0 + d * PX; g.X = X;
  const defs = sv('defs', {}, svg); const pat = sv('pattern', { id: 'hach', width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  sv('rect', { width: 4, height: 4, fill: '#fff' }, pat); sv('rect', { width: 1.8, height: 4, fill: AC }, pat);
  sv('rect', { x: 0, y: 0, width: GW, height: SH, fill: '#fff' }, svg);
  sv('rect', { x: 0, y: 0, width: X0, height: SH, fill: '#fafbfc' }, svg);
  // cabeçalho da escala: ano e mês
  sv('rect', { x: 0, y: 0, width: GW, height: R0 - 2, fill: '#f4f6f9' }, svg);
  sv('line', { x1: 0, x2: GW, y1: R0 - 2, y2: R0 - 2, stroke: '#c9d0d8', 'stroke-width': 1 }, svg);
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const meses = []; for (let d = -4; d <= 500; d++) { const s = dataDe(d); if (s.endsWith('-01') || d === -4) meses.push({ d: Math.max(0, d), m: +s.slice(5, 7) - 1, a: s.slice(0, 4) }); }
  meses.forEach((m, i) => { const x = X(m.d), nx = i + 1 < meses.length ? X(meses[i + 1].d) : X(500);
    sv('line', { x1: x, x2: x, y1: 13, y2: SH, stroke: '#e6eaef', 'stroke-width': .7 }, svg);
    tx(svg, x + (nx - x) / 2, 23, MES[m.m], { 'font-size': 7, fill: '#5b6672', 'text-anchor': 'middle' });
    if (m.m === 0 || i === 0) { sv('line', { x1: x, x2: x, y1: 0, y2: SH, stroke: '#c9d0d8', 'stroke-width': .8 }, svg); tx(svg, x + 3, 10, m.a, { 'font-size': 7.5, fill: '#37424f', 'font-weight': 600 }); } });
  sv('line', { x1: X0, x2: X0, y1: 0, y2: SH, stroke: '#c9d0d8' }, svg);
  tx(svg, 6, 19, '', {}); if (!tall) { tx(svg, 24, 19, 'Nome da tarefa', { 'font-size': 7.5, fill: '#37424f', 'font-weight': 600 }); tx(svg, 168, 19, 'Início', { 'font-size': 7.5, fill: '#37424f', 'font-weight': 600 }); tx(svg, 224, 19, 'Término', { 'font-size': 7.5, fill: '#37424f', 'font-weight': 600 }); }
  // faixa da semana e linha de status
  g.band = sv('rect', { x: X(N.corte), y: R0, width: 7 * PX, height: SH - R0, fill: AC, opacity: 0 }, svg);
  g.rows = N.linhas.map((d, i) => {
    const y = R0 + i * RH, r = { d, y };
    r.hl = sv('rect', { x: 0, y, width: GW, height: RH, fill: AC_CL, opacity: 0 }, svg);
    sv('line', { x1: 0, x2: GW, y1: y + RH, y2: y + RH, stroke: '#e6eaef', 'stroke-width': .7 }, svg);
    tx(svg, 4, y + 9.3, String(i + 1), { 'font-size': 7, fill: '#8a949e' });
    if (!tall) { tx(svg, 17, y + 9.3, d.nome.length > 34 ? d.nome.slice(0, 33) + '…' : d.nome, { 'font-size': 7.6, fill: '#26323d' }); r.ti = tx(svg, 168, y + 9.3, dt(d.bi), { 'font-size': 7, fill: '#4b5663' }); r.tf = tx(svg, 224, y + 9.3, dt(d.bf), { 'font-size': 7, fill: '#4b5663' }); }
    r.base = sv('rect', { x: X(d.bi), y: y + 8.6, width: 0, height: 2.6, fill: BASEC, opacity: 0 }, svg);
    r.bar = sv('rect', { x: X(d.bi), y: y + 2, width: 0, height: 6.6, fill: AZUL, rx: .6 }, svg);
    r.prog = sv('rect', { x: X(d.bi), y: y + 4.2, width: 0, height: 2.4, fill: AZUL_ESC }, svg);
    if (d.id === 25) r.pb = sv('rect', { x: X(d.rf), y: y + 1.6, width: 0, height: 9.8, fill: 'url(#hach)', stroke: AC, 'stroke-width': 1, opacity: 0 }, svg);
    r.hat = sv('rect', { x: X(d.bf), y: y + 1.6, width: 0, height: 7.4, fill: 'url(#hach)', stroke: AC, 'stroke-width': .7 }, svg);
    return r;
  });
  const fim = R0 + 25 * RH;
  g.mk = [[N.fimBase, '#8a949e', '3 2'], [N.fimRev, AZUL_ESC, ''], [N.p80, AC, '3 2']].map(([d, c, da]) => sv('line', { x1: X(d), x2: X(d), y1: R0, y2: fim, stroke: c, 'stroke-width': 1.2, 'stroke-dasharray': da, opacity: 0 }, svg));
  g.pbT = tx(svg, X(N.fimRev) - 14, R0 + 24 * RH + 9.2, `Pulmão do projeto: ${n1(N.pulmao)} dias`, { 'font-size': 7.6, fill: AC, 'font-weight': 600, 'text-anchor': 'end', opacity: 0 });
  g.st = sv('line', { x1: X(N.corte), x2: X(N.corte), y1: R0, y2: fim + 4, stroke: '#37424f', 'stroke-width': 1, 'stroke-dasharray': '3 2', opacity: 0 }, svg);
  g.stT = tx(svg, X(N.corte) + 3, fim + 9.5, `Data de status ${dt(N.corte)}`, { 'font-size': 6.8, fill: '#37424f', opacity: 0 });
  sv('rect', { x: 0, y: SH - 1, width: GW, height: 1, fill: '#c9d0d8' }, svg);
  R.rot = mk('div', { innerHTML: '<i></i>Cronograma do planejador (Project)' }, cena, 'rotulo');
  g.sv = svg;
}
// posição de uma linha do gantt em coordenadas da cena
function winEstado(tt) {
  const a = ly.winA, b = ly.winB, c = ly.winC, u1 = eio(seg(tt, 7, 8.4)), u2 = eio(seg(tt, 50.5, 52.3));
  const m = (p1, p2, u) => ({ x: lerp(p1.x, p2.x, u), y: lerp(p1.y, p2.y, u), s: lerp(p1.s, p2.s, u) });
  return u2 > 0 ? m(b, c, u2) : m(a, b, u1);
}
function barraNaCena(i, tt) {
  const g = R.g, w = winEstado(tt), d = g.rows[i].d;
  return { x: w.x + (g.X(d.bi)) * w.s, y: w.y + (44 + g.R0 + i * g.RH + 2) * w.s, w: (d.bf - d.bi) * g.PX * w.s, h: 6.6 * w.s };
}

/* ----- lista da proposta ----- */
function montarLista(cena) {
  const ac = N.act, cr = N.cr;
  const it = [
    ['Percentual concluído atualizado', `${N.emExec.length} tarefas em execução: ${ac.map(a => Math.round(a.avanco * 100) + '%').join(', ').replace(/, ([^,]*)$/, ' e $1')}`, 'avanço lançado no diário'],
    ['Datas reprogramadas pelo ritmo medido', `Término de ${dt(N.fimBase)} para ${dt(Math.round(N.fimRev))}`, `elétrica a ${n2(N.med.ritmo.eletrica.media)} do plano`],
    ['Dias de clima nas tarefas sensíveis', `${n1(N.climaDias)} dias previstos em ${N.sens.length} tarefas`, 'chuva e vento das semanas'],
    ['Bolsões de folga nas tarefas críticas', `${N.crit.length} tarefas críticas em aberto`, 'exposição pela lógica fuzzy'],
    ['Bolsão de folga no fim da obra', `${n1(N.pulmao)} dias, até ${dt(Math.round(N.p80))}`, '8 em 10 cenários'],
  ];
  const L = ly.lista;
  R.itens = it.map((d, i) => {
    const e = mk('div', {}, cena, 'item'); U(e, { l: L.x, t: L.y + i * (L.rh + L.gap), w: L.w, h: L.rh });
    e.innerHTML = `<span class="it-ch"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3L12.5 4.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="16" stroke-dashoffset="16"/></svg></span><div class="it-tx"><b>${d[0]}</b><span>${d[1]}</span><span class="it-m2">${d[2]} · <u>aceito</u></span></div><div class="it-dr"><span class="it-mo">${d[2]}</span><span class="it-ac">aceito</span></div>`;
    return { el: e, ch: q('.it-ch', e), path: q('path', e), ac: q('.it-ac', e), i };
  });
  R.fly = Array.from({ length: 5 }, () => mk('div', {}, cena, 'item'));
  R.fly.forEach(e => { e.innerHTML = ''; e.style.cssText += `;width:30px;height:8px;padding:0;border:0;border-radius:4px;background:${AC};display:block`; });
  R.dat = Array.from({ length: 14 }, () => mk('div', {}, cena, 'item'));
  R.dat.forEach(e => { e.innerHTML = ''; e.style.cssText += `;width:9px;height:9px;padding:0;border:0;border-radius:50%;background:${AC};display:block;left:0;top:0`; });
}

/* ---------- batidas do cálculo ---------- */
function beatRitmo(g, w, h) {
  g.setAttribute('transform', `translate(0 ${mode === 'tall' ? 20 : 36})`);
  const rows = N.ritmo, esc1 = (w - 96) / 1.25, rh = 78, top = 34;
  const lin = sv('line', { x1: esc1, x2: esc1, y1: top - 8, y2: top + rows.length * rh - 14, stroke: '#9aa7aa', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }, g);
  const lt = tx(g, esc1, top - 14, 'Planejado = 1,00', { 'font-size': 13, fill: APOIO, 'text-anchor': 'middle' });
  const el = rows.map((r, i) => {
    const y = top + i * rh;
    const t1 = tx(g, 0, y + 14, r.nome + (r.ok ? '' : ' (menos de 4 semanas medidas)'), { 'font-size': 14, fill: r.ok ? TINTA : '#93a0a4', 'font-weight': r.ok ? 600 : 400 });
    sv('rect', { x: 0, y: y + 24, width: w - 96, height: 22, rx: 11, fill: '#f0f3f3' }, g);
    const b = sv('rect', { x: 0, y: y + 24, width: 0, height: 22, rx: 11, fill: r.ok ? AC : '#cfd8d8' }, g);
    const n = tx(g, 0, y + 42, n2(r.media), { 'font-size': 22, 'font-weight': r.ok ? 600 : 400, fill: r.ok ? TINTA : '#93a0a4' });
    return { r, b, n, t1, y };
  });
  const ele = N.med.ritmo.eletrica, nota = tx(g, 0, top + rows.length * rh + 14, `Elétrica: ${n2(ele.media)} do ritmo planejado, em ${ele.semanas} semanas medidas no diário`, { 'font-size': 15, fill: APOIO });
  const nota2 = tx(g, 0, top + rows.length * rh + 36, 'As demais disciplinas seguem o ritmo de referência até completar quatro semanas.', { 'font-size': 13, fill: '#93a0a4' });
  return tt => {
    const [a, b] = BEATS[0], op = vis(tt, a + .7, b, .5, .35);
    A(g, { opacity: op });
    A(lin, { opacity: seg(tt, a + 1.4, a + 1.9) }); A(lt, { opacity: seg(tt, a + 1.4, a + 1.9) });
    el.forEach((e, i) => { const u = eo3(seg(tt, a + 1.5 + i * .35, a + 2.7 + i * .35)); const wv = Math.max(0, e.r.media * esc1 * u); A(e.b, { width: Math.max(0.01, wv) }); A(e.n, { x: Math.max(wv, 22) + 12, opacity: u > .05 ? 1 : 0 }); A(e.t1, { opacity: seg(tt, a + 1.3 + i * .35, a + 1.8 + i * .35) }); });
    A(nota, { opacity: seg(tt, a + 2.9, a + 3.4) }); A(nota2, { opacity: seg(tt, a + 3.1, a + 3.6) });
  };
}
function beatClima(g, w, h) {
  const tall = mode === 'tall', S = N.semanas, d0 = S[0].dia, span = S.length * 7, sl = w / S.length;
  const base = 150, maxv = Math.max(...S.map(s => Math.max(s.chuva, s.vento))) * 1.08;
  // legenda
  sv('rect', { x: 0, y: 6, width: 12, height: 12, rx: 3, fill: AC }, g); tx(g, 18, 17, 'chuva acima de 10 mm', { 'font-size': 13, fill: APOIO });
  const lx = tall ? w / 2 + 8 : 190; sv('rect', { x: lx, y: 6, width: 12, height: 12, rx: 3, fill: '#5d6f76' }, g); tx(g, lx + 18, 17, 'rajada acima de 45 km/h', { 'font-size': 13, fill: APOIO });
  tx(g, w, 17, 'chance de dia perdido na semana', { 'font-size': 12, fill: '#93a0a4', 'text-anchor': 'end' }).setAttribute('display', tall ? 'none' : 'inline');
  sv('line', { x1: 0, x2: w, y1: base + 36, y2: base + 36, stroke: '#cdd6d6' }, g);
  const bars = S.map((s, i) => {
    const bw = Math.max(5, sl * .3), x = i * sl + sl / 2;
    const c = sv('rect', { x: x - bw - 1, y: base + 36, width: bw, height: 0, rx: 2, fill: AC }, g), v = sv('rect', { x: x + 1, y: base + 36, width: bw, height: 0, rx: 2, fill: '#5d6f76' }, g);
    if (i % 2 === 0) tx(g, x, base + 52, dcurta(s.dia), { 'font-size': 11, fill: '#93a0a4', 'text-anchor': 'middle' });
    return { c, v, s };
  });
  const pico = S.reduce((m, s) => s.vento > m.vento ? s : m, S[0]), ip = S.indexOf(pico);
  const tp = tx(g, ip * sl + sl / 2, base - (pico.vento / maxv) * 120 - 4, `${Math.round(pico.vento * 100)}%`, { 'font-size': 13, 'font-weight': 600, fill: TINTA, 'text-anchor': 'middle', opacity: 0 });
  // tarefas sensíveis
  const ty0 = base + 76, rh = tall ? 40 : 38, X = d => clamp((d - d0) / span, 0, 1) * w;
  const tr = N.sens.map((l, i) => {
    const y = ty0 + i * rh, ini = Math.max(l.inicio, N.corte), x1 = X(ini), x2 = X(l.fim);
    const nm = tx(g, x1, y + 12, `${N.curto[l.id] || l.nome} (${[l.ceuAberto ? 'chuva' : '', l.icamento ? 'vento' : ''].filter(Boolean).join(' e ')})`, { 'font-size': 13, fill: TINTA, 'font-weight': 600 });
    sv('rect', { x: x1, y: y + 18, width: Math.max(2, x2 - x1), height: 8, rx: 4, fill: '#eef3f3' }, g);
    const b = sv('rect', { x: x1, y: y + 18, width: 0, height: 8, rx: 4, fill: AC_MED }, g);
    const dd = tx(g, Math.min(w, x2) + 8, y + 26, `+${n1(l.diasClima)} d`, { 'font-size': 13, fill: AC, 'font-weight': 600 });
    if (x2 > w - 60) { dd.setAttribute('x', w); dd.setAttribute('text-anchor', 'end'); dd.setAttribute('y', y + 12); }
    return { nm, b, dd, x1, x2, i };
  });
  const sum = tx(g, 0, ty0 + N.sens.length * rh + 22, `${n1(N.climaDias)} dias de clima previstos nas ${N.sens.length} tarefas sensíveis`, { 'font-size': 17, 'font-weight': 600, fill: AC_ESC });
  return tt => {
    const [a, b] = BEATS[1]; A(g, { opacity: vis(tt, a, b, .4, .35) });
    bars.forEach((e, i) => { const u = eo3(seg(tt, a + .5 + i * .06, a + 1.3 + i * .06)); const hc = (e.s.chuva / maxv) * 120 * u, hv = (e.s.vento / maxv) * 120 * u; A(e.c, { y: base + 36 - hc, height: hc }); A(e.v, { y: base + 36 - hv, height: hv }); });
    A(tp, { opacity: seg(tt, a + 1.5, a + 1.9) });
    tr.forEach((e, i) => { const u = eio(seg(tt, a + 1.4 + i * .3, a + 2.4 + i * .3)); A(e.b, { width: Math.max(0.01, (e.x2 - e.x1) * u) }); A(e.nm, { opacity: seg(tt, a + 1.3 + i * .3, a + 1.8 + i * .3) }); A(e.dd, { opacity: seg(tt, a + 2.2 + i * .3, a + 2.7 + i * .3) }); });
    A(sum, { opacity: seg(tt, a + 3.1, a + 3.6) });
  };
}
function beatMC(g, w, h) {
  const tall = mode === 'tall', Hh = N.H, nb = Hh.faixas.length, d0 = Hh.base, d1 = Hh.base + nb * Hh.passo, X = d => (d - d0) / (d1 - d0) * w;
  const bw = w / nb, maxk = Math.max(...N.pontos.map(p => p.k)) + 1, ybase = h - (tall ? 96 : 100);
  const rad = Math.min(bw * .42, (ybase - 78) / (maxk * 2.15), 3.2), pitch = rad * 2.15;
  sv('line', { x1: 0, x2: w, y1: ybase + 8, y2: ybase + 8, stroke: '#cdd6d6' }, g);
  for (let d = d0; d <= d1; d++) { const s = dataDe(d); if (s.endsWith('-01')) { const x = X(d); sv('line', { x1: x, x2: x, y1: ybase + 8, y2: ybase + 14, stroke: '#cdd6d6' }, g); tx(g, x, ybase + 30, ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+s.slice(5, 7) - 1] + '/' + s.slice(2, 4), { 'font-size': 12, fill: '#93a0a4', 'text-anchor': 'middle' }); } }
  tx(g, w / 2, ybase + 62, `${milhar(N.nCenarios)} cenários do cálculo · cada ponto vale ${N.nCenarios / N.pontos.length}`, { 'font-size': 13, fill: APOIO, 'text-anchor': 'middle' });
  const dots = N.pontos.map((p, j) => { const c = sv('circle', { cx: (p.b + .5) * bw, cy: ybase - rad - p.k * pitch, r: rad, fill: AC, opacity: 0 }, g); return { c, y: ybase - rad - p.k * pitch, j }; });
  const mk1 = (d, col, lab, val, anchor, y0) => { const x = X(d); const l = sv('line', { x1: x, x2: x, y1: y0, y2: ybase + 8, stroke: col, 'stroke-width': 1.6 }, g); const a1 = tx(g, x + (anchor === 'end' ? -8 : 8), y0 + 12, lab, { 'font-size': 13, fill: APOIO, 'text-anchor': anchor }); const a2 = tx(g, x + (anchor === 'end' ? -8 : 8), y0 + 32, val, { 'font-size': 19, 'font-weight': 600, fill: col === TINTA ? TINTA : AC_ESC, 'text-anchor': anchor }); return { l, a1, a2 }; };
  const m50 = mk1(N.p50, TINTA, 'Mais provável (mediana)', dt(Math.round(N.p50)), 'end', 40), m80 = mk1(N.p80, AC, '8 em cada 10 cenários', 'até ' + dt(Math.round(N.p80)), 'start', 40);
  return tt => {
    const [a, b] = BEATS[2]; A(g, { opacity: vis(tt, a, b, .4, .4) });
    dots.forEach(e => { const t0 = a + .9 + 2.0 * Math.pow(e.j / dots.length, .85), u = seg(tt, t0, t0 + .5), y = lerp(e.y - 150, e.y, ei2(u)); A(e.c, { cy: y, opacity: u > 0 ? 1 : 0 }); });
    const u50 = seg(tt, a + 3.0, a + 3.4), u80 = seg(tt, a + 3.5, a + 3.9);
    [m50.l, m50.a1, m50.a2].forEach(e => A(e, { opacity: u50 })); [m80.l, m80.a1, m80.a2].forEach(e => A(e, { opacity: u80 }));
  };
}
function beatFuzzy(g, w, h) {
  const tall = mode === 'tall', cw = tall ? 80 : 108, ch = tall ? 62 : 80, gx = tall ? 52 : 78, gy = 42;
  g.setAttribute('transform', `translate(${tall ? 14 : 50} ${tall ? 0 : 46})`);
  const rot = ['Baixa', 'Média', 'Alta'];
  tx(g, gx + cw * 1.5, 14, 'Variação da duração', { 'font-size': 13, fill: APOIO, 'text-anchor': 'middle' });
  [0, 1, 2].forEach(j => tx(g, gx + cw * (j + .5), 34, rot[j], { 'font-size': 12, fill: '#93a0a4', 'text-anchor': 'middle' }));
  const gt = tx(g, 0, 0, 'Criticidade', { 'font-size': 13, fill: APOIO, 'text-anchor': 'middle', transform: `translate(${tall ? 2 : 10} ${gy + ch * 1.5}) rotate(-90)` });
  [0, 1, 2].forEach(r => tx(g, gx - 8, gy + ch * (r + .5) + 4, rot[2 - r], { 'font-size': 12, fill: '#93a0a4', 'text-anchor': 'end' }));
  const cel = []; const max = Math.max(...N.celulas.flat());
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const ci = 2 - r, v = N.celulas[ci][c], x = gx + c * cw, y = gy + r * ch;
    const rc = sv('rect', { x: x + 2, y: y + 2, width: cw - 4, height: ch - 4, rx: 9, fill: AC, 'fill-opacity': .06 + .5 * v / max, stroke: AC, 'stroke-width': 0, opacity: 0 }, g);
    const n = N.crit.filter(k => k.ci === ci && k.cj === c);
    cel.push({ rc, ci, c, n, x, y, v });
  }
  // pontos das tarefas críticas dentro das células
  const dots = []; cel.forEach(c => c.n.forEach((k, i) => { const col = i % 3, row = Math.floor(i / 3), px = c.x + 18 + col * 26, py = c.y + ch - 20 - row * 22;
    const gg = sv('g', { opacity: 0 }, g); sv('circle', { cx: px, cy: py, r: 10.5, fill: '#fff', stroke: AC, 'stroke-width': 1.5 }, gg); tx(gg, px, py + 4, String(k.id), { 'font-size': 11, 'font-weight': 600, fill: AC_ESC, 'text-anchor': 'middle' }); dots.push({ gg, c, k }); }));
  const px0 = tall ? 0 : gx + cw * 3 + 36, py0 = tall ? gy + ch * 3 + 26 : 44;
  const lab1 = tx(g, px0, py0 + 8, 'Tarefas críticas em aberto', { 'font-size': 13, fill: APOIO, opacity: 0 });
  const lab2 = tx(g, px0, py0 + 38, `${N.crit.length} tarefas`, { 'font-size': 22, 'font-weight': 600, fill: TINTA, opacity: 0 });
  const lab3 = tx(g, px0, py0 + 74, 'Pulmão do projeto', { 'font-size': 13, fill: APOIO, opacity: 0 });
  const lab4 = tx(g, px0, py0 + 108, `${n1(N.pulmao)} dias`, { 'font-size': 34, 'font-weight': 300, fill: AC_ESC, opacity: 0 });
  const lab5 = tx(g, px0, py0 + 132, 'dividido entre elas, na proporção da exposição', { 'font-size': 12, fill: '#93a0a4', opacity: 0 });
  return tt => {
    const [a, b] = BEATS[3]; A(g, { opacity: vis(tt, a, b, .4, .4) });
    cel.forEach((c, i) => { const u = seg(tt, a + .3 + (i % 3) * .08 + Math.floor(i / 3) * .08, a + .9 + (i % 3) * .08 + Math.floor(i / 3) * .08); const on = c.n.length ? eio(seg(tt, a + 1.6, a + 2.2)) : 0;
      A(c.rc, { opacity: u, 'stroke-width': 2.4 * on }); });
    dots.forEach((d, i) => A(d.gg, { opacity: seg(tt, a + 1.0 + i * .07, a + 1.4 + i * .07) }));
    A(lab1, { opacity: seg(tt, a + 1.7, a + 2.1) }); A(lab2, { opacity: seg(tt, a + 1.8, a + 2.2) });
    A(lab3, { opacity: seg(tt, a + 2.3, a + 2.7) }); A(lab4, { opacity: seg(tt, a + 2.4, a + 2.9) }); A(lab5, { opacity: seg(tt, a + 2.8, a + 3.2) });
  };
}

/* ---------- quadro ---------- */
function render(tt) {
  if (!N || !R.win) return;
  tt = clamp(tt, 0, DUR);
  const w = winEstado(tt), g = R.g, tall = mode === 'tall';
  // legenda
  CENAS.slice(0, 6).forEach((c0, i) => { const c1 = CENAS[i + 1]; const o = (i === 0 ? seg(tt, .2, .8) : seg(tt, c0 + .1, c0 + .6)) * (i === 5 ? 1 : 1 - seg(tt, c1 - .3, c1 + .1)); U(R.legp[i], { o, y: (1 - o) * 4 }); });
  // janela do Project
  U(R.win, { x: w.x, y: w.y, s: w.s, o: seg(tt, .1, 1.3) });
  const par = seg(tt, 7, 8.4) * (1 - seg(tt, 50.5, 52.3));
  U(R.rot, { x: w.x, y: w.y - (tall ? 22 : 26), o: seg(tt, .3, 1.1) });
  R.rot.style.fontSize = lerp(13, tall ? 11 : 12, par) + 'px';
  // chamada da semana (cena 1)
  const cx = w.x + (g.X(N.corte) + 3.5 * g.PX) * w.s;
  U(R.call, { x: cx - 100, y: w.y - ly.call.dy - (tall ? 6 : 4) - 8, w: 200, o: tall ? 0 : seg(tt, 3.6, 4.2) * (1 - seg(tt, 6.5, 7.1)) }); R.call.style.width = '200px';
  pintarGantt(tt);
  // superfície da ferramenta
  const sup = vis(tt, 7.6, 50.9, .8, .5);
  U(R.sup, { o: sup, y: (1 - sup) * 14 });
  U(R.chip[0], { o: seg(tt, 7.9, 8.5) * (1 - seg(tt, 25.7, 26.3)) }); U(R.chip[1], { o: seg(tt, 25.9, 26.5) * (1 - seg(tt, 50.2, 50.8)) });
  SUBS.forEach((s, i) => U(R.subs[i], { o: vis(tt, s[1], s[2], .4, .35) * sup }));
  // cartões
  pintarCartoes(tt);
  // celular e contador
  pintarFone(tt);
  // batidas
  R.beats.forEach(b => b.upd(tt)); U(R.graf, {});
  // lista
  pintarLista(tt);
  // quadro final
  const fim = ly.fim;
  U(R.fim, { o: 1 });
  R.fimT.forEach((e, i) => U(e, { o: seg(tt, 56.6 + i * .5, 57.1 + i * .5) }));
  U(R.fimB, { o: seg(tt, 58.2, 58.8), pe: tt >= 58.5 ? 'auto' : 'none' });
  // barra de reprodução
  const ch = CENAS.findIndex((c, i) => tt >= c && tt < CENAS[i + 1]); const at = ch < 0 ? 5 : ch;
  R.capsEl.forEach((e, i) => { e.classList.toggle('at', i === at); e.querySelector('i').style.width = (clamp((tt - CENAS[i]) / (CENAS[i + 1] - CENAS[i])) * 100).toFixed(1) + '%'; });
  const s = Math.floor(tt); q('#tempo').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} / 1:00`;
}

function pintarGantt(tt) {
  const g = R.g, rows = g.rows, X = g.X, PX = g.PX;
  A(g.band, { opacity: .3 * seg(tt, 3.0, 3.8) * (1 - seg(tt, 10, 11)) + .0 });
  A(g.st, { opacity: seg(tt, 3.0, 3.6) }); A(g.stT, { opacity: seg(tt, 3.2, 3.8) });
  rows.forEach((r, i) => {
    const d = r.d, gr = eo3(seg(tt, 1.0 + i * .05, 1.8 + i * .05)), u = eio(seg(tt, 52.3 + i * .04, 53.7 + i * .04));
    const ini = lerp(d.bi, d.ri, u), fim = lerp(d.bf, d.rf, u), wd = (fim - ini) * PX * gr, crit = u >= .5 ? d.rc : d.sc;
    A(r.bar, { x: X(ini), width: Math.max(0, wd), fill: crit ? VERM : AZUL });
    A(r.prog, { x: X(ini), width: Math.max(0, wd * lerp(d.sp, d.rp, u)), fill: crit ? VERM_ESC : AZUL_ESC });
    A(r.base, { width: (d.bf - d.bi) * PX * gr, opacity: seg(tt, 52.3, 53.0) });
    const hp = d.pulm > 0 ? eo3(seg(tt, 55.0 + i * .03, 56.0 + i * .03)) : 0; A(r.hat, { x: X(fim), width: r.pb ? 0 : d.pulm * PX * hp, opacity: hp > 0 && !r.pb ? 1 : 0 });
    if (r.pb) { const pu = eio(seg(tt, 56.0, 57.2)); A(r.pb, { x: X(fim), width: (N.pulmao) * PX * pu, opacity: pu > 0 ? 1 : 0 }); A(g.pbT, { opacity: seg(tt, 57.0, 57.6) }); }
    const lit = N.emExec.includes(d.id) ? seg(tt, 4.4, 5.1) * (1 - seg(tt, 9.8, 10.8)) : 0; A(r.hl, { opacity: lit });
    if (r.ti) { const nu = u >= .5; A(r.ti, { }); const si = nu ? dt(d.ri) : dt(d.bi), sf = nu ? dt(d.rf) : dt(d.bf); if (r.ti._s !== si) { r.ti._s = si; r.ti.textContent = si; } if (r.tf._s !== sf) { r.tf._s = sf; r.tf.textContent = sf; } }
  });
  g.mk.forEach((m, i) => A(m, { opacity: seg(tt, 56.4 + i * .5, 56.9 + i * .5) }));
}

function pintarCartoes(tt) {
  const cd = ly.card;
  R.cards.forEach((c, k) => {
    const dest = ly.cards[k], tag = ly.tags[k], rowI = N.linhas.findIndex(x => x.id === c.id);
    const t0 = 8.4 + k * .3, p = eio(seg(tt, t0, t0 + 1.3)), tg = eio(seg(tt, 15.0, 16.0));
    const src = barraNaCena(rowI, 8.5);
    let x = lerp(src.x, dest.x, p), y = lerp(src.y, dest.y, p), w = lerp(src.w, dest.w, p), h = lerp(src.h, dest.h, p);
    x = lerp(x, tag.x, tg); y = lerp(y, tag.y, tg); w = lerp(w, tag.w, tg); h = lerp(h, tag.h, tg);
    const sel = k === 1 ? 1 : .0; // a tarefa de fechamentos é a do celular
    const ap = seg(tt, t0 - .1, t0 + .2) * (1 - seg(tt, 25.4, 26.0));
    const conteudo = seg(p, .65, 1) * (1 - tg);
    U(c.el, { x, y, w, h, r: lerp(2, tall(cd) ? 14 : 20, p) * (1 - tg) + 10 * tg, bg: mix('#4a78c2', '#ffffff', seg(p, .35, .9)), bc: mix('#4a78c2', '#b7dcda', p), o: ap * (1 - .0) });
    U(c.disc, { l: cd.pad, t: cd.discTop, o: conteudo });
    U(c.nome, { l: cd.pad, t: lerp(cd.nomeTop, tag.h > 30 ? 11 : 6, tg), fs: lerp(mode === 'tall' ? 15 : 17, 13, tg), o: seg(p, .5, 1) * lerp(1, k === 1 ? 1 : .6, tg), 'w': 0 });
    c.nome.style.width = (w - cd.pad * 2) + 'px'; c.nome.style.right = 'auto'; c.nome.style.whiteSpace = tg > .25 ? 'nowrap' : 'normal'; c.nome.style.maxHeight = tg > .25 ? '' : '48px';
    U(c.rs, { l: cd.pad, t: cd.restrTop, o: conteudo });
    c.cx.forEach((b, j) => { const tj = 10.2 + j * .7 + k * .2, u = eo3(seg(tt, tj, tj + .35)); const svg = b.firstElementChild.firstElementChild; U(b, { bg: mix('#ffffff', '#0e7c7b', u), bc: mix('#b8c4c3', '#0e7c7b', u) }); svg.style.strokeDashoffset = 14 * (1 - u); });
    c.rs.style.height = (cd.rowH * 3) + 'px'; [...c.rs.children].forEach(d => d.style.height = cd.rowH + 'px');
    const tp = 10.2 + 2 * .7 + k * .2 + .5; U(c.pill, { l: cd.pad, t: cd.pillTop, o: seg(tt, tp, tp + .4) * conteudo });
  });
}
function tall(cd) { return cd.rowH < 20; }

function pintarFone(tt) {
  const tall = mode === 'tall';
  const ph = ly.phone, a = seg(tt, 15.3, 16.4), out = seg(tt, 25.7, 26.7);
  const o = eo3(a) * (1 - out);
  U(R.fone, { x: ph.x + (out * 20 * ph.s), y: ph.y + (1 - eo3(a)) * 26, s: ph.s * (1 - .12 * out), o });
  const starts = [16.4, 18.6, 20.2, 22.8, 24.4], vel = [1, 2.2, 1.6, 2.2];
  let di = 0; for (let i = 0; i < 4; i++) if (tt >= starts[i]) di = i;
  const d = N.dias[di], lt = (tt - starts[di]) * vel[di], chuva = d.chuva || d.oc === 'chuva';
  const txt = (el, s, u) => { const v = digita(s, u); if (el._s !== v) { el._s = v; el.textContent = v; } };
  const [v0, v1, v2, v3, v4, v5] = R.fv;
  txt(v0, d.data, seg(lt, 0, .25));
  txt(v1, `${n1(d.avanco)} %`, seg(lt, .25, .75)); txt(v2, String(d.efetivo), seg(lt, .45, .85));
  const oc = d.oc ? d.oc : 'nenhuma'; txt(v3, oc, seg(lt, .65, 1.0)); v3.className = d.oc === 'chuva' ? 'v3 oc' : 'v3';
  U(R.fcl, { o: seg(lt, .85, 1.2) });
  txt(v4, `${n1(d.mm)} mm`, seg(lt, 1.0, 1.4)); txt(v5, `${Math.round(d.raj)} km/h`, seg(lt, 1.1, 1.5)); v4.className = 'v4' + (d.chuva ? ' alerta' : '');
  txt(R.fav, d.chuva ? 'acima do limite de 10 mm' : '', seg(lt, 1.3, 1.7));
  U(R.fok, { o: seg(lt, 1.5, 1.9) });
  // contador
  const c = ly.cont, ct = vis(tt, 16.9, 26.0, .6, .5);
  const val = Math.round(N.registros * eio(seg(tt, 17.2, 24.8)));
  const s = milhar(val); if (R.contN._s !== s) { R.contN._s = s; R.contN.textContent = s; }
  U(R.cont, { x: c.x, y: c.y, o: ct });
  if (tall) { R.contN.style.fontSize = '50px'; R.contT.style.maxWidth = '150px'; }
}

function pintarLista(tt) {
  const L = ly.lista, wS = winEstado(50.5);
  R.itens.forEach((it, i) => {
    const t0 = 43.6 + i * .85, u = eo3(seg(tt, t0, t0 + .6)), ck = seg(tt, t0 + .8, t0 + 1.2);
    const out = eio(seg(tt, 50.5 + i * .05, 51.3 + i * .05));
    const x = L.x, y = L.y + i * (L.rh + L.gap);
    U(it.el, { x: 0, y: (1 - u) * 16, o: u * (1 - out), s: 1 - out * .08 });
    it.el.style.left = x + 'px'; it.el.style.top = y + 'px'; it.el.style.width = L.w + 'px'; it.el.style.height = L.rh + 'px'; it.el.style.display = '';
    U(it.ch, { bg: mix('#ffffff', '#0e7c7b', ck), bc: mix('#b8c4c3', '#0e7c7b', ck) }); it.path.style.strokeDashoffset = 16 * (1 - ck);
    U(it.ac, { o: ck });
  });
  // fichas que viajam de volta ao cronograma
  const wC = ly.winC, alvoX = wC.x + (R.g.X(N.fimRev - 120)) * wC.s, alvoY = wC.y + 44 * wC.s + 60 * wC.s;
  const alvos = [5, 12, 14, 21, 24];
  R.fly.forEach((e, i) => {
    const t0 = 50.7 + i * .12, u = eio(seg(tt, t0, t0 + 1.2));
    const sx = L.x + 60, sy = L.y + i * (L.rh + L.gap) + L.rh / 2;
    const ex = wC.x + (R.g.X(N.linhas[alvos[i]].rf)) * wC.s, ey = wC.y + (44 + R.g.R0 + (alvos[i] + .5) * R.g.RH) * wC.s;
    const o = seg(tt, t0, t0 + .15) * (1 - seg(tt, t0 + 1.0, t0 + 1.3));
    U(e, { x: lerp(sx, ex, u), y: lerp(sy, ey, u), o, s: lerp(1, .5, u) }); e.style.left = '0px'; e.style.top = '0px';
  });
  // dados do diário que viram o cálculo (fim da cena 3)
  const ph = ly.phone, bt = ly.beat;
  R.dat.forEach((e, i) => {
    const t0 = 26.0 + i * .035, u = eio(seg(tt, t0, t0 + 1.0)), row = i % 3;
    const sx = ph.x + 118 * ph.s + ((i * 53) % 90 - 45) * ph.s, sy = ph.y + (140 + (i * 31) % 200) * ph.s;
    const ex = bt.x + 40 + ((i * 97) % 300), ey = bt.y + (mode === 'tall' ? 20 : 36) + 34 + row * 78 + 35;
    U(e, { x: lerp(sx, ex, u), y: lerp(sy, ey, u), o: seg(tt, t0, t0 + .12) * (1 - seg(tt, t0 + .85, t0 + 1.1)) });
  });
}

/* ---------- ajuste à janela ---------- */
function ajustar() {
  const p = q('#palco'), aw = p.clientWidth, ah = p.clientHeight;
  if (!ly) return;
  esc = Math.min(aw / ly.W, ah / ly.H);
  const cena = q('#cena'); cena.style.transform = `translate(${(aw - ly.W * esc) / 2}px,${(ah - ly.H * esc) / 2}px) scale(${esc})`;
}

/* ---------- controlador ---------- */
function pintarBarra() {
  q('#bt-play').innerHTML = reduz
    ? '<svg viewBox="0 0 16 16"><path d="M4 3l7 5-7 5z" fill="currentColor"/><path d="M13 3v10" stroke="currentColor" stroke-width="2"/></svg>'
    : tocando ? '<svg viewBox="0 0 16 16"><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 16 16"><path d="M4 2.5l9 5.5-9 5.5z" fill="currentColor"/></svg>';
  q('#bt-play').setAttribute('aria-label', reduz ? 'Próxima etapa' : tocando ? 'Pausar' : 'Tocar');
  q('#bt-rep').innerHTML = '<svg viewBox="0 0 16 16"><path d="M3 8a5 5 0 1 0 1.8-3.8M3 2.5v3h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function laco(now) {
  if (tocando) { t += (now - ultimo) / 1000; if (t >= DUR) { t = DUR; tocando = false; pintarBarra(); } }
  ultimo = now; render(t);
  quadroId = tocando ? requestAnimationFrame(laco) : 0;
}
function tocar() { if (reduz) return proxima(); if (t >= DUR) t = 0; tocando = true; ultimo = performance.now(); pintarBarra(); if (!quadroId) quadroId = requestAnimationFrame(laco); }
function pausar() { tocando = false; pintarBarra(); }
function proxima() { parada = PARADAS.findIndex(x => x > t + .01); if (parada < 0) parada = 0; irPara(PARADAS[parada]); }
function repetir() { fecharFontes(); t = 0; if (reduz) { parada = 0; irPara(PARADAS[0]); return; } tocando = false; tocar(); }
window.irPara = s => { t = clamp(+s, 0, DUR); render(t); };
function irCapitulo(i) { if (reduz) { parada = PARADA_DO_CAP[i]; irPara(PARADAS[parada]); } else { irPara(CENAS[i] + .02); tocar(); } }
function abrirFontes() { q('#fontes').classList.add('on'); q('#fontes-x').focus(); }
function fecharFontes() { q('#fontes').classList.remove('on'); }

function iniciar() {
  q('#caps').innerHTML = ''; R.capsEl = NOMES.map((n, i) => { const b = mk('button', { type: 'button', title: n }, q('#caps'), 'cap'); b.innerHTML = `<span class="nm">${i + 1}. ${n}</span><span class="tr"><i></i></span>`; b.setAttribute('aria-label', 'Etapa ' + (i + 1) + ': ' + n); b.onclick = () => irCapitulo(i); return b; });
  q('#bt-play').onclick = () => { tocando ? pausar() : tocar(); }; q('#bt-rep').onclick = repetir;
  q('#fontes-x').onclick = fecharFontes; q('#fontes').onclick = e => { if (e.target.id === 'fontes') fecharFontes(); };
  addEventListener('keydown', e => { if (e.key === 'Escape') fecharFontes(); else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); tocando ? pausar() : tocar(); } });
  pintarBarra();
}

function pronto() {
  const parametro = new URLSearchParams(location.search).get('t');
  N = calcular(); window.__numeros = { fimRevisado: Math.round(N.fimRev), fimRevisadoData: dt(Math.round(N.fimRev)), pulmao: N.pulmao, registros: N.registros, p50: N.p50, p80: N.p80, p80Data: dt(Math.round(N.p80)), fimBase: dt(N.fimBase) };
  montar(); q('#espera').remove();
  let ultimoModo = mode;
  addEventListener('resize', () => { const m = innerWidth <= 760 ? 'tall' : 'wide'; if (m !== ultimoModo) { ultimoModo = m; montar(); } ajustar(); render(t); });
  if (parametro != null) { t = clamp(+parametro || 0, 0, DUR); render(t); }
  else if (reduz) { irPara(PARADAS[0]); }
  else { render(0); tocar(); }
  window.__pronto = true;
}
iniciar();
requestAnimationFrame(() => setTimeout(pronto, 30));
