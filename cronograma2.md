# Cronograma — Projeto SAEPSaúde (Backend Node.js + HTML puro + PostgreSQL)

**Carga horária do projeto:** 10 aulas × 3h30 = **35h**
**Stack:** HTML/CSS/JS puro (front), Node.js + Express (back), PostgreSQL + pgAdmin (banco)
**Entregas finais (conforme caderno SAEP):**
1. Estrutura das tabelas em PDF
2. Banco de dados em .SQL
3. Pasta com todos os arquivos do sistema SAEPSaúde

---

## Aula 01 — Kickoff e Arquitetura (3h30)
**Objetivo:** Entender o desafio e planejar a solução antes de codar.
- Leitura guiada do caderno de prova: contextualização, desafio, entregas esperadas
- Levantamento das regras de negócio (quadro/lista) a partir das seções 1.1 a 1.5
- Discussão de arquitetura: front estático (HTML/CSS/JS) → API REST (Node/Express) → PostgreSQL
- Setup do ambiente: Node.js, VS Code, PostgreSQL + pgAdmin, extensão REST client/Thunder Client
- Criação da estrutura de pastas do projeto (`/frontend`, `/backend`, `/database`)

## Aula 02 — Modelagem de Dados (3h30)
**Objetivo:** Produzir a **Entrega 1** (estrutura das tabelas em PDF).
- Análise dos arquivos `usuarios.csv` e `atividades.csv` (dados do protótipo a importar)
- Identificação das entidades: Empresa, Usuário (funcionário/cliente), Atividade, Like, Comentário
- Modelagem do DER (Diagrama Entidade-Relacionamento) com chaves primárias/estrangeiras
- Regras de negócio que viram constraints (ex: 1 like por usuário por atividade)
- Exportar o diagrama/estrutura das tabelas em PDF → **Entrega 1 concluída**

## Aula 03 — Banco de Dados (3h30)
**Objetivo:** Produzir a **Entrega 2** (.sql) e ter o banco pronto para uso.
- Criação do banco no PostgreSQL via pgAdmin
- Scripts DDL: `CREATE TABLE` para todas as entidades modeladas, com FKs e constraints
- Importação dos dados de `usuarios.csv` e `atividades.csv` para as tabelas
- Conferência dos dados importados (queries `SELECT` de checagem)
- Export do banco completo em `.sql` → **Entrega 2 concluída**

## Aula 04 — Setup do Backend Node.js (3h30)
**Objetivo:** Backend rodando e conectado ao banco.
- Inicialização do projeto (`npm init`, `package.json`)
- Instalação de dependências: `express`, `pg`, `cors`, `dotenv`
- Estrutura de pastas do backend (rotas / controllers / model de conexão)
- Configuração do pool de conexão com PostgreSQL via variáveis de ambiente
- Primeira rota de teste (`GET /status`) rodando no servidor local

## Aula 05 — API de Leitura (Atividades e Perfil) (3h30)
**Objetivo:** Endpoints que alimentam a tela principal.
- `GET /empresa` — dados do componente perfil (nome, logo, totais de atividades/calorias)
- `GET /atividades` — listagem com paginação (4 por página) e filtro por tipo (corrida/caminhada/trilha)
- Formatação da data no padrão `HH:MM - DD/MM/YY` na resposta ou no front
- Testes dos endpoints com Thunder Client/Insomnia

## Aula 06 — Frontend Estático (Layout) (3h30)
**Objetivo:** Estrutura visual completa (sem dados dinâmicos ainda).
- `index.html` com o layout em colunas: perfil (sidebar) + main (header, filtros, lista, paginação)
- CSS seguindo a paleta obrigatória (#FFFFFF, #000000, #333333, #483DAD, #FF0000) e fonte Inter
- Componentes estáticos: cabeçalho com botão Login, filtros, cards de atividade, rodapé, paginação
- Ícones (coração, comentário, redes sociais) e estados visuais (ativo/inativo)

## Aula 07 — Integração Front↔Back (Consumo da API) (3h30)
**Objetivo:** Tela principal 100% dinâmica.
- Consumo de `GET /atividades` e `GET /empresa` via `fetch`
- Renderização dinâmica dos cards de atividade a partir da resposta da API
- Filtros funcionais (corrida/caminhada/trilha) sem recarregar a página
- Paginação dinâmica (Próxima/Anterior, página ativa destacada) integrada à API

## Aula 08 — Autenticação (Login/Logout) (3h30)
**Objetivo:** Controle de acesso às interações.
- Modal de login (HTML/CSS/JS) com campos email/senha e validações de layout
- `POST /login` no backend validando credenciais contra o banco
- Tratamento de erros: campo obrigatório / credenciais incorretas (mensagens e bordas vermelhas)
- Estado de sessão no frontend (ex: variável/localStorage) controlando header (Login↔Logout)
- Habilitação de filtros, paginação, like e comentário apenas para usuário logado

## Aula 09 — Interações: Like e Comentário (3h30)
**Objetivo:** Regras de interação social do app.
- `POST/DELETE` de like: toggle, persistência no banco, regra de 1 like por usuário/atividade
- Atualização visual do ícone coração (#FF0000 quando curtido) e contador
- `POST /comentarios`: validação de mínimo de caracteres, mensagem de erro se vazio
- Seção de comentário expansível abaixo da atividade selecionada, persistência e atualização do contador

## Aula 10 — Cadastro de Atividades e Fechamento (3h30)
**Objetivo:** Fechar o CRUD e revisar a entrega completa.
- Formulário "Crie sua atividade": tipos aceitos (corrida/caminhada/trilha), validações e placeholders
- `POST /atividades`: persistência e retorno da nova atividade como primeira da lista
- Conversões de exibição (distância → km, duração → horas)
- Revisão cruzada de todas as regras de negócio do caderno (checklist)
- Organização final da pasta de entrega e simulação cronometrada da prova → **Entrega 3 concluída**

---

### Observações para condução das aulas
- Cada aula deve reservar os últimos ~20-30min para prática guiada/dúvidas antes de encerrar.
- As Aulas 02 e 03 travam as Entregas 1 e 2 cedo — importante não atrasar essa etapa, pois o restante do projeto depende do banco pronto.
- A Aula 10 funciona como ensaio da prova real: útil rodar com tempo cronometrado (30min/30min/2h30 como no caderno).