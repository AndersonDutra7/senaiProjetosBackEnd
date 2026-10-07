# Competição SAEP (estilo Kahoot, na sua rede)

Usa as questões do `objRevisaoSaep2.html` com o mesmo visual (código, tabelas, DER).
Ranking ao vivo no projetor, alunos respondem pelo celular.

## Primeira vez

```
npm install
npm start
```

O terminal mostra dois endereços:

- **PROFESSOR** (abra no computador ligado ao projetor): `http://localhost:3000/professor?key=XXXX`
- **ALUNOS**: `http://192.168.x.x:3000` (aparece também em QR Code na tela do professor)

Computador do professor e celulares dos alunos precisam estar no **mesmo Wi-Fi**.
Se o Windows perguntar sobre o firewall, permita o Node.js em **rede privada**.

## Se a rede da escola bloquear (túnel)

```
npm run tunnel
```

Gera um endereço público `https://....trycloudflare.com` (via cloudflared) que passa a
aparecer na tela do professor e no QR Code. Precisa de internet no computador do professor
e baixa o `cloudflared` na primeira vez.

## Como conduzir

1. Abra a tela do professor, espere os alunos entrarem (nomes aparecem na sala).
2. **Espaço** (ou botão) inicia a partida. Cada questão avança sozinha quando todos
   respondem ou quando o tempo acaba. **Espaço** também encerra antes e passa para a próxima.
3. Depois de cada questão aparecem a correta, como a turma respondeu e o ranking.
4. No fim: pódio, tabela completa e **Baixar resultados (CSV)** (abre no Excel).

## Pontuação e tempo

`config.json`: tempo por dificuldade (fácil 30s, média 45s, difícil 90s) e pontos máximos (1000).
Acertar rápido vale mais (de 1000 a 500 pontos); errar ou não responder vale 0.

## Trocar as questões

Coloque o novo HTML (mesmo padrão `section.item` com `data-resp`) em `fonte/` e rode:

```
npm run extrair
```

## Teste automático

Com o servidor parado: `node scripts/teste-fluxo.js` (simula professor + 3 alunos).

## Observações

- O gabarito fica só no servidor; os alunos só o recebem depois que a questão é encerrada.
- Aluno que fecha o navegador volta com o mesmo nome e mantém os pontos.
- Se o servidor for reiniciado, a partida zera.
