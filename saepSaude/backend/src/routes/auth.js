const express = require('express');
const pool = require('../db');

const router = express.Router();

// POST /login — valida credenciais e retorna o perfil do usuário logado
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'email_ou_senha_obrigatorio' });
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = result.rows[0];

    if (!usuario || usuario.senha !== senha) {
      return res.status(401).json({ erro: 'email_ou_senha_incorreta' });
    }

    const totaisResult = await pool.query(
      `SELECT COUNT(*)::int AS total_atividades, COALESCE(SUM(calorias), 0)::int AS total_calorias
       FROM atividades WHERE usuario_id = $1`,
      [usuario.id]
    );

    res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      foto_url: usuario.foto_url,
      total_atividades: totaisResult.rows[0].total_atividades,
      total_calorias: totaisResult.rows[0].total_calorias,
    });
  } catch (err) {
    res.status(500).json({ erro: 'Não foi possível validar o login.' });
  }
});

module.exports = router;
