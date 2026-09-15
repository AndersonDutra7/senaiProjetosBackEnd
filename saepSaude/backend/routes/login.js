  const router = require('express').Router();
  const pool = require('../db');

  router.post('/', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'email ou senha obrigatório' });
    }

    try {
      const result = await pool.query(
        'SELECT id, nome, email, foto, tipo FROM tb_usuarios WHERE email = $1 AND senha = $2',
        [email, senha]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ erro: 'email ou senha incorreta' });
      }

      res.json({ usuario: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao realizar login' });
    }
  });

  module.exports = router;