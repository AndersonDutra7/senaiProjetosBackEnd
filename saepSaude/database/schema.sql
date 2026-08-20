-- =====================================================================
-- SAEPSaúde — Script de criação do banco de dados (DDL)
-- SGBD: PostgreSQL
-- =====================================================================

DROP TABLE IF EXISTS comentarios CASCADE;
DROP TABLE IF EXISTS curtidas CASCADE;
DROP TABLE IF EXISTS atividades CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS empresa CASCADE;

-- Dados institucionais exibidos no componente Perfil (nome/logo)
CREATE TABLE empresa (
    id       SERIAL PRIMARY KEY,
    nome     VARCHAR(120) NOT NULL,
    logo_url VARCHAR(255)
);

-- Tabela única de usuários com coluna discriminadora "tipo".
-- Reúne funcionários (dados do protótipo) e clientes (novos usuários da
-- plataforma) em uma só estrutura, já que ambos compartilham exatamente
-- os mesmos dados de perfil, atividades e credenciais de login — isso
-- evita duplicar colunas e permite evoluir o sistema sem quebrar os
-- dados já importados do protótipo (regra de negócio do enunciado).
CREATE TABLE usuarios (
    id         SERIAL PRIMARY KEY,
    tipo       VARCHAR(12)  NOT NULL CHECK (tipo IN ('funcionario', 'cliente')),
    nome       VARCHAR(120) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    senha      VARCHAR(255) NOT NULL,
    foto_url   VARCHAR(255),
    criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE atividades (
    id                SERIAL PRIMARY KEY,
    usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo              VARCHAR(12) NOT NULL CHECK (tipo IN ('corrida', 'caminhada', 'trilha')),
    distancia_metros  INTEGER NOT NULL CHECK (distancia_metros > 0),
    duracao_minutos   INTEGER NOT NULL CHECK (duracao_minutos > 0),
    calorias          INTEGER NOT NULL DEFAULT 0,
    criado_em         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE curtidas (
    id            SERIAL PRIMARY KEY,
    atividade_id  INTEGER NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
    usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (atividade_id, usuario_id)  -- no máximo 1 curtida por usuário/atividade
);

CREATE TABLE comentarios (
    id            SERIAL PRIMARY KEY,
    atividade_id  INTEGER NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
    usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    texto         VARCHAR(500) NOT NULL,
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices auxiliares para os filtros e a listagem paginada
CREATE INDEX idx_atividades_tipo ON atividades(tipo);
CREATE INDEX idx_atividades_criado_em ON atividades(criado_em DESC);

-- Dados da empresa
INSERT INTO empresa (nome, logo_url) VALUES ('SAEPSaúde', '/assets/img/SAEPSaude.png');
