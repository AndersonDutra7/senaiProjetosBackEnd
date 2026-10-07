// Teste automático: sobe o servidor, simula professor + 3 alunos e joga as 35 questões.
const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');
const assert = require('assert');

const PORT = 3999, KEY = 'test';
const gab = require('../dados/questoes.json').map((q) => q.resp);
const srv = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT, HOST_KEY: KEY },
  stdio: 'ignore',
});
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function cliente() {
  const ws = new WebSocket(`ws://localhost:${PORT}`);
  const c = { ws, st: null, msgs: [] };
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    c.msgs.push(m);
    if (m.t === 'state') c.st = m;
    if (m.t === 'entrou') c.pid = m.pid;
  });
  c.send = (o) => ws.send(JSON.stringify(o));
  c.pronto = new Promise((r) => ws.on('open', r));
  return c;
}

(async () => {
  try {
    await espera(800);
    const host = cliente(); await host.pronto; host.send({ t: 'host', key: KEY });
    const ana = cliente(), bia = cliente(), caio = cliente();
    await Promise.all([ana.pronto, bia.pronto, caio.pronto]);
    ana.send({ t: 'join', nome: 'Ana' });
    bia.send({ t: 'join', nome: 'Bia' });
    caio.send({ t: 'join', nome: 'Caio' });
    await espera(300);

    // nome duplicado é recusado
    const dup = cliente(); await dup.pronto; dup.send({ t: 'join', nome: 'ana' });
    await espera(200);
    assert(dup.msgs.some((m) => m.t === 'erro'), 'nome duplicado deveria dar erro');

    // chave errada é recusada
    const falso = cliente(); await falso.pronto; falso.send({ t: 'host', key: 'x' });
    await espera(200);
    assert(falso.msgs.some((m) => m.t === 'erro'), 'chave errada deveria dar erro');
    falso.send({ t: 'avancar' }); await espera(200);
    assert.strictEqual(host.st.phase, 'lobby', 'impostor não pode avançar');

    assert.strictEqual(host.st.jogadores.length, 3);
    host.send({ t: 'avancar' }); await espera(300);
    assert.strictEqual(host.st.phase, 'question');

    // o aluno nunca recebe o gabarito durante a questão
    assert(!JSON.stringify(ana.st).includes('"correta"'), 'vazou gabarito');

    for (let i = 0; i < gab.length; i++) {
      assert.strictEqual(ana.st.qi, i);
      const errada = 'abcd'.replace(gab[i], '')[0];
      ana.send({ t: 'resposta', escolha: gab[i] });   // sempre acerta
      bia.send({ t: 'resposta', escolha: i % 2 ? gab[i] : errada }); // acerta metade
      // Caio não responde: o jogo deve esperar o tempo ou o professor encerrar
      await espera(250);
      assert.strictEqual(host.st.respondidas, 2);
      host.send({ t: 'avancar' }); await espera(250);   // encerra
      assert.strictEqual(host.st.phase, 'reveal');
      assert.strictEqual(host.st.correta, gab[i]);
      assert.strictEqual(ana.st.minha.certa, true);
      assert.strictEqual(caio.st.minha.escolha, null);
      host.send({ t: 'avancar' }); await espera(250);   // próxima ou final
    }
    assert.strictEqual(host.st.phase, 'final');
    const r = host.st.ranking;
    assert.strictEqual(r[0].nome, 'Ana');
    assert.strictEqual(r[0].acertos, 35);
    assert.strictEqual(r[1].nome, 'Bia');
    assert.strictEqual(r[2].pontos, 0);
    assert.strictEqual(ana.st.posicao, 1);

    // CSV
    const csv = await (await fetch(`http://localhost:${PORT}/api/resultados.csv?key=${KEY}`)).text();
    assert(csv.includes('Ana') && csv.split('\n').length === 4);
    const negado = await fetch(`http://localhost:${PORT}/api/resultados.csv?key=errada`);
    assert.strictEqual(negado.status, 403);

    // páginas e QR
    for (const p of ['/', '/professor', '/estilo-prova.css', '/comum.js', '/qr.svg?text=http://x']) {
      const x = await fetch(`http://localhost:${PORT}${p}`);
      assert.strictEqual(x.status, 200, p);
    }
    assert.strictEqual((await fetch(`http://localhost:${PORT}/dados/questoes.json`)).status, 404, 'gabarito exposto!');
    assert.strictEqual((await fetch(`http://localhost:${PORT}/../server.js`)).status, 404);

    // reconexão de aluno
    ana.ws.close(); await espera(200);
    const ana2 = cliente(); await ana2.pronto;
    ana2.send({ t: 'join', pid: ana.pid, nome: 'Ana' }); await espera(250);
    assert.strictEqual(ana2.st.pontos, ana.st.pontos, 'reconexão deve manter pontos');

    // reiniciar
    host.send({ t: 'reiniciar' }); await espera(250);
    assert.strictEqual(host.st.phase, 'lobby');
    console.log('TODOS OS TESTES PASSARAM');
    console.log('Pontuação final:', r.map((x) => `${x.nome}=${x.pontos}`).join(', '));
  } catch (e) {
    console.error('FALHOU:', e.message);
    process.exitCode = 1;
  } finally {
    srv.kill();
    setTimeout(() => process.exit(), 100);
  }
})();
