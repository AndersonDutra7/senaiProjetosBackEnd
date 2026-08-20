const API_BASE = 'http://localhost:3000';

const estado = {
  usuario: JSON.parse(localStorage.getItem('saepsaude_usuario') || 'null'),
  filtroTipo: '',
  pagina: 1,
};

// ── Elementos ──────────────────────────────────────────────────────────
const el = {
  perfilLogo: document.getElementById('perfil-logo'),
  perfilNomeEmpresa: document.getElementById('perfil-nome-empresa'),
  perfilUsuario: document.getElementById('perfil-usuario'),
  perfilFoto: document.getElementById('perfil-foto'),
  perfilNomeUsuario: document.getElementById('perfil-nome-usuario'),
  totalAtividades: document.getElementById('total-atividades'),
  totalCalorias: document.getElementById('total-calorias'),
  btnAtividade: document.getElementById('btn-atividade'),
  btnLogin: document.getElementById('btn-login'),
  btnLogout: document.getElementById('btn-logout'),
  filtros: document.querySelectorAll('.filtro-btn'),
  listaAtividades: document.getElementById('lista-atividades'),
  paginacao: document.getElementById('paginacao'),
  secaoListagem: document.getElementById('secao-listagem'),
  secaoFormAtividade: document.getElementById('secao-form-atividade'),
  formAtividade: document.getElementById('form-atividade'),
  modalLogin: document.getElementById('modal-login'),
  formLogin: document.getElementById('form-login'),
  btnCancelarLogin: document.getElementById('btn-cancelar-login'),
  btnFecharModal: document.getElementById('btn-fechar-modal'),
  templateCard: document.getElementById('template-card-atividade'),
};

// ── Helpers ────────────────────────────────────────────────────────────
function estaLogado() {
  return !!estado.usuario;
}

function salvarUsuario(usuario) {
  estado.usuario = usuario;
  localStorage.setItem('saepsaude_usuario', JSON.stringify(usuario));
}

function limparUsuario() {
  estado.usuario = null;
  localStorage.removeItem('saepsaude_usuario');
}

function mostrarErroCampo(inputEl, mensagem) {
  inputEl.classList.add('campo-invalido');
  const erroEl = inputEl.parentElement.querySelector('.erro-campo');
  if (erroEl) erroEl.textContent = mensagem;
}

function limparErroCampo(inputEl) {
  inputEl.classList.remove('campo-invalido');
  const erroEl = inputEl.parentElement.querySelector('.erro-campo');
  if (erroEl) erroEl.textContent = '';
}

function abrirModalLogin() {
  el.modalLogin.hidden = false;
}

function fecharModalLogin() {
  el.modalLogin.hidden = true;
  el.formLogin.reset();
  [...el.formLogin.querySelectorAll('input')].forEach(limparErroCampo);
}

function exigirLoginOuAbrirModal() {
  if (!estaLogado()) {
    abrirModalLogin();
    return false;
  }
  return true;
}

// ── Perfil ─────────────────────────────────────────────────────────────
async function carregarPerfil() {
  if (estaLogado()) {
    el.perfilUsuario.hidden = false;
    el.perfilFoto.src = estado.usuario.foto_url || '';
    el.perfilNomeUsuario.textContent = estado.usuario.nome;
    el.totalAtividades.textContent = estado.usuario.total_atividades;
    el.totalCalorias.textContent = estado.usuario.total_calorias;
    el.btnAtividade.disabled = false;
    el.btnLogin.hidden = true;
    el.btnLogout.hidden = false;
  } else {
    el.perfilUsuario.hidden = true;
    el.btnAtividade.disabled = true;
    el.btnLogin.hidden = false;
    el.btnLogout.hidden = true;

    try {
      const resp = await fetch(`${API_BASE}/empresa`);
      const dados = await resp.json();
      el.perfilNomeEmpresa.textContent = dados.nome;
      if (dados.logo_url) {
        el.perfilLogo.src = dados.logo_url;
        el.perfilLogo.hidden = false;
      }
      el.totalAtividades.textContent = dados.total_atividades;
      el.totalCalorias.textContent = dados.total_calorias;
    } catch (err) {
      console.error('Falha ao carregar dados da empresa', err);
    }
  }
}

// ── Listagem de atividades ────────────────────────────────────────────
async function carregarAtividades() {
  try {
    const params = new URLSearchParams({ page: estado.pagina });
    if (estado.filtroTipo) params.set('tipo', estado.filtroTipo);
    if (estaLogado()) params.set('usuario_id', estado.usuario.id);

    const resp = await fetch(`${API_BASE}/atividades?${params.toString()}`);
    const dados = await resp.json();

    renderizarAtividades(dados.atividades);
    renderizarPaginacao(dados.pagina, dados.total_paginas);
  } catch (err) {
    console.error('Falha ao carregar atividades', err);
  }
}

function renderizarAtividades(atividades) {
  el.listaAtividades.innerHTML = '';

  atividades.forEach((atividade) => {
    const card = el.templateCard.content.cloneNode(true);

    card.querySelector('.card-titulo').textContent = atividade.tipo;
    card.querySelector('.card-autor-foto').src = atividade.usuario.foto_url || '';
    card.querySelector('.card-autor-nome').textContent = atividade.usuario.nome;
    card.querySelector('.card-distancia').textContent = `${atividade.distancia_km} km`;
    card.querySelector('.card-duracao').textContent = `${atividade.duracao_horas} h`;
    card.querySelector('.card-calorias').textContent = `${atividade.calorias} kcal`;
    card.querySelector('.card-data').textContent = atividade.data;

    const btnCurtir = card.querySelector('.card-curtir');
    const iconeCoracao = card.querySelector('.icone-coracao');
    const totalCurtidasEl = card.querySelector('.card-total-curtidas');
    totalCurtidasEl.textContent = atividade.curtidas;
    if (atividade.curtido_por_mim) iconeCoracao.classList.add('curtido');

    btnCurtir.addEventListener('click', () => alternarCurtida(atividade.id, iconeCoracao, totalCurtidasEl));

    const totalComentariosEl = card.querySelector('.card-total-comentarios');
    totalComentariosEl.textContent = atividade.comentarios;

    const btnComentar = card.querySelector('.card-comentar');
    const formComentario = card.querySelector('.card-comentario-form');
    const inputComentario = card.querySelector('.input-comentario');
    const btnEnviarComentario = card.querySelector('.btn-enviar-comentario');

    btnComentar.addEventListener('click', () => {
      if (!exigirLoginOuAbrirModal()) return;
      formComentario.hidden = !formComentario.hidden;
    });

    btnEnviarComentario.addEventListener('click', () =>
      enviarComentario(atividade.id, inputComentario, totalComentariosEl)
    );

    el.listaAtividades.appendChild(card);
  });
}

async function alternarCurtida(atividadeId, iconeCoracao, totalCurtidasEl) {
  if (!exigirLoginOuAbrirModal()) return;

  try {
    const resp = await fetch(`${API_BASE}/atividades/${atividadeId}/curtir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: estado.usuario.id }),
    });
    const dados = await resp.json();

    iconeCoracao.classList.toggle('curtido', dados.curtido);
    totalCurtidasEl.textContent = dados.total_curtidas;
  } catch (err) {
    console.error('Falha ao curtir atividade', err);
  }
}

async function enviarComentario(atividadeId, inputComentario, totalComentariosEl) {
  const erroEl = inputComentario.parentElement.querySelector('.erro-comentario');
  const texto = inputComentario.value.trim();

  if (texto.length <= 2) {
    inputComentario.classList.add('campo-invalido');
    erroEl.textContent = 'não é possível enviar um comentário vazio';
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/atividades/${atividadeId}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: estado.usuario.id, texto }),
    });

    if (!resp.ok) throw new Error('Erro ao comentar');

    const dados = await resp.json();
    totalComentariosEl.textContent = dados.total_comentarios;
    inputComentario.value = '';
    inputComentario.classList.remove('campo-invalido');
    erroEl.textContent = '';
  } catch (err) {
    console.error('Falha ao enviar comentário', err);
  }
}

// ── Paginação ──────────────────────────────────────────────────────────
function renderizarPaginacao(paginaAtual, totalPaginas) {
  el.paginacao.innerHTML = '';

  const criarBotao = (texto, pagina, opcoes = {}) => {
    const btn = document.createElement('button');
    btn.textContent = texto;
    if (opcoes.ativa) btn.classList.add('ativa');
    if (opcoes.desabilitada) btn.disabled = true;
    btn.addEventListener('click', () => {
      estado.pagina = pagina;
      carregarAtividades();
    });
    return btn;
  };

  el.paginacao.appendChild(criarBotao('Primeira', 1, { desabilitada: paginaAtual === 1 }));
  el.paginacao.appendChild(
    criarBotao('Anterior', paginaAtual - 1, { desabilitada: paginaAtual === 1 })
  );

  for (let p = 1; p <= totalPaginas; p++) {
    el.paginacao.appendChild(criarBotao(String(p), p, { ativa: p === paginaAtual }));
  }

  el.paginacao.appendChild(
    criarBotao('Próxima', paginaAtual + 1, { desabilitada: paginaAtual === totalPaginas })
  );
  el.paginacao.appendChild(
    criarBotao('Última', totalPaginas, { desabilitada: paginaAtual === totalPaginas })
  );
}

// ── Filtros ────────────────────────────────────────────────────────────
el.filtros.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tipo !== '' && !exigirLoginOuAbrirModal()) return;

    el.filtros.forEach((b) => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    estado.filtroTipo = btn.dataset.tipo;
    estado.pagina = 1;
    carregarAtividades();
  });
});

// ── Login / Logout ────────────────────────────────────────────────────
el.btnLogin.addEventListener('click', abrirModalLogin);
el.btnCancelarLogin.addEventListener('click', fecharModalLogin);
el.btnFecharModal.addEventListener('click', fecharModalLogin);

el.formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const inputEmail = document.getElementById('input-email');
  const inputSenha = document.getElementById('input-senha');
  limparErroCampo(inputEmail);
  limparErroCampo(inputSenha);

  if (!inputEmail.value || !inputSenha.value) {
    if (!inputEmail.value) mostrarErroCampo(inputEmail, 'email ou senha obrigatório');
    if (!inputSenha.value) mostrarErroCampo(inputSenha, 'email ou senha obrigatório');
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inputEmail.value, senha: inputSenha.value }),
    });

    if (!resp.ok) {
      mostrarErroCampo(inputEmail, 'email ou senha incorreta');
      mostrarErroCampo(inputSenha, 'email ou senha incorreta');
      return;
    }

    const usuario = await resp.json();
    salvarUsuario(usuario);
    fecharModalLogin();
    estado.pagina = 1;
    await carregarPerfil();
    await carregarAtividades();
  } catch (err) {
    console.error('Falha no login', err);
  }
});

el.btnLogout.addEventListener('click', async () => {
  limparUsuario();
  estado.filtroTipo = '';
  estado.pagina = 1;
  el.filtros.forEach((b) => b.classList.remove('ativo'));
  el.secaoFormAtividade.hidden = true;
  el.secaoListagem.hidden = false;
  await carregarPerfil();
  await carregarAtividades();
});

// ── Cadastro de atividade ─────────────────────────────────────────────
el.btnAtividade.addEventListener('click', () => {
  if (!exigirLoginOuAbrirModal()) return;
  el.btnAtividade.classList.add('ativo');
  el.secaoListagem.hidden = true;
  el.secaoFormAtividade.hidden = false;
});

el.formAtividade.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const inputTipo = document.getElementById('input-tipo');
  const inputDistancia = document.getElementById('input-distancia');
  const inputDuracao = document.getElementById('input-duracao');
  [inputTipo, inputDistancia, inputDuracao].forEach(limparErroCampo);

  let valido = true;
  if (!inputTipo.value) {
    mostrarErroCampo(inputTipo, 'Campo obrigatório');
    valido = false;
  }
  if (!inputDistancia.value) {
    mostrarErroCampo(inputDistancia, 'Campo obrigatório');
    valido = false;
  }
  if (!inputDuracao.value) {
    mostrarErroCampo(inputDuracao, 'Campo obrigatório');
    valido = false;
  }
  if (!valido) return;

  try {
    const resp = await fetch(`${API_BASE}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: estado.usuario.id,
        tipo: inputTipo.value,
        distancia_metros: Number(inputDistancia.value),
        duracao_minutos: Number(inputDuracao.value),
      }),
    });

    if (!resp.ok) throw new Error('Erro ao criar atividade');

    el.formAtividade.reset();
    estado.usuario.total_atividades += 1;
    salvarUsuario(estado.usuario);

    estado.filtroTipo = '';
    estado.pagina = 1;
    el.secaoFormAtividade.hidden = true;
    el.secaoListagem.hidden = false;

    await carregarPerfil();
    await carregarAtividades();
  } catch (err) {
    console.error('Falha ao criar atividade', err);
  }
});

// ── Inicialização ──────────────────────────────────────────────────────
(async function iniciar() {
  await carregarPerfil();
  await carregarAtividades();
})();
