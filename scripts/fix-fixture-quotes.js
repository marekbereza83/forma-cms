const fs = require('fs')
const data = JSON.parse(fs.readFileSync('fixtures/forma-site.json', 'utf8'))

const pricing = data.pages[0].sections.find(s => s.id === 'pricing')
// U+0022 = ASCII double quote
pricing.fields.sectionLead.value =
  'Transparentne warunki. Bez "zapytaj o wycenę". Prawnicy cenią konkret — daję go z góry.'

const problem = data.pages[0].sections.find(s => s.id === 'problem')
problem.fields.symptomCards.value[0].body =
  'Nowi klienci oceniają Cię zanim zadzwonią. Stara strona mówi: "ta kancelaria nie dba o szczegóły".'

fs.writeFileSync('fixtures/forma-site.json', JSON.stringify(data, null, 2), 'utf8')
console.log('done')
