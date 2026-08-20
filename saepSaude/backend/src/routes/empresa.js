const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /empresa — nome, logo e totais gerais para o componente Perfil
// (quando não há usuário logado, os totais são da empresa como um todo)
router.get('/empresa', async (req, res) => {
  try {
    const empresaResult = await pool.query('SELECT nome, logo_url FROM empresa LIMIT 1');
    const totaisResult = await pool.query(
      `SELECT COUNT(*)::int AS total_atividades, COALESCE(SUM(calorias), 0)::int AS total_calorias
       FROM atividades`
    );

    const empresa = empresaResult.rows[0] || { nome: 'SAEPSaúde', logo_url: null };
    const totais = totaisResult.rows[0];

    res.json({
      nome: empresa.nome,
      logo_url: empresa.logo_url,
      total_atividades: totais.total_atividades,
      total_calorias: totais.total_calorias,
    });
  } catch (err) {
    res.status(500).json({ erro: 'Não foi possível carregar os dados da empresa.' });
  }
});

module.exports = router;
