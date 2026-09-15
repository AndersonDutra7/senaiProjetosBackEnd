-- ============================
-- SAEPSaude - schema.sql
-- ============================

CREATE TABLE tb_usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  nome_usuario VARCHAR(150) NOT NULL,
  senha VARCHAR(100) NOT NULL,
  foto VARCHAR(255),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('funcionario', 'cliente'))
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TABLE tb_atividade (
  id SERIAL PRIMARY KEY,
  tipo_atividade VARCHAR(20) NOT NULL CHECK (tipo_atividade IN ('corrida', 'caminhada', 'trilha')),
  distancia_percorrida INTEGER NOT NULL,   -- em metros
  duracao_atividade INTEGER NOT NULL,      -- em minutos
  quantidade_calorias INTEGER NOT NULL,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW(),
  usuario_id INTEGER NOT NULL REFERENCES tb_usuarios(id)
);

CREATE TABLE tb_curtida (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES tb_usuarios(id),
  atividade_id INTEGER NOT NULL REFERENCES tb_atividade(id),
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, atividade_id)  -- garante "1 like por usuário/atividade"
);

CREATE TABLE tb_comentario (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES tb_usuarios(id),
  atividade_id INTEGER NOT NULL REFERENCES tb_atividade(id),
  texto VARCHAR(500) NOT NULL,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);