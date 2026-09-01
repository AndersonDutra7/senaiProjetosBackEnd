const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public')); // serve index.html, style.css, app.js, assets, uploads

const pool = new Pool({
  user: 'postgres',
  password: 'Senai1510',
  host: 'localhost',
  port: 5432,
  database: 'saep_vision',
});

const storage = multer.diskStorage({
  destination: 'public/uploads',
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

app.get('/api/fotos', async (req, res) => {
  const { fotografo, usuario_id } = req.query;
  const params = [];

  // Subquery no PostgreSQL para checar se o usuário logado curtiu a publicação
  let curtiuSubquery = 'FALSE AS curtiu';
  if (usuario_id) {
    params.push(usuario_id);
    curtiuSubquery = `EXISTS(
      SELECT 1 FROM curtidas cu 
      WHERE cu.publicacao_id = p.id AND cu.usuario_id = $${params.length}
    ) AS curtiu`;
  }

  let query = `
    SELECT p.id, p.titulo, p.local, p.imagem,
           u.nome AS fotografo, u.usuario AS fotografo_usuario,
           COUNT(c.id)::int AS curtidas,
           ${curtiuSubquery}
    FROM publicacoes p
    JOIN usuarios u ON u.id = p.fotografo_id
    LEFT JOIN curtidas c ON c.publicacao_id = p.id
  `;

  if (fotografo) {
    params.push(`%${fotografo}%`);
    query += ` WHERE u.usuario ILIKE $${params.length}`;
  }

  query += ' GROUP BY p.id, u.nome, u.usuario ORDER BY p.criado_em DESC';

  const { rows } = await pool.query(query, params);
  res.json(rows);
});

app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body;
  const { rows } = await pool.query(
    'SELECT id, nome, usuario, tipo, foto_perfil FROM usuarios WHERE usuario = $1 AND senha = $2',
    [usuario, senha],
  );
  if (rows.length === 0) {
    return res
      .status(401)
      .json({ erro: 'Usuário não encontrado ou senha incorreta' });
  }
  res.json(rows[0]);
});

app.post('/api/curtidas/:publicacaoId', async (req, res) => {
  const { publicacaoId } = req.params;
  const { usuario_id } = req.body;

  const existe = await pool.query(
    'SELECT id FROM curtidas WHERE publicacao_id = $1 AND usuario_id = $2',
    [publicacaoId, usuario_id],
  );

  if (existe.rows.length > 0) {
    await pool.query('DELETE FROM curtidas WHERE id = $1', [existe.rows[0].id]);
  } else {
    await pool.query(
      'INSERT INTO curtidas (publicacao_id, usuario_id) VALUES ($1, $2)',
      [publicacaoId, usuario_id],
    );
  }

  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM curtidas WHERE publicacao_id = $1',
    [publicacaoId],
  );
  res.json({ curtidas: rows[0].total, curtiu: existe.rows.length === 0 });
});

app.get('/api/perfil/:id', async (req, res) => {
  const { id } = req.params;
  const publicacoes = await pool.query(
    `
    SELECT p.id, p.titulo, p.local, p.imagem, COUNT(c.id)::int AS curtidas
    FROM publicacoes p LEFT JOIN curtidas c ON c.publicacao_id = p.id
    WHERE p.fotografo_id = $1 GROUP BY p.id ORDER BY p.criado_em DESC
  `,
    [id],
  );

  const totalCurtidas = publicacoes.rows.reduce(
    (acc, p) => acc + p.curtidas,
    0,
  );

  res.json({
    totalPublicacoes: publicacoes.rows.length,
    totalCurtidas,
    publicacoes: publicacoes.rows,
  });
});

app.post('/api/publicacoes', upload.single('imagem'), async (req, res) => {
  const { titulo, local, fotografo_id } = req.body;
  if (!req.file) return res.status(400).json({ erro: 'Imagem obrigatória' });

  const { rows } = await pool.query(
    'INSERT INTO publicacoes (titulo, local, imagem, fotografo_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [titulo, local, req.file.filename, fotografo_id],
  );
  res.json(rows[0]);
});

app.delete('/api/publicacoes/:id', async (req, res) => {
  await pool.query('DELETE FROM publicacoes WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

app.listen(3000, () =>
  console.log('Servidor rodando em http://localhost:3000'),
);
