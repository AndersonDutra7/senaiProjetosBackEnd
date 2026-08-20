const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Fator aproximado de kcal por km, por tipo de atividade
const FATOR_CALORIAS = {
  corrida: 65,
  caminhada: 40,
  trilha: 55,
};

// Função para calcular calorias
function calcularCalorias(tipo, distanciaMetros) {
  const fator = FATOR_CALORIAS[tipo] || 50;
  const km = distanciaMetros / 1000;
  return Math.round(km * fator);
}

// Função de formatação de data
function formatarAtividade(row) {
  const data = new Date(row.criado_em);
  const pad = (n) => String(n).padStart(2, '0');
  const dataFormatada = `${pad(data.getHours())}:${pad(
    data.getMinutes(),
  )} - ${pad(data.getDate())}/${pad(data.getMonth() + 1)}/${String(
    data.getFullYear(),
  ).slice(-2)}`;

  return {
    id: row.id,
    tipo: row.tipo,
    distancia_km: Number((row.distancia_metros / 1000).toFixed(2)),
    duracao_horas: Number((row.duracao_minutos / 60).toFixed(2)),
    calorias: row.calorias,
    data: dataFormatada,
    usuario: {
      id: row.usuario_id,
      nome: row.usuario_nome,
      foto_url: row.usuario_foto,
    },
    curtidas: Number(row.total_curtidas) || 0,
    comentarios: Number(row.total_comentarios) || 0,
    curtido_por_mim: row.curtido_por_mim === true,
  };
}

// Função para ler csv
async function lerLinhasCSV(caminhoArquivo) {
  const stream = fs.createReadStream(caminhoArquivo);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const linhas = [];

  for await (const linha of rl) {
    if (linha.trim()) {
      linhas.push(linha.trim());
    }
  }

  return linhas;
}

// Função importar dados do csv
async function importarCSVs(pool) {
  try {
    // 1. Importação de Usuários
    const caminhoUsuarios = path.join(__dirname, '../../database/usuarios.csv');
    if (fs.existsSync(caminhoUsuarios)) {
      const linhas = await lerLinhasCSV(caminhoUsuarios);
      linhas.shift(); // Remove o cabeçalho (id,nome,email,tipo_usuario,data_cadastro)

      for (const linha of linhas) {
        // Desestrutura EXATAMENTE na ordem do seu usuarios.csv
        const [id, nome, email, tipo_usuario, data_cadastro] = linha
          .split(',')
          .map((item) => item?.trim());

        await pool.query(
          `INSERT INTO usuarios (tipo, nome, email, senha, foto_url, criado_em)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
          [
            tipo_usuario, // $1 -> tipo ('funcionario' ou 'cliente')
            nome, // $2 -> nome
            email, // $3 -> email
            '123456', // $4 -> senha padrão
            null, // $5 -> foto_url
            data_cadastro || new Date(), // $6 -> criado_em
          ],
        );
      }
      console.log('Dados de usuarios.csv importados com sucesso!');
    }

    // 2. Importação de Atividades
    const caminhoAtividades = path.join(
      __dirname,
      '../../database/atividades.csv',
    );
    if (fs.existsSync(caminhoAtividades)) {
      const linhas = await lerLinhasCSV(caminhoAtividades);
      linhas.shift(); // Remove cabeçalho

      const tiposValidos = ['corrida', 'caminhada', 'trilha'];

      for (const linha of linhas) {
        const [
          id,
          usuario_id,
          tipo_atividade,
          distancia_km,
          duracao_min,
          data_atividade,
          descricao,
        ] = linha.split(',').map((item) => item?.trim());

        const tipoLower = tipo_atividade?.toLowerCase();
        const distMetros = Math.round(parseFloat(distancia_km || '0') * 1000);
        const durMinutos = parseInt(duracao_min, 10);

        // Pula linhas com tipos não permitidos pelo CHECK ou distância zero
        if (!tiposValidos.includes(tipoLower) || distMetros <= 0 || isNaN(durMinutos)) {
          continue;
        }

        const calorias = calcularCalorias(tipoLower, distMetros);

        await pool.query(
          `INSERT INTO atividades (usuario_id, tipo, distancia_metros, duracao_minutos, calorias, criado_em)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            parseInt(usuario_id, 10),
            tipoLower,
            distMetros,
            durMinutos,
            calorias,
            data_atividade || new Date(),
          ],
        );
      }
      console.log('Dados de atividades.csv importados!');
    }

    
  } catch (error) {
    console.error('Erro na importação:', error);
    throw error;
  }
}

module.exports = {
  calcularCalorias,
  formatarAtividade,
  lerLinhasCSV,
  importarCSVs,
};
