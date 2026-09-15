const router = require('express').Router();
const pool = require('../db');

function formatarData(data) {
  const d = new Date(data);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${hh}:${mm} - ${dd}/${mo}/${yy}`;
}

router.get('/', async (req, res) => {
  try {
    const { tipo, usuario_id, all, viewer_id } = req.query;
    const limit = 4;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // monta filtros dinamicamente
    const condicoes = [];
    const params = [];

    if (tipo) {
      params.push(tipo);
      condicoes.push(`a.tipo_atividade = $${params.length}`);
    }
    if (usuario_id) {
      params.push(usuario_id);
      condicoes.push(`a.usuario_id = $${params.length}`);
    }
    const whereClause = condicoes.length
      ? `WHERE ${condicoes.join(' AND ')}`
      : '';

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM tb_atividade a ${whereClause}`,
      params,
    );
    const total = parseInt(totalResult.rows[0].count);

    // se viewer_id vier, calcula se ESSE usuário curtiu cada atividade
    const viewerParamIndex = params.length + 1;
    const curtidoSelect = viewer_id
      ? `EXISTS(SELECT 1 FROM tb_curtida c2 WHERE c2.atividade_id = a.id AND c2.usuario_id = $${viewerParamIndex}) AS curtido_pelo_usuario`
      : `false AS curtido_pelo_usuario`;
    const queryParams = viewer_id ? [...params, viewer_id] : [...params];

    let paginacaoSQL = '';
    if (all !== 'true') {
      queryParams.push(limit, offset);
      paginacaoSQL = `LIMIT $${queryParams.length - 1} OFFSET $${
        queryParams.length
      }`;
    }

    const query = `
      SELECT 
        a.id, a.tipo_atividade, a.distancia_percorrida, a.duracao_atividade,
        a.quantidade_calorias, a.createdat, a.usuario_id,
        u.nome AS usuario_nome, u.foto AS usuario_foto,
        (SELECT COUNT(*) FROM tb_curtida c WHERE c.atividade_id = a.id) AS total_curtidas,
        (SELECT COUNT(*) FROM tb_comentario co WHERE co.atividade_id = a.id) AS total_comentarios,
        ${curtidoSelect}
      FROM tb_atividade a
      JOIN tb_usuarios u ON u.id = a.usuario_id
      ${whereClause}
      ORDER BY a.createdat DESC
      ${paginacaoSQL}
    `;
    const result = await pool.query(query, queryParams);

    const atividades = result.rows.map((a) => ({
      ...a,
      data_formatada: formatarData(a.createdat),
    }));

    res.json({ page, totalPages: Math.ceil(total / limit), total, atividades });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar atividades' });
  }
});

router.post('/', async (req, res) => {
  const { tipo_atividade, distancia_percorrida, duracao_atividade, usuario_id } = req.body;

  const tiposValidos = ['corrida', 'caminhada', 'trilha'];
  if (!tipo_atividade || !tiposValidos.includes(tipo_atividade)) {
    return res.status(400).json({ erro: 'Campo obrigatório', campo: 'tipo_atividade' });
  }
  if (!distancia_percorrida || isNaN(distancia_percorrida)) {
    return res.status(400).json({ erro: 'Campo obrigatório', campo: 'distancia_percorrida' });
  }
  if (!duracao_atividade || isNaN(duracao_atividade)) {
    return res.status(400).json({ erro: 'Campo obrigatório', campo: 'duracao_atividade' });
  }
  if (!usuario_id) {
    return res.status(400).json({ erro: 'usuario_id é obrigatório' });
  }

  try {
    // calorias estimadas de forma simples (não há regra explícita na prova pra isso)
    const quantidade_calorias = Math.round(distancia_percorrida * 0.06);

    const result = await pool.query(
      `INSERT INTO tb_atividade (tipo_atividade, distancia_percorrida, duracao_atividade, quantidade_calorias, usuario_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tipo_atividade, distancia_percorrida, duracao_atividade, quantidade_calorias, usuario_id]
    );

    res.status(201).json({ atividade: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar atividade' });
  }
});

module.exports = router;
