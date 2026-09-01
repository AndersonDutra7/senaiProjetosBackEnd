-- schema.sql

-- 1. Usuários: comuns ou fotógrafos, todos fazem login
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) UNIQUE NOT NULL,
  senha VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('comum', 'fotografo')),
  foto_perfil VARCHAR(255)
);

-- 2. Publicações: só fotógrafos criam
CREATE TABLE publicacoes (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  local VARCHAR(100) NOT NULL,
  imagem VARCHAR(255) NOT NULL,
  fotografo_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Curtidas: comuns e fotógrafos podem curtir; máx. 1 curtida por publicação/usuário
CREATE TABLE curtidas (
  id SERIAL PRIMARY KEY,
  publicacao_id INTEGER NOT NULL REFERENCES publicacoes(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE (publicacao_id, usuario_id)
);