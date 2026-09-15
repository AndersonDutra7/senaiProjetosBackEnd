const router = require('express').Router();
const pool = require('../db');

router.post('/', async (req, res) => {
  const { usuario_id, atividade_id } = req.body;

  if (!usuario_id || !atividade_id) {
    return res
      .status(400)
      .json({ erro: 'usuario_id e atividade_id são obrigatórios' });
  }

  try {
    const existe = await pool.query(
      'SELECT id FROM tb_curtida WHERE usuario_id = $1 AND atividade_id = $2',
      [usuario_id, atividade_id],
    );

    let curtido;
    if (existe.rows.length > 0) {
      // já curtiu -> descurtir
      await pool.query('DELETE FROM tb_curtida WHERE id = $1', [
        existe.rows[0].id,
      ]);
      curtido = false;
    } else {
      // não curtiu -> curtir
      await pool.query(
        'INSERT INTO tb_curtida (usuario_id, atividade_id) VALUES ($1, $2)',
        [usuario_id, atividade_id],
      );
      curtido = true;
    }

    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM tb_curtida WHERE atividade_id = $1',
      [atividade_id],
    );

    res.json({ curtido, total: parseInt(totalResult.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao curtir/descurtir atividade' });
  }
});

module.exports = router;
