-- =====================================================================
-- OPCIONAL — dados de demonstração para testar a galeria
-- (não faz parte da entrega da prova). Rode DEPOIS de streamflix_Gabarito.sql:
--   psql -U postgres -d streamflix -f demo_dados.sql
-- As capas ficam em public/imagens/capas/.
-- =====================================================================
INSERT INTO tb_filme (titulo_filme, genero, id_usuario, url_capa)
SELECT f.titulo, f.genero, u.id_usuario, f.capa
FROM (VALUES
  ('Interestelar',     'Ficção Científica', 'bulma',      'imagens/capas/interestelar.png'),
  ('Wall-E',           'Animação',          'bulma',      'imagens/capas/wall-e.png'),
  ('Clube da Luta',    'Drama',             'bulma',      'imagens/capas/clube-da-luta.png'),
  ('Amélie',           'Comédia Romântica', 'bulma',      'imagens/capas/amelie.png'),
  ('Cidade de Deus',   'Drama',             'mestrekame', 'imagens/capas/cidade-de-deus.png'),
  ('Parasita',         'Suspense',          'mestrekame', 'imagens/capas/parasita.png')
) AS f(titulo, genero, admin, capa)
JOIN tb_usuario u ON u.nome_usuario = f.admin;

INSERT INTO tb_curtida (id_usuario, id_filme)
SELECT u.id_usuario, f.id_filme
FROM (VALUES
  ('goku','Interestelar'),('vegeta','Interestelar'),('gohan','Interestelar'),('piccolo','Interestelar'),
  ('goku','Cidade de Deus'),('A18','Cidade de Deus'),
  ('vegeta','Parasita'),('kuririn','Parasita'),('gohan','Parasita'),
  ('goku','Wall-E'),
  ('piccolo','Clube da Luta'),('vegeta','Clube da Luta'),
  ('A18','Amélie'),('bulma','Interestelar'),('mestrekame','Parasita')
) AS c(usuario, filme)
JOIN tb_usuario u ON u.nome_usuario = c.usuario
JOIN tb_filme   f ON f.titulo_filme = c.filme;
