const express = require('express');
const pool = require('../db');
const { calcularCalorias, formatarAtividade } = require('../utils');

const router = express.Router();

const TIPOS_VALIDOS = ['corrida', 'caminhada', 'trilha'];
const POR_PAGINA = 4;

// GET /atividades?tipo=corrida&page=1&usuario_id=3
// Lista as atividades mais recentes primeiro, com paginação de 4 por página,
// filtro opcional por tipo e indicação de "curtido_por_mim" quando um
// usuario_id (usuário logado) é informado.
router.get('/atividades', async (req, res) => {
  const { tipo, usuario_id } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * POR_PAGINA;

  if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ erro: 'tipo_invalido' });
  }

  try {
    const params = [];
    let whereClause = '';
    if (tipo) {
      params.push(tipo);
      whereClause = `WHERE a.tipo = $${params.length}`;
    }

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM atividades a ${whereClause}`,
      params
    );
    const total = totalResult.rows[0].total;

    params.push(usuario_id || null);
    const usuarioLogadoIdx = params.length;
    params.push(POR_PAGINA, offset);

    const query = `
      SELECT
        a.id, a.tipo, a.distancia_metros, a.duracao_minutos, a.calorias, a.criado_em,
        u.id AS usuario_id, u.nome AS usuario_nome, u.foto_url AS usuario_foto,
        COUNT(DISTINCT c.id) AS total_curtidas,
        COUNT(DISTINCT cm.id) AS total_comentarios,
        BOOL_OR(c.usuario_id = $${usuarioLogadoIdx}) AS curtido_por_mim
      FROM atividades a
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN curtidas c ON c.atividade_id = a.id
      LEFT JOIN comentarios cm ON cm.atividade_id = a.id
      ${whereClause}
      GROUP BY a.id, u.id
      ORDER BY a.criado_em DESC, a.id DESC
      LIMIT $${usuarioLogadoIdx + 1} OFFSET $${usuarioLogadoIdx + 2}
    `;

    const result = await pool.query(query, params);

    res.json({
      pagina: page,
      total_paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
      total_atividades: total,
      atividades: result.rows.map(formatarAtividade),
    });
  } catch (err) {
    res.status(500).json({ erro: 'Não foi possível carregar as atividades.' });
  }
});

// GET /atividades/:id/comentarios — Busca os comentários de uma atividade específica
router.get('/atividades/:id/comentarios', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
         c.id,
         c.texto,
         c.criado_em,
         u.id AS usuario_id,
         u.nome AS usuario_nome,
         u.foto_url AS usuario_foto
       FROM comentarios c
       JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.atividade_id = $1
       ORDER BY c.criado_em ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Não foi possível carregar os comentários.' });
  }
});

// POST /atividades — cadastra uma nova atividade para o usuário logado
router.post('/atividades', async (req, res) => {
  const { usuario_id, tipo, distancia_metros, duracao_minutos } = req.body;

  const camposFaltando = [];
  if (!usuario_id) camposFaltando.push('usuario_id');
  if (!tipo) camposFaltando.push('tipo');
  if (!distancia_metros) camposFaltando.push('distancia_metros');
  if (!duracao_minutos) camposFaltando.push('duracao_minutos');

  if (camposFaltando.length > 0) {
    return res.status(400).json({ erro: 'campo_obrigatorio', campos: camposFaltando });
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ erro: 'tipo_invalido' });
  }

  try {
    const calorias = calcularCalorias(tipo, Number(distancia_metros));

    const insertResult = await pool.query(
      `INSERT INTO atividades (usuario_id, tipo, distancia_metros, duracao_minutos, calorias)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, usuario_id, tipo, distancia_metros, duracao_minutos, calorias, criado_em`,
      [usuario_id, tipo, distancia_metros, duracao_minutos, calorias]
    );

    const usuarioResult = await pool.query(
      'SELECT id, nome, foto_url FROM usuarios WHERE id = $1',
      [usuario_id]
    );

    const nova = insertResult.rows[0];
    const usuario = usuarioResult.rows[0];

    res.status(201).json(
      formatarAtividade({
        ...nova,
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        usuario_foto: usuario.foto_url,
        total_curtidas: 0,
        total_comentarios: 0,
        curtido_por_mim: false,
      })
    );
  } catch (err) {
    res.status(500).json({ erro: 'Não foi possível salvar a atividade.' });
  }
});

// POST /atividades/:id/curtir — alterna curtir/descurtir (toggle)
router.post('/atividades/:id/curtir', async (req, res) => {
  const { id } = req.params;
  const { usuario_id } = req.body;

  if (!usuario_id) {
    return res.status(400).json({ erro: 'usuario_id_obrigatorio' });
  }

  try {
    const existente = await pool.query(
      'SELECT id FROM curtidas WHERE atividade_id = $1 AND usuario_id = $2',
      [id, usuario_id]
    );

    let curtido;
    if (existente.rows.length > 0) {
      await pool.query('DELETE FROM curtidas WHERE id = $1', [existente.rows[0].id]);
      curtido = false;
    } else {
      await pool.query(
        'INSERT INTO curtidas (atividade_id, usuario_id) VALUES ($1, $2)',
        [id, usuario_id]
      );
      curtido = true;
    }

    const totalResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM curtidas WHERE atividade_id = $1',
      [id]
    );

    res.json({ curtido, total_curtidas: totalResult.rows[0].total });
  } catch (err) {
    res.status(500).json({ erro: 'Não foi possível registrar a curtida.' });
  }
});

// POST /atividades/:id/comentarios — adiciona um comentário
router.post('/atividades/:id/comentarios', async (req, res) => {
  const { id } = req.params;
  const { usuario_id, texto } = req.body;

  if (!usuario_id) {
    return res.status(400).json({ erro: 'usuario_id_obrigatorio' });
  }

  if (!texto || texto.trim().length <= 2) {
    return res.status(400).json({ erro: 'comentario_vazio' });
  }

  try {
    await pool.query(
      'INSERT INTO comentarios (atividade_id, usuario_id, texto) VALUES ($1, $2, $3)',
      [id, usuario_id, texto.trim()]
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM comentarios WHERE atividade_id = $1',
      [id]
    );

    res.status(201).json({ total_comentarios: totalResult.rows[0].total });
  } catch (err) {
    res.status(500).json({ erro: 'Não foi possível salvar o comentário.' });
  }
});

module.exports = router;
