'use strict';
/**
 * StreamFlix — back-end (Express + PostgreSQL)
 * Todas as regras de autorização usam o usuário da SESSÃO, nunca um id vindo do front.
 * Todas as consultas são parametrizadas.
 */
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT || 3000);
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'Senai1510',
  database: process.env.PGDATABASE || 'stream_teste2',
});

const app = express();
app.use(express.json());
app.use(
  session({
    name: 'streamflix.sid',
    secret:
      process.env.SESSION_SECRET || 'streamflix-segredo-de-desenvolvimento',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
  }),
);
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------------------------------------------ helpers */
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  });

async function usuarioDaSessao(req) {
  if (!req.session.userId) return null;
  const { rows } = await pool.query(
    'SELECT id_usuario, nome, nome_usuario, imagem_usuario, tipo FROM tb_usuario WHERE id_usuario = $1',
    [req.session.userId],
  );
  return rows[0] || null;
}

function exigeLogin(req, res, next) {
  usuarioDaSessao(req)
    .then((u) => {
      if (!u)
        return res.status(401).json({ erro: 'Faça login para continuar.' });
      req.usuario = u;
      next();
    })
    .catch(() => res.status(500).json({ erro: 'Erro interno do servidor.' }));
}

function exigeAdmin(req, res, next) {
  exigeLogin(req, res, () => {
    if (req.usuario.tipo !== 'administrador')
      return res
        .status(403)
        .json({ erro: 'Apenas administradores podem executar esta ação.' });
    next();
  });
}

const paraUsuarioPublico = (u) => ({
  id: u.id_usuario,
  nome: u.nome,
  nome_usuario: u.nome_usuario,
  imagem: `imagens/perfil/${u.imagem_usuario || 'streamflix.png'}`,
  tipo: u.tipo,
});

/* ------------------------------------------------------------------ sessão */
app.get(
  '/api/sessao',
  wrap(async (req, res) => {
    const u = await usuarioDaSessao(req);
    res.json(
      u ? { logado: true, usuario: paraUsuarioPublico(u) } : { logado: false },
    );
  }),
);

app.post(
  '/api/login',
  wrap(async (req, res) => {
    const nomeUsuario = String(req.body.nome_usuario ?? '').trim();
    const senha = String(req.body.senha ?? '');
    const erros = {};
    if (nomeUsuario.length < 3 || /\s/.test(nomeUsuario))
      erros.nome_usuario =
        'Informe um nome_usuario com no mínimo 3 caracteres.';
    if (!senha) erros.senha = 'Informe a senha.';
    if (Object.keys(erros).length) return res.status(400).json({ erros });

    const { rows } = await pool.query(
      'SELECT id_usuario, nome, nome_usuario, imagem_usuario, tipo, senha FROM tb_usuario WHERE LOWER(nome_usuario) = LOWER($1)',
      [nomeUsuario],
    );
    const u = rows[0];
    if (!u || u.senha !== senha)
      return res
        .status(401)
        .json({ erro: 'Usuário não encontrado ou senha incorreta' });

    req.session.regenerate((err) => {
      if (err)
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
      req.session.userId = u.id_usuario;
      res.json({ usuario: paraUsuarioPublico(u) });
    });
  }),
);

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('streamflix.sid');
    res.json({ ok: true });
  });
});

/* ------------------------------------------------------------------ filmes */
const SQL_FILMES = `
  SELECT f.id_filme, f.titulo_filme, f.genero, f.url_capa, u.nome_usuario AS administrador,
         (SELECT COUNT(*) FROM tb_curtida c WHERE c.id_filme = f.id_filme)::int AS curtidas,
         EXISTS (SELECT 1 FROM tb_curtida c
                  WHERE c.id_filme = f.id_filme AND c.id_usuario = $1::int) AS curtido
    FROM tb_filme f
    JOIN tb_usuario u ON u.id_usuario = f.id_usuario`;

const mapFilme = (r) => {
  const capa = r.url_capa || '';
  const ehCaminho =
    capa.startsWith('uploads/') ||
    capa.startsWith('imagens/') ||
    /^https?:\/\//.test(capa);
  return {
    id: r.id_filme,
    titulo: r.titulo_filme,
    genero: r.genero,
    capa: ehCaminho ? capa : `imagens/capas/${capa}`,
    administrador: r.administrador,
    curtidas: r.curtidas,
    curtido: r.curtido,
  };
};

app.get(
  '/api/filmes',
  wrap(async (req, res) => {
    const logado = req.session.userId || null;
    const busca = req.query.administrador;

    if (busca !== undefined && busca !== '') {
      if (!logado)
        return res.status(401).json({ erro: 'Faça login para pesquisar.' });
      const nome = String(busca).trim().replace(/^@/, '');
      if (!/^[A-Za-z0-9_.-]{3,50}$/.test(nome))
        return res
          .status(400)
          .json({
            erro: 'Informe um nome de administrador válido (exemplo: bulma).',
          });

      const adm = await pool.query(
        `SELECT id_usuario FROM tb_usuario WHERE LOWER(nome_usuario) = LOWER($1) AND tipo = 'administrador'`,
        [nome],
      );
      if (!adm.rows.length)
        return res.status(404).json({ erro: 'Administrador não encontrado' });

      const { rows } = await pool.query(
        `${SQL_FILMES} WHERE f.id_usuario = $2 ORDER BY f.created_at DESC, f.id_filme DESC`,
        [logado, adm.rows[0].id_usuario],
      );
      return res.json({ filmes: rows.map(mapFilme) });
    }

    const { rows } = await pool.query(
      `${SQL_FILMES} ORDER BY f.created_at DESC, f.id_filme DESC`,
      [logado],
    );
    res.json({ filmes: rows.map(mapFilme) });
  }),
);

app.post(
  '/api/filmes/:id/curtir',
  exigeLogin,
  wrap(async (req, res) => {
    const idFilme = Number(req.params.id);
    if (!Number.isInteger(idFilme))
      return res.status(400).json({ erro: 'Filme inválido.' });
    const existe = await pool.query(
      'SELECT 1 FROM tb_filme WHERE id_filme = $1',
      [idFilme],
    );
    if (!existe.rows.length)
      return res.status(404).json({ erro: 'Filme não encontrado.' });

    // Alterna: remove a curtida do próprio usuário; se não havia, cria (no máximo 1 por filme).
    const removida = await pool.query(
      'DELETE FROM tb_curtida WHERE id_usuario = $1 AND id_filme = $2 RETURNING id_curtida',
      [req.usuario.id_usuario, idFilme],
    );
    let curtido = false;
    if (!removida.rowCount) {
      await pool.query(
        'INSERT INTO tb_curtida (id_usuario, id_filme) VALUES ($1, $2) ON CONFLICT (id_usuario, id_filme) DO NOTHING',
        [req.usuario.id_usuario, idFilme],
      );
      curtido = true;
    }
    const total = await pool.query(
      'SELECT COUNT(*)::int AS n FROM tb_curtida WHERE id_filme = $1',
      [idFilme],
    );
    res.json({ curtido, curtidas: total.rows[0].n });
  }),
);

/* ------------------------------------------------------------------ administrador */
app.get(
  '/api/perfil',
  exigeAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT (SELECT COUNT(*) FROM tb_filme WHERE id_usuario = $1)::int AS filmes,
              (SELECT COUNT(*) FROM tb_curtida c JOIN tb_filme f ON f.id_filme = c.id_filme
                WHERE f.id_usuario = $1)::int AS likes`,
      [req.usuario.id_usuario],
    );
    res.json(rows[0]);
  }),
);

app.get(
  '/api/meus-filmes',
  exigeAdmin,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id_filme, titulo_filme FROM tb_filme WHERE id_usuario = $1 ORDER BY created_at DESC, id_filme DESC',
      [req.usuario.id_usuario],
    );
    res.json({
      filmes: rows.map((r) => ({ id: r.id_filme, titulo: r.titulo_filme })),
    });
  }),
);

/* upload */
const EXT_OK = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const MIME_OK = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MSG_IMAGEM = 'Selecione uma imagem JPG, JPEG, PNG, GIF ou WEBP.';

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(
        null,
        `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      EXT_OK.has(path.extname(file.originalname).toLowerCase()) &&
      MIME_OK.has(file.mimetype);
    cb(null, ok); // arquivo recusado = req.file indefinido (tratado abaixo)
  },
});

function assinaturaValida(arquivo) {
  const b = Buffer.alloc(12);
  const fd = fs.openSync(arquivo, 'r');
  fs.readSync(fd, b, 0, 12, 0);
  fs.closeSync(fd);
  return (
    (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) || // jpeg
    b
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) || // png
    b.subarray(0, 4).toString('latin1') === 'GIF8' || // gif
    (b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP') // webp
  );
}

const apagaArquivo = (p) => p && fs.unlink(p, () => {});

app.post('/api/filmes', exigeAdmin, (req, res) => {
  upload.single('capa')(req, res, async (errUpload) => {
    try {
      const erros = {};
      const titulo = String(req.body?.titulo_filme ?? '').trim();
      const genero = String(req.body?.genero ?? '').trim();

      if (!titulo) erros.titulo_filme = 'Campo obrigatório.';
      else if (titulo.length > 150)
        erros.titulo_filme = 'Máximo de 150 caracteres.';
      if (!genero) erros.genero = 'Campo obrigatório.';
      else if (genero.length > 60) erros.genero = 'Máximo de 60 caracteres.';

      if (errUpload)
        erros.capa =
          errUpload.code === 'LIMIT_FILE_SIZE'
            ? 'A imagem deve ter no máximo 5 MB.'
            : MSG_IMAGEM;
      else if (!req.file)
        erros.capa =
          req.body?.tem_arquivo === '1' ? MSG_IMAGEM : 'Campo obrigatório.';
      else if (!assinaturaValida(req.file.path)) erros.capa = MSG_IMAGEM;

      if (Object.keys(erros).length) {
        apagaArquivo(req.file?.path);
        return res.status(400).json({ erros });
      }

      const { rows } = await pool.query(
        'INSERT INTO tb_filme (titulo_filme, genero, id_usuario, url_capa) VALUES ($1, $2, $3, $4) RETURNING id_filme',
        [
          titulo,
          genero,
          req.usuario.id_usuario,
          `uploads/${req.file.filename}`,
        ],
      );
      res.status(201).json({ id: rows[0].id_filme });
    } catch (e) {
      console.error(e);
      apagaArquivo(req.file?.path);
      res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
  });
});

app.delete(
  '/api/filmes/:id',
  exigeAdmin,
  wrap(async (req, res) => {
    const idFilme = Number(req.params.id);
    if (!Number.isInteger(idFilme))
      return res.status(400).json({ erro: 'Filme inválido.' });
    // Só exclui filmes do PRÓPRIO administrador; curtidas saem junto (ON DELETE CASCADE).
    const { rows } = await pool.query(
      'DELETE FROM tb_filme WHERE id_filme = $1 AND id_usuario = $2 RETURNING url_capa',
      [idFilme, req.usuario.id_usuario],
    );
    if (!rows.length)
      return res.status(404).json({ erro: 'Filme não encontrado.' });
    if (rows[0].url_capa.startsWith('uploads/'))
      apagaArquivo(path.join(UPLOAD_DIR, path.basename(rows[0].url_capa)));
    res.json({ ok: true });
  }),
);

app.use('/api', (req, res) =>
  res.status(404).json({ erro: 'Rota não encontrada.' }),
);

app.listen(PORT, () => console.log(`StreamFlix em http://localhost:${PORT}`));
