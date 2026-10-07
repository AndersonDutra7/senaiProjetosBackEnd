/* Funções compartilhadas pelas telas do aluno e do professor */
const DIFS = { facil: ['Fácil', 'badge-facil'], medio: ['Média', 'badge-medio'], dificil: ['Difícil', 'badge-dificil'] };

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Mesma estrutura do HTML original: faixa azul + caixa do item */
function itemHTML(st) {
  const [rot, cls] = DIFS[st.dif] || ['?', ''];
  const n = String(st.qi + 1).padStart(2, '0');
  return (
    `<div class="item-header"><span>QUESTÃO ${n} / ${st.total}</span><span class="badge ${cls}">${rot}</span></div>` +
    `<div class="item-box"><div class="capacidade">${esc(st.ct)}</div>${st.html}</div>`
  );
}

/* Destaca a alternativa correta (verde) e a escolhida errada (vermelho) */
function marcar(el, correta, escolha) {
  el.querySelectorAll('.alternativas > li').forEach((li, i) => {
    const l = 'abcd'[i];
    if (l === correta) li.classList.add('correta');
    else if (l === escolha) li.classList.add('errada');
  });
}

/* WebSocket com reconexão automática */
function abrirWS(onMsg, onStatus) {
  let ws;
  function conectar() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}`);
    ws.onopen = () => onStatus(true);
    ws.onmessage = (e) => onMsg(JSON.parse(e.data));
    ws.onclose = () => {
      onStatus(false);
      setTimeout(conectar, 1500);
    };
  }
  conectar();
  return { send: (o) => ws && ws.readyState === 1 && ws.send(JSON.stringify(o)) };
}

/* Barra de tempo regressiva */
function iniciarTimer(barra, rotulo, restanteMs, totalS, aoZerar) {
  const fim = Date.now() + restanteMs;
  clearInterval(iniciarTimer.id);
  function passo() {
    const resta = Math.max(0, fim - Date.now());
    barra.style.width = Math.min(100, (resta / (totalS * 1000)) * 100) + '%';
    barra.classList.toggle('urgente', resta < 8000);
    rotulo.textContent = Math.ceil(resta / 1000) + 's';
    if (resta <= 0) {
      clearInterval(iniciarTimer.id);
      if (aoZerar) aoZerar();
    }
  }
  passo();
  iniciarTimer.id = setInterval(passo, 200);
}
