const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /status — confirma que o servidor está de pé e conectado ao banco
router.get('/status', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'conectado' });
  } catch (err) {
    res.status(500).json({ status: 'erro', database: 'desconectado', detalhe: err.message });
  }
});

module.exports = router;
