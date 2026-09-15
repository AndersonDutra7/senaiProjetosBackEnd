require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const empresaRoutes = require('./routes/empresa');
const atividadesRoutes = require('./routes/atividades');
const loginRoutes = require('./routes/login');
const curtidasRoutes = require('./routes/curtidas');
const comentariosRoutes = require('./routes/comentarios');

app.use('/curtidas', curtidasRoutes);
app.use('/comentarios', comentariosRoutes);

app.use('/empresa', empresaRoutes);
app.use('/atividades', atividadesRoutes);
app.use('/login', loginRoutes);




// Rota de teste (Etapa 3.3)
app.get('/status', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'conectado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'erro', database: 'desconectado' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
