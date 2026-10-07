'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const PORT = Number(process.env.PORT) || 3000;
const USE_TUNNEL = process.argv.includes('--tunnel');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const QUESTOES = JSON.parse(fs.readFileSync(path.join(__dirname, 'dados', 'questoes.json'), 'utf8'));
const HOST_KEY = process.env.HOST_KEY || crypto.randomBytes(2).toString('hex');
const PUB = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const urls = { lan: [], tunnel: null };
function lanIPs() {
  const out = [];
  for (const lista of Object.values(os.networkInterfaces()))
    for (const i of lista || [])
      if (i.family === 'IPv4' && !i.internal) out.push(`http://${i.address}:${PORT}`);
  return out;
}

/* ───────────── estado do jogo ───────────── */
const S = { phase: 'lobby', qi: -1, startedAt: 0, endsAt: 0, timer: null };
const players = new Map(); // pid -> {pid, nome, pontos, resp:{qi:{escolha,certa,pontos,ms}}, ws}
const hosts = new Set();

const tempoDe = (q) => cfg.tempos[q.dif] || 60;
const online = () => [...players.values()].filter((p) => p.ws && p.ws.readyState === 1);
const respondidas = () => online().filter((p) => p.resp[S.qi]).length;

function ranking() {
  return [...players.values()]
    .map((p) => ({
      pid: p.pid,
      nome: p.nome,
      pontos: p.pontos,
      acertos: Object.values(p.resp).filter((r) => r.certa).length,
    }))
    .sort((a, b) => b.pontos - a.pontos || b.acertos - a.acertos || a.nome.localeCompare(b.nome));
}

function contagem(qi) {
  const c = { a: 0, b: 0, c: 0, d: 0, branco: 0 };
  for (const p of players.values()) {
    const r = p.resp[qi];
    if (r) c[r.escolha]++;
    else c.branco++;
  }
  return c;
}

function msgFor(role, p) {
  const q = QUESTOES[S.qi];
  const m = { t: 'state', phase: S.phase, qi: S.qi, total: QUESTOES.length };
  if (role === 'host') {
    m.urls = urls;
    m.jogadores = [...players.values()].map((x) => ({ nome: x.nome, on: !!(x.ws && x.ws.readyState === 1) }));
  } else {
    m.nome = p.nome;
  }
  if (S.phase === 'question') {
    Object.assign(m, {
      html: q.html, dif: q.dif, ct: q.ct,
      tempo: tempoDe(q),
      restante: Math.max(0, S.endsAt - Date.now()),
    });
    if (role === 'host') {
      m.respondidas = respondidas();
      m.online = online().length;
    } else {
      const r = p.resp[S.qi];
      m.respondeu = !!r;
      m.escolha = r ? r.escolha : null;
    }
  }
  if (S.phase === 'reveal') {
    const r = ranking();
    Object.assign(m, {
      html: q.html, dif: q.dif, ct: q.ct,
      correta: q.resp,
      contagem: contagem(S.qi),
      top: r.slice(0, 5).map(({ nome, pontos }) => ({ nome, pontos })),
      ultima: S.qi === QUESTOES.length - 1,
    });
    if (role !== 'host') {
      m.minha = p.resp[S.qi] || { escolha: null, certa: false, pontos: 0 };
      m.pontos = p.pontos;
      m.posicao = r.findIndex((x) => x.pid === p.pid) + 1;
      m.nJogadores = r.length;
    }
  }
  if (S.phase === 'final') {
    const r = ranking();
    m.ranking = r.slice(0, role === 'host' ? 60 : 10).map(({ nome, pontos, acertos }) => ({ nome, pontos, acertos }));
    if (role !== 'host') {
      const i = r.findIndex((x) => x.pid === p.pid);
      m.pontos = p.pontos;
      m.posicao = i + 1;
      m.acertos = r[i] ? r[i].acertos : 0;
      m.nJogadores = r.length;
    }
  }
  return m;
}

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}
function pushHosts() {
  for (const h of hosts) send(h, msgFor('host'));
}
function pushAll() {
  pushHosts();
  for (const p of players.values()) send(p.ws, msgFor('aluno', p));
}

function iniciarQuestao(i) {
  clearTimeout(S.timer);
  S.phase = 'question';
  S.qi = i;
  S.startedAt = Date.now();
  S.endsAt = S.startedAt + tempoDe(QUESTOES[i]) * 1000;
  S.timer = setTimeout(revelar, S.endsAt - Date.now() + 700);
  pushAll();
}
function revelar() {
  if (S.phase !== 'question') return;
  clearTimeout(S.timer);
  S.phase = 'reveal';
  pushAll();
}
function avancar() {
  if (S.phase === 'lobby') return iniciarQuestao(0);
  if (S.phase === 'question') return revelar();
  if (S.phase === 'reveal') {
    if (S.qi + 1 < QUESTOES.length) return iniciarQuestao(S.qi + 1);
    S.phase = 'final';
    return pushAll();
  }
}
function reiniciar() {
  clearTimeout(S.timer);
  for (const p of players.values()) {
    p.pontos = 0;
    p.resp = {};
  }
  S.phase = 'lobby';
  S.qi = -1;
  pushAll();
}

/* ───────────── WebSocket ───────────── */
function tratar(ws, m) {
  if (m.t === 'host') {
    if (m.key !== HOST_KEY) return send(ws, { t: 'erro', msg: 'Chave do professor inválida. Use o endereço impresso no terminal.' });
    ws.role = 'host';
    hosts.add(ws);
    return send(ws, msgFor('host'));
  }

  if (m.t === 'join') {
    const nome = String(m.nome || '').trim().slice(0, 20);
    let p = m.pid && players.get(m.pid);
    if (p) {
      if (p.ws && p.ws !== ws && p.ws.readyState === 1) try { p.ws.close(); } catch {}
      p.ws = ws;
    } else {
      if (!nome) return send(ws, { t: 'erro', msg: 'Digite seu nome.' });
      if ([...players.values()].some((x) => x.nome.toLowerCase() === nome.toLowerCase()))
        return send(ws, { t: 'erro', msg: 'Esse nome já está em uso. Escolha outro.' });
      p = { pid: crypto.randomUUID(), nome, pontos: 0, resp: {}, ws };
      players.set(p.pid, p);
    }
    ws.player = p;
    send(ws, { t: 'entrou', pid: p.pid, nome: p.nome });
    send(ws, msgFor('aluno', p));
    return pushHosts();
  }

  if (m.t === 'resposta') {
    const p = ws.player;
    if (!p || S.phase !== 'question') return;
    const agora = Date.now();
    if (agora > S.endsAt + 500 || p.resp[S.qi]) return;
    const e = String(m.escolha);
    if (!/^[abcd]$/.test(e)) return;
    const q = QUESTOES[S.qi];
    const certa = e === q.resp;
    const frac = Math.min(1, Math.max(0, (agora - S.startedAt) / (tempoDe(q) * 1000)));
    const pontos = certa ? Math.round(cfg.pontosMax * (1 - frac / 2)) : 0;
    p.resp[S.qi] = { escolha: e, certa, pontos, ms: agora - S.startedAt };
    p.pontos += pontos;
    send(ws, msgFor('aluno', p));
    pushHosts();
    if (respondidas() >= online().length) {
      const qi = S.qi;
      setTimeout(() => { if (S.phase === 'question' && S.qi === qi) revelar(); }, 900);
    }
    return;
  }

  if (ws.role !== 'host') return;
  if (m.t === 'avancar') return avancar();
  if (m.t === 'reiniciar') return reiniciar();
}

/* ───────────── HTTP ───────────── */
function csv() {
  const cab = ['Posição', 'Nome', 'Pontos', 'Acertos', ...QUESTOES.map((_, i) => `Q${i + 1}`)];
  const linhas = ranking().map((r, i) => {
    const p = players.get(r.pid);
    const cols = QUESTOES.map((_, qi) => {
      const x = p.resp[qi];
      return x ? `${x.escolha.toUpperCase()} ${x.certa ? '✓' : '✗'}` : '';
    });
    return [i + 1, `"${r.nome.replace(/"/g, '""')}"`, r.pontos, r.acertos, ...cols].join(';');
  });
  return '﻿' + [cab.join(';'), ...linhas].join('\r\n');
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/qr.svg') {
      const t = u.searchParams.get('text') || '';
      if (!t || t.length > 300) { res.writeHead(400); return res.end(); }
      const svg = await QRCode.toString(t, { type: 'svg', margin: 1, width: 260 });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      return res.end(svg);
    }
    if (u.pathname === '/api/resultados.csv') {
      if (u.searchParams.get('key') !== HOST_KEY) { res.writeHead(403); return res.end('Chave inválida'); }
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="resultados.csv"',
      });
      return res.end(csv());
    }
    const p = u.pathname === '/' ? '/aluno.html' : u.pathname === '/professor' ? '/professor.html' : u.pathname;
    const f = path.normalize(path.join(PUB, p));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404);
      return res.end('Não encontrado');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    res.writeHead(500);
    res.end('Erro interno');
  }
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    try { tratar(ws, m); } catch (e) { console.error(e); }
  });
  ws.on('close', () => {
    hosts.delete(ws);
    if (ws.player && ws.player.ws === ws) {
      ws.player.ws = null;
      pushHosts();
    }
  });
});

async function abrirTunel() {
  try {
    const cf = await import('cloudflared');
    if (!fs.existsSync(cf.bin)) {
      console.log('Baixando o cloudflared (só na primeira vez)...');
      await cf.install(cf.bin);
    }
    const t = cf.Tunnel.quick(`http://localhost:${PORT}`);
    t.on('error', (e) => console.error('Erro no túnel:', e.message));
    t.on('exit', (code) => {
      console.error(`O túnel foi encerrado (código ${code}).`);
      urls.tunnel = null;
      pushHosts();
    });
    urls.tunnel = await new Promise((resolve, reject) => {
      t.once('url', resolve);
      setTimeout(() => reject(new Error('o túnel não respondeu em 40 segundos')), 40000);
    });
    console.log(`\n  Túnel ativo. Endereço dos alunos: ${urls.tunnel}\n`);
    pushHosts();
    const parar = () => { try { t.stop(); } catch {} process.exit(0); };
    process.on('SIGINT', parar);
    process.on('SIGTERM', parar);
  } catch (e) {
    console.error('Não foi possível abrir o túnel:', e.message);
    console.error('Use a rede local (npm start) ou instale o cloudflared manualmente.');
  }
}

server.listen(PORT, '0.0.0.0', () => {
  urls.lan = lanIPs();
  console.log('\n══════════════════════════════════════════════');
  console.log(' Competição SAEP — servidor no ar');
  console.log('══════════════════════════════════════════════');
  console.log(` Questões carregadas: ${QUESTOES.length}`);
  console.log(`\n PROFESSOR (abra no seu computador / projetor):`);
  console.log(`   http://localhost:${PORT}/professor?key=${HOST_KEY}`);
  console.log(`\n ALUNOS (mesma rede Wi-Fi):`);
  (urls.lan.length ? urls.lan : [`http://localhost:${PORT}`]).forEach((u) => console.log(`   ${u}`));
  console.log('══════════════════════════════════════════════\n');
  if (USE_TUNNEL) abrirTunel();
});
