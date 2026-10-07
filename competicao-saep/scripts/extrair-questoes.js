// Lê o HTML da avaliação e gera:
//   dados/questoes.json       (questões + gabarito; fica só no servidor)
//   public/estilo-prova.css   (o mesmo CSS do HTML, para manter o visual)
const fs = require('fs');
const path = require('path');

const origem = process.argv[2];
if (!origem) {
  console.error('Uso: node scripts/extrair-questoes.js caminho/do/arquivo.html');
  process.exit(1);
}
const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.resolve(origem), 'utf8');

const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1];
if (!css) throw new Error('Bloco <style> não encontrado no HTML.');

const re = /<section class="item" data-ct="(C\d+)" data-dif="(\w+)" data-resp="([a-d])">([\s\S]*?)<\/section>/g;
const questoes = [];
let m;
while ((m = re.exec(html))) {
  const [, ct, dif, resp, interno] = m;
  const n = (interno.match(/<ol class="alternativas">[\s\S]*?<\/ol>/) || [''])[0].split('<li>').length - 1;
  if (n !== 4) console.warn(`Aviso: questão ${questoes.length + 1} com ${n} alternativas.`);
  questoes.push({ ct, dif, resp, html: interno.trim() });
}
if (!questoes.length) throw new Error('Nenhuma <section class="item"> encontrada.');

fs.mkdirSync(path.join(raiz, 'dados'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'dados', 'questoes.json'), JSON.stringify(questoes, null, 1));
fs.writeFileSync(path.join(raiz, 'public', 'estilo-prova.css'), css);
console.log(`OK: ${questoes.length} questões extraídas.`);
