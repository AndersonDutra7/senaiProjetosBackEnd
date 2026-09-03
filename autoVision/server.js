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
  database: 'autovision',
});

const storage = multer.diskStorage({
  destination: 'public/uploads',
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

app.get('/api/anuncios', async (req, res) => {
  const { vendedor, usuario_id } = req.query;
  const params = [];

  // Subquery no PostgreSQL para checar se o usuário logado já registrou interesse
  let interessouSubquery = 'FALSE AS interessou';
  if (usuario_id) {
    params.push(usuario_id);
    interessouSubquery = `EXISTS(
      SELECT 1 FROM interesses i 
      WHERE i.anuncio_id = a.id AND i.usuario_id = $${params.length}
    ) AS interessou`;
  }

  let query = `
    SELECT a.id, a.titulo, a.local, a.preco, a.imagem,
            u.nome AS vendedor, u.usuario AS vendedor_usuario, u.telefone AS vendedor_telefone,
            COUNT(i.id)::int AS interesses,
            ${interessouSubquery}
    FROM anuncios a
    JOIN usuarios u ON u.id = a.vendedor_id
    LEFT JOIN interesses i ON i.anuncio_id = a.id
  `;

  if (vendedor) {
    params.push(`%${vendedor}%`);
    query += ` WHERE u.usuario ILIKE $${params.length}`;
  }

  query +=
    ' GROUP BY a.id, u.nome, u.usuario, u.telefone ORDER BY a.criado_em DESC';

  const { rows } = await pool.query(query, params);
  res.json(rows);
});

app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body;
  const { rows } = await pool.query(
    'SELECT id, nome, usuario, tipo, telefone, foto_perfil FROM usuarios WHERE usuario = $1 AND senha = $2',
    [usuario, senha],
  );
  if (rows.length === 0) {
    return res
      .status(401)
      .json({ erro: 'Usuário não encontrado ou senha incorreta' });
  }
  res.json(rows[0]);
});

app.post('/api/interesses/:anuncioId', async (req, res) => {
  const { anuncioId } = req.params;
  const { usuario_id } = req.body;

  const existe = await pool.query(
    'SELECT id FROM interesses WHERE anuncio_id = $1 AND usuario_id = $2',
    [anuncioId, usuario_id],
  );

  if (existe.rows.length > 0) {
    await pool.query('DELETE FROM interesses WHERE id = $1', [
      existe.rows[0].id,
    ]);
  } else {
    await pool.query(
      'INSERT INTO interesses (anuncio_id, usuario_id) VALUES ($1, $2)',
      [anuncioId, usuario_id],
    );
  }

  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM interesses WHERE anuncio_id = $1',
    [anuncioId],
  );
  res.json({ interesses: rows[0].total, interessou: existe.rows.length === 0 });
});

app.get('/api/perfil/:id', async (req, res) => {
  const { id } = req.params;
  const anuncios = await pool.query(
    `
    SELECT a.id, a.titulo, a.local, a.preco, a.imagem, COUNT(i.id)::int AS interesses
    FROM anuncios a LEFT JOIN interesses i ON i.anuncio_id = a.id
    WHERE a.vendedor_id = $1 GROUP BY a.id ORDER BY a.criado_em DESC
  `,
    [id],
  );

  const totalInteresses = anuncios.rows.reduce(
    (acc, a) => acc + a.interesses,
    0,
  );

  res.json({
    totalAnuncios: anuncios.rows.length,
    totalInteresses,
    anuncios: anuncios.rows,
  });
});

app.post('/api/anuncios', upload.single('imagem'), async (req, res) => {
  const { titulo, local, preco, vendedor_id } = req.body;
  if (!req.file) return res.status(400).json({ erro: 'Imagem obrigatória' });

  const { rows } = await pool.query(
    'INSERT INTO anuncios (titulo, local, preco, imagem, vendedor_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [titulo, local, preco, req.file.filename, vendedor_id],
  );
  res.json(rows[0]);
});

app.delete('/api/anuncios/:id', async (req, res) => {
  await pool.query('DELETE FROM anuncios WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

app.listen(3000, () =>
  console.log('Servidor rodando em http://localhost:3000'),
);
