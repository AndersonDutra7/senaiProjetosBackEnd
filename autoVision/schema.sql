-- 1. Usuários: clientes ou vendedores, todos fazem login
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) UNIQUE NOT NULL,
  senha VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cliente', 'vendedor')),
  telefone VARCHAR(20),
  foto_perfil VARCHAR(255)
);

-- 2. Anúncios: só vendedores criam
CREATE TABLE anuncios (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  local VARCHAR(100) NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  imagem VARCHAR(255) NOT NULL,
  vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Interesses: clientes e vendedores podem registrar; máx. 1 por anúncio/usuário
CREATE TABLE interesses (
  id SERIAL PRIMARY KEY,
  anuncio_id INTEGER NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE (anuncio_id, usuario_id)
);