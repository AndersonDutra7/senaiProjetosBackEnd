const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Pool } = require('pg');

// ---------- configuração (ajuste conforme o ambiente) ----------
const PORT = process.env.PORT || 3000;
const pool = new Pool({
  host: process.env.DBHOST || 'localhost',
  port: Number(process.env.DBPORT || 5432),
  user: process.env.DBUSER || 'postgres',
  password: process.env.DBPASSWORD || 'Senai1510',
  database: process.env.DBDATABASE || 'stream_flix',
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- upload de capas ----------
// Todas as imagens (capas e fotos de perfil) ficam em public/imagens; o banco guarda só o nome do arquivo.
const pastaCapas = path.join(__dirname, 'public', 'imagens_filmes');
fs.mkdirSync(pastaCapas, { recursive: true });

const EXT_OK = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, pastaCapas),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, EXT_OK.includes(ext));
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ---------- sessão simples em memória (token) ----------
const sessoes = new Map(); // token -> id_usuario
function novoToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function autenticar(req, res, next) {
  const token = req.headers['x-token'];
  const id = token && sessoes.get(token);
  if (!id) return res.status(401).json({ erro: 'Não autenticado' });
  const r = await pool.query(
    'SELECT id_usuario, nome, nome_usuario, imagem_usuario, tipo FROM tb_usuario WHERE id_usuario = $1',
    [id]
  );
  if (!r.rows.length) return res.status(401).json({ erro: 'Sessão inválida' });
  req.usuario = r.rows[0];
  next();
}

function soAdmin(req, res, next) {
  if (req.usuario.tipo !== 'administrador')
    return res.status(403).json({ erro: 'Apenas administradores' });
  next();
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  });

// ---------- LOGIN / LOGOUT ----------
app.post('/api/login', wrap(async (req, res) => {
  const { nome_usuario, senha } = req.body || {};
  if (!nome_usuario || String(nome_usuario).trim().length < 3 || /\s/.test(nome_usuario))
    return res.status(400).json({ erro: 'Informe um nome_usuario com no mínimo 3 caracteres.' });
  if (!senha) return res.status(400).json({ erro: 'Informe a senha.' });

  const r = await pool.query(
    `SELECT id_usuario, nome, nome_usuario, imagem_usuario, tipo
       FROM tb_usuario WHERE nome_usuario = $1 AND senha = $2`,
    [nome_usuario.trim(), senha]
  );
  if (!r.rows.length)
    return res.status(401).json({ erro: 'Usuário não encontrado ou senha incorreta' });

  const token = novoToken();
  sessoes.set(token, r.rows[0].id_usuario);
  res.json({ token, usuario: r.rows[0] });
}));

app.post('/api/logout', (req, res) => {
  sessoes.delete(req.headers['x-token']);
  res.json({ ok: true });
});

app.get('/api/me', autenticar, (req, res) => res.json(req.usuario));

// ---------- FILMES ----------
// Lista filmes. Visitante: só catálogo. Logado: marca curtido/na lista.
// ?busca=termo  ?lista=1 (só Minha Lista)  ?meus=1 (só filmes do admin logado)
async function usuarioOpcional(req) {
  const token = req.headers['x-token'];
  const id = token && sessoes.get(token);
  return id || null;
}

app.get('/api/filmes', wrap(async (req, res) => {
  const idUsuario = await usuarioOpcional(req);
  const { busca, lista, meus } = req.query;

  const params = [idUsuario];
  const where = [];

  if (busca) {
    params.push('%' + busca + '%');
    where.push(`f.titulo_filme ILIKE $${params.length}`);
  }
  if (lista === '1') {
    if (!idUsuario) return res.status(401).json({ erro: 'Não autenticado' });
    where.push(`EXISTS (SELECT 1 FROM tb_minha_lista ml WHERE ml.id_filme = f.id_filme AND ml.id_usuario = $1)`);
  }
  if (meus === '1') {
    if (!idUsuario) return res.status(401).json({ erro: 'Não autenticado' });
    where.push('f.id_usuario = $1');
  }

  const sql = `
    SELECT f.id_filme, f.titulo_filme, f.genero, f.url_capa,
           u.nome_usuario AS cadastrado_por,
           (SELECT COUNT(*) FROM tb_curtida c WHERE c.id_filme = f.id_filme)::int AS curtidas,
           CASE WHEN $1::int IS NULL THEN false ELSE EXISTS
             (SELECT 1 FROM tb_curtida c WHERE c.id_filme = f.id_filme AND c.id_usuario = $1) END AS curtido,
           CASE WHEN $1::int IS NULL THEN false ELSE EXISTS
             (SELECT 1 FROM tb_minha_lista m WHERE m.id_filme = f.id_filme AND m.id_usuario = $1) END AS na_lista
      FROM tb_filme f
      JOIN tb_usuario u ON u.id_usuario = f.id_usuario
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY f.id_filme`;
  const r = await pool.query(sql, params);
  res.json(r.rows);
}));

// Cadastro de filme (admin)
app.post('/api/filmes', autenticar, soAdmin, (req, res) => {
  upload.single('capa')(req, res, async (err) => {
    try {
      const erros = {};
      const titulo = (req.body.titulo_filme || '').trim();
      const genero = (req.body.genero || '').trim();
      if (err) erros.capa = 'Arquivo inválido ou muito grande.';
      if (!titulo) erros.titulo_filme = 'Informe o título do filme.';
      if (!genero) erros.genero = 'Informe o gênero.';
      if (!req.file && !erros.capa)
        erros.capa = 'Selecione uma imagem JPG, JPEG, PNG, GIF ou WEBP.';

      if (Object.keys(erros).length) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ erros });
      }

      const url = req.file.filename;
      const r = await pool.query(
        `INSERT INTO tb_filme (titulo_filme, genero, id_usuario, url_capa)
         VALUES ($1,$2,$3,$4) RETURNING id_filme`,
        [titulo, genero, req.usuario.id_usuario, url]
      );
      res.status(201).json({ id_filme: r.rows[0].id_filme });
    } catch (e) {
      console.error(e);
      res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  });
});

// Exclusão de filme (admin dono) - curtidas e lista saem por ON DELETE CASCADE
app.delete('/api/filmes/:id', autenticar, soAdmin, wrap(async (req, res) => {
  const r = await pool.query(
    'DELETE FROM tb_filme WHERE id_filme = $1 AND id_usuario = $2 RETURNING url_capa',
    [req.params.id, req.usuario.id_usuario]
  );
  if (!r.rows.length) return res.status(404).json({ erro: 'Filme não encontrado' });

  // remove o arquivo apenas se foi enviado por upload (não apaga capas de exemplo)
  const url = r.rows[0].url_capa;
  const emUso = await pool.query('SELECT 1 FROM tb_filme WHERE url_capa = $1 LIMIT 1', [url]);
  if (!emUso.rows.length && /^\d+-\d+\.[a-z]+$/.test(url))
    fs.unlink(path.join(pastaCapas, url), () => {});
  res.json({ ok: true });
}));

// ---------- CURTIR (alterna) ----------
app.post('/api/filmes/:id/curtir', autenticar, wrap(async (req, res) => {
  const idFilme = Number(req.params.id);
  const existe = await pool.query('SELECT 1 FROM tb_filme WHERE id_filme = $1', [idFilme]);
  if (!existe.rows.length) return res.status(404).json({ erro: 'Filme não encontrado' });

  const del = await pool.query(
    'DELETE FROM tb_curtida WHERE id_usuario = $1 AND id_filme = $2',
    [req.usuario.id_usuario, idFilme]
  );
  let curtido = false;
  if (del.rowCount === 0) {
    await pool.query(
      'INSERT INTO tb_curtida (id_usuario, id_filme) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.usuario.id_usuario, idFilme]
    );
    curtido = true;
  }
  const c = await pool.query('SELECT COUNT(*)::int AS n FROM tb_curtida WHERE id_filme = $1', [idFilme]);
  res.json({ curtido, curtidas: c.rows[0].n });
}));

// ---------- MINHA LISTA (alterna) ----------
app.post('/api/filmes/:id/lista', autenticar, wrap(async (req, res) => {
  const idFilme = Number(req.params.id);
  const existe = await pool.query('SELECT 1 FROM tb_filme WHERE id_filme = $1', [idFilme]);
  if (!existe.rows.length) return res.status(404).json({ erro: 'Filme não encontrado' });

  const del = await pool.query(
    'DELETE FROM tb_minha_lista WHERE id_usuario = $1 AND id_filme = $2',
    [req.usuario.id_usuario, idFilme]
  );
  let naLista = false;
  if (del.rowCount === 0) {
    await pool.query(
      'INSERT INTO tb_minha_lista (id_usuario, id_filme) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.usuario.id_usuario, idFilme]
    );
    naLista = true;
  }
  res.json({ na_lista: naLista });
}));

// ---------- PERFIL DO ADMIN (totais do menu lateral) ----------
app.get('/api/perfil', autenticar, soAdmin, wrap(async (req, res) => {
  const id = req.usuario.id_usuario;
  const likes = await pool.query(
    `SELECT COUNT(*)::int AS n FROM tb_curtida c
       JOIN tb_filme f ON f.id_filme = c.id_filme WHERE f.id_usuario = $1`, [id]);
  const filmes = await pool.query(
    'SELECT COUNT(*)::int AS n FROM tb_filme WHERE id_usuario = $1', [id]);
  res.json({ likes: likes.rows[0].n, filmes: filmes.rows[0].n });
}));

app.listen(PORT, () => console.log(`StreamFlix rodando em http://localhost:${PORT}`));
