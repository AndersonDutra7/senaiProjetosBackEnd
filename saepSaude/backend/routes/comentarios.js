const router = require('express').Router();
const pool = require('../db');

router.post('/', async (req, res) => {
  const { usuario_id, atividade_id, texto } = req.body;

  if (!texto || texto.trim().length <= 2) {
    return res
      .status(400)
      .json({ erro: 'não é possível enviar um comentário vazio' });
  }
  if (!usuario_id || !atividade_id) {
    return res
      .status(400)
      .json({ erro: 'usuario_id e atividade_id são obrigatórios' });
  }

  try {
    await pool.query(
      'INSERT INTO tb_comentario (usuario_id, atividade_id, texto) VALUES ($1, $2, $3)',
      [usuario_id, atividade_id, texto.trim()],
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM tb_comentario WHERE atividade_id = $1',
      [atividade_id],
    );

    res.json({ total: parseInt(totalResult.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao enviar comentário' });
  }
});

module.exports = router;
