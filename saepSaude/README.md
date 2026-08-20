# SAEPSaúde — Sistema Web de Atividades Físicas

Projeto desenvolvido a partir do caderno de prova SAEP "SAEPSaúde": um sistema
web onde usuários registram atividades físicas (corrida/caminhada/trilha) e
interagem via curtidas e comentários.

**Stack:** Frontend em HTML/CSS/JS puro (SPA) · Backend em Node.js/Express ·
Banco de dados PostgreSQL.

> ⚠️ **Sobre os dados de exemplo:** 
> Os arquivos em `database/usuarios.csv` e `database/atividades.csv` são
> **dados fictícios de exemplo**, só para o sistema funcionar de ponta a
> ponta.

## Estrutura do projeto

```
saepsaude/
├── README.md
├── database/
│   ├── schema.sql        # DDL (CREATE TABLE) das tabelas
│   ├── usuarios.csv       # dados de exemplo (funcionários + clientes)
│   └── atividades.csv     # dados de exemplo
├── backend/
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── src/
│       ├── server.js      # inicializa o Express
│       ├── db.js          # pool de conexão com o PostgreSQL
│       ├── utils.js        # cálculo de calorias e formatação
│       └── routes/
│           ├── status.js       # GET /status
│           ├── empresa.js      # GET /empresa
│           ├── auth.js         # POST /login
│           └── atividades.js   # GET/POST /atividades, curtir, comentar
└── frontend/
    ├── index.html
    ├── css/style.css
    ├── js/app.js
    └── assets/icons/*.svg
```

## 1. Configuração do Ambiente + Banco

**1.1 Navegue até a pasta do backend:**

```
cd backend
```

**1.2 Instale as dependências:**
   ```
   npm install
   ```
**1.3 Configure as Variáveis de Ambiente:**

  Crie o arquivo .env na raiz da pasta backend/ (você pode copiar do .env.example) e configure suas credenciais do PostgreSQL:
  
  ```
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=saepsaude
  DB_USER=postgres
  DB_PASSWORD="sua_senha_aqui"
  PORT=3000
  ```
**1.4 Configure as Variáveis de Ambiente:**
    
  Execute o script automatizado para criar o banco de dados saepsaude, rodar as tabelas do schema.sql e carregar os dados dos arquivos .csv:

    ```
    npm run init-db
    ```
## 2. Backend (Node.js)
**2.1 Após criar o banco de dados, inicie o servidor:**

 - Modo de Desenvolvimento (recomendado):
 ```
 npm run dev
 ```

 - Modo de Produção:
 ```
 npm start
 ```

O servidor sobe em `http://localhost:3000` e também serve os arquivos do
`frontend/` estaticamente (é possível abrir `http://localhost:3000` direto
no navegador em vez de abrir o `index.html` separadamente).

## 3. Rotas da API

| Método | Rota                              | Descrição                                  |
|--------|------------------------------------|---------------------------------------------|
| GET    | `/status`                          | Verifica se o servidor/banco estão de pé    |
| GET    | `/empresa`                         | Nome, logo e totais gerais                  |
| POST   | `/login`                           | `{ email, senha }` → dados do usuário       |
| GET    | `/atividades?tipo=&page=&usuario_id=` | Lista paginada (4/página) e filtrada     |
| POST   | `/atividades`                      | Cria atividade `{ usuario_id, tipo, distancia_metros, duracao_minutos }` |
| POST   | `/atividades/:id/curtir`           | `{ usuario_id }` → alterna curtir/descurtir |
| POST   | `/atividades/:id/comentarios`      | `{ usuario_id, texto }` → novo comentário   |

## 3. Frontend

Se você rodou o backend com `npm start`, é só abrir `http://localhost:3000`
no navegador — o Express já serve os arquivos estáticos da pasta `frontend/`.

Se preferir abrir o `frontend/index.html` diretamente (sem servir pelo
Express), o `fetch` já aponta para `http://localhost:3000` em
`frontend/js/app.js` (constante `API_BASE`), então o backend só precisa estar
rodando em paralelo.

### Credenciais de teste (dados de exemplo)

| E-mail                        | Senha  |
|--------------------------------|--------|
| carla.mendes@saepsaude.com    | 123456 |
| bruno.costa@gmail.com         | 123456 |

## Regras de negócio implementadas

- **Perfil:** fundo `#333333`, logo/nome da empresa carregados do banco,
  totais de atividades/calorias, botão "Atividade" desabilitado quando
  deslogado, rodapé fixo com redes sociais e "Copyright-2024".
- **Main:** filtros (corrida/caminhada/trilha), listagem paginada (4 por
  página, distância em km e duração em horas), página ativa em `#483DAD`.
- **Login:** modal com validação de campo vazio ("email ou senha
  obrigatório") e credencial incorreta ("email ou senha incorreta").
- **Curtir:** toggle de 1 curtida por usuário/atividade, ícone
  `coração.svg` fica `#FF0000` quando curtido, persistido no banco.
- **Comentar:** exige mais de 2 caracteres, mensagem de erro em campo
  vazio, contador atualizado no banco.
- **Cadastro de atividade:** formulário "Crie sua atividade" com validação
  de campos obrigatórios; nova atividade aparece como a primeira da lista.
- **Acesso não logado:** qualquer clique em filtro, paginação, curtir ou
  comentar abre o modal de login.

## Próximos passos antes da entrega

1. Trocar `database/usuarios.csv` e `database/atividades.csv` pelos arquivos
   reais do protótipo fornecido no caderno.
2. Trocar o logo em `frontend/assets/img/` pelo `SAEPSaude.png` real e
   apontar `logo_url` na tabela `empresa` para ele.
3. Revisar as regras de negócio do caderno linha a linha (seção "Lista de
   Verificação — Critérios de Avaliação") antes de organizar a pasta final.
