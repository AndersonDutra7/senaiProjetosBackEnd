const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS total_atividades,
        COALESCE(SUM(quantidade_calorias), 0) AS total_calorias
      FROM tb_atividade
    `);

    res.json({
      nome: 'SAEPSaúde',
      logo: 'SAEPSaude.png',
      total_atividades: parseInt(result.rows[0].total_atividades),
      total_calorias: parseInt(result.rows[0].total_calorias),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar dados da empresa' });
  }
});

module.exports = router;
