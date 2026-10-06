# 📐 System Design Description (SDD) — Gerador de SA (Situação de Aprendizagem) HTML

## 1. Visão Geral e Objetivo
O objetivo deste documento é instruir a IA (Kiro) a gerar documentos HTML de **Avaliação Prática / Situação de Aprendizagem (SA)** em conformidade exata com o padrão gráfico e estrutural do SENAI.

O Kiro receberá um conjunto de dados brutos (Curso, Unidade Curricular, Contexto, Comando, Capacidades e Critérios de Avaliação) e deverá renderizar um arquivo HTML único, autossuficiente, responsivo para visualização e otimizado para impressão/conversão em **PDF (A4)**.

---

## 2. Esquema de Entradas de Dados (Input Variables)

Ao solicitar a geração de uma nova SA, o Kiro deve aguardar ou solicitar as seguintes variáveis de entrada:

| Variável | Tipo | Descrição | Exemplo / Padrão |
| :--- | :--- | :--- | :--- |
| `data` | String | Data da avaliação | `"21/09/2026"` |
| `docente` | String | Nome do professor | `"Anderson Raulino Dutra"` |
| `curso` | String | Nome do Curso Técnico | `"Técnico em Desenvolvimento de Sistemas"` |
| `unidade_curricular` | String | Nome da disciplina | `"Projeto de Backend"` |
| `turma` | String | Código da turma | `"T TIIN 2025/1 M2"` |
| `titulo_sa` | String | Título/Tema central da SA | `"Portal B2B de E-commerce e Integração Logística"` |
| `capacidades_tecnicas` | Lista | IDs e descrições das CTs | `[{"id": "CT1", "texto": "..."}]` |
| `capacidades_socioemocionais` | Lista | IDs e descrições das CSs | `[{"id": "CS1", "texto": "..."}]` |
| `contexto` | Texto | Cenário ou problema do cliente/indústria | Parágrafo explicativo do cenário real. |
| `comando` | Texto | Instrução geral da atividade | O que a equipe deve realizar e entregar. |
| `modulos` | Lista de Objetos | Módulos da entrega (I, II, III, IV...) | `[ { modulo: "I", titulo: "...", escopo: "...", entregaveis: [...] } ]` |
| `criterios_avaliacao` | Lista de Objetos por Módulo | Rubrica/Checklist de avaliação vinculada às CTs/CSs | `[ { criterio: "...", capacidade_id: "CT1", tipo: "Técnica" } ]` |

---

## 3. Guia de Estilo & Design System (CSS Rules)

O Kiro deve aplicar estritamente as regras de estilização CSS abaixo no cabeçalho `<style>` do HTML gerado:

### 3.1. Dimensões e Layout da Página
*   **Página A4:** Classe `.page` com `width: 210mm`, `min-height: 297mm`, `margin: 0 auto`, `padding: 15mm`.
*   **Impressão:** Regra `@media print` com `-webkit-print-color-adjust: exact !important;` para preservar as cores de fundo.

### 3.2. Tipografia e Paleta de Cores
*   **Fonte Principal:** `Arial, Helvetica, sans-serif`.
*   **Cor Primária / Institucional:** Azul SENAI `#2e5496` (utilizada em títulos de caixas, divisores, cabeçalhos de tabela).
*   **Cor Destaque (Entrega Final / Módulo IV):** Verde `#1b7e36`.
*   **Fundo de Tabelas Zebra:** Alternância entre `#ffffff` e `#fcfdfe`.
*   **Bordas:** `#d0d7de` para tabelas internas e `#2e5496` para quadros principais.

---

## 4. Arquitetura do Documento HTML (DOM Structure)

O HTML deve obrigatoriamente seguir a seguinte ordem de seções:

```
└── <div class="page">
    ├── 1. CABEÇALHO OFICIAL (table.header-table)
    │    ├── Logo SENAI (Célula mesclada rowspan=7)
    │    ├── Título: AVALIAÇÃO PRÁTICA - SA
    │    ├── Metadados (Data, Docente, Curso, Unidade, Turma, Avaliado)
    │    └── Célula de Nota "Desempenho" (rowspan=7)
    │
    ├── 2. TÍTULO DO PROJETO (.section-divider)
    │
    ├── 3. CAPACIDADES TÉCNICAS (.capacidades-box)
    │
    ├── 4. CAPACIDADES SOCIOEMOCIONAIS (.capacidades-box)
    │
    ├── 5. CONTEXTO DA SA (.capacidades-box)
    │
    ├── 6. COMANDO E VISÃO GERAL DAS ENTREGAS (.capacidades-box)
    │    ├── Parágrafos de orientação
    │    └── Tabela com Visão Geral dos Módulos (I a IV)
    │
    ├── 7. DESAFIO — DETALHAMENTO DE ARTEFATOS POR MÓDULO (.capacidades-box)
    │    ├── Tabelas individuais por Módulo (Seção, Entregável, Descrição)
    │    └── Caixa de Orientações de Formato (PDF, Git, etc.)
    │
    └── 8. LISTAS DE VERIFICAÇÃO / CHECKLISTS (Uma caixa por Módulo)
         └── Tabelas com critérios, capacidade associada, checkboxes (☐) e observação.
```

---

## 5. Regras de Construção dos Componentes

### 5.1. Cabeçalho Principal (7 Linhas)
Deve ser montado utilizando uma `<table>` com a classe `.header-table`.
*   A primeira coluna possui a logo do SENAI e a legenda `"Serviço Nacional de Aprendizagem"`.
*   A última coluna é reservada para a nota do aluno (`Desempenho`).

### 5.2. Caixas de Seção (`.capacidades-box`)
Cada bloco de conteúdo principal deve usar a estrutura:
```html
<div class="capacidades-box">
  <div class="capacidades-header">NOME DA SEÇÃO</div>
  <div class="capacidades-content">
    <!-- Conteúdo aqui -->
  </div>
</div>
```

### 5.3. Tabelas de Avaliação (Rubrica / Checklist)
Para cada módulo, deve ser gerada uma tabela com **6 colunas**:
1.  **Critério de Avaliação:** Texto descritivo do que será avaliado.
2.  **Capacidade Avaliada:** Identificador da capacidade e descrição reduzida (Ex: `Técnica (CT1): ...` ou `Socioemocional (CS1): ...`).
3.  **Atingiu:** Célula centralizada com o caractere unicode `☐` (ou `&#9744;`).
4.  **Parcialmente:** Célula centralizada com `☐`.
5.  **Não Atingiu:** Célula centralizada com `☐`.
6.  **Obs:** Célula vazia para anotações do docente.

*Nota:* No **Módulo Final (Módulo IV)**, a cor do cabeçalho da tabela e do título da caixa deve mudar para verde (`#1b7e36`).

---

## 6. Prompt do Kiro (Instruções de Execução)

Para acionar o Kiro usando este SDD, o comando de instrução inicial deve ser configurado assim:

```markdown
Você é o assistente responsável por gerar folhas de Avaliação Prática (SA) em HTML para cursos técnicos do SENAI, seguindo o padrão de design definido no SDD.

Ao receber um tema, curso e contexto:
1. Monte o HTML completo em um único arquivo, contendo o CSS embutido no <head>.
2. Siga rigorosamente a ordem visual: Cabeçalho → Capacidades → Contexto → Comando → Módulos detalhados → Checklists de Avaliação.
3. Garanta que cada critério de avaliação na Checklist esteja vinculado explicitamente a uma Capacidade Técnica (CT) ou Socioemocional (CS) declarada no início do documento.
4. Utilize o símbolo '☐' nas tabelas de avaliação.
5. Deixe a estrutura totalmente pronta para ser impressa ou salva em PDF (A4).
```