const { Client, Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { importarCSVs } = require('./utils');
require('dotenv').config();

async function init() {
  // Conecta no banco padrão 'postgres' apenas para criar o banco 'saepsaude'
  const rootClient = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await rootClient.connect();

    // Verifica se o banco já existe
    const res = await rootClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [process.env.DB_NAME]);
    
    if (res.rowCount === 0) {
      await rootClient.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log(`Banco de dados '${process.env.DB_NAME}' criado com sucesso!`);
    } else {
      console.log(`O banco de dados '${process.env.DB_NAME}' já existe.`);
    }
  } catch (err) {
    console.error('Erro ao criar o banco:', err.message);
  } finally {
    await rootClient.end();
  }

  // 2. Conecta no banco 'saepsaude' para rodar o schema.sql e importar os CSVs
  const dbPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    // Executa o schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await dbPool.query(sql);
    console.log('Tabelas criadas com sucesso!');

    // Chamada da função de importação dos arquivos
    await importarCSVs(dbPool);

  } catch (err) {
    console.error('Erro na estruturação/importação:', err.message);
  } finally {
    await dbPool.end();
  }
}

init();