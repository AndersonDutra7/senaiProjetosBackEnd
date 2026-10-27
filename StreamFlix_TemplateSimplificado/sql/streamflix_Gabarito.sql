-- =====================================================================
-- StreamFlix — script de criação do banco, tabelas, constraints e carga
-- SGBD: PostgreSQL 14+
-- Execução:  psql -U postgres -f streamflix_Gabarito.sql
-- =====================================================================

DROP DATABASE IF EXISTS streamflix;
CREATE DATABASE streamflix ENCODING 'UTF8';
\connect streamflix

-- ---------------------------------------------------------------------
-- Função de apoio: mantém updated_at preenchido automaticamente
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_atualiza_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- tb_usuario
-- ---------------------------------------------------------------------
CREATE TABLE tb_usuario (
    id_usuario      SERIAL        PRIMARY KEY,
    nome            VARCHAR(100)  NOT NULL,
    nome_usuario    VARCHAR(50)   NOT NULL,
    email           VARCHAR(120)  NOT NULL,
    senha           VARCHAR(100)  NOT NULL,
    imagem_usuario  VARCHAR(255),
    tipo            VARCHAR(15)   NOT NULL DEFAULT 'usuario',
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_nome_usuario UNIQUE (nome_usuario),
    CONSTRAINT uq_usuario_email        UNIQUE (email),
    CONSTRAINT ck_usuario_tipo         CHECK (tipo IN ('usuario', 'administrador'))
);

-- ---------------------------------------------------------------------
-- tb_filme (cadastrado por um administrador; a regra "só administrador"
-- é validada na aplicação)
-- ---------------------------------------------------------------------
CREATE TABLE tb_filme (
    id_filme      SERIAL        PRIMARY KEY,
    titulo_filme  VARCHAR(150)  NOT NULL,
    genero        VARCHAR(60)   NOT NULL,
    id_usuario    INTEGER       NOT NULL,
    url_capa      VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_filme_usuario FOREIGN KEY (id_usuario)
        REFERENCES tb_usuario (id_usuario) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- tb_curtida (entidade associativa N:N entre usuário e filme)
-- ---------------------------------------------------------------------
CREATE TABLE tb_curtida (
    id_curtida  SERIAL     PRIMARY KEY,
    id_usuario  INTEGER    NOT NULL,
    id_filme    INTEGER    NOT NULL,
    created_at  TIMESTAMP  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_curtida_usuario_filme UNIQUE (id_usuario, id_filme),
    CONSTRAINT fk_curtida_usuario FOREIGN KEY (id_usuario)
        REFERENCES tb_usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_curtida_filme FOREIGN KEY (id_filme)
        REFERENCES tb_filme (id_filme) ON DELETE CASCADE
);

CREATE INDEX idx_filme_usuario  ON tb_filme (id_usuario);
CREATE INDEX idx_curtida_filme  ON tb_curtida (id_filme);

-- ---------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_usuario_updated BEFORE UPDATE ON tb_usuario
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_updated_at();
CREATE TRIGGER trg_filme_updated BEFORE UPDATE ON tb_filme
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_updated_at();
CREATE TRIGGER trg_curtida_updated BEFORE UPDATE ON tb_curtida
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_updated_at();

-- ---------------------------------------------------------------------
-- CARGA INICIAL — conteúdo do arquivo anexos/usuarios.csv
-- (alternativa pelo psql, a partir da pasta do projeto:
--   \copy tb_usuario (nome, nome_usuario, email, senha, imagem_usuario, tipo)
--         FROM 'anexos/usuarios.csv' WITH (FORMAT csv, HEADER true) )
-- ---------------------------------------------------------------------
INSERT INTO tb_usuario (nome, nome_usuario, email, senha, imagem_usuario, tipo) VALUES
('Bulma Briefs',  'bulma',      'bulma@streamflix.com',      'Bulma@123',    'bulma.png',      'administrador'),
('Mestre Kame',   'mestrekame', 'mestrekame@streamflix.com', 'Kame@123',     'mestrekame.png', 'administrador'),
('Son Goku',      'goku',       'goku@email.com',            'Goku@123',     'goku.png',       'usuario'),
('Vegeta',        'vegeta',     'vegeta@email.com',          'Vegeta@123',   'vegeta.png',     'usuario'),
('Son Gohan',     'gohan',      'gohan@email.com',           'Gohan@123',    'gohan.png',      'usuario'),
('Piccolo',       'piccolo',    'piccolo@email.com',         'Piccolo@123',  'piccolo.png',    'usuario'),
('Kuririn',       'kuririn',    'kuririn@email.com',         'Kuririn@123',  'kuririn.png',    'usuario'),
('Android 18',    'A18',        'a18@email.com',             'A18@123',      'a18.png',        'usuario');
