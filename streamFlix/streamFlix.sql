-- =====================================================
-- StreamFlix - criação das tabelas e constraints
-- SGBD: PostgreSQL (pgAdmin 4)
-- Uso: crie o banco "streamflix", abra o Query Tool nele e execute este script.
-- A carga inicial é feita importando usuarios.csv e filmes.csv (veja o final do arquivo).
-- =====================================================

DROP TABLE IF EXISTS tb_minha_lista CASCADE;
DROP TABLE IF EXISTS tb_curtida CASCADE;
DROP TABLE IF EXISTS tb_filme CASCADE;
DROP TABLE IF EXISTS tb_usuario CASCADE;

-- ---------- tb_usuario ----------
CREATE TABLE tb_usuario (
    id_usuario      SERIAL PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    nome_usuario    VARCHAR(50)  NOT NULL,
    email           VARCHAR(120) NOT NULL,
    senha           VARCHAR(100) NOT NULL,
    imagem_usuario  VARCHAR(255),
    tipo            VARCHAR(15)  NOT NULL DEFAULT 'usuario',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_nome_usuario UNIQUE (nome_usuario),
    CONSTRAINT uq_usuario_email        UNIQUE (email),
    CONSTRAINT ck_usuario_tipo         CHECK (tipo IN ('usuario', 'administrador'))
);

-- ---------- tb_filme ----------
CREATE TABLE tb_filme (
    id_filme     SERIAL PRIMARY KEY,
    titulo_filme VARCHAR(150) NOT NULL,
    genero       VARCHAR(80)  NOT NULL,
    id_usuario   INTEGER      NOT NULL,   -- administrador que cadastrou (regra validada na aplicação)
    url_capa     VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_filme_usuario FOREIGN KEY (id_usuario)
        REFERENCES tb_usuario (id_usuario) ON DELETE CASCADE
);

-- ---------- tb_curtida (associativa N:N) ----------
CREATE TABLE tb_curtida (
    id_curtida SERIAL PRIMARY KEY,
    id_usuario INTEGER   NOT NULL,
    id_filme   INTEGER   NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_curtida_usuario FOREIGN KEY (id_usuario)
        REFERENCES tb_usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_curtida_filme FOREIGN KEY (id_filme)
        REFERENCES tb_filme (id_filme) ON DELETE CASCADE,
    CONSTRAINT uq_curtida UNIQUE (id_usuario, id_filme)   -- 1 curtida por filme/usuário
);

-- ---------- tb_minha_lista (associativa N:N) ----------
CREATE TABLE tb_minha_lista (
    id_lista   SERIAL PRIMARY KEY,
    id_usuario INTEGER   NOT NULL,
    id_filme   INTEGER   NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lista_usuario FOREIGN KEY (id_usuario)
        REFERENCES tb_usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_lista_filme FOREIGN KEY (id_filme)
        REFERENCES tb_filme (id_filme) ON DELETE CASCADE,
    CONSTRAINT uq_lista UNIQUE (id_usuario, id_filme)     -- 1 registro por filme/usuário
);

-- =====================================================
-- CARGA INICIAL (importar os CSVs no pgAdmin)
-- Ordem: primeiro tb_usuario, depois tb_filme (o filme referencia o usuário).
-- Em cada tabela: botão direito > Import/Export Data...
--   Import, Format = csv, Header = ligado, Delimiter = , , Encoding = UTF8
--   Aba "Columns": deixe SÓ as colunas do CSV (não inclua id_*, created_at, updated_at)
--   tb_usuario <- usuarios.csv : nome, nome_usuario, email, senha, imagem_usuario, tipo
--   tb_filme   <- filmes.csv   : titulo_filme, genero, id_usuario, url_capa
-- Alternativa via psql:
--   \copy tb_usuario (nome, nome_usuario, email, senha, imagem_usuario, tipo) FROM 'C:/caminho/usuarios.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
--   \copy tb_filme (titulo_filme, genero, id_usuario, url_capa) FROM 'C:/caminho/filmes.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
-- =====================================================