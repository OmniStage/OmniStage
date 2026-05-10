const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', 'app', 'eventos', 'page.tsx');

if (!fs.existsSync(filePath)) {
  console.error('Arquivo não encontrado:', filePath);
  process.exit(1);
}

let text = fs.readFileSync(filePath, 'utf8');
const original = text;

// 1) Adiciona slug ao type Evento, sem duplicar.
text = text.replace(
  /type Evento = \{\n  id: string;\n(?!  slug\??: string \| null;)/,
  'type Evento = {\n  id: string;\n  slug?: string | null;\n'
);

// 2) Adiciona slug no select de eventos, sem duplicar.
text = text.replace(
  /(\.from\("eventos"\)\n\s+\.select\(`\n\s+id,\n)(?!\s+slug,)/,
  '$1        slug,\n'
);

// 3) Ajusta o botão Presentes para usar slug quando existir.
text = text.replace(
  'href={`/app/eventos/${evento.id}/lista-presentes`}',
  'href={`/app/eventos/${evento.slug || evento.id}/lista-presentes`}'
);

if (text === original) {
  console.log('Nenhuma alteração aplicada. O arquivo já pode estar ajustado ou o padrão não foi encontrado.');
  process.exit(0);
}

fs.writeFileSync(filePath, text, 'utf8');
console.log('Ajuste aplicado com sucesso em app/app/eventos/page.tsx');
console.log('Alterações: slug no type Evento, slug no select e botão Presentes usando slug || id.');
