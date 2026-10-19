# StreamFlix

Catálogo de filmes com curtidas e "Minha Lista". Stack: HTML/CSS/JS puro + Node.js (Express) + PostgreSQL.

## Como rodar

1. Instale as dependências: `npm install`
2. Crie o banco e execute o script e import os arquivos usuarios.csv e filmes.csv diretametne pelo PgAdmin4.
3. Ajuste a conexão se necessário (variáveis `DBHOST`, `DBPORT`, `DBUSER`, `DBPASSWORD`, `DBDATABASE`;
   padrão: `postgres` / `postgres` em `localhost:5432`).
4. Inicie: `npm start` e abra http://localhost:3000

## Usuários de teste (do usuarios.csv)

| nome_usuario | senha     | tipo          |
|--------------|-----------|---------------|
| bulma        | Bulma@123 | administrador |
| mestrekame   | Kame@123  | administrador |
| goku         | Goku@123  | usuario       |
| A18          | A18@123   | usuario       |

(O login diferencia maiúsculas de minúsculas: use `A18`, não `a18`.)

## Imagens

Coloque todas as imagens da pasta de anexos (fotos de perfil e capas, ex.: `goku.png`,
`batalha_dos_deuses.png`) dentro de `public/imagens/`. O banco guarda apenas o nome do arquivo.
As capas enviadas pelo administrador também são gravadas nessa pasta.
Sem a imagem, o sistema mostra um avatar padrão ou um espaço cinza no lugar da capa.

## Estrutura

- `server.js` — API REST (login, filmes, curtidas, lista, perfil do admin)
- `public/` — front-end (`index.html`, `style.css`, `app.js`), `icones/` (SVGs) e `imagens/` (fotos e capas)
- `anexos/` — `usuarios.csv` e `filmes.csv`
- `streamflix_NomeSobrenome.sql` — criação do banco, constraints e carga inicial

Para a entrega, renomeie o SQL e compacte a pasta como `StreamFlix_NomeSobrenome.zip`.
