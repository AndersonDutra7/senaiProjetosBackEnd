-- schema.sql

-- 1. Usuários: somente vendedores fazem login e anunciam carros
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) UNIQUE NOT NULL,
  senha VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  foto_perfil VARCHAR(255)
);

-- 2. Anúncios: criados pelo vendedor logado
CREATE TABLE anuncios (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  local VARCHAR(100) NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  imagem VARCHAR(255) NOT NULL,
  vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Interesses: cliente não tem conta, então nome/contato vão direto no registro
CREATE TABLE interesses (
  id SERIAL PRIMARY KEY,
  anuncio_id INTEGER NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
  cliente_nome VARCHAR(100) NOT NULL,
  cliente_contato VARCHAR(100) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Mensagens: cliente entra em contato com o vendedor sobre um anúncio
CREATE TABLE mensagens (
  id SERIAL PRIMARY KEY,
  anuncio_id INTEGER NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
  cliente_nome VARCHAR(100) NOT NULL,
  cliente_contato VARCHAR(100) NOT NULL,
  mensagem TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);