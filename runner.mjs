// runner.mjs — roda o pipeline completo e salva HTML em public/
// Chamado pelo GitHub Actions (sem Netlify Functions)
import {
  fetchArticles,
  selectAndSummarize,
  generateHTML,
} from './netlify/functions/briefing-core.mjs';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('ANTHROPIC_API_KEY não definida'); process.exit(1); }

function nowBR() { return new Date(Date.now() - 3 * 60 * 60 * 1000); }
function dateSlug(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

const today = nowBR();
const slug = dateSlug(today);

console.log(`\n${'─'.repeat(50)}`);
console.log(`  DAILY BRIEFING — ${slug}`);
console.log(`${'─'.repeat(50)}\n`);

const articles = await fetchArticles();
if (!articles.length) { console.error('Nenhum artigo coletado'); process.exit(1); }

const grouped = await selectAndSummarize(articles, apiKey);

const prevDate = new Date(today); prevDate.setUTCDate(prevDate.getUTCDate() - 1);
const nextDate = new Date(today); nextDate.setUTCDate(nextDate.getUTCDate() + 1);
const prevSlug = dateSlug(prevDate);
const nextSlug = dateSlug(nextDate);
const hasPrev = existsSync(`docs/${prevSlug}/index.html`);
const hasNext = existsSync(`docs/${nextSlug}/index.html`);

const html = generateHTML(
  grouped, today,
  hasPrev ? prevSlug : null,
  hasNext ? nextSlug : null
);

mkdirSync(`docs/${slug}`, { recursive: true });
writeFileSync(`docs/${slug}/index.html`, html, 'utf-8');
writeFileSync(
  'docs/index.html',
  `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/${slug}/"><title>Daily Briefing</title></head><body><script>window.location.replace("/${slug}/")<\/script></body></html>`,
  'utf-8'
);

const total = Object.values(grouped).reduce((s, v) => s + v.length, 0);
console.log(`\n✅ ${total} notícias geradas → docs/${slug}/index.html\n`);
