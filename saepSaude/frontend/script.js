const API_URL = 'http://localhost:3000';

const state = {
  usuario: null, // preenchido no Passo 7 (login)
  pagina: 1,
  filtro: null, // 'corrida' | 'caminhada' | 'trilha' | null
  totalPages: 1,
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
  carregarEmpresa();
  carregarAtividades();
  configurarEventos();
});

// ===== PERFIL (empresa, ainda sem usuário logado) =====
async function carregarEmpresa() {
  try {
    const res = await fetch(`${API_URL}/empresa`);
    const data = await res.json();

    if (!state.usuario) {
      document.getElementById('perfil-nome').innerText = data.nome;
      document.getElementById(
        'perfil-logo',
      ).src = `logo_saepsaude/SAEPSaude.png`;
      document.getElementById('total-atividades').innerText =
        data.total_atividades;
      document.getElementById('total-calorias').innerText = data.total_calorias;
    }
  } catch (err) {
    console.error('Erro ao carregar empresa:', err);
  }
}

// ===== LISTAGEM DE ATIVIDADES =====
async function carregarAtividades() {
  try {
    let url = `${API_URL}/atividades?page=${state.pagina}`;
    if (state.filtro) url += `&tipo=${state.filtro}`;
    if (state.usuario) url += `&viewer_id=${state.usuario.id}`;

    const res = await fetch(url);
    const data = await res.json();

    state.totalPages = data.totalPages;
    renderAtividades(data.atividades);
    renderPaginacao();
  } catch (err) {
    console.error('Erro ao carregar atividades:', err);
  }
}

function renderAtividades(atividades) {
  const container = document.getElementById('lista-atividades');
  container.innerHTML = '';

  atividades.forEach((a) => {
    const distanciaKm = (a.distancia_percorrida / 1000).toFixed(1);
    const iconeCoracao = a.curtido_pelo_usuario
      ? 'icones/CoracaoVermelho.svg'
      : 'icones/coracao.svg';

    const card = document.createElement('div');
    card.className = 'card-atividade-wrapper';
    card.innerHTML = `
      <div class="card-atividade">
        <img src="imagens_perfil/${a.usuario_foto}" alt="${
      a.usuario_nome
    }" class="foto-usuario" />
        <div class="card-info">
          <h4>${capitalizar(a.tipo_atividade)}</h4>
          <p>${a.usuario_nome}</p>
          <p>${distanciaKm} km · ${a.duracao_atividade} min · ${
      a.quantidade_calorias
    } Calorias</p>
          <small>${a.data_formatada}</small>
        </div>
        <div class="card-interacoes">
          <span class="curtir" data-id="${a.id}">
            <img src="${iconeCoracao}" class="icone-coracao icone-interacao" />
            <span class="contador">${a.total_curtidas}</span>
          </span>
          <span class="comentar" data-id="${a.id}">
            <img src="icones/comentario.svg" class="icone-interacao" />
            <span class="contador">${a.total_comentarios}</span>
          </span>
        </div>
      </div>
      <div class="caixa-comentario" id="comentario-${
        a.id
      }" style="display:none;">
        <input type="text" placeholder="Escrever um comentário..." class="input-comentario" />
        <img src="icones/send.svg" class="icone-interacao btn-enviar-comentario" data-id="${
          a.id
        }" />
        <p class="erro-msg-comentario"></p>
      </div>
    `;
    container.appendChild(card);
  });

  ligarEventosCurtirComentar();
}

function ligarEventosCurtirComentar() {
  document.querySelectorAll('.curtir').forEach((el) => {
    el.onclick = () => requireLogin(() => curtir(el.dataset.id));
  });

  document.querySelectorAll('.comentar').forEach((el) => {
    el.onclick = () =>
      requireLogin(() => {
        const caixa = document.getElementById(`comentario-${el.dataset.id}`);
        caixa.style.display = caixa.style.display === 'none' ? 'flex' : 'none';
      });
  });

  document.querySelectorAll('.btn-enviar-comentario').forEach((el) => {
    el.onclick = () => enviarComentario(el.dataset.id);
  });
}

async function curtir(atividadeId) {
  try {
    const res = await fetch(`${API_URL}/curtidas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: state.usuario.id,
        atividade_id: atividadeId,
      }),
    });
    const data = await res.json();

    const spanCurtir = document.querySelector(
      `.curtir[data-id="${atividadeId}"]`,
    );
    spanCurtir.querySelector('.icone-coracao').src = data.curtido
      ? 'icones/CoracaoVermelho.svg'
      : 'icones/coracao.svg';
    spanCurtir.querySelector('.contador').innerText = data.total;
  } catch (err) {
    console.error('Erro ao curtir:', err);
  }
}

async function enviarComentario(atividadeId) {
  const caixa = document.getElementById(`comentario-${atividadeId}`);
  const input = caixa.querySelector('.input-comentario');
  const erroMsg = caixa.querySelector('.erro-msg-comentario');
  const texto = input.value.trim();

  if (texto.length <= 2) {
    erroMsg.innerText = 'não é possível enviar um comentário vazio';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: state.usuario.id,
        atividade_id: atividadeId,
        texto,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      erroMsg.innerText = data.erro;
      return;
    }

    document.querySelector(
      `.comentar[data-id="${atividadeId}"] .contador`,
    ).innerText = data.total;
    input.value = '';
    erroMsg.style.color = '#28a745';
    erroMsg.innerText = 'Comentário enviado!';

    setTimeout(() => {
      caixa.style.display = 'none';
      erroMsg.innerText = '';
      erroMsg.style.color = '';
    }, 1200);
  } catch (err) {
    console.error('Erro ao enviar comentário:', err);
  }
}

function capitalizar(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// ===== PAGINAÇÃO =====
function renderPaginacao() {
  const container = document.getElementById('paginacao');
  container.innerHTML = '';

  const btnAnterior = document.createElement('button');
  btnAnterior.innerText = 'Anterior';
  btnAnterior.disabled = state.pagina === 1;
  btnAnterior.onclick = () =>
    requireLogin(() => irParaPagina(state.pagina - 1));
  container.appendChild(btnAnterior);

  for (let i = 1; i <= state.totalPages; i++) {
    const btn = document.createElement('button');
    btn.innerText = i;
    if (i === state.pagina) btn.classList.add('ativo');
    btn.onclick = () => requireLogin(() => irParaPagina(i));
    container.appendChild(btn);
  }

  const btnProximo = document.createElement('button');
  btnProximo.innerText = 'Próximo';
  btnProximo.disabled = state.pagina === state.totalPages;
  btnProximo.onclick = () => requireLogin(() => irParaPagina(state.pagina + 1));
  container.appendChild(btnProximo);
}

function irParaPagina(p) {
  state.pagina = p;
  carregarAtividades();
}

// ===== FILTROS =====
function configurarEventos() {
  document.querySelectorAll('.filtro').forEach((btn) => {
    btn.onclick = () => {
      requireLogin(() => {
        const tipo = btn.dataset.tipo;
        state.filtro = state.filtro === tipo ? null : tipo; // clica de novo = remove filtro
        state.pagina = 1;
        carregarAtividades();
      });
    };
  });

  // Modal de login
  document.getElementById('btn-login').onclick = abrirModal;
  document.getElementById('fechar-modal').onclick = fecharModal;
  document.getElementById('btn-cancelar').onclick = fecharModal;
}

function abrirModal() {
  document.getElementById('modal-login').style.display = 'flex';
}
function fecharModal() {
  document.getElementById('modal-login').style.display = 'none';
}

// ===== GUARDA DE LOGIN (regra: ação sem login abre modal) =====
function requireLogin(acao) {
  if (state.usuario) {
    acao();
  } else {
    abrirModal();
  }
}

// ===== LOGIN =====
document.getElementById('btn-confirmar-login').onclick = async () => {
  const email = document.getElementById('input-email').value.trim();
  const senha = document.getElementById('input-senha').value.trim();
  const inputEmail = document.getElementById('input-email');
  const inputSenha = document.getElementById('input-senha');
  const erroMsg = document.getElementById('erro-login');

  inputEmail.classList.remove('erro');
  inputSenha.classList.remove('erro');
  erroMsg.innerText = '';

  if (!email || !senha) {
    inputEmail.classList.add('erro');
    inputSenha.classList.add('erro');
    erroMsg.innerText = 'email ou senha obrigatório';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();

    if (!res.ok) {
      inputEmail.classList.add('erro');
      inputSenha.classList.add('erro');
      erroMsg.innerText = data.erro;
      return;
    }

    fazerLogin(data.usuario);
    fecharModal();
  } catch (err) {
    console.error('Erro no login:', err);
  }
};

function fazerLogin(usuario) {
  state.usuario = usuario;

  // Perfil passa a mostrar dados do usuário logado
  document.getElementById('perfil-nome').innerText = usuario.nome;
  document.getElementById('perfil-logo').src = `imagens_perfil/${usuario.foto}`;
  // Header alterna Login -> Logout
  document.getElementById('btn-login').style.display = 'none';
  document.getElementById('btn-logout').style.display = 'inline-block';

  // Habilita botão Atividade
  const btnAtividade = document.getElementById('btn-atividade');
  btnAtividade.disabled = false;
  btnAtividade.classList.add('ativo');
  btnAtividade.onclick = () => {
    document.querySelector('.filtros').style.display = 'none';
    document.getElementById('lista-atividades').style.display = 'none';
    document.getElementById('paginacao').style.display = 'none';
    document.getElementById('tela-formulario').style.display = 'flex';
  };

  carregarTotaisUsuario();
}

async function carregarTotaisUsuario() {
  try {
    const res = await fetch(
      `${API_URL}/atividades?usuario_id=${state.usuario.id}&all=true`,
    );
    const data = await res.json();
    const total = data.atividades.length;
    const calorias = data.atividades.reduce(
      (soma, a) => soma + a.quantidade_calorias,
      0,
    );
    document.getElementById('total-atividades').innerText = total;
    document.getElementById('total-calorias').innerText = calorias;
  } catch (err) {
    console.error('Erro ao carregar totais do usuário:', err);
  }
}

// ===== LOGOUT =====
document.getElementById('btn-logout').onclick = () => {
  state.usuario = null;
  location.reload(); // reseta a SPA pro estado "não logado" (mais simples e seguro)
};

// ===== CRIAR ATIVIDADE =====
document.getElementById('btn-criar-atividade').onclick = async () => {
  const tipo = document.getElementById('form-tipo');
  const distancia = document.getElementById('form-distancia');
  const duracao = document.getElementById('form-duracao');

  [tipo, distancia, duracao].forEach((campo) => {
    campo.classList.remove('erro');
    document.getElementById(`erro-${campo.id.replace('form-', '')}`).innerText =
      '';
  });

  let valido = true;
  if (!tipo.value) {
    tipo.classList.add('erro');
    document.getElementById('erro-tipo').innerText = 'Campo obrigatório';
    valido = false;
  }
  if (!distancia.value) {
    distancia.classList.add('erro');
    document.getElementById('erro-distancia').innerText = 'Campo obrigatório';
    valido = false;
  }
  if (!duracao.value) {
    duracao.classList.add('erro');
    document.getElementById('erro-duracao').innerText = 'Campo obrigatório';
    valido = false;
  }
  if (!valido) return;

  try {
    const res = await fetch(`${API_URL}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_atividade: tipo.value,
        distancia_percorrida: parseInt(distancia.value),
        duracao_atividade: parseInt(duracao.value),
        usuario_id: state.usuario.id,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.erro);
      return;
    }

    // volta pra listagem, já mostrando a nova atividade em primeiro
    tipo.value = '';
    distancia.value = '';
    duracao.value = '';
    document.getElementById('tela-formulario').style.display = 'none';
    document.querySelector('.filtros').style.display = 'flex';
    document.getElementById('lista-atividades').style.display = 'flex';
    document.getElementById('paginacao').style.display = 'flex';

    state.filtro = null;
    state.pagina = 1;
    carregarAtividades();
    carregarTotaisUsuario();
  } catch (err) {
    console.error('Erro ao criar atividade:', err);
  }
};
