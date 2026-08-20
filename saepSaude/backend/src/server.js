require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const statusRoutes = require('./routes/status');
const empresaRoutes = require('./routes/empresa');
const authRoutes = require('./routes/auth');
const atividadesRoutes = require('./routes/atividades');

const app = express();

app.use(cors());
app.use(express.json());

// Serve o frontend estático diretamente (opcional — facilita rodar tudo
// com um único comando durante o desenvolvimento/apresentação)
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

app.use(statusRoutes);
app.use(empresaRoutes);
app.use(authRoutes);
app.use(atividadesRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'rota_nao_encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor SAEPSaúde rodando em http://localhost:${PORT}`);
});
