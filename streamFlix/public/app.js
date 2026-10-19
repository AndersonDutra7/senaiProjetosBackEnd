(() => {
  'use strict';

  // ---------- estado ----------
  let token = null;
  let usuario = null;
  let visao = 'catalogo'; // catalogo | lista | meus (admin)
  let termoBusca = '';
  let pollTimer = null;

  const $ = (id) => document.getElementById(id);
  const el = {
    foto: $('foto-usuario'),
    nome: $('nome-usuario'),
    btnPerfil: $('btn-perfil'),
    btnAuth: $('btn-auth'),
    formBusca: $('form-busca'),
    campoBusca: $('campo-busca'),
    msgBusca: $('msg-busca'),
    filtro: $('filtro'),
    btnCatalogo: $('btn-catalogo'),
    btnLista: $('btn-minha-lista'),
    galeria: $('galeria'),
    msgGaleria: $('msg-galeria'),
    painelAdmin: $('painel-admin'),
    formFilme: $('form-filme'),
    listaAdmin: $('lista-admin'),
    msgListaAdmin: $('msg-lista-admin'),
    modal: $('modal-login'),
    formLogin: $('form-login'),
    menu: $('menu-lateral'),
    fundoMenu: $('fundo-menu'),
  };

  // foto ausente: usa o avatar padrão
  [el.foto, $('menu-foto')].forEach((i) =>
    i.addEventListener('error', () => {
      if (!i.src.endsWith(SEM_IMAGEM)) i.src = SEM_IMAGEM;
    }),
  );

  // ---------- util ----------
  function guardar(k, v) {
    try {
      v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v);
    } catch (e) {}
  }
  function ler(k) {
    try {
      return sessionStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }

  async function api(url, opcoes = {}) {
    const headers = Object.assign({}, opcoes.headers || {});
    if (token) headers['x-token'] = token;
    if (opcoes.json) {
      headers['Content-Type'] = 'application/json';
      opcoes.body = JSON.stringify(opcoes.json);
    }
    const r = await fetch(url, Object.assign({}, opcoes, { headers }));
    let dados = null;
    try {
      dados = await r.json();
    } catch (e) {}
    return { ok: r.ok, status: r.status, dados };
  }

  // O banco guarda só o nome do arquivo (ex.: goku.png); as imagens ficam na pasta imagens/
  const LOGO = 'logo/logo.jpg'; // foto do @StreamFlix (visitante)
  const SEM_IMAGEM = LOGO;
  function caminhoImagem(nome, pasta) {
    if (!nome) return SEM_IMAGEM;
    return pasta + '/' + encodeURIComponent(nome);
  }

  function ico(arquivo, classe) {
    const s = document.createElement('span');
    s.className = 'ico ' + (classe || '');
    s.style.setProperty('--i', `url(icones/${arquivo})`);
    return s;
  }

  function msg(elemento, texto) {
    elemento.textContent = texto || '';
    elemento.hidden = !texto;
  }

  // ---------- modal de login ----------
  function abrirLogin() {
    el.formLogin.reset();
    ['e-usuario', 'e-senha', 'e-login'].forEach((i) => msg($(i), ''));
    el.modal.hidden = false;
    $('l-usuario').focus();
  }
  function fecharLogin() {
    el.modal.hidden = true;
  }

  $('login-fechar').addEventListener('click', fecharLogin);
  $('login-cancelar').addEventListener('click', fecharLogin);
  el.modal.addEventListener('mousedown', (e) => {
    if (e.target === el.modal) fecharLogin();
  });

  el.formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nomeUsuario = $('l-usuario').value.trim();
    const senha = $('l-senha').value;
    let ok = true;
    msg($('e-login'), '');

    if (nomeUsuario.length < 3 || /\s/.test(nomeUsuario)) {
      msg(
        $('e-usuario'),
        'Informe um nome_usuario com no mínimo 3 caracteres.',
      );
      ok = false;
    } else msg($('e-usuario'), '');

    if (!senha) {
      msg($('e-senha'), 'Informe a senha.');
      ok = false;
    } else msg($('e-senha'), '');
    if (!ok) return;

    const r = await api('/api/login', {
      method: 'POST',
      json: { nome_usuario: nomeUsuario, senha },
    });
    if (!r.ok) {
      msg(
        $('e-login'),
        (r.dados && r.dados.erro) ||
          'Usuário não encontrado ou senha incorreta',
      );
      return;
    }
    token = r.dados.token;
    usuario = r.dados.usuario;
    guardar('sf_token', token);
    fecharLogin();
    aplicarSessao();
  });

  // ---------- sessão ----------
  function aplicarSessao() {
    const logado = !!usuario;
    el.nome.textContent = logado ? '@' + usuario.nome_usuario : '@StreamFlix';
    el.foto.src = logado ? caminhoImagem(usuario.imagem_usuario, 'imagens_perfil') : LOGO;
    el.btnAuth.textContent = logado ? 'Logout' : 'Login';
    // visitante: botão com aparência desabilitada, mas o clique abre o login (B1)
    el.btnPerfil.disabled = logado && usuario.tipo !== 'administrador';
    el.btnPerfil.classList.toggle('desabilitado', !logado);
    el.filtro.hidden = !logado;
    el.campoBusca.placeholder = logado
      ? 'Digite o nome do filme'
      : 'Digite o nome do filme... ex: Interestelar';
    visao = 'catalogo';
    termoBusca = '';
    el.campoBusca.value = '';
    marcarFiltro();
    carregarGaleria();
  }

  el.btnAuth.addEventListener('click', async () => {
    if (!usuario) return abrirLogin();
    await api('/api/logout', { method: 'POST' });
    token = null;
    usuario = null;
    guardar('sf_token', null);
    fecharMenu();
    msg(el.msgBusca, '');
    aplicarSessao();
  });

  // Usuário não logado: ações que exigem login abrem o modal (B1)
  el.campoBusca.addEventListener('focus', () => {
    if (!usuario) {
      el.campoBusca.blur();
      abrirLogin();
    }
  });
  el.campoBusca.addEventListener('mousedown', (e) => {
    if (!usuario) {
      e.preventDefault();
      abrirLogin();
    }
  });

  // ---------- busca ----------
  el.formBusca.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!usuario) return abrirLogin();
    const termo = el.campoBusca.value.trim();
    if (termo.length < 2) {
      msg(el.msgBusca, 'Digite ao menos 2 caracteres para pesquisar.');
      return;
    }
    msg(el.msgBusca, '');
    termoBusca = termo;
    if (visao === 'meus') {
      visao = 'catalogo';
      marcarFiltro();
    }
    carregarGaleria();
  });
  el.campoBusca.addEventListener('input', () => {
    if (el.campoBusca.value.trim() === '' && termoBusca) {
      termoBusca = '';
      msg(el.msgBusca, '');
      carregarGaleria();
    }
  });

  // ---------- filtros ----------
  function marcarFiltro() {
    el.btnCatalogo.classList.toggle(
      'ativa',
      visao === 'catalogo' || visao === 'meus',
    );
    el.btnLista.classList.toggle('ativa', visao === 'lista');
  }
  el.btnCatalogo.addEventListener('click', () => {
    visao = 'catalogo';
    marcarFiltro();
    carregarGaleria();
  });
  el.btnLista.addEventListener('click', () => {
    visao = 'lista';
    marcarFiltro();
    carregarGaleria();
  });

  // ---------- galeria ----------
  async function buscarFilmes() {
    const p = new URLSearchParams();
    if (termoBusca) p.set('busca', termoBusca);
    if (visao === 'lista') p.set('lista', '1');
    const r = await api('/api/filmes' + (p.toString() ? '?' + p : ''));
    return r.ok ? r.dados : [];
  }

  async function carregarGaleria() {
    pararPoll();
    el.painelAdmin.hidden = true;
    el.galeria.hidden = false;
    const filmes = await buscarFilmes();
    el.galeria.innerHTML = '';
    filmes.forEach((f) => el.galeria.appendChild(criarCard(f)));

    if (!filmes.length) {
      el.msgGaleria.textContent =
        visao === 'lista' && !termoBusca
          ? 'Sua lista está vazia'
          : termoBusca
            ? 'Filme não encontrado'
            : 'Nenhum filme cadastrado.';
      el.msgGaleria.hidden = false;
    } else el.msgGaleria.hidden = true;
    iniciarPoll();
  }

  function criarCard(f) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = f.id_filme;

    const box = document.createElement('div');
    box.className = 'capa-box';
    const img = document.createElement('img');
    img.className = 'capa';
    img.src = caminhoImagem(f.url_capa, 'imagens_filmes');
    img.alt = 'Capa de ' + f.titulo_filme;
    img.addEventListener('error', () => {
      img.style.visibility = 'hidden';
    }); // capa ausente: mantém o fundo cinza
    box.appendChild(img);

    const btnLista = document.createElement('button');
    btnLista.className = 'btn-lista';
    btnLista.type = 'button';
    btnLista.title = 'Minha Lista';
    btnLista.appendChild(ico(f.na_lista ? 'check.svg' : 'mais.svg'));
    btnLista.addEventListener('click', () => alternarLista(f, card, btnLista));
    box.appendChild(btnLista);

    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.innerHTML = '';
    const l1 = document.createElement('div');
    l1.textContent = 'Cadastrado por: @' + f.cadastrado_por;
    const l2 = document.createElement('div');
    l2.textContent = 'Gênero: ' + f.genero;
    tip.append(l1, l2);
    box.appendChild(tip);

    const info = document.createElement('div');
    info.className = 'card-info';
    const titulo = document.createElement('span');
    titulo.className = 'card-titulo';
    titulo.textContent = f.titulo_filme;

    const like = document.createElement('div');
    like.className = 'card-like';
    const btnLike = document.createElement('button');
    btnLike.className = 'btn-like';
    btnLike.type = 'button';
    btnLike.title = 'Curtir';
    btnLike.appendChild(ico('coracao.svg', f.curtido ? 'ico-vermelho' : ''));
    const num = document.createElement('span');
    num.className = 'contador';
    num.textContent = f.curtidas;
    btnLike.addEventListener('click', () => alternarCurtida(f, btnLike, num));
    like.append(btnLike, num);

    info.append(titulo, like);
    card.append(box, info);
    return card;
  }

  async function alternarCurtida(f, btn, num) {
    if (!usuario) return abrirLogin();
    const r = await api(`/api/filmes/${f.id_filme}/curtir`, { method: 'POST' });
    if (!r.ok) return;
    f.curtido = r.dados.curtido;
    f.curtidas = r.dados.curtidas;
    btn.firstChild.classList.toggle('ico-vermelho', f.curtido);
    num.textContent = f.curtidas;
  }

  async function alternarLista(f, card, btn) {
    if (!usuario) return abrirLogin();
    const r = await api(`/api/filmes/${f.id_filme}/lista`, { method: 'POST' });
    if (!r.ok) return;
    f.na_lista = r.dados.na_lista;
    btn.innerHTML = '';
    btn.appendChild(ico(f.na_lista ? 'check.svg' : 'mais.svg'));
    if (visao === 'lista' && !f.na_lista) {
      card.remove();
      if (!el.galeria.children.length) {
        el.msgGaleria.textContent = termoBusca
          ? 'Filme não encontrado'
          : 'Sua lista está vazia';
        el.msgGaleria.hidden = false;
      }
    }
  }

  // Atualização em tempo real dos contadores (consulta periódica ao banco)
  function iniciarPoll() {
    pararPoll();
    pollTimer = setInterval(async () => {
      if (visao === 'meus' || document.hidden) return;
      const filmes = await buscarFilmes();
      filmes.forEach((f) => {
        const card = el.galeria.querySelector(`.card[data-id="${f.id_filme}"]`);
        if (!card) return;
        card.querySelector('.contador').textContent = f.curtidas;
        card
          .querySelector('.btn-like .ico')
          .classList.toggle('ico-vermelho', f.curtido);
      });
    }, 5000);
  }
  function pararPoll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  // ---------- menu lateral (admin) ----------
  function abrirMenu() {
    if (!usuario || usuario.tipo !== 'administrador') return;
    $('menu-foto').src = el.foto.src;
    $('menu-nome').textContent = '@' + usuario.nome_usuario;
    atualizarPerfil();
    el.fundoMenu.hidden = false;
    el.menu.classList.add('aberto');
    el.menu.setAttribute('aria-hidden', 'false');
  }
  function fecharMenu() {
    el.menu.classList.remove('aberto');
    el.menu.setAttribute('aria-hidden', 'true');
    el.fundoMenu.hidden = true;
  }
  async function atualizarPerfil() {
    const r = await api('/api/perfil');
    if (r.ok) {
      $('menu-likes').textContent = r.dados.likes;
      $('menu-filmes').textContent = r.dados.filmes;
    }
  }
  el.btnPerfil.addEventListener('click', () =>
    usuario ? abrirMenu() : abrirLogin(),
  );
  $('menu-fechar').addEventListener('click', fecharMenu);
  el.fundoMenu.addEventListener('click', fecharMenu);

  $('btn-seus-filmes').addEventListener('click', () => {
    fecharMenu();
    abrirSeusFilmes();
  });

  // ---------- seus filmes (admin) ----------
  async function abrirSeusFilmes() {
    visao = 'meus';
    termoBusca = '';
    el.campoBusca.value = '';
    marcarFiltro();
    pararPoll();
    el.galeria.hidden = true;
    el.msgGaleria.hidden = true;
    el.painelAdmin.hidden = false;
    limparFormFilme();
    await carregarListaAdmin();
  }

  async function carregarListaAdmin() {
    const r = await api('/api/filmes?meus=1');
    const filmes = r.ok ? r.dados : [];
    el.listaAdmin.innerHTML = '';
    filmes.forEach((f) => {
      const li = document.createElement('li');
      const t = document.createElement('span');
      t.textContent = f.titulo_filme;
      const b = document.createElement('button');
      b.className = 'btn-lixeira';
      b.type = 'button';
      b.title = 'Excluir filme';
      b.appendChild(ico('lixeira.svg'));
      b.addEventListener('click', () => excluirFilme(f));
      li.append(t, b);
      el.listaAdmin.appendChild(li);
    });
    el.msgListaAdmin.hidden = filmes.length > 0;
  }

  async function excluirFilme(f) {
    const r = await api('/api/filmes/' + f.id_filme, { method: 'DELETE' });
    if (r.ok) {
      await carregarListaAdmin();
      atualizarPerfil();
    }
  }

  function limparFormFilme() {
    el.formFilme.reset();
    $('nome-arquivo').textContent = 'Nenhum arquivo escolhido';
    ['e-titulo', 'e-genero', 'e-capa'].forEach((i) => msg($(i), ''));
  }

  $('btn-arquivo').addEventListener('click', () => $('f-capa').click());
  $('f-capa').addEventListener('change', () => {
    const a = $('f-capa').files[0];
    $('nome-arquivo').textContent = a ? a.name : 'Nenhum arquivo escolhido';
    msg($('e-capa'), '');
  });

  const EXT_OK = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  el.formFilme.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = $('f-titulo').value.trim();
    const genero = $('f-genero').value.trim();
    const arquivo = $('f-capa').files[0];
    let ok = true;

    if (!titulo) {
      msg($('e-titulo'), 'Informe o título do filme.');
      ok = false;
    } else msg($('e-titulo'), '');
    if (!genero) {
      msg($('e-genero'), 'Informe o gênero.');
      ok = false;
    } else msg($('e-genero'), '');

    if (!arquivo) {
      msg($('e-capa'), 'Selecione uma imagem JPG, JPEG, PNG, GIF ou WEBP.');
      ok = false;
    } else {
      const ext = arquivo.name.split('.').pop().toLowerCase();
      if (!EXT_OK.includes(ext)) {
        msg($('e-capa'), 'Formato inválido. Use JPG, JPEG, PNG, GIF ou WEBP.');
        ok = false;
      } else msg($('e-capa'), '');
    }
    if (!ok) return;

    const fd = new FormData();
    fd.append('titulo_filme', titulo);
    fd.append('genero', genero);
    fd.append('capa', arquivo);
    const r = await api('/api/filmes', { method: 'POST', body: fd });

    if (!r.ok) {
      const er = (r.dados && r.dados.erros) || {};
      if (er.titulo_filme) msg($('e-titulo'), er.titulo_filme);
      if (er.genero) msg($('e-genero'), er.genero);
      if (er.capa) msg($('e-capa'), er.capa);
      if (!r.dados || !r.dados.erros)
        msg(
          $('e-capa'),
          (r.dados && r.dados.erro) || 'Não foi possível cadastrar.',
        );
      return;
    }
    limparFormFilme();
    await carregarListaAdmin();
    atualizarPerfil();
  });

  // ---------- inicialização ----------
  async function iniciar() {
    const salvo = ler('sf_token');
    if (salvo) {
      token = salvo;
      const r = await api('/api/me');
      if (r.ok) usuario = r.dados;
      else {
        token = null;
        guardar('sf_token', null);
      }
    }
    aplicarSessao();
  }
  iniciar();
})();
