'use strict';
/* StreamFlix — front-end. Todo o conteúdo vem da API (banco de dados); nada recarrega a página,
   exceto o Logout, que por especificação redireciona para a página inicial. */

const $ = (s, r = document) => r.querySelector(s);
const FOTO_PADRAO = 'imagens/perfil/logoSimulado.png';

const estado = {
  usuario: null, // { id, nome, nome_usuario, imagem, tipo } ou null
  visao: 'galeria', // 'galeria' | 'registro'
  busca: '', // administrador pesquisado ('' = catálogo geral)
  ultimoJson: '',
};

/* ------------------------------------------------------------ utilitários */
async function api(url, opcoes = {}) {
  const init = { credentials: 'same-origin', ...opcoes };
  if (opcoes.json) {
    init.method = init.method || 'POST';
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(opcoes.json);
    delete init.json;
  }
  const resp = await fetch(url, init);
  let dados = {};
  try {
    dados = await resp.json();
  } catch (_) {
    /* sem corpo */
  }
  return { ok: resp.ok, status: resp.status, dados };
}

function el(tag, props = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  filhos.forEach((f) => f && n.append(f));
  return n;
}
const icone = (svg) =>
  el('i', { class: 'ico', style: `--i: url(/icons/${svg}.svg)` });

function limpaErros(raiz) {
  raiz.querySelectorAll('[data-erro]').forEach((p) => (p.textContent = ''));
  raiz
    .querySelectorAll('input.invalido')
    .forEach((i) => i.classList.remove('invalido'));
}
function mostraErro(raiz, campo, msg, input) {
  const p = raiz.querySelector(`[data-erro="${campo}"]`);
  if (p) p.textContent = msg;
  if (input) input.classList.add('invalido');
}

/* ------------------------------------------------------------ cabeçalho / sessão */
function atualizaCabecalho() {
  const u = estado.usuario;
  const btnPerfil = $('#btn-perfil');
  const btnLogin = $('#btn-login');

  $('#foto-usuario').src = u ? u.imagem : FOTO_PADRAO;
  $('#nome-usuario').textContent = u ? `@${u.nome_usuario}` : '@StreamFlix';
  btnLogin.textContent = u ? 'Logout' : 'Login';

  if (!u) {
    // aparência desabilitada, mas o clique abre o login (Seção "não logado")
    btnPerfil.disabled = false;
    btnPerfil.setAttribute('aria-disabled', 'true');
  } else if (u.tipo === 'administrador') {
    btnPerfil.disabled = false;
    btnPerfil.setAttribute('aria-disabled', 'false');
  } else {
    btnPerfil.disabled = true;
    btnPerfil.setAttribute('aria-disabled', 'true');
  }
}

async function carregaSessao() {
  const { dados } = await api('api/sessao');
  estado.usuario = dados.logado ? dados.usuario : null;
  atualizaCabecalho();
}

/* ------------------------------------------------------------ modal de login */
const modal = $('#modal-login');
function abreLogin() {
  limpaErros($('#form-login'));
  $('#login-erro').textContent = '';
  $('#form-login').reset();
  modal.hidden = false;
  $('#login-usuario').focus();
}
function fechaLogin() {
  modal.hidden = true;
}

$('#fechar-login').addEventListener('click', fechaLogin);
$('#cancelar-login').addEventListener('click', fechaLogin);
modal.addEventListener('mousedown', (e) => {
  if (e.target === modal) fechaLogin();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) fechaLogin();
});

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  limpaErros(f);
  $('#login-erro').textContent = '';

  const campoU = $('#login-usuario');
  const campoS = $('#login-senha');
  const nome = campoU.value.trim();
  let ok = true;
  if (nome.length < 3 || /\s/.test(nome)) {
    mostraErro(
      f,
      'nome_usuario',
      'Informe um nome_usuario com no mínimo 3 caracteres.',
      campoU,
    );
    ok = false;
  }
  if (!campoS.value) {
    mostraErro(f, 'senha', 'Informe a senha.', campoS);
    ok = false;
  }
  if (!ok) return;

  const r = await api('api/login', {
    json: { nome_usuario: nome, senha: campoS.value },
  });
  if (!r.ok) {
    if (r.dados.erros) {
      Object.entries(r.dados.erros).forEach(([c, m]) => mostraErro(f, c, m));
    } else {
      $('#login-erro').textContent =
        r.dados.erro || 'Usuário não encontrado ou senha incorreta';
    }
    return;
  }
  estado.usuario = r.dados.usuario;
  fechaLogin();
  atualizaCabecalho();
  estado.busca = '';
  $('#campo-busca').value = '';
  mostraVisao('galeria');
  await carregaGaleria(true);
});

$('#btn-login').addEventListener('click', async () => {
  if (!estado.usuario) return abreLogin();
  await api('api/logout', { method: 'POST' });
  window.location.href = '/'; // Logout: redireciona para a página inicial
});

/* ------------------------------------------------------------ galeria */
function criaCard(f) {
  const coracao = el(
    'button',
    {
      class: 'btn-curtir' + (f.curtido ? ' curtido' : ''),
      type: 'button',
      'aria-label': f.curtido ? 'Remover curtida' : 'Curtir',
      onclick: () => curtir(f.id),
    },
    icone('coracao'),
  );
  return el(
    'article',
    { class: 'card', 'data-id': f.id },
    el(
      'div',
      { class: 'capa' },
      el('img', { src: f.capa, alt: `Capa de ${f.titulo}`, loading: 'lazy' }),
      el(
        'div',
        { class: 'tooltip' },
        el('div', { text: `Cadastrado por: @${f.administrador}` }),
        el('div', { text: `Gênero: ${f.genero}` }),
      ),
    ),
    el(
      'div',
      { class: 'card-info' },
      el('span', { class: 'card-titulo', text: f.titulo, title: f.titulo }),
      el(
        'span',
        { class: 'curtida' },
        coracao,
        el('span', { class: 'contador', text: String(f.curtidas) }),
      ),
    ),
  );
}

function renderGaleria(filmes) {
  const g = $('#galeria');
  g.replaceChildren();
  if (!filmes.length) {
    g.append(
      el('p', { class: 'galeria-vazia', text: 'Nenhum filme cadastrado.' }),
    );
    return;
  }
  filmes.forEach((f) => g.append(criaCard(f)));
}

async function carregaGaleria(forca = false) {
  const url = estado.busca
    ? `api/filmes?administrador=${encodeURIComponent(estado.busca)}`
    : 'api/filmes';
  const r = await api(url);
  const msg = $('#msg-busca');

  if (!r.ok) {
    if (r.status === 401 && estado.usuario) {
      // sessão expirou
      estado.usuario = null;
      atualizaCabecalho();
    }
    msg.textContent = r.dados.erro || 'Não foi possível carregar os filmes.';
    renderGaleria([]);
    $('#galeria').replaceChildren();
    estado.ultimoJson = '';
    return;
  }
  msg.textContent = '';
  const json = JSON.stringify(r.dados.filmes);
  if (forca || json !== estado.ultimoJson) {
    // só redesenha se algo mudou (contagem em tempo real)
    estado.ultimoJson = json;
    renderGaleria(r.dados.filmes);
  }
}

async function curtir(id) {
  if (!estado.usuario) return abreLogin();
  const r = await api(`api/filmes/${id}/curtir`, { method: 'POST' });
  if (r.status === 401) {
    estado.usuario = null;
    atualizaCabecalho();
    return abreLogin();
  }
  if (!r.ok) return;
  const card = $(`.card[data-id="${id}"]`);
  if (card) {
    card.querySelector('.contador').textContent = String(r.dados.curtidas);
    const b = card.querySelector('.btn-curtir');
    b.classList.toggle('curtido', r.dados.curtido);
    b.setAttribute(
      'aria-label',
      r.dados.curtido ? 'Remover curtida' : 'Curtir',
    );
  }
  if (!$('#menu-lateral').hidden) carregaPerfil();
  estado.ultimoJson = ''; // próxima consulta confirma o estado vindo do banco
}

/* ------------------------------------------------------------ busca por administrador */
const campoBusca = $('#campo-busca');
campoBusca.addEventListener('focus', () => {
  if (!estado.usuario) {
    campoBusca.blur();
    abreLogin();
  }
});
campoBusca.addEventListener('mousedown', (e) => {
  if (!estado.usuario) {
    e.preventDefault();
    abreLogin();
  }
});

$('#form-busca').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!estado.usuario) return abreLogin();
  const termo = campoBusca.value.trim().replace(/^@/, '');
  estado.busca = termo;
  await carregaGaleria(true);
});

/* atualização periódica (curtidas de outros usuários) */
setInterval(() => {
  if (estado.visao === 'galeria' && !document.hidden && modal.hidden)
    carregaGaleria();
}, 5000);

/* ------------------------------------------------------------ menu lateral (administrador) */
const menu = $('#menu-lateral');
async function carregaPerfil() {
  const r = await api('api/perfil');
  if (!r.ok) return;
  $('#menu-likes').textContent = r.dados.likes;
  $('#menu-filmes').textContent = r.dados.filmes;
}
async function abreMenu() {
  const u = estado.usuario;
  $('#menu-foto').src = u.imagem;
  $('#menu-nome').textContent = `@${u.nome_usuario}`;
  menu.hidden = false;
  await carregaPerfil();
}
$('#fechar-menu').addEventListener('click', () => (menu.hidden = true));

$('#btn-perfil').addEventListener('click', () => {
  if (!estado.usuario) return abreLogin();
  if (estado.usuario.tipo === 'administrador') abreMenu();
});

/* ------------------------------------------------------------ navegação entre visões */
function mostraVisao(v) {
  estado.visao = v;
  $('#visao-galeria').hidden = v !== 'galeria';
  $('#visao-registro').hidden = v !== 'registro';
}

$('#marca').addEventListener('click', async () => {
  menu.hidden = true;
  mostraVisao('galeria');
  await carregaGaleria(true);
});

$('#btn-seus-filmes').addEventListener('click', async () => {
  menu.hidden = true;
  mostraVisao('registro');
  limpaFormulario();
  await carregaMeusFilmes();
});

/* ------------------------------------------------------------ registro de filmes */
const formFilme = $('#form-filme');
const inputCapa = $('#capa-filme');
const EXT_OK = /\.(jpe?g|png|gif|webp)$/i;

function limpaFormulario() {
  formFilme.reset();
  limpaErros(formFilme);
  $('#nome-arquivo').textContent = 'Nenhum arquivo escolhido';
}

inputCapa.addEventListener('change', () => {
  $('#nome-arquivo').textContent = inputCapa.files[0]
    ? inputCapa.files[0].name
    : 'Nenhum arquivo escolhido';
});

formFilme.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpaErros(formFilme);
  const titulo = $('#titulo-filme');
  const genero = $('#genero-filme');
  const arquivo = inputCapa.files[0];
  let ok = true;

  if (!titulo.value.trim()) {
    mostraErro(formFilme, 'titulo_filme', 'Campo obrigatório.', titulo);
    ok = false;
  }
  if (!genero.value.trim()) {
    mostraErro(formFilme, 'genero', 'Campo obrigatório.', genero);
    ok = false;
  }
  if (!arquivo) {
    mostraErro(formFilme, 'capa', 'Campo obrigatório.');
    ok = false;
  } else if (!EXT_OK.test(arquivo.name)) {
    mostraErro(
      formFilme,
      'capa',
      'Selecione uma imagem JPG, JPEG, PNG, GIF ou WEBP.',
    );
    ok = false;
  }
  if (!ok) return;

  const fd = new FormData();
  fd.append('titulo_filme', titulo.value.trim());
  fd.append('genero', genero.value.trim());
  fd.append('tem_arquivo', '1');
  fd.append('capa', arquivo);

  const r = await api('api/filmes', { method: 'POST', body: fd });
  if (!r.ok) {
    const erros = r.dados.erros || {};
    Object.entries(erros).forEach(([c, m]) =>
      mostraErro(
        formFilme,
        c,
        m,
        c === 'titulo_filme' ? titulo : c === 'genero' ? genero : null,
      ),
    );
    if (r.dados.erro) mostraErro(formFilme, 'capa', r.dados.erro);
    return;
  }
  limpaFormulario();
  await carregaMeusFilmes();
});

async function carregaMeusFilmes() {
  const r = await api('api/meus-filmes');
  const ul = $('#lista-filmes');
  ul.replaceChildren();
  if (!r.ok) return;
  $('#lista-vazia').hidden = r.dados.filmes.length > 0;
  r.dados.filmes.forEach((f) =>
    ul.append(
      el(
        'li',
        {},
        el('span', { text: f.titulo }),
        el(
          'button',
          {
            class: 'btn-lixeira',
            type: 'button',
            'aria-label': `Excluir ${f.titulo}`,
            onclick: () => exclui(f.id),
          },
          icone('lixeira'),
        ),
      ),
    ),
  );
}

async function exclui(id) {
  const r = await api(`api/filmes/${id}`, { method: 'DELETE' });
  if (r.ok) {
    await carregaMeusFilmes();
    if (!menu.hidden) carregaPerfil();
  }
}

/* ------------------------------------------------------------ início */
(async function iniciar() {
  await carregaSessao();
  await carregaGaleria(true);
})();
