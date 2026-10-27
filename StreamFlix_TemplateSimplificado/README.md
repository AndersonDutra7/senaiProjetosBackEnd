# StreamFlix — solução de referência do simulado SAEP

Stack: HTML + CSS + JavaScript (front) · Node.js + Express (back) · PostgreSQL.

## Como rodar

```bash
# 1) banco (cria o banco "streamflix", tabelas, constraints e carga dos 8 usuários)
psql -U postgres -f sql/streamflix_Gabarito.sql

# 2) (opcional) 6 filmes e curtidas de demonstração
psql -U postgres -d streamflix -f sql/demo_dados.sql

# 3) dependências e servidor
npm install
npm start            # http://localhost:3000
```

Conexão com o banco por variáveis de ambiente (padrões entre parênteses):
`PGHOST` (localhost) · `PGPORT` (5432) · `PGUSER` (postgres) · `PGPASSWORD` (postgres) · `PGDATABASE` (streamflix) · `PORT` (3000).

## Usuários (anexos/usuarios.csv)

| nome_usuario | senha | tipo |
|---|---|---|
| bulma | Bulma@123 | administrador |
| mestrekame | Kame@123 | administrador |
| goku | Goku@123 | usuario |
| vegeta | Vegeta@123 | usuario |
| gohan | Gohan@123 | usuario |
| piccolo | Piccolo@123 | usuario |
| kuririn | Kuririn@123 | usuario |
| A18 | A18@123 | usuario |

## Estrutura

```
server.js            API (sessão, login, filmes, curtidas, upload, exclusão)
sql/                 streamflix_Gabarito.sql (entrega) · demo_dados.sql (opcional)
anexos/usuarios.csv  carga inicial
public/              index.html · css/ · js/ · icons/ · fonts/ (Inter) · imagens/ · uploads/
```

## Pontos de correção que o back-end garante

- Usuário da **sessão** define quem curte, cadastra e exclui (nenhum id de usuário vem do front).
- Só administrador cadastra/exclui filme, e só os **próprios** filmes.
- 1 curtida por usuário/filme (UNIQUE) · exclusão de filme apaga as curtidas (ON DELETE CASCADE).
- Upload validado no servidor (extensão, MIME e assinatura do arquivo; até 5 MB; nome único).
- Todas as consultas são parametrizadas · `updated_at` automático por trigger.
- Senhas em texto puro **somente** porque o `usuarios.csv` da prova as traz assim.
