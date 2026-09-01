let usuarioAtual = null; // guarda { id, nome, usuario, tipo, foto_perfil } após login

// --- 1. GALERIA DE FOTOS ---
async function carregarGaleria(filtroFotografo = '') {
  const params = new URLSearchParams();
  if (filtroFotografo) params.append('fotografo', filtroFotografo);
  if (usuarioAtual) params.append('usuario_id', usuarioAtual.id);

  const url = `/api/fotos${params.toString() ? '?' + params.toString() : ''}`;
  const resp = await fetch(url);
  const fotos = await resp.json();

  if (filtroFotografo && fotos.length === 0) {
    document.getElementById('galeria').innerHTML =
      '<p>Fotógrafo não encontrado</p>';
    return;
  }
  renderizarGaleria(fotos);
}

function renderizarGaleria(fotos) {
  const galeria = document.getElementById('galeria');
  galeria.innerHTML = fotos
    .map((f) => {
      // Verifica se a API indicou que o usuário logado já curtiu esta publicação
      const curtiu =
        f.curtiu ||
        (Array.isArray(f.usuarios_curtiram) &&
          usuarioAtual &&
          f.usuarios_curtiram.includes(usuarioAtual.id));
      const classeAtiva = curtiu ? 'ativa' : '';

      return `
        <div class="foto-card">
          <img class="foto" src="/uploads/${f.imagem}" />
          <div class="tooltip">Foto tirada por: @${f.fotografo_usuario}<br/>Local: ${f.local}</div>
          <div class="rodape-card">
            <span>${f.titulo}</span>
            <img class="curtida-icone ${classeAtiva}" data-id="${f.id}" src="assets/coracao.svg" />
            <span class="contador">${f.curtidas}</span>
          </div>
        </div>
      `;
    })
    .join('');

  document.querySelectorAll('.curtida-icone').forEach((icone) => {
    icone.addEventListener('click', () => toggleCurtida(icone));
  });
}

carregarGaleria();

// --- 2. CURTIDAS ---
async function toggleCurtida(icone) {
  if (!usuarioAtual) {
    abrirModalLogin();
    return;
  }

  const publicacaoId = icone.dataset.id;
  const resp = await fetch(`/api/curtidas/${publicacaoId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id: usuarioAtual.id }),
  });
  const { curtidas, curtiu } = await resp.json();

  icone.classList.toggle('ativa', curtiu);
  icone.parentElement.querySelector('.contador').textContent = curtidas;
}

// --- 3. AUTENTICAÇÃO (LOGIN / LOGOUT) ---
const btnLogin = document.getElementById('btnLogin');

btnLogin.addEventListener('click', () => {
  if (usuarioAtual) {
    // Ação de LOGOUT
    usuarioAtual = null;
    document.getElementById('nomeUsuario').textContent = '@SAEPVision';
    document.getElementById('fotoPerfil').src = 'assets/logo.png';
    document.getElementById('btnVerPerfil').disabled = true;
    btnLogin.textContent = 'Entrar';

    // Recarrega galeria sem estado de curtida
    carregarGaleria();
  } else {
    abrirModalLogin();
  }
});

document
  .getElementById('btnCancelar')
  .addEventListener('click', fecharModalLogin);
document
  .getElementById('fecharModal')
  .addEventListener('click', fecharModalLogin);

function abrirModalLogin() {
  document.getElementById('loginUsuario').value = '';
  document.getElementById('loginSenha').value = '';
  document.getElementById('erroUsuario').textContent = '';
  document.getElementById('erroSenha').textContent = '';
  document.getElementById('erroLogin').textContent = '';

  document.getElementById('modalLogin').classList.remove('oculto');
}

function fecharModalLogin() {
  document.getElementById('modalLogin').classList.add('oculto');
}

document
  .getElementById('btnConfirmarLogin')
  .addEventListener('click', async () => {
    const usuario = document.getElementById('loginUsuario').value.trim();
    const senha = document.getElementById('loginSenha').value;

    document.getElementById('erroUsuario').textContent = '';
    document.getElementById('erroSenha').textContent = '';
    document.getElementById('erroLogin').textContent = '';

    let temErro = false;

    // Validação estrita conforme especificação
    if (!usuario || usuario.length < 3) {
      document.getElementById('erroUsuario').textContent =
        'nome_usuario menor que 3 caracteres ou vazio';
      temErro = true;
    }

    if (!senha) {
      document.getElementById('erroSenha').textContent = 'Senha obrigatória';
      temErro = true;
    }

    if (temErro) return;

    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha }),
    });

    if (!resp.ok) {
      document.getElementById('erroLogin').textContent =
        'Usuário não encontrado ou senha incorreta';
      return;
    }

    usuarioAtual = await resp.json();
    fecharModalLogin();
    atualizarHeaderLogado();
  });

function atualizarHeaderLogado() {
  document.getElementById('nomeUsuario').textContent =
    '@' + usuarioAtual.usuario;

  if (usuarioAtual.foto_perfil) {
    document.getElementById(
      'fotoPerfil',
    ).src = `/uploads/${usuarioAtual.foto_perfil}`;
  }

  const btnPerfil = document.getElementById('btnVerPerfil');
  btnPerfil.disabled = usuarioAtual.tipo !== 'fotografo';
  document.getElementById('btnLogin').textContent = 'Logout';

  // Recarrega galeria exibindo as fotos curtidas pelo usuário logado em vermelho
  carregarGaleria();
}

// --- 4. BUSCA ---
function executarBusca() {
  const termo = document
    .getElementById('inputBusca')
    .value.trim()
    .replace('@', '');
  carregarGaleria(termo);
}

document.getElementById('inputBusca').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    executarBusca();
  }
});

const iconeLupa = document.querySelector('.icone-lupa');
if (iconeLupa) {
  iconeLupa.addEventListener('click', executarBusca);
}

// --- 5. PAINEL DE PERFIL ---
document.getElementById('btnVerPerfil').addEventListener('click', async () => {
  const resp = await fetch(`/api/perfil/${usuarioAtual.id}`);
  const dados = await resp.json();

  document.getElementById('totalCurtidas').textContent = dados.totalCurtidas;
  document.getElementById('totalPublicacoes').textContent =
    dados.totalPublicacoes;
  document.getElementById('listaPublicacoesPerfil').innerHTML =
    dados.publicacoes
      .map(
        (p) => `
    <div class="item-perfil">
      <span>${p.titulo}</span>
      <img class="lixeira" data-id="${p.id}" src="assets/lixeira.svg" />
    </div>
  `,
      )
      .join('');

  document.querySelectorAll('.lixeira').forEach((icone) => {
    icone.addEventListener('click', async () => {
      await fetch(`/api/publicacoes/${icone.dataset.id}`, { method: 'DELETE' });
      document.getElementById('btnVerPerfil').click();
      carregarGaleria();
    });
  });

  document.getElementById('painelPerfil').classList.remove('oculto');
});

document.getElementById('fecharPainel').addEventListener('click', () => {
  document.getElementById('painelPerfil').classList.add('oculto');
});

// --- 6. CADASTRO DE NOVA PUBLICAÇÃO (Com validações individuais) ---
document
  .getElementById('formCadastro')
  .addEventListener('submit', async (e) => {
    e.preventDefault();

    const campoTitulo = document.getElementById('campoTitulo');
    const campoLocal = document.getElementById('campoLocal');
    const campoImagem = document.getElementById('campoImagem');

    const erroTitulo = document.getElementById('erroTitulo');
    const erroLocal = document.getElementById('erroLocal');
    const erroImagem = document.getElementById('erroImagem');

    // Limpa erros anteriores
    erroTitulo.textContent = '';
    erroLocal.textContent = '';
    erroImagem.textContent = '';

    let temErro = false;

    // Validação do Título
    if (!campoTitulo.value.trim()) {
      erroTitulo.textContent = 'O título da imagem é obrigatório.';
      temErro = true;
    }

    // Validação do Local / Fonte
    if (!campoLocal.value.trim()) {
      erroLocal.textContent = 'A fonte de origem é obrigatória.';
      temErro = true;
    }

    // Validação da Imagem
    const arquivo = campoImagem.files[0];
    if (!arquivo) {
      erroImagem.textContent = 'Nenhum arquivo escolhido.';
      temErro = true;
    } else {
      const extensoesValidas = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const extensao = arquivo.name.split('.').pop().toLowerCase();
      if (!extensoesValidas.includes(extensao)) {
        erroImagem.textContent =
          'Formato inválido (use JPG, JPEG, PNG, GIF ou WEBP).';
        temErro = true;
      }
    }

    if (temErro) return;

    // Envio para a API
    const formData = new FormData();
    formData.append('titulo', campoTitulo.value.trim());
    formData.append('local', campoLocal.value.trim());
    formData.append('fotografo_id', usuarioAtual.id);
    formData.append('imagem', arquivo);

    const resp = await fetch('/api/publicacoes', {
      method: 'POST',
      body: formData,
    });

    if (resp.ok) {
      e.target.reset();
      carregarGaleria();
      document.getElementById('btnVerPerfil').click(); // Recarrega os dados do perfil
    }
  });
