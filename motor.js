// Motor do controle de obra da Obra A (construção de um data center, dados fictícios).
// Cadeia única: diário de obra -> medição de avanço e produtividade -> previsão de prazo e custo por Monte Carlo
// -> índice de contingência. Toda tela lê este módulo; nenhum número é recalculado fora dele.

import { ENTORNO } from './entorno_dados.js';

export const INICIO = '2026-01-05';
export const DISC = {
  prelim: 'Serviços preliminares', civil: 'Obra civil', eletrica: 'Elétrica', mecanica: 'Mecânica e climatização',
  acabamento: 'Acabamentos técnicos', sistemas: 'Sistemas', comiss: 'Comissionamento',
};

// EAP: duração planejada em dias corridos, predecessoras (término-início), equipe planejada e custo em R$ mil.
export const EAP = [
  { id: 1, nome: 'Mobilização e canteiro', disc: 'prelim', dur: 15, pred: [], equipe: 36, custo: 900 },
  { id: 2, nome: 'Terraplenagem e contenções', disc: 'civil', dur: 25, pred: [1], equipe: 54, custo: 1800 },
  { id: 3, nome: 'Fundações', disc: 'civil', dur: 35, pred: [2], equipe: 78, custo: 3200 },
  { id: 4, nome: 'Estrutura', disc: 'civil', dur: 55, pred: [3], equipe: 144, custo: 6800 },
  { id: 5, nome: 'Cobertura e impermeabilização', disc: 'civil', dur: 25, pred: [4], equipe: 48, custo: 1700 },
  { id: 6, nome: 'Fechamentos e envoltória', disc: 'civil', dur: 40, pred: [4], equipe: 72, custo: 3100 },
  { id: 7, nome: 'Piso industrial e bases de equipamentos', disc: 'civil', dur: 25, pred: [4], equipe: 42, custo: 1500 },
  { id: 8, nome: 'Subestação e entrada de média tensão', disc: 'eletrica', dur: 50, pred: [3], equipe: 42, custo: 5200 },
  { id: 9, nome: 'Infraestrutura elétrica (leitos e eletrodutos)', disc: 'eletrica', dur: 45, pred: [5, 6], equipe: 66, custo: 2400 },
  { id: 10, nome: 'Painéis de baixa tensão e barramentos blindados', disc: 'eletrica', dur: 35, pred: [9, 7], equipe: 48, custo: 6400 },
  { id: 11, nome: 'Grupos geradores e tanques', disc: 'eletrica', dur: 30, pred: [7], equipe: 30, custo: 5600 },
  { id: 12, nome: 'UPS e bancos de baterias', disc: 'eletrica', dur: 25, pred: [10], equipe: 24, custo: 4800 },
  { id: 13, nome: 'Cabeamento de força e aterramento', disc: 'eletrica', dur: 40, pred: [10], equipe: 60, custo: 2900 },
  { id: 14, nome: 'Central de água gelada (chillers e bombas)', disc: 'mecanica', dur: 40, pred: [7, 5], equipe: 36, custo: 5400 },
  { id: 15, nome: 'Tubulação hidráulica e isolamento', disc: 'mecanica', dur: 45, pred: [6], equipe: 54, custo: 2300 },
  { id: 17, nome: 'Piso elevado e forros', disc: 'acabamento', dur: 30, pred: [6, 9], equipe: 42, custo: 1600 },
  { id: 16, nome: 'Climatização de precisão', disc: 'mecanica', dur: 25, pred: [15, 17], equipe: 30, custo: 3600 },
  { id: 18, nome: 'Detecção e combate a incêndio', disc: 'sistemas', dur: 35, pred: [9], equipe: 30, custo: 1900 },
  { id: 19, nome: 'Automação predial e supervisão elétrica', disc: 'sistemas', dur: 35, pred: [13, 15], equipe: 24, custo: 1700 },
  { id: 20, nome: 'Segurança eletrônica e controle de acesso', disc: 'sistemas', dur: 25, pred: [17], equipe: 18, custo: 700 },
  { id: 21, nome: 'Racks, confinamento e cabeamento estruturado', disc: 'sistemas', dur: 30, pred: [17, 13], equipe: 36, custo: 2200 },
  { id: 22, nome: 'Comissionamento níveis 1 a 3', disc: 'comiss', dur: 30, pred: [12, 11, 16, 18, 14], equipe: 24, custo: 600 },
  { id: 23, nome: 'Comissionamento nível 4 (funcional)', disc: 'comiss', dur: 20, pred: [22, 19], equipe: 24, custo: 500 },
  { id: 24, nome: 'Comissionamento nível 5 (teste integrado)', disc: 'comiss', dur: 12, pred: [23, 21, 20], equipe: 30, custo: 400 },
  { id: 25, nome: 'Entrega e documentação', disc: 'comiss', dur: 10, pred: [24], equipe: 12, custo: 200 },
];
export const ULTIMA = 25;
const memoDiario = new Map();
const POR_ID = Object.fromEntries(EAP.map(a => [a.id, a]));
const EAP_ORIGINAL = EAP.map(x => ({ id: x.id, dur: x.dur, pred: [...x.pred] }));
// Linha de base: cópia congelada da rede. O diário já lançado e a curva prevista leem a linha de base;
// as edições do cronograma só alteram o que falta executar.
let BASE = Object.fromEntries(EAP.map(x => [x.id, { dur: x.dur, pred: [...x.pred] }]));
export function definirLinhaDeBase() { BASE = Object.fromEntries(EAP.map(x => [x.id, { dur: x.dur, pred: [...x.pred] }])); memoDiario.clear(); }
export function linhaDeBase() { const fim = {}, ini = {}; const f = id => { if (fim[id] != null) return fim[id]; const b = BASE[id]; ini[id] = b.pred.length ? Math.max(...b.pred.map(f)) : 0; return (fim[id] = ini[id] + b.dur); }; EAP.forEach(a => f(a.id)); return { ini, fim, dur: Object.fromEntries(EAP.map(a => [a.id, BASE[a.id].dur])), fimObra: fim[ULTIMA], custoTotal: EAP.reduce((t, a) => t + a.custo, 0) }; }
// Edição do cronograma na própria ferramenta: duração e predecessoras de uma tarefa. Recusa ciclo e duração inválida.
export function editarTarefa(id, { dur, pred } = {}, p = PADRAO) {
  const a = POR_ID[id]; if (!a) throw new Error('tarefa inexistente');
  const est = diario(p).estado[id];
  if (est.fim != null) throw new Error('tarefa concluída não é editável');
  if (pred != null && est.inicio != null) throw new Error('tarefa em execução: só a duração é editável');
  if (dur != null) { if (!(dur >= 1 && dur <= 400)) throw new Error('duração fora da faixa de 1 a 400 dias'); }
  if (pred != null) {
    for (const q of pred) if (!POR_ID[q] || q === id) throw new Error('predecessora inválida');
    const alcanca = (de, alvo, vistos = new Set()) => de === alvo || (!vistos.has(de) && (vistos.add(de), (de === id ? pred : POR_ID[de].pred).some(x => alcanca(x, alvo, vistos))));
    if (pred.some(q => alcanca(q, id))) throw new Error('a ligação cria um ciclo');
    a.pred = [...pred];
  }
  if (dur != null) a.dur = Math.round(dur);
}
export function restaurarEAP() { for (const o of EAP_ORIGINAL) { POR_ID[o.id].dur = o.dur; POR_ID[o.id].pred = [...o.pred]; } definirLinhaDeBase(); }


// Matriz de riscos: classe de impacto, probabilidade, atividade afetada, atraso em dias e custo em R$ mil (três pontos).
export const RISCOS = [
  { id: 'R01', nome: 'Atraso na entrega dos painéis de baixa tensão', classe: 'alto', prob: 0.30, alvo: 10, atraso: [10, 25, 50], custo: [0, 150, 400] },
  { id: 'R02', nome: 'Atraso na entrega dos chillers', classe: 'alto', prob: 0.25, alvo: 14, atraso: [10, 20, 45], custo: [0, 120, 350] },
  { id: 'R03', nome: 'Atraso na energização pela concessionária', classe: 'alto', prob: 0.35, alvo: 8, atraso: [15, 30, 60], custo: [50, 200, 500] },
  { id: 'R04', nome: 'Atraso na entrega dos grupos geradores', classe: 'médio', prob: 0.20, alvo: 11, atraso: [7, 15, 30], custo: [0, 100, 250] },
  { id: 'R05', nome: 'Atraso na entrega das UPS', classe: 'médio', prob: 0.20, alvo: 12, atraso: [7, 15, 30], custo: [0, 80, 200] },
  { id: 'R06', nome: 'Interferência entre elétrica e hidráulica nos leitos', classe: 'médio', prob: 0.35, alvo: 9, atraso: [3, 8, 18], custo: [40, 120, 300] },
  { id: 'R07', nome: 'Retrabalho de impermeabilização da cobertura', classe: 'médio', prob: 0.15, alvo: 5, atraso: [4, 10, 20], custo: [60, 180, 380] },
  { id: 'R08', nome: 'Falha em ensaio de estanqueidade das tubulações', classe: 'médio', prob: 0.20, alvo: 15, atraso: [3, 7, 15], custo: [30, 90, 220] },
  { id: 'R09', nome: 'Reprovação em teste funcional de sistema', classe: 'alto', prob: 0.30, alvo: 23, atraso: [5, 10, 25], custo: [50, 150, 400] },
  { id: 'R10', nome: 'Reprovação no teste integrado', classe: 'alto', prob: 0.20, alvo: 24, atraso: [5, 12, 30], custo: [80, 200, 600] },
  { id: 'R11', nome: 'Alteração de projeto de TI pelo cliente', classe: 'médio', prob: 0.25, alvo: 21, atraso: [5, 12, 25], custo: [100, 300, 700] },
  { id: 'R12', nome: 'Falta de mão de obra qualificada em elétrica', classe: 'médio', prob: 0.30, alvo: 13, atraso: [4, 10, 20], custo: [40, 120, 260] },
  { id: 'R13', nome: 'Paralisação por evento climático extremo', classe: 'baixo', prob: 0.10, alvo: 6, atraso: [3, 6, 12], custo: [10, 40, 90] },
  { id: 'R14', nome: 'Integração entre automação e equipamentos de fornecedores distintos', classe: 'médio', prob: 0.30, alvo: 19, atraso: [4, 10, 22], custo: [30, 100, 250] },
  { id: 'R15', nome: 'Não conformidade em inspeção do corpo de bombeiros', classe: 'baixo', prob: 0.15, alvo: 18, atraso: [3, 8, 15], custo: [20, 60, 150] },
  { id: 'R16', nome: 'Dano a equipamento no transporte interno', classe: 'baixo', prob: 0.10, alvo: 16, atraso: [3, 8, 20], custo: [50, 150, 400] },
];

export const PADRAO = {
  corte: 180,        // dia da medição (data de corte do diário)
  n: 4000,           // cenários do Monte Carlo
  semente: 20261114,
  reforco: {},       // { idAtividade: fator de produtividade adicional } para simular reforço de equipe
  mitigados: [],     // ids de riscos com plano de mitigação: a probabilidade cai à metade
  custoTempo: 0.25,  // parcela do custo da atividade que cresce com a duração (indiretos e mão de obra)
  chuvaLimite: 10,   // mm no dia a partir dos quais a atividade a céu aberto perde o dia (opções: 5, 10, 15, 20)
  ventoLimite: 45,   // km/h de rajada a partir dos quais o içamento é suspenso (opções: 35, 40, 45, 50, 55)
};

// ---------- utilitários ----------
function mulberry32(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function triangular(r, [a, m, b]) { if (b <= a) return a; const u = r(), f = (m - a) / (b - a); return u < f ? a + Math.sqrt(u * (b - a) * (m - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - m)); }
function normal(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
const limita = (v, a, b) => Math.max(a, Math.min(b, v));
export function dataDe(dia) { const d = new Date(INICIO + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + Math.round(dia)); return d.toISOString().slice(0, 10); }

// ---------- clima: observado no ponto da obra e climatologia mensal de dez anos ----------
export const A_CEU_ABERTO = new Set([2, 3, 4, 5, 6]);   // perdem o dia com chuva acima do limite
export const ICAMENTO = new Set([4, 5, 11, 14]);        // perdem o dia com rajada acima do limite
const OBS = ENTORNO.clima.observado, CLIMA = ENTORNO.clima.pontos[0].mensal, SEMANAL = ENTORNO.clima.pontos[0].semanal;
const MES_DO_DIA = Array.from({ length: 1200 }, (_, d) => { const x = new Date(INICIO + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.getUTCMonth(); });
export const SEMANA_DO_DIA = Array.from({ length: 1200 }, (_, d) => { const x = new Date(INICIO + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); const ini = Date.UTC(x.getUTCFullYear(), 0, 1); return Math.min(52, Math.floor((x - ini) / 864e5 / 7)); });
export function climaDoDia(dia, p = PADRAO) {
  if (p.semClima) return { chuva: false, vento: false, mm: OBS.chuva[dia], rajada: OBS.rajada[dia] };
  const mm = OBS.chuva[dia], raj = OBS.rajada[dia];
  return { chuva: mm != null && mm >= p.chuvaLimite, vento: raj != null && raj >= p.ventoLimite, mm, rajada: raj };
}
function probSemanal(p) {
  if (p.semClima) return SEMANAL.map(() => ({ chuva: 0, vento: 0 }));
  const ic = ENTORNO.clima.limitesChuva.indexOf(p.chuvaLimite), iv = ENTORNO.clima.limitesVento.indexOf(p.ventoLimite);
  return SEMANAL.map(m => ({ chuva: m.chuva[Math.max(0, ic)], vento: m.vento[Math.max(0, iv)] }));
}
function probMensal(p) {
  if (p.semClima) return CLIMA.map(() => ({ chuva: 0, vento: 0 }));
  const ic = ENTORNO.clima.limitesChuva.indexOf(p.chuvaLimite), iv = ENTORNO.clima.limitesVento.indexOf(p.ventoLimite);
  return CLIMA.map(m => ({ chuva: m.chuva[Math.max(0, ic)], vento: m.vento[Math.max(0, iv)] }));
}
const perdaDoDia = (id, pm) => 1 - (A_CEU_ABERTO.has(id) ? 1 - pm.chuva : 1) * (ICAMENTO.has(id) ? 1 - pm.vento : 1);
// dias corridos para executar `trabalho` dias úteis a partir de `inicio`, sorteando os dias perdidos pelo clima do mês
function comClima(inicio, trabalho, id, prob, rnd) {
  if (!A_CEU_ABERTO.has(id) && !ICAMENTO.has(id)) return inicio + trabalho;
  let d = inicio, falta = trabalho;
  while (falta > 0 && d < 1190) { const pm = prob[SEMANA_DO_DIA[Math.floor(d)]]; if (rnd() >= perdaDoDia(id, pm)) falta -= 1; d += 1; }
  return d + falta;
}

// ---------- plano (caminho crítico determinístico) ----------
export function plano() {
  const fim = {}, ini = {};
  const f = id => { if (fim[id] != null) return fim[id]; const a = POR_ID[id]; ini[id] = a.pred.length ? Math.max(...a.pred.map(f)) : 0; return (fim[id] = ini[id] + a.dur); };
  EAP.forEach(a => f(a.id));
  const custoTotal = EAP.reduce((s, a) => s + a.custo, 0);
  return { ini, fim, fimObra: fim[ULTIMA], custoTotal };
}

// ---------- diário de obra (registros simulados com semente fixa) ----------
const RITMO = { prelim: 1.0, civil: 1.0, eletrica: 0.9, mecanica: 0.95, acabamento: 1.0, sistemas: 0.95, comiss: 1.0 };
export function diario(p = PADRAO) {
  const manuais = p.manuais || {};
  const chave = [p.corte, p.semente, !!p.semClima, JSON.stringify(manuais)].join('|');
  if (memoDiario.has(chave)) return memoDiario.get(chave);
  const r = mulberry32(p.semente + 7);
  const estado = Object.fromEntries(EAP.map(a => [a.id, { avanco: 0, inicio: null, fim: null, trabalhados: 0, perdidos: 0 }]));
  const registros = [];
  for (let dia = 0; dia < p.corte; dia++) {
    for (const a of EAP) {
      const e = estado[a.id];
      if (e.fim != null) continue;
      if (!BASE[a.id].pred.every(q => estado[q].fim != null && estado[q].fim <= dia)) continue;
      if (e.inicio == null) e.inicio = dia;
      let mult = RITMO[a.disc] * (0.8 + 0.4 * r()), ocorrencia = null;
      const u = r(), efSorteio = r();
      const man = manuais[dia] && manuais[dia][a.id];
      if (man) {
        const av = Math.min(1 - e.avanco, Math.max(0, man.avanco)); e.avanco += av;
        if (av === 0) e.perdidos++; else e.trabalhados++;
        registros.push({ dia, id: a.id, avanco: av, efetivo: man.efetivo || 0, ocorrencia: man.ocorrencia || null, manual: true });
        if (e.avanco >= 1 - 1e-9) { e.avanco = 1; e.fim = dia + 1; }
        continue;
      }
      const cl = climaDoDia(dia, { ...PADRAO, semClima: p.semClima });
      if (A_CEU_ABERTO.has(a.id) && cl.chuva) { mult = 0; ocorrencia = 'chuva'; }
      else if (ICAMENTO.has(a.id) && cl.vento) { mult = 0; ocorrencia = 'vento'; }
      else if ((a.disc === 'eletrica' || a.disc === 'mecanica') && u < 0.05) { mult = 0; ocorrencia = 'falta de material'; }
      else if (u > 0.965) { mult *= 0.5; ocorrencia = 'interferência entre frentes'; }
      else if (u > 0.935) { mult *= 0.2; ocorrencia = 'retrabalho'; }
      const avanco = Math.min(1 - e.avanco, mult / BASE[a.id].dur);
      e.avanco += avanco;
      if (mult === 0) e.perdidos++; else e.trabalhados++;
      const efetivo = mult === 0 ? 0 : Math.round(a.equipe * (0.85 + 0.2 * efSorteio));
      registros.push({ dia, id: a.id, avanco, efetivo, ocorrencia });
      if (e.avanco >= 1 - 1e-9) { e.avanco = 1; e.fim = dia + 1; }
    }
  }
  const saida = { registros, estado };
  memoDiario.set(chave, saida);
  return saida;
}

// ---------- medição: avanço, curva S, produtividade por disciplina, perdas ----------
const CLIMATICA = new Set(['chuva', 'vento']);
export function medicao(p = PADRAO) {
  const pl = linhaDeBase(), { registros, estado } = diario(p);
  const dias = pl.fimObra + 1;
  const previsto = new Array(dias).fill(0), real = new Array(p.corte + 1).fill(0);
  for (let d = 0; d < dias; d++) for (const a of EAP) previsto[d] += a.custo * limita((d - pl.ini[a.id]) / pl.dur[a.id], 0, 1);
  const porDia = new Array(p.corte).fill(0);
  for (const g of registros) porDia[g.dia] += g.avanco * POR_ID[g.id].custo;
  for (let d = 0; d < p.corte; d++) real[d + 1] = real[d] + porDia[d];
  const pv = previsto[p.corte], ev = real[p.corte];
  let diaEquivalente = 0; while (diaEquivalente < dias - 1 && previsto[diaEquivalente + 1] <= ev) diaEquivalente++;
  // produtividade: ritmo efetivo por semana (6 dias) de cada atividade em execução, agrupado por disciplina
  const semanas = {};
  for (const a of EAP) {
    const regs = registros.filter(g => g.id === a.id);
    for (let i = 0; i + 6 <= regs.length; i += 6) { const bl = regs.slice(i, i + 6), uteis = bl.filter(g => !CLIMATICA.has(g.ocorrencia)).length; if (uteis < 3) continue; (semanas[a.disc] = semanas[a.disc] || []).push(bl.reduce((t, g) => t + g.avanco, 0) / (uteis / pl.dur[a.id])); }
  }
  // série semanal da obra: ritmo de cada semana por disciplina e percentual de metas semanais cumpridas (PPC).
  // Meta semanal de uma atividade em execução: o avanço planejado de 6 dias. Cumprida com 90% ou mais da meta.
  const nSem = Math.floor(p.corte / 6), semanal = [];
  for (let w = 0; w < nSem; w++) {
    const porAtiv = {};
    for (const g of registros) if (g.dia >= w * 6 && g.dia < w * 6 + 6) (porAtiv[g.id] = porAtiv[g.id] || []).push(g);
    let metas = 0, cumpridas = 0; const disc = {};
    for (const [id, regs] of Object.entries(porAtiv)) {
      const at = POR_ID[id]; if (regs.length < 6 && estado[id].fim == null) continue;
      const uteis = regs.filter(g => !CLIMATICA.has(g.ocorrencia)).length; if (uteis < 3) continue;
      const meta = uteis / pl.dur[at.id], feito = regs.reduce((t, g) => t + g.avanco, 0), razao = feito / meta;
      metas++; if (razao >= 0.9 || (estado[id].fim != null && estado[id].fim <= w * 6 + 6)) cumpridas++;
      (disc[at.disc] = disc[at.disc] || []).push(razao);
    }
    semanal.push({ semana: w + 1, dia: w * 6 + 6, metas, cumpridas, ppc: metas ? cumpridas / metas : null, ritmo: Object.fromEntries(Object.entries(disc).map(([k, v]) => [k, v.reduce((x, y) => x + y, 0) / v.length])) });
  }
  const comMeta = semanal.filter(x => x.metas > 0);
  const ppcMedio = comMeta.reduce((t, x) => t + x.cumpridas, 0) / Math.max(1, comMeta.reduce((t, x) => t + x.metas, 0));
  // carta de controle (valores individuais): limites em média ± 2,66 × amplitude móvel média
  const carta = {};
  for (const d of Object.keys(DISC)) {
    const v = semanal.filter(x => x.ritmo[d] != null).map(x => ({ semana: x.semana, valor: x.ritmo[d] }));
    if (v.length < 4) continue;
    const m = v.reduce((t, x) => t + x.valor, 0) / v.length;
    let am = 0; for (let i = 1; i < v.length; i++) am += Math.abs(v[i].valor - v[i - 1].valor); am /= v.length - 1;
    carta[d] = { pontos: v, media: m, lsc: m + 2.66 * am, lic: Math.max(0, m - 2.66 * am), fora: v.filter(x => x.valor > m + 2.66 * am || x.valor < m - 2.66 * am).length };
  }
  const ritmo = {};
  for (const [disc, v] of Object.entries(semanas)) { const m = v.reduce((s, x) => s + x, 0) / v.length; ritmo[disc] = { media: m, desvio: Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, v.length - 1)), semanas: v.length }; }
  const perdas = {};
  for (const g of registros) if (g.ocorrencia) perdas[g.ocorrencia] = (perdas[g.ocorrencia] || 0) + 1;
  const atividades = EAP.map(a => { const e = estado[a.id]; return { id: a.id, nome: a.nome, disc: a.disc, avanco: e.avanco, previsto: limita((p.corte - pl.ini[a.id]) / pl.dur[a.id], 0, 1), inicio: e.inicio, fim: e.fim, inicioPlano: pl.ini[a.id], fimPlano: pl.fim[a.id], perdidos: e.perdidos, trabalhados: e.trabalhados }; });
  const homensDia = registros.reduce((s, g) => s + g.efetivo, 0);
  return { corte: p.corte, previsto, real, pv, ev, custoTotal: pl.custoTotal, fimPlano: pl.fimObra, idp: ev / pv, prazoAgregado: diaEquivalente, atrasoDias: p.corte - diaEquivalente, ritmo, semanal, ppcMedio, carta, perdas, atividades, registros: registros.length, homensDia };
}

// ---------- previsão por Monte Carlo ----------
const PREVIA = { prelim: [0.9, 1, 1.05], civil: [0.8, 0.95, 1.08], eletrica: [0.75, 0.92, 1.08], mecanica: [0.78, 0.94, 1.08], acabamento: [0.82, 0.97, 1.08], sistemas: [0.8, 0.95, 1.08], comiss: [0.8, 0.97, 1.08] };
export function previsao(p = PADRAO) {
  const r = mulberry32(p.semente), pl = linhaDeBase(), med = medicao(p), { estado } = diario(p);
  const n = p.n, fins = new Float64Array(n), custos = new Float64Array(n);
  const critico = Object.fromEntries(EAP.map(a => [a.id, 0]));
  const riscoDias = Object.fromEntries(RISCOS.map(k => [k.id, 0])), riscoVezes = Object.fromEntries(RISCOS.map(k => [k.id, 0]));
  const durSoma = Object.fromEntries(EAP.map(a => [a.id, 0])), iniSoma = Object.fromEntries(EAP.map(a => [a.id, 0])), fimSoma = Object.fromEntries(EAP.map(a => [a.id, 0]));
  const prob = probSemanal(p);
  const durTodas = EAP.map(() => new Float32Array(n)), fimTodas = EAP.map(() => new Float32Array(n));
  for (let i = 0; i < n; i++) {
    const fatorDisc = {};
    for (const d of Object.keys(DISC)) {
      const m = med.ritmo[d];
      fatorDisc[d] = p.ritmoPlano ? 1 : m && m.semanas >= 4 ? limita(m.media + normal(r) * m.desvio / Math.sqrt(Math.min(m.semanas, 8)), 0.45, 1.25) : triangular(r, PREVIA[d]);
    }
    const extra = {}, custoRisco = {}, ocorreu = {};
    for (const k of RISCOS) {
      if (p.semRiscos || estado[k.alvo].fim != null) continue;
      const prob = p.mitigados.includes(k.id) ? k.prob / 2 : k.prob;
      if (r() < prob) { const dd = triangular(r, k.atraso); extra[k.alvo] = (extra[k.alvo] || 0) + dd; custoRisco[k.id] = triangular(r, k.custo); ocorreu[k.id] = dd; }
    }
    const fim = {}, ini = {}, dono = {}, durReal = {};
    const f = id => {
      if (fim[id] != null) return fim[id];
      const a = POR_ID[id], e = estado[id];
      if (e.fim != null) { durReal[id] = e.fim - e.inicio; ini[id] = e.inicio; return (fim[id] = e.fim); }
      let inicio = p.corte;
      if (e.inicio == null) { for (const q of a.pred) { const t = f(q); if (t > inicio) { inicio = t; dono[id] = q; } } inicio += (p.deslocamentos && p.deslocamentos[id]) || 0; }
      const trabalho = (1 - e.avanco) * a.dur / (fatorDisc[a.disc] * (0.92 + 0.16 * r()) * (p.reforco[id] || 1));
      const termino = comClima(inicio, trabalho, id, prob, r) + (extra[id] || 0);
      ini[id] = e.inicio != null ? e.inicio : inicio;
      durReal[id] = termino - ini[id];
      return (fim[id] = termino);
    };
    EAP.forEach(a => f(a.id));
    fins[i] = fim[ULTIMA];
    let c = 0;
    EAP.forEach((a, j) => { durTodas[j][i] = durReal[a.id]; fimTodas[j][i] = fim[a.id]; });
    for (const a of EAP) { c += a.custo * (1 + p.custoTempo * Math.max(0, durReal[a.id] / a.dur - 1)); durSoma[a.id] += durReal[a.id]; iniSoma[a.id] += ini[a.id]; fimSoma[a.id] += fim[a.id]; }
    for (const v of Object.values(custoRisco)) c += v;
    custos[i] = c;
    const noCaminho = new Set(); let x = ULTIMA;
    while (x != null) { noCaminho.add(x); critico[x]++; x = dono[x]; }
    for (const k of RISCOS) if (ocorreu[k.id] != null) { riscoVezes[k.id]++; if (noCaminho.has(k.alvo)) riscoDias[k.id] += ocorreu[k.id]; }
  }
  const ord = Array.from(fins).sort((a, b) => a - b), ordC = Array.from(custos).sort((a, b) => a - b);
  const q = (v, f) => v[Math.min(n - 1, Math.floor(n * f))];
  const passo = 5, base = Math.floor(ord[0] / passo) * passo, faixas = new Array(Math.ceil((ord[n - 1] - base) / passo) + 1).fill(0);
  for (const v of fins) faixas[Math.floor((v - base) / passo)]++;
  const noPrazo = k => { let c = 0; for (const v of fins) if (v <= k) c++; return c / n; };
  return {
    n, fimPlano: pl.fimObra, custoPlano: pl.custoTotal,
    prazo: { p10: q(ord, 0.1), p50: q(ord, 0.5), p80: q(ord, 0.8), p90: q(ord, 0.9), min: ord[0], max: ord[n - 1], media: fins.reduce((s, v) => s + v, 0) / n },
    custo: { p50: q(ordC, 0.5), p80: q(ordC, 0.8), p90: q(ordC, 0.9) },
    contingencia: { p80: q(ordC, 0.8) - pl.custoTotal, p80pct: (q(ordC, 0.8) - pl.custoTotal) / pl.custoTotal, p50pct: (q(ordC, 0.5) - pl.custoTotal) / pl.custoTotal },
    histograma: { base, passo, faixas: faixas.map(v => v / n) },
    noPrazo,
    criticidade: EAP.map(a => ({ id: a.id, nome: a.nome, disc: a.disc, indice: critico[a.id] / n, duracaoMedia: durSoma[a.id] / n, duracaoPlano: a.dur, inicioMedio: iniSoma[a.id] / n, fimMedio: fimSoma[a.id] / n })).filter(c => estado[c.id].fim == null),
    atividades: EAP.map((a, j) => { const d = Array.from(durTodas[j]).sort((x, y) => x - y), f = Array.from(fimTodas[j]).sort((x, y) => x - y); return { id: a.id, durP50: q(d, 0.5), durP80: q(d, 0.8), fimP50: q(f, 0.5), fimP80: q(f, 0.8), indice: critico[a.id] / n }; }),
    riscos: RISCOS.map(k => ({ id: k.id, nome: k.nome, classe: k.classe, alvo: k.alvo, frequencia: riscoVezes[k.id] / n, diasNoPrazo: riscoDias[k.id] / n, encerrado: estado[k.alvo].fim != null })),
  };
}

// ---------- índice de contingência por lógica fuzzy (impacto e probabilidade, 9 regras) ----------
const tri = (x, a, b, c) => Math.max(0, Math.min(a === b ? 1 : (x - a) / (b - a), b === c ? 1 : (c - x) / (c - b)));
const tres = (x, max) => { const t = x / max; return { baixo: tri(t, -0.5, 0, 0.5), medio: tri(t, 0, 0.5, 1), alto: tri(t, 0.5, 1, 1.5) }; };
const REGRAS = [['baixo', 'baixo', 'baixo'], ['baixo', 'medio', 'baixo'], ['baixo', 'alto', 'medio'], ['medio', 'baixo', 'baixo'], ['medio', 'medio', 'medio'], ['medio', 'alto', 'alto'], ['alto', 'baixo', 'medio'], ['alto', 'medio', 'alto'], ['alto', 'alto', 'alto']];
const SAIDA = { baixo: [0, 2, 4], medio: [2, 4, 6], alto: [4, 6, 8] };
export function fuzzy(impacto, probabilidade) {
  const i = tres(limita(impacto, 0, 1), 1), q = tres(limita(probabilidade, 0, 0.4), 0.4);
  const forca = { baixo: 0, medio: 0, alto: 0 };
  for (const [a, b, s] of REGRAS) forca[s] = Math.max(forca[s], Math.min(i[a], q[b]));
  let num = 0, den = 0;
  for (let x = 0; x <= 10.0001; x += 0.1) { let m = 0; for (const s of Object.keys(SAIDA)) m = Math.max(m, Math.min(forca[s], tri(x, ...SAIDA[s]))); num += x * m; den += m; }
  return den ? num / den : 0;
}
const IMPACTO = { baixo: 0.2, 'médio': 0.5, alto: 0.85 };
export function contingencia(p = PADRAO) {
  const { estado } = diario(p), prev = previsao(p);
  const linhas = RISCOS.map(k => { const prob = p.mitigados.includes(k.id) ? k.prob / 2 : k.prob, aberto = estado[k.alvo].fim == null; return { id: k.id, nome: k.nome, classe: k.classe, prob, impacto: IMPACTO[k.classe], aberto, indice: aberto ? fuzzy(IMPACTO[k.classe], prob) : 0 }; });
  const abertos = linhas.filter(l => l.aberto);
  const pesoTotal = abertos.reduce((s, l) => s + l.impacto, 0);
  const indice = pesoTotal ? abertos.reduce((s, l) => s + l.indice * l.impacto, 0) / pesoTotal : 0;
  return { linhas, indiceFuzzy: indice / 100, monteCarloP80: prev.contingencia.p80pct, monteCarloP50: prev.contingencia.p50pct, valorP80: prev.contingencia.p80, custoPlano: prev.custoPlano };
}

// ---------- entorno: clima e mão de obra da região ----------
export function entorno(p = PADRAO) {
  const pl = linhaDeBase(), { registros, estado } = diario(p), prev = previsao(p), prob = probMensal(p), probS = probSemanal(p);
  const mensal = prob.map((m, i) => ({ mes: i + 1, chuva: m.chuva, vento: m.vento, chuvaMm: CLIMA[i].chuvaMm }));
  const exposicao = prev.criticidade.filter(c => A_CEU_ABERTO.has(c.id) || ICAMENTO.has(c.id)).map(c => {
    let esperados = 0; for (let d = Math.floor(Math.max(p.corte, c.inicioMedio)); d < c.fimMedio; d++) esperados += perdaDoDia(c.id, probS[SEMANA_DO_DIA[d]]);
    return { id: c.id, nome: c.nome, chuva: A_CEU_ABERTO.has(c.id), vento: ICAMENTO.has(c.id), inicio: Math.max(p.corte, c.inicioMedio), fim: c.fimMedio, diasPerdidosEsperados: esperados };
  });
  let diasChuva = 0, diasVento = 0; for (let d = 0; d < p.corte; d++) { const c = climaDoDia(d, p); if (c.chuva) diasChuva++; if (c.vento) diasVento++; }
  const lancados = { chuva: new Set(registros.filter(g => g.ocorrencia === 'chuva').map(g => g.dia)).size, vento: new Set(registros.filter(g => g.ocorrencia === 'vento').map(g => g.dia)).size };
  // efetivo planejado por dia: pico total e pico de instalações (elétrica, mecânica e sistemas)
  const INSTAL = new Set(['eletrica', 'mecanica', 'sistemas']); let pico = { total: 0, dia: 0 }, picoInst = { total: 0, dia: 0 };
  for (let d = 0; d < pl.fimObra; d++) { let t = 0, ti = 0; for (const a of EAP) if (d >= pl.ini[a.id] && d < pl.fim[a.id]) { t += a.equipe; if (INSTAL.has(a.disc)) ti += a.equipe; } if (t > pico.total) pico = { total: t, dia: d }; if (ti > picoInst.total) picoInst = { total: ti, dia: d }; }
  const raios = [10, 20, 30, 45].map(km => { const dentro = ENTORNO.municipios.filter(m => m.km <= km); const soma = k => dentro.reduce((t, m) => t + (m[k] || 0), 0);
    return { km, municipios: dentro.length, populacao: soma('populacao'), construcao: soma('construcao'), instalacoes: soma('instalacoes'), picoSobreInstalacoes: picoInst.total / Math.max(1, soma('instalacoes')), picoSobreConstrucao: pico.total / Math.max(1, soma('construcao')) }; });
  return { regiao: ENTORNO.obra.regiao, mensal, exposicao, conferencia: { diasChuva, diasVento, lancados, limiteChuva: p.chuvaLimite, limiteVento: p.ventoLimite }, pontos: ENTORNO.clima.pontos.map(x => ({ nome: x.nome, km: x.km, chuvaAno: x.mensal.reduce((t, m) => t + m.chuva[ENTORNO.clima.limitesChuva.indexOf(p.chuvaLimite)] * m.dias, 0) / x.mensal.reduce((t, m) => t + m.dias, 0), ventoAno: x.mensal.reduce((t, m) => t + m.vento[ENTORNO.clima.limitesVento.indexOf(p.ventoLimite)] * m.dias, 0) / x.mensal.reduce((t, m) => t + m.dias, 0) })),
    efetivo: { pico, picoInstalacoes: picoInst }, municipios: ENTORNO.municipios, raios, fonte: ENTORNO.fonte, periodoClima: ENTORNO.clima.periodo, observadoAte: OBS.ate };
}

// ---------- resumo executivo: de onde vem o atraso e o que cada medida recupera ----------
// Decomposição por cenários sucessivos (mediana do término): retira-se um fator de cada vez e mede-se a diferença.
const ELETRICA_CRITICA = [9, 10, 13];
export function resumo(p = PADRAO) {
  const q = { ...p, n: Math.min(p.n, 2000) }, pl = linhaDeBase();
  const base = previsao(q);
  const semRiscos = previsao({ ...q, semRiscos: true });
  const semClima = previsao({ ...q, semRiscos: true, semClima: true });
  const noRitmo = previsao({ ...q, semRiscos: true, semClima: true, ritmoPlano: true });
  const partes = [
    { chave: 'clima', nome: 'Chuva e vento', dias: semRiscos.prazo.p50 - semClima.prazo.p50, nota: 'dias perdidos já ocorridos e os esperados até o término' },
    { chave: 'ritmo', nome: 'Ritmo abaixo do plano nas atividades a executar', dias: semClima.prazo.p50 - noRitmo.prazo.p50, nota: 'ritmo medido no diário, aplicado ao que falta' },
    { chave: 'riscos', nome: 'Riscos da matriz', dias: base.prazo.p50 - semRiscos.prazo.p50, nota: 'entregas de equipamentos, ensaios e interferências' },
    { chave: 'acumulado', nome: 'Atraso já acumulado por produtividade e ocorrências', dias: noRitmo.prazo.p50 - pl.fimObra, nota: 'retrabalho, interferência entre frentes e falta de material' },
  ];
  const abertos = base.riscos.filter(k => !k.encerrado).sort((a, b) => b.diasNoPrazo - a.diasNoPrazo);
  const tres = abertos.slice(0, 3).map(k => k.id);
  const cen = (nome, descricao, extra) => { const v = previsao({ ...q, ...extra }); return { nome, descricao, p50: v.prazo.p50, p80: v.prazo.p80, ganhoP50: base.prazo.p50 - v.prazo.p50, ganhoP80: base.prazo.p80 - v.prazo.p80, custoP80: v.custo.p80, ganhoCusto: base.custo.p80 - v.custo.p80 }; };
  const reforco = Object.fromEntries(ELETRICA_CRITICA.map(id => [id, 1.25]));
  const medidas = [
    cen('Reforçar a equipe de elétrica', 'mais 25% de produtividade em infraestrutura, painéis e cabeamento', { reforco: { ...p.reforco, ...reforco } }),
    cen('Antecipar a compra dos equipamentos críticos', 'plano de mitigação para os três riscos de maior efeito no prazo', { mitigados: [...new Set([...p.mitigados, ...tres])] }),
    cen('As duas medidas juntas', 'reforço da elétrica e mitigação dos três riscos', { reforco: { ...p.reforco, ...reforco }, mitigados: [...new Set([...p.mitigados, ...tres])] }),
  ];
  return {
    corte: p.corte, fimPlano: pl.fimObra, custoPlano: pl.custoTotal,
    prazo: base.prazo, atrasoP50: base.prazo.p50 - pl.fimObra, atrasoP80: base.prazo.p80 - pl.fimObra,
    custoP80: base.custo.p80, contingenciaP80: base.contingencia.p80, contingenciaPct: base.contingencia.p80pct,
    partes, maiorRisco: abertos[0], riscosMitigados: tres, medidas,
  };
}

// ---------- cronograma revisado: reprogramação determinística, folgas e pulmões ----------
// Linha de base = plano. Revisão na data de corte: o que falta de cada tarefa é reprogramado pelo ritmo medido da
// disciplina e pelos dias de clima esperados na janela da tarefa. Folga total pelo passe de volta.
export function cronograma(p = PADRAO) {
  const pl = linhaDeBase(), med = medicao(p), { estado } = diario(p), probS = probSemanal(p), prev = previsao(p);
  const fator = d => { const m = med.ritmo[d]; return m && m.semanas >= 4 ? m.media : PREVIA[d][1]; };
  const ini = {}, fim = {}, clima = {};
  const f = id => {
    if (fim[id] != null) return fim[id];
    const a = POR_ID[id], e = estado[id];
    if (e.fim != null) { ini[id] = e.inicio; clima[id] = 0; return (fim[id] = e.fim); }
    const inicio = e.inicio != null ? p.corte : Math.max(p.corte, ...a.pred.map(f)) + ((p.deslocamentos && p.deslocamentos[id]) || 0);
    const trabalho = (1 - e.avanco) * a.dur / (fator(a.disc) * (p.reforco[id] || 1));
    let d = inicio, falta = trabalho, perdidos = 0;
    while (falta > 0 && d < 1190) { const perda = perdaDoDia(id, probS[SEMANA_DO_DIA[Math.floor(d)]]); falta -= 1 - perda; perdidos += perda; d += 1; }
    ini[id] = e.inicio != null ? e.inicio : inicio; clima[id] = perdidos;
    return (fim[id] = d + Math.min(0, falta));
  };
  EAP.forEach(a => f(a.id));
  const fimObra = fim[ULTIMA], tarde = {};
  const suc = Object.fromEntries(EAP.map(a => [a.id, EAP.filter(b => b.pred.includes(a.id)).map(b => b.id)]));
  const lf = id => { if (tarde[id] != null) return tarde[id]; return (tarde[id] = suc[id].length ? Math.min(...suc[id].map(s => lf(s) - (fim[s] - Math.max(p.corte, ini[s] > p.corte ? ini[s] : p.corte)))) : fimObra); };
  EAP.forEach(a => lf(a.id));
  const mc = Object.fromEntries(prev.atividades.map(x => [x.id, x]));
  const pulmaoProjeto = Math.max(0, prev.prazo.p80 - fimObra);
  const linhas = EAP.map(a => {
    const e = estado[a.id], aberto = e.fim == null, x = mc[a.id];
    const folga = aberto ? Math.max(0, tarde[a.id] - fim[a.id]) : null;
    // lógica fuzzy: impacto = índice de criticidade; probabilidade = chance de a tarefa passar da duração reprogramada
    const variacao = aberto ? Math.max(0, x.durP80 - x.durP50) : 0;
    const exposicao = aberto ? fuzzy(x.indice, Math.min(0.4, 0.4 * variacao / Math.max(1, a.dur * 0.3))) : 0;
    return { id: a.id, nome: a.nome, disc: a.disc, pred: a.pred, duracaoBase: pl.dur[a.id], duracao: a.dur, deslocamento: (p.deslocamentos && p.deslocamentos[a.id]) || 0, inicioBase: pl.ini[a.id], fimBase: pl.fim[a.id],
      concluido: e.avanco, inicio: ini[a.id], fim: fim[a.id], status: e.fim != null ? 'concluída' : e.inicio != null ? 'em execução' : 'a iniciar',
      desvio: fim[a.id] - pl.fim[a.id], folga, critica: aberto && folga < 0.5, diasClima: clima[a.id], ceuAberto: A_CEU_ABERTO.has(a.id), icamento: ICAMENTO.has(a.id),
      fimP50: aberto ? x.fimP50 : e.fim, fimP80: aberto ? x.fimP80 : e.fim, variacao, exposicao, classe: !aberto ? null : exposicao >= 5 ? 'alta' : exposicao >= 3 ? 'média' : 'baixa' };
  });
  // pulmão do projeto (P80 − P50 do término) repartido pelas tarefas críticas em aberto, na proporção da exposição fuzzy
  const base = linhas.filter(l => l.status !== 'concluída' && l.critica), soma = base.reduce((t, l) => t + l.exposicao, 0);
  for (const l of linhas) l.pulmao = l.status !== 'concluída' && l.critica && soma ? pulmaoProjeto * l.exposicao / soma : 0;
  const semanas = []; for (let d = 0; d < Math.max(fimObra, prev.prazo.p80) + 14; d += 7) { const pm = probS[SEMANA_DO_DIA[d]]; semanas.push({ dia: d, chuva: pm.chuva, vento: pm.vento, observado: d < p.corte ? { chuva: [0, 1, 2, 3, 4, 5, 6].filter(k => climaDoDia(d + k, p).chuva).length, vento: [0, 1, 2, 3, 4, 5, 6].filter(k => climaDoDia(d + k, p).vento).length } : null }); }
  return { corte: p.corte, fimBase: pl.fimObra, fimRevisado: fimObra, fimP50: prev.prazo.p50, fimP80: prev.prazo.p80, pulmaoProjeto, linhas, semanas };
}

// janelas de clima para reprogramar: dias perdidos esperados se a tarefa sensível começar 0, 7, 14, 21 ou 28 dias depois
export function janelas(p = PADRAO) {
  const cr = cronograma({ ...p, deslocamentos: {} }), probS = probSemanal(p);
  return cr.linhas.filter(l => l.status === 'a iniciar' && (l.ceuAberto || l.icamento)).map(l => {
    const dur = l.fim - l.inicio - l.diasClima;
    const opcoes = [0, 7, 14, 21, 28].map(desl => { let d = l.inicio + desl, falta = dur, perdidos = 0; while (falta > 0 && d < 1190) { const perda = perdaDoDia(l.id, probS[SEMANA_DO_DIA[Math.floor(d)]]); falta -= 1 - perda; perdidos += perda; d += 1; } return { deslocamento: desl, inicio: l.inicio + desl, fim: d, diasClima: perdidos, cabeNaFolga: desl <= (l.folga || 0) }; });
    return { id: l.id, nome: l.nome, folga: l.folga, opcoes, melhor: opcoes.filter(o => o.cabeNaFolga).sort((a, b) => a.diasClima - b.diasClima)[0] };
  });
}

// ---------- troca de arquivo com o Microsoft Project (formato XML, MSPDI) ----------
const dataHora = dia => dataDe(dia) + 'T08:00:00';
export function paraProjectXML(p = PADRAO) {
  const cr = cronograma(p);
  const t = cr.linhas.map((l, i) => `  <Task><UID>${l.id}</UID><ID>${i + 1}</ID><Name>${l.nome.replace(/&/g, '&amp;')}</Name><WBS>${l.id}</WBS><Start>${dataHora(l.inicio)}</Start><Finish>${dataHora(l.fim)}</Finish><Duration>PT${Math.round(l.duracao * 8)}H0M0S</Duration><PercentComplete>${Math.round(l.concluido * 100)}</PercentComplete><Critical>${l.critica ? 1 : 0}</Critical>${l.pred.map(q => `<PredecessorLink><PredecessorUID>${q}</PredecessorUID><Type>1</Type></PredecessorLink>`).join('')}<Baseline><Number>0</Number><Start>${dataHora(l.inicioBase)}</Start><Finish>${dataHora(l.fimBase)}</Finish></Baseline></Task>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Project xmlns="http://schemas.microsoft.com/project">\n <Name>Obra A</Name>\n <StartDate>${dataHora(0)}</StartDate>\n <StatusDate>${dataHora(cr.corte)}</StatusDate>\n <Tasks>\n${t}\n </Tasks>\n</Project>\n`;
}
export function deProjectXML(texto) {
  const campo = (bloco, tag) => { const m = bloco.match(new RegExp('<' + tag + '>([^<]*)</' + tag + '>')); return m ? m[1] : null; };
  return [...texto.matchAll(/<Task>([\s\S]*?)<\/Task>/g)].map(m => { const b = m[1], semBase = b.replace(/<Baseline>[\s\S]*?<\/Baseline>/g, '');
    return { id: +campo(b, 'UID'), nome: (campo(b, 'Name') || '').replace(/&amp;/g, '&'), inicio: campo(semBase, 'Start'), fim: campo(semBase, 'Finish'), duracao: (() => { const d = (campo(b, 'Duration') || '').match(/PT(\d+)H/); return d ? +d[1] / 8 : null; })(), concluido: +(campo(b, 'PercentComplete') || 0) / 100,
      pred: [...b.matchAll(/<PredecessorUID>(\d+)<\/PredecessorUID>/g)].map(x => +x[1]) }; });
}

// aplica ao cronograma o arquivo lido por deProjectXML: duração (pela diferença de datas) e predecessoras das tarefas em aberto
export function aplicarArquivo(tarefas, p = PADRAO) {
  const est = diario(p).estado, feitas = [], recusadas = [];
  for (const t of tarefas) {
    const a = POR_ID[t.id]; if (!a) { recusadas.push({ id: t.id, motivo: 'tarefa inexistente' }); continue; }
    if (est[t.id].fim != null) continue;
    try {
      const dur = t.duracao != null ? Math.round(t.duracao) : Math.round((new Date(t.fim) - new Date(t.inicio)) / 864e5);
      const mud = {}; if (est[t.id].inicio == null && JSON.stringify(t.pred) !== JSON.stringify(a.pred)) mud.pred = t.pred;
      if (est[t.id].inicio == null && dur >= 1 && dur !== a.dur) mud.dur = dur;
      if (Object.keys(mud).length) { editarTarefa(t.id, mud, p); feitas.push({ id: t.id, ...mud }); }
    } catch (e) { recusadas.push({ id: t.id, motivo: e.message }); }
  }
  return { feitas, recusadas };
}
