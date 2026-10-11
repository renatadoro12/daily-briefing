import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import Parser from 'rss-parser';

// ─── CONFIG ────────────────────────────────────────────────────────────────

const FEEDS = {
  economia: [
    // Brasil
    'https://pox.globo.com/rss/valor/brasil/',
    'https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/economia/',
    'https://www.gazetadopovo.com.br/feed/rss/economia.xml',
    'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
    'https://www.moneytimes.com.br/economia/feed/',
    'https://veja.abril.com.br/economia/feed/',
    'https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias',
    'https://www.bloomberglinea.com.br/arc/outboundfeeds/rss/?outputType=xml',
    'https://www.metropoles.com/negocios/feed',
    // Internacional
    'https://www.cnbc.com/id/20910258/device/rss/rss.html',
    'https://www.theguardian.com/business/economics/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
    'https://feeds.bloomberg.com/economics/news.rss',
    'http://feeds.bbci.co.uk/news/business/rss.xml',
  ],
  financas: [
    // Brasil
    'https://pox.globo.com/rss/valor/financas/',
    'https://pox.globo.com/rss/valor/empresas/',
    'https://pox.globo.com/rss/valorinveste/',
    'https://www.infomoney.com.br/feed/',
    'https://www.moneytimes.com.br/mercados/feed/',
    'https://www.seudinheiro.com/feed/',
    'https://exame.com/invest/feed/',
    'https://borainvestir.b3.com.br/feed/',
    'https://www.suno.com.br/noticias/feed/',
    'https://braziljournal.com/feed/',
    'https://investnews.com.br/feed/',
    'https://forbes.com.br/forbes-money/feed/',
    'https://monitordomercado.com.br/feed/',
    // Internacional
    'https://www.cnbc.com/id/10000664/device/rss/rss.html',
    'https://www.cnbc.com/id/15839069/device/rss/rss.html',
    'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    'https://feeds.bloomberg.com/markets/news.rss',
  ],
  geopolitica: [
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.theguardian.com/world/rss',
    'http://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.gzeromedia.com/feeds/feed.rss',
  ],
  ia: [
    'https://www.technologyreview.com/feed/',
    'https://www.theverge.com/rss/index.xml',
    'https://api.axios.com/feed/',
    'https://cointelegraph.com/rss/tag/ai',
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    'https://tldr.tech/api/rss/ai',
    'https://feeds.bloomberg.com/technology/news.rss',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://www.semafor.com/rss.xml',
  ],
  crypto: [
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://cointelegraph.com/rss',
    'https://decrypt.co/feed',
    'https://www.theblock.co/rss.xml',
    'https://cryptobriefing.com/feed/',
    'https://ambcrypto.com/feed/',
    'https://unchainedcrypto.com/feed/',
    'https://thedefiant.io/api/feed',
    'https://www.bankless.com/rss/feed',
    'https://coinjournal.net/feed/',
  ],
};

// Feeds de veículos brasileiros — definem a origem (Brasil x internacional)
// usada na cota exata de Economia e Finanças.
const BR_FEEDS = new Set([
  'https://pox.globo.com/rss/valor/brasil/',
  'https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/economia/',
  'https://www.gazetadopovo.com.br/feed/rss/economia.xml',
  'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
  'https://www.moneytimes.com.br/economia/feed/',
  'https://pox.globo.com/rss/valor/financas/',
  'https://pox.globo.com/rss/valor/empresas/',
  'https://pox.globo.com/rss/valorinveste/',
  'https://www.infomoney.com.br/feed/',
  'https://www.moneytimes.com.br/mercados/feed/',
  'https://www.seudinheiro.com/feed/',
  'https://exame.com/invest/feed/',
  'https://borainvestir.b3.com.br/feed/',
  'https://www.suno.com.br/noticias/feed/',
  'https://braziljournal.com/feed/',
  'https://veja.abril.com.br/economia/feed/',
  'https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias',
  'https://www.bloomberglinea.com.br/arc/outboundfeeds/rss/?outputType=xml',
  'https://www.metropoles.com/negocios/feed',
  'https://investnews.com.br/feed/',
  'https://forbes.com.br/forbes-money/feed/',
  'https://monitordomercado.com.br/feed/',
]);

// Nome do veículo quando o título do feed é genérico (ex: "Economia")
const SOURCE_NAMES = {
  'https://pox.globo.com/rss/valor/brasil/': 'Valor Econômico',
  'https://pox.globo.com/rss/valor/financas/': 'Valor Econômico',
  'https://pox.globo.com/rss/valor/empresas/': 'Valor Econômico',
  'https://pox.globo.com/rss/valorinveste/': 'Valor Investe',
  'https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/economia/': 'Estadão',
  'https://www.gazetadopovo.com.br/feed/rss/economia.xml': 'Gazeta do Povo',
  'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml': 'Agência Brasil',
  'https://www.moneytimes.com.br/economia/feed/': 'Money Times',
  'https://www.moneytimes.com.br/mercados/feed/': 'Money Times',
  'https://exame.com/invest/feed/': 'Exame Invest',
  'https://borainvestir.b3.com.br/feed/': 'B3 Bora Investir',
  'https://www.suno.com.br/noticias/feed/': 'Suno',
  'https://braziljournal.com/feed/': 'Brazil Journal',
  'https://veja.abril.com.br/economia/feed/': 'Veja Economia',
  'https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias': 'Banco Central do Brasil',
  'https://www.bloomberglinea.com.br/arc/outboundfeeds/rss/?outputType=xml': 'Bloomberg Línea',
  'https://www.metropoles.com/negocios/feed': 'Metrópoles Negócios',
  'https://investnews.com.br/feed/': 'InvestNews',
  'https://forbes.com.br/forbes-money/feed/': 'Forbes Money',
  'https://monitordomercado.com.br/feed/': 'Monitor do Mercado',
};

const ACCENT_COLORS = {
  economia: '#10B981',
  financas: '#3B82F6',
  geopolitica: '#7C3AED',
  ia: '#00C4B4',
  crypto: '#F59E0B',
};

const TOPIC_NAMES = {
  economia: 'Economia',
  financas: 'Finanças',
  geopolitica: 'Geopolítica',
  ia: 'Inteligência Artificial',
  crypto: 'Criptomoedas',
};

const TOPIC_ICONS = {
  economia: '📊',
  financas: '💰',
  geopolitica: '🌍',
  ia: '🤖',
  crypto: '₿',
};

const TOPIC_ORDER = ['economia', 'financas', 'geopolitica', 'ia', 'crypto'];

// Cota exata por tema. Economia e Finanças têm cota separada por origem.
const QUOTAS = {
  economia: { br: 5, int: 3 },
  financas: { br: 4, int: 2 },
  geopolitica: 4,
  ia: 6,
  crypto: 6,
};

// Grupos da resposta do modelo → [tema, origem]
const GROUPS = {
  economia_brasil: ['economia', 'br'],
  economia_internacional: ['economia', 'int'],
  financas_brasil: ['financas', 'br'],
  financas_internacional: ['financas', 'int'],
  geopolitica: ['geopolitica', null],
  ia: ['ia', null],
  crypto: ['crypto', null],
};

const MONTHS_PT = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function nowBR() {
  const override = process.env.BRIEFING_DATE;
  if (override) {
    const [y, m, d] = override.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  return new Date(Date.now() - 3 * 60 * 60 * 1000);
}

function repairJson(text) {
  let result = '';
  let inString = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (!inString) {
      result += ch;
      if (ch === '"') inString = true;
    } else {
      if (ch === '\\') {
        result += ch + (text[i + 1] || '');
        i++;
      } else if (ch === '"') {
        let j = i + 1;
        while (j < text.length && ' \t\n\r'.includes(text[j])) j++;
        const next = text[j] || '';
        if (',:]}'.includes(next) || next === '') {
          inString = false;
          result += ch;
        } else {
          result += '\\"';
        }
      } else {
        result += ch;
      }
    }
    i++;
  }
  return result;
}

function dateSlug(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function sha1(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function escapeHTML(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const TOPIC_ALIASES = {
  economia: 'economia',
  financas: 'financas',
  'finanças': 'financas',
  geopolitica: 'geopolitica',
  'geopolítica': 'geopolitica',
  ia: 'ia',
  ai: 'ia',
  inteligencia_artificial: 'ia',
  'inteligência_artificial': 'ia',
  'inteligencia artificial': 'ia',
  'inteligência artificial': 'ia',
  crypto: 'crypto',
  cripto: 'crypto',
  criptomoedas: 'crypto',
};

function normalizeTopic(t) {
  const key = String(t || '').toLowerCase().trim();
  return TOPIC_ALIASES[key] || key;
}

// ─── DEDUPLICAÇÃO ──────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'para','com','por','que','uma','dos','das','nos','nas','mas','aos','sem','sob','apos','ate','ainda',
  'como','mais','menos','sobre','entre','diz','foi','sao','ser','tem','vai','seu','sua','seus','suas',
  'pelo','pela','pelos','pelas','esta','este','isso','veja','novo','nova','contra','desde','quando',
  'the','and','for','with','from','that','this','its','are','was','has','have','will','says','said',
  'after','over','amid','into','new','but','not','how','why','what','than','more','you','your','his','her',
]);

function normalizeTitle(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleTokens(t) {
  return new Set(normalizeTitle(t).split(' ').filter(w => w.length >= 3 && !STOPWORDS.has(w)));
}

function canonicalLink(link) {
  return String(link || '').trim().toLowerCase().split('#')[0].split('?')[0].replace(/\/+$/, '');
}

// Mesmo assunto com título diferente. strict=true é usado contra edições de
// dias anteriores, para não descartar a atualização diária de um mesmo tema
// (ex: fechamento do Ibovespa de hoje x de ontem).
function isSameStory(a, b, strict = false) {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  if (shared < 4) return false;
  const jaccard = shared / (a.size + b.size - shared);
  if (strict) return jaccard >= 0.6;
  return jaccard >= 0.5 || shared / Math.min(a.size, b.size) >= 0.75;
}

// Links e títulos publicados nas edições dos dias anteriores (docs/AAAA-MM-DD/data.json).
function loadRecentHistory(days = 3) {
  const links = new Set();
  const titles = [];
  const today = nowBR();
  for (let i = 1; i <= days; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const file = `docs/${dateSlug(d)}/data.json`;
    if (!existsSync(file)) continue;
    try {
      const { grouped } = JSON.parse(readFileSync(file, 'utf-8'));
      for (const items of Object.values(grouped || {})) {
        for (const item of items) {
          if (item.link) links.add(canonicalLink(item.link));
          if (item.title) titles.push(item.title);
        }
      }
    } catch (e) {
      console.warn(`Histórico ilegível (${file}): ${e.message}`);
    }
  }
  return { links, titles };
}

// ─── RSS FETCH ─────────────────────────────────────────────────────────────

export async function fetchArticles() {
  const parser = new Parser({ timeout: 10000 });
  // Roda 1x/dia (20h BRT) — janela cobre as últimas 24h a partir do horário
  // de execução, recalculada a cada rodada (nunca é fixa, sempre "hoje até agora").
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const tasks = [];
  for (const [topic, urls] of Object.entries(FEEDS)) {
    for (const url of urls) tasks.push({ topic, url });
  }

  const results = await Promise.allSettled(
    tasks.map(({ topic, url }) =>
      parser.parseURL(url).then(feed => ({ topic, url, feed }))
    )
  );

  const articles = [];
  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn(`Feed falhou: ${result.reason?.message || result.reason}`);
      continue;
    }
    const { topic, url, feed } = result.value;
    const source = SOURCE_NAMES[url] || feed.title || new URL(url).hostname;
    // Veículos de economia/finanças publicam em volume maior ao longo do dia
    const perFeed = hasOrigin(topic) ? 25 : 10;
    for (const item of (feed.items || []).slice(0, perFeed)) {
      if (!item.title) continue;
      if (!item.pubDate) continue;
      const published = new Date(item.pubDate);
      if (published < cutoff) continue;
      articles.push({
        topic,
        origin: BR_FEEDS.has(url) ? 'br' : 'int',
        title: item.title.trim(),
        summary: (item.contentSnippet || item.content || '').slice(0, 400).trim(),
        source,
        published,
        link: item.link || item.guid || '',
      });
    }
  }

  // Remove notícias repetidas antes de montar o lote enviado ao Claude,
  // mantendo a primeira ocorrência: mesmo link, mesmo assunto com título
  // parecido (entre fontes e entre temas) e o que já saiu nos dias anteriores.
  const history = loadRecentHistory();
  const historyTokens = history.titles.map(titleTokens);
  const seenLinks = new Set();
  const seenTokens = [];
  const deduped = [];
  for (const a of articles) {
    const link = canonicalLink(a.link);
    const tokens = titleTokens(a.title);
    if (link && (seenLinks.has(link) || history.links.has(link))) continue;
    if (seenTokens.some(t => isSameStory(tokens, t))) continue;
    if (historyTokens.some(t => isSameStory(tokens, t, true))) continue;
    if (link) seenLinks.add(link);
    seenTokens.push(tokens);
    deduped.push(a);
  }

  console.log(`Total coletado: ${articles.length} artigos (${deduped.length} após remover duplicatas)`);
  return deduped;
}

// ─── CLAUDE SELECT + SUMMARIZE ─────────────────────────────────────────────

// Tamanho do lote enviado ao Claude por grupo (tema + origem), com folga acima da cota.
const POOL_LIMITS = {
  economia_br: 20, economia_int: 12,
  financas_br: 16, financas_int: 10,
  geopolitica: 10, ia: 24, crypto: 24,
};

function hasOrigin(topic) {
  return topic === 'economia' || topic === 'financas';
}

// Monta o lote alternando entre as fontes e priorizando as mais recentes,
// para nenhum veículo dominar a lista de um tema.
function buildPool(articles) {
  const byGroup = {};
  for (const a of articles) {
    const g = hasOrigin(a.topic) ? `${a.topic}_${a.origin}` : a.topic;
    if (!byGroup[g]) byGroup[g] = {};
    if (!byGroup[g][a.source]) byGroup[g][a.source] = [];
    byGroup[g][a.source].push(a);
  }
  const pool = [];
  for (const [g, bySource] of Object.entries(byGroup)) {
    const queues = Object.values(bySource).map(list => list.sort((x, y) => y.published - x.published));
    const limit = POOL_LIMITS[g] || 6;
    let taken = 0;
    while (taken < limit && queues.some(q => q.length)) {
      for (const q of queues) {
        if (taken >= limit) break;
        if (q.length) { pool.push(q.shift()); taken++; }
      }
    }
  }
  pool.forEach((a, i) => { a.id = i + 1; });
  return pool;
}

function formatArticles(list) {
  let text = '';
  for (const a of list) {
    text += `\n[${a.id}] TEMA: ${a.topic.toUpperCase()}\n`;
    if (hasOrigin(a.topic)) text += `ORIGEM: ${a.origin === 'br' ? 'BRASIL' : 'INTERNACIONAL'}\n`;
    text += `TÍTULO: ${a.title}\n`;
    text += `FONTE: ${a.source}\n`;
    const brHour = (a.published.getUTCHours() - 3 + 24) % 24;
    const brMin = a.published.getUTCMinutes();
    text += `HORA: ${String(brHour).padStart(2,'0')}:${String(brMin).padStart(2,'0')} (horário de Brasília)\n`;
    if (a.link) text += `LINK: ${a.link}\n`;
    if (a.summary) text += `DESCRIÇÃO: ${a.summary.slice(0,150)}\n`;
  }
  return text;
}

async function callModel(client, prompt) {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20000,
    messages: [{ role: 'user', content: prompt }],
  });

  let text = msg.content[0].text.trim();
  if (text.includes('```json')) text = text.split('```json')[1].split('```')[0].trim();
  else if (text.includes('```')) text = text.split('```')[1].split('```')[0].trim();

  // Remove caracteres de controle que quebram JSON (exceto \t \n \r que são válidos escapados)
  text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

  try {
    return JSON.parse(text);
  } catch (e1) {
    console.warn(`JSON inválido, tentando recuperar: ${e1.message}`);
    try {
      return JSON.parse(text.replace(/,(\s*[}\]])/g, '$1'));
    } catch (e2) {
      console.warn(`Recuperação 1 falhou, tentando repair de aspas: ${e2.message}`);
      return JSON.parse(repairJson(text.replace(/,(\s*[}\]])/g, '$1')));
    }
  }
}

// Distribui os itens da resposta nos temas. A origem (Brasil x internacional)
// vem do artigo original, não da classificação do modelo.
function collectItems(data, pool, grouped) {
  const byId = new Map(pool.map(a => [a.id, a]));
  const byLink = new Map(pool.filter(a => a.link).map(a => [canonicalLink(a.link), a]));

  const add = (key, item) => {
    if (!item || !item.title) return;
    const k = normalizeTitle(key).replace(/ /g, '_');
    const [topic, groupOrigin] = GROUPS[k] || [normalizeTopic(k), null];
    const article = byLink.get(canonicalLink(item.link)) || byId.get(Number(item.id));
    delete item.id;
    if (article) {
      item._id = article.id;
      if (!item.link) item.link = article.link;
    }
    if (hasOrigin(topic)) item.origin = article ? article.origin : (groupOrigin || 'int');
    if (!item.published_time) item.published_time = '--:--';
    if (!grouped[topic]) grouped[topic] = [];
    grouped[topic].push(item);
  };

  if (Array.isArray(data.news)) {
    // Fallback para o formato antigo (array único "news"), caso o modelo responda assim
    for (const item of data.news) add(item.topic, item);
  } else {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'thread_of_day' || !Array.isArray(value)) continue;
      for (const item of value) add(key, item);
    }
  }
}

// Checagem final: nenhum evento pode aparecer duas vezes na edição,
// nem no mesmo tema nem em temas diferentes.
function dedupeSelected(grouped) {
  const seenLinks = new Set();
  const seenIds = new Set();
  const seenTokens = [];
  let removed = 0;
  const topics = [...TOPIC_ORDER, ...Object.keys(grouped).filter(t => !TOPIC_ORDER.includes(t))];
  for (const topic of topics) {
    if (!grouped[topic]) continue;
    grouped[topic] = grouped[topic].filter(item => {
      const link = canonicalLink(item.link);
      const tokens = titleTokens(item.title);
      const repeated = (link && seenLinks.has(link))
        || (item._id && seenIds.has(item._id))
        || seenTokens.some(t => isSameStory(tokens, t));
      if (repeated) { removed++; return false; }
      if (link) seenLinks.add(link);
      if (item._id) seenIds.add(item._id);
      seenTokens.push(tokens);
      return true;
    });
  }
  if (removed) console.log(`Checagem final: ${removed} notícia(s) repetida(s) removida(s)`);
}

// Segunda leitura pelo modelo: pega o mesmo fato contado com títulos sem
// palavras em comum (ex: duas fontes sobre o mesmo bug), que a comparação
// de títulos não alcança.
async function removeSameEvent(client, grouped) {
  const flat = [];
  for (const [topic, items] of Object.entries(grouped)) {
    for (const item of items) flat.push({ topic, item });
  }
  if (flat.length < 2) return;

  const prompt = `Abaixo estão as notícias escolhidas para uma edição de briefing. Identifique as que tratam do MESMO fato ou evento que outra da lista — mesmo com ângulo, fonte, título ou tema diferente (ex: duas notícias sobre a mesma falha de segurança, a mesma decisão de juros, o mesmo anúncio de empresa).

Notícias sobre o mesmo assunto geral, mas sobre fatos distintos, NÃO são repetidas (ex: dois ataques hackers a empresas diferentes; resultado de duas empresas diferentes).

Para cada grupo de repetidas, mantenha apenas a mais completa e liste as outras para remoção.

Retorne APENAS JSON válido: {"remover": [números das notícias a remover]} — lista vazia se não houver repetição.

NOTÍCIAS:
${flat.map((f, i) => `[${i + 1}] (${f.topic}) ${f.item.title} — ${String(f.item.summary || '').slice(0, 220)}`).join(String.fromCharCode(10))}`;

  try {
    const data = await callModel(client, prompt);
    const drop = new Set((data.remover || []).map(Number).filter(n => n >= 1 && n <= flat.length).map(n => flat[n - 1].item));
    if (!drop.size) return;
    for (const topic of Object.keys(grouped)) grouped[topic] = grouped[topic].filter(i => !drop.has(i));
    console.log(`Segunda leitura: ${drop.size} notícia(s) sobre o mesmo evento removida(s)`);
  } catch (e) {
    console.warn(`Segunda leitura de repetidas falhou: ${e.message}`);
  }
}

// Corta o excesso de cada tema e devolve o que ficou faltando para a cota exata.
function applyQuotas(grouped) {
  const deficits = [];
  for (const [group, [topic, origin]] of Object.entries(GROUPS)) {
    const items = grouped[topic] || [];
    if (origin) {
      const quota = QUOTAS[topic][origin];
      const mine = items.filter(i => i.origin === origin);
      const keep = new Set(mine.slice(0, quota));
      grouped[topic] = items.filter(i => i.origin !== origin || keep.has(i));
      if (mine.length < quota) deficits.push({ group, topic, origin, missing: quota - mine.length });
    } else {
      const quota = QUOTAS[topic];
      grouped[topic] = items.slice(0, quota);
      if (items.length < quota) deficits.push({ group, topic, origin, missing: quota - items.length });
    }
  }
  return deficits;
}

// Segunda chamada, só quando algum tema ficou abaixo da cota: completa com
// artigos reais ainda não usados daquele grupo.
async function fillGaps(client, deficits, pool, grouped, datePT) {
  const selected = Object.values(grouped).flat();
  const usedIds = new Set(selected.map(i => i._id).filter(Boolean));
  const selectedTokens = selected.map(i => titleTokens(i.title));

  const matches = (a, d) => d.origin
    ? hasOrigin(a.topic) && a.origin === d.origin
    : a.topic === d.topic;
  const candidates = pool.filter(a =>
    !usedIds.has(a.id)
    && deficits.some(d => matches(a, d))
    && !selectedTokens.some(t => isSameStory(titleTokens(a.title), t))
  );
  const fillable = deficits.filter(d => candidates.some(a => matches(a, d)));
  if (!fillable.length) return;

  const prompt = `Você é um curador de notícias. Hoje é ${datePT}. Uma edição de briefing ficou com menos notícias que o necessário em alguns grupos.

Selecione, APENAS entre os artigos da lista abaixo, a quantidade exata pedida para cada grupo:
${fillable.map(d => `- "${d.group}": exatamente ${d.missing} item(ns)`).join('\n')}

Regras:
- Nunca invente notícia: use somente artigos reais da lista.
- Grupos terminados em "_brasil" só aceitam artigos com ORIGEM: BRASIL; os terminados em "_internacional", só ORIGEM: INTERNACIONAL.
- "economia" = cenário macro (juros, inflação, câmbio, PIB, contas públicas, bancos centrais); "financas" = mercado e bolso (bolsa, investimentos, renda fixa, empresas, bancos, crédito, impostos, finanças pessoais).
- NÃO repita nenhum evento já publicado nesta edição:
${selected.map(i => `  · ${i.title}`).join('\n')}

Para cada notícia: resumo em português brasileiro com 6 a 8 linhas, direto ao ponto (contexto, o que aconteceu, quem está envolvido, impacto). Traduza o título para português. Valores, percentuais e datas só os que constam no artigo. Nunca use aspas duplas dentro dos textos.

Retorne APENAS JSON válido, com um array por grupo pedido:
{
  "${fillable[0].group}": [ { "id": 12, "title": "...", "summary": "...", "source": "...", "published_time": "HH:MM", "link": "https://..." } ]
}

ARTIGOS:
${formatArticles(candidates)}`;

  try {
    const data = await callModel(client, prompt);
    delete data.thread_of_day;
    collectItems(data, pool, grouped);
  } catch (e) {
    console.warn(`Não foi possível completar a cota: ${e.message}`);
  }
}

export async function selectAndSummarize(articles, apiKey) {
  const client = new Anthropic({ apiKey });

  const today = nowBR();
  const datePT = `${today.getUTCDate()} de ${MONTHS_PT[today.getUTCMonth()]} de ${today.getUTCFullYear()}`;

  const pool = buildPool(articles);
  const articlesText = formatArticles(pool);

  const recentTitles = loadRecentHistory(2).titles.slice(0, 70);
  const historyText = recentTitles.length
    ? `\nJÁ PUBLICADO NOS ÚLTIMOS DIAS — não selecione notícia sobre o mesmo evento, a não ser que haja um fato novo relevante (e, nesse caso, o resumo deve focar no que mudou):\n${recentTitles.map(t => `- ${t}`).join('\n')}\n`
    : '';

  const prompt = `Você é um curador de notícias especializado em economia, finanças, geopolítica e tecnologia, escrevendo para o público brasileiro. Hoje é ${datePT}.

A resposta deve ter 7 arrays separados, cada um com a quantidade EXATA de itens abaixo (nunca invente notícia, use sempre artigos reais da lista):
- "economia_brasil": exatamente 5 itens (somente artigos com ORIGEM: BRASIL)
- "economia_internacional": exatamente 3 itens (somente artigos com ORIGEM: INTERNACIONAL)
- "financas_brasil": exatamente 4 itens (somente artigos com ORIGEM: BRASIL)
- "financas_internacional": exatamente 2 itens (somente artigos com ORIGEM: INTERNACIONAL)
- "geopolitica": exatamente 4 itens
- "ia": exatamente 6 itens
- "crypto": exatamente 6 itens

Os artigos marcados com TEMA: ECONOMIA ou TEMA: FINANCAS formam um conjunto só: classifique cada um em economia ou finanças pelo assunto (definições abaixo), não pela marcação. A ORIGEM, porém, nunca muda.

Antes de finalizar, conte os itens de cada array. Se algum tiver menos que o exigido, volte à lista de artigos e complete com as melhores opções restantes daquele grupo, mesmo que precise relaxar um pouco o critério de repercussão — mas nunca repetindo um evento já usado.

REGRAS GERAIS — válidas para todos os temas:
1. BREAKING NEWS e eventos de alto impacto têm prioridade ABSOLUTA.
2. Prefira sempre notícias das últimas horas — quanto mais fresca, melhor.
3. PROIBIDO REPETIR. Cada evento ou assunto aparece UMA única vez em toda a edição — mesmo que venha de fontes diferentes, com títulos diferentes, em idiomas diferentes ou pareça se encaixar em mais de um tema (ex: a mesma decisão do Copom não pode aparecer em economia e em finanças; uma notícia sobre IA aplicada a criptomoedas aparece em APENAS UM tema; a mesma alta do Bitcoin contada por dois sites é UMA notícia). Escolha o tema mais adequado e a melhor cobertura. Antes de finalizar, releia todos os títulos escolhidos e troque qualquer um que trate do mesmo fato que outro.
4. EXCLUIR: notícias de projetos pequenos e irrelevantes, opiniões sem fato concreto, conteúdo patrocinado e publicidade, resultados de loterias, horóscopo, esportes, cultura e entretenimento.
5. EXCLUIR notícias "frias" — factuais sem impacto real, sem tendência, sem repercussão. Priorize sempre o que está gerando buzz, debate ou consequência prática agora.
6. EXCLUIR notícias isoladas, genéricas ou de baixo impacto — sejam internacionais (ex: crimes locais, casos pontuais sem repercussão global) ou nacionais (Brasil) sem conexão clara com tendências maiores.
7. Valores, percentuais, cotações, taxas e datas: use SOMENTE os que constam no artigo. Nunca estime, arredonde por conta própria ou complete com números de memória.
${historyText}
REGRAS POR TEMA:

ECONOMIA (cenário macro) — priorizar:
- Brasil: Selic e decisões do Copom, inflação (IPCA), dólar e câmbio, PIB, emprego e renda
- Brasil: contas públicas, arcabouço fiscal, orçamento, reforma tributária e medidas do governo e do Banco Central
- Brasil: comércio exterior, agronegócio, indústria e setores que movem a economia
- Internacional: Fed, BCE e outros bancos centrais, inflação e emprego nos EUA
- Internacional: China, petróleo, commodities, tarifas e guerras comerciais
- Sempre que possível, explique o impacto para o brasileiro comum

FINANÇAS (mercado e bolso) — priorizar:
- Brasil: Ibovespa e ações em destaque, resultados e dividendos de empresas, IPOs, fusões e aquisições
- Brasil: renda fixa, Tesouro Direto, CDBs, fundos imobiliários e fundos de investimento
- Brasil: bancos, fintechs, crédito, Pix, endividamento, imposto de renda e regras que afetam o investidor
- Brasil: finanças pessoais com fato novo (mudanças de regra, novos produtos, golpes relevantes)
- Internacional: Wall Street, S&P 500, Nasdaq, big techs na bolsa, juros dos Treasuries, ouro
- Sempre que possível, explique o que muda para quem investe ou para o bolso

GEOPOLÍTICA — priorizar:
- Guerras ativas, escaladas militares e ataques relevantes
- Eleições em países que impactam a ordem global
- Tensões EUA-China, Rússia-Ucrânia, Oriente Médio
- Sanções, embargos e movimentos diplomáticos importantes
- Brasil no cenário internacional
- Crises humanitárias de grande escala
- Fatos políticos que impactam mercados, Fed, BCE ou juros globais
- Decisões de líderes que afetam a economia global

INTELIGÊNCIA ARTIFICIAL — priorizar:
- Lançamentos de modelos novos (OpenAI, Google, Anthropic, Meta e outros)
- Regulação de IA na Europa, EUA e Brasil
- Impacto da IA no mercado de trabalho e demissões em massa
- Aplicações reais com casos de uso concretos
- Financiamentos e aquisições grandes no setor
- Parcerias entre big techs e governos
- IA em saúde, educação e finanças
- Competição EUA vs China em IA
- Uso de IA em eleições e desinformação

CRIPTOMOEDAS — priorizar:
- Movimentos grandes de preço (BTC, ETH e altcoins relevantes)
- Decisões regulatórias (SEC, CVM, governos)
- Adoção institucional (empresas, bancos, ETFs)
- Hacks, exploits e falências relevantes
- Lançamentos e atualizações de protocolos importantes
- Notícias brasileiras de cripto
- Decisões do Fed e bancos centrais que afetam cripto
- Movimentos de grandes carteiras (baleias)
- Stablecoins — descolamentos, regulação, novos lançamentos
- Bitcoin como reserva estratégica de países e empresas
- ETFs de cripto (mencionar pouco, só se houver fato muito relevante)
- Projetos e tokens ganhando tração/atenção no momento (ex: Hyperliquid, novas L2s, memecoins relevantes, narrativas virais)

Para cada notícia: escreva um resumo em português brasileiro com 6 a 8 linhas, direto ao ponto, explicando o contexto, o que aconteceu, quem está envolvido e o impacto. Traduza os títulos para português. Inclua o link original da notícia e, no campo "id", o número entre colchetes do artigo usado.

Além das notícias, gere um "fio condutor do dia" (campo thread_of_day): um parágrafo editorial de 3 a 4 frases conectando os principais temas do dia, explicando o que une as notícias mais importantes desta edição.

Retorne APENAS JSON válido, sem texto antes ou depois, seguindo EXATAMENTE esta estrutura com 7 arrays separados (não use um array único "news"). IMPORTANTE: nos campos de texto (summary, title, thread_of_day), nunca use aspas duplas — use aspas simples ou reescreva a frase para evitá-las:
{
  "thread_of_day": "Parágrafo editorial de 3 a 4 frases conectando os principais temas do dia.",
  "economia_brasil": [
    { "id": 12, "title": "Título em português", "summary": "Resumo direto com 6 a 8 linhas.", "source": "Fonte", "published_time": "HH:MM", "link": "https://..." }
  ],
  "economia_internacional": [ { "id": 0, "title": "...", "summary": "...", "source": "...", "published_time": "HH:MM", "link": "..." } ],
  "financas_brasil": [ { "id": 0, "title": "...", "summary": "...", "source": "...", "published_time": "HH:MM", "link": "..." } ],
  "financas_internacional": [ { "id": 0, "title": "...", "summary": "...", "source": "...", "published_time": "HH:MM", "link": "..." } ],
  "geopolitica": [ { "id": 0, "title": "...", "summary": "...", "source": "...", "published_time": "HH:MM", "link": "..." } ],
  "ia": [ { "id": 0, "title": "...", "summary": "...", "source": "...", "published_time": "HH:MM", "link": "..." } ],
  "crypto": [ { "id": 0, "title": "...", "summary": "...", "source": "...", "published_time": "HH:MM", "link": "..." } ]
}

ARTIGOS:
${articlesText}`;

  const data = await callModel(client, prompt);
  const threadOfDay = data.thread_of_day || '';

  const grouped = {};
  collectItems(data, pool, grouped);
  dedupeSelected(grouped);
  await removeSameEvent(client, grouped);

  // Garante a cota exata por tema: corta o excesso e, se faltar, completa
  // uma vez com artigos reais ainda não usados.
  let deficits = applyQuotas(grouped);
  if (deficits.length) {
    console.log(`Abaixo da cota: ${deficits.map(d => `${d.group} (-${d.missing})`).join(', ')} — tentando completar`);
    await fillGaps(client, deficits, pool, grouped, datePT);
    dedupeSelected(grouped);
    deficits = applyQuotas(grouped);
  }
  for (const d of deficits) {
    console.warn(`Cota não atingida em ${d.group}: faltaram ${d.missing} (sem notícia real e inédita disponível)`);
  }

  for (const topic of Object.keys(grouped)) {
    if (!grouped[topic].length) { delete grouped[topic]; continue; }
    for (const item of grouped[topic]) delete item._id;
    grouped[topic].sort((a, b) => b.published_time.localeCompare(a.published_time));
  }

  const totalSelecionado = Object.values(grouped).reduce((sum, items) => sum + items.length, 0);
  console.log(`Claude selecionou ${totalSelecionado} notícias (${Object.entries(grouped).map(([t, v]) => `${t}: ${v.length}`).join(', ')})`);
  return { grouped, threadOfDay };
}

// ─── HTML GENERATION ───────────────────────────────────────────────────────

export function generateHTML(grouped, today, prevSlug, nextSlug, allSlugs = [], threadOfDay = '') {
  const datePT = `${today.getUTCDate()} de ${MONTHS_PT[today.getUTCMonth()]} de ${today.getUTCFullYear()}`.toUpperCase();
  const dateCompact = `${String(today.getUTCDate()).padStart(2,'0')} ${MONTHS_PT[today.getUTCMonth()].slice(0,3)} ${today.getUTCFullYear()}`;
  const slug = dateSlug(today);

  const prevBtn = prevSlug
    ? `<a class="page-btn" href="../${prevSlug}/">← Anterior</a>`
    : `<span class="page-btn disabled">← Anterior</span>`;
  const nextBtn = nextSlug
    ? `<a class="page-btn" href="../${nextSlug}/">Próximo →</a>`
    : `<span class="page-btn disabled">Próximo →</span>`;
  const hojeBtn = `<a id="btnHoje" class="page-btn" style="display:none;" href="#">Hoje</a>`;

  const slugsForDropdown = allSlugs.length > 0 ? allSlugs : [slug];
  const dropdownOptions = slugsForDropdown.map(s =>
    `<option value="${s}"${s === slug ? ' selected' : ''}>${s}</option>`
  ).join('');
  const dateDropdown = `<select class="date-select" id="date-select" onchange="goToDate(this.value)">${dropdownOptions}</select>`;

  const threadBtn = threadOfDay
    ? `<button class="topic-pill" data-topic="thread" onclick="toggleThread()" style="color:#00C4B4;border-color:rgba(0,196,180,0.4);background:rgba(0,196,180,0.08);">✦ Fio do Dia</button>`
    : '';

  const topicNav = [
    `<button class="topic-pill active" data-topic="all" onclick="filterTopic('all')" style="color:#00C4B4;border-color:rgba(0,196,180,0.4);background:rgba(0,196,180,0.15);">Todos</button>`,
    ...TOPIC_ORDER
      .filter(t => grouped[t])
      .map(t => `<button class="topic-pill" data-topic="${t}" onclick="filterTopic('${t}')" style="color:${ACCENT_COLORS[t]};border-color:${ACCENT_COLORS[t]}40;background:${ACCENT_COLORS[t]}15;">${TOPIC_ICONS[t]} ${TOPIC_NAMES[t]}</button>`),
    threadBtn,
  ].join('\n    ');

  const threadSection = threadOfDay ? `
<div class="thread-section" id="thread-section" style="display:none;">
  <div class="thread-inner">
    <div class="thread-label">Fio Condutor do Dia</div>
    <div class="thread-text">${escapeHTML(threadOfDay)}</div>
  </div>
</div>` : '';

  let globalNewsCount = 0;

  const sections = TOPIC_ORDER
    .filter(t => grouped[t])
    .map(t => {
      const color = ACCENT_COLORS[t];
      let sectionItems = '';

      for (const item of grouped[t]) {
        globalNewsCount++;
        sectionItems += `
      <div class="news-item" style="border-left-color:${color};" data-searchable="${escapeHTML(item.title)} ${escapeHTML(item.summary)} ${escapeHTML(item.source)}" data-title="${escapeHTML(item.title)}" data-share-url="${escapeHTML(item.link || '')}">
        <div class="news-meta">
          <span class="news-date">${dateCompact}</span>
          <span class="news-time">${escapeHTML(item.published_time)}</span>
          <span class="news-source">${escapeHTML(item.source)}</span>
        </div>
        <div class="news-title">${escapeHTML(item.title)}</div>
        <div class="news-summary">${escapeHTML(item.summary)}</div>
        ${item.link ? `<div class="news-link"><a href="${escapeHTML(item.link)}" target="_blank" rel="noopener">🔗 Ver notícia original</a></div>` : ''}
        <div class="share-btns">
          <a class="share-btn share-wa" href="#" target="_blank" rel="noopener">&#128232; WhatsApp</a>
          <a class="share-btn share-x" href="#" target="_blank" rel="noopener">X</a>
        </div>
      </div>`;

      }

      return `
  <div class="section" id="${t}">
    <div class="section-header">
      <div class="section-dot" style="background:${color};box-shadow:0 0 10px ${color}80;"></div>
      <div class="section-title" style="color:${color};">${TOPIC_ICONS[t]} ${TOPIC_NAMES[t]}</div>
    </div>
    ${sectionItems}
  </div>`;
    }).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily Briefing — Renata Doro IA &amp; Tech</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0F172A; color: #F8FAFC; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; }

  #neural-bg { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }

  .hero, .ticker-bar, .thread-section, .pagination, .topics-nav, .search-bar,
  .section, .newsletter-section, .search-empty, .footer, .fab-group { position: relative; z-index: 1; }

  /* HERO */
  .hero { padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .hero-title { font-size: 24px; font-weight: 800; color: #F8FAFC; letter-spacing: -0.5px; line-height: 1.2; font-family: 'Space Grotesk', sans-serif; }
  .hero-title span { background: linear-gradient(135deg, #00C4B4, #7C3AED); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .hero-brand { font-size: 13px; color: #94A3B8; margin-top: 6px; font-weight: 500; }
  .hero-date { font-size: 10px; color: #475569; margin-top: 5px; letter-spacing: 3px; text-transform: uppercase; }

  /* TICKER */
  .ticker-bar { display: flex; justify-content: center; flex-wrap: wrap; background: #0B1120; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .ticker-item { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-right: 1px solid rgba(255,255,255,0.05); font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .ticker-item:last-child { border-right: none; }
  .ticker-label { color: #475569; text-transform: uppercase; letter-spacing: 1px; font-size: 10px; }
  .ticker-value { color: #F8FAFC; }
  .ticker-value.up { color: #84CC16; }
  .ticker-value.down { color: #EF4444; }
  .ticker-fng { font-weight: 700; }
  .ticker-loading { color: #334155; }

  /* THREAD */
  .thread-section { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .thread-inner { max-width: 760px; margin: 0 auto; background: rgba(0,196,180,0.06); border: 1px solid rgba(0,196,180,0.2); border-left: 3px solid #00C4B4; border-radius: 0 8px 8px 0; padding: 16px 20px; }
  .thread-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #00C4B4; margin-bottom: 8px; }
  .thread-text { font-size: 14px; color: #94A3B8; line-height: 1.75; }

  /* PAGINATION */
  .pagination { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 12px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); background: #0F172A; flex-wrap: wrap; }
  .page-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-decoration: none; border: 1px solid rgba(255,255,255,0.08); color: #94A3B8; transition: .2s; text-transform: uppercase; }
  .page-btn:hover { border-color: #00C4B4; color: #00C4B4; }
  .page-btn.disabled { opacity: 0.2; pointer-events: none; }
  .date-select { background: #1E2937; border: 1px solid rgba(255,255,255,0.08); color: #94A3B8; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; padding: 6px 10px; border-radius: 8px; cursor: pointer; outline: none; transition: .2s; }
  .date-select:hover, .date-select:focus { border-color: #00C4B4; color: #F8FAFC; }

  /* TOPICS NAV */
  .topics-nav { display: flex; gap: 8px; justify-content: center; padding: 12px 24px; flex-wrap: wrap; border-bottom: 1px solid rgba(255,255,255,0.05); background: #0F172A; position: sticky; top: 0; z-index: 100; }
  .topic-pill { padding: 5px 14px; border-radius: 100px; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border: 1px solid; text-decoration: none; transition: all 0.15s; cursor: pointer; background: none; }
  .topic-pill:hover { opacity: 0.8; transform: translateY(-1px); }
  .topic-pill.active { opacity: 1; transform: translateY(-1px); box-shadow: 0 0 12px rgba(0,0,0,0.3); }

  /* SEARCH */
  .search-bar { display: none; padding: 10px 24px; background: #0F172A; border-bottom: 1px solid rgba(255,255,255,0.05); position: sticky; top: 49px; z-index: 99; }
  .search-bar.open { display: block; }
  .search-input { width: 100%; max-width: 600px; display: block; margin: 0 auto; background: #1E2937; border: 1px solid rgba(0,196,180,0.2); color: #F8FAFC; padding: 9px 16px; border-radius: 8px; font-size: 13px; font-family: 'Inter', sans-serif; outline: none; transition: .2s; }
  .search-input:focus { border-color: #00C4B4; }
  .search-input::placeholder { color: #475569; }

  /* SECTIONS */
  .section { border-bottom: 1px solid rgba(255,255,255,0.04); padding: 40px 24px; max-width: 760px; margin: 0 auto; }
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .section-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .section-title { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }

  /* NEWS ITEMS */
  .news-item { padding: 18px 0 18px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); border-left: 3px solid #00C4B4; transition: background 0.15s; }
  .news-item:last-child { border-bottom: none; }
  .news-item.hidden { display: none; }
  .news-item:hover { background: rgba(255,255,255,0.01); border-radius: 0 4px 4px 0; }
  .news-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .news-date { font-size: 10px; color: #475569; font-weight: 600; background: #1E2937; padding: 2px 7px; border-radius: 4px; }
  .news-time { font-size: 10px; color: #475569; font-weight: 700; background: #1E2937; padding: 2px 7px; border-radius: 4px; }
  .news-source { font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
  .news-title { font-size: 15px; font-weight: 700; color: #CBD5E1; line-height: 1.45; margin-bottom: 10px; font-family: 'Space Grotesk', sans-serif; }
  .news-summary { font-size: 13px; color: #94A3B8; line-height: 1.75; margin-bottom: 12px; }
  .news-link { margin-bottom: 10px; }
  .news-link a { font-size: 12px; color: #475569; text-decoration: none; }
  .news-link a:hover { color: #00C4B4; }

  /* SHARE BUTTONS */
  .share-btns { display: flex; gap: 8px; flex-wrap: wrap; }
  .share-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-decoration: none; padding: 4px 10px; border-radius: 6px; border: 1px solid; transition: .15s; font-family: 'Inter', sans-serif; }
  .share-wa { color: #25D366; border-color: rgba(37,211,102,0.25); background: rgba(37,211,102,0.06); }
  .share-wa:hover { background: rgba(37,211,102,0.12); }
  .share-x { color: #94A3B8; border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); }
  .share-x:hover { border-color: rgba(255,255,255,0.2); color: #F8FAFC; }

  /* NEWSLETTER MODAL */
  .nl-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 300; align-items: flex-end; justify-content: flex-end; padding: 90px 24px; }
  .nl-overlay.open { display: flex; }
  .nl-modal-box { background: #1E2937; border: 1px solid rgba(0,196,180,0.2); border-radius: 12px; padding: 20px; width: 280px; box-shadow: 0 0 40px rgba(0,196,180,0.1); }
  .nl-modal-close { float: right; background: none; border: none; color: #475569; font-size: 14px; cursor: pointer; padding: 0; line-height: 1; }
  .nl-modal-close:hover { color: #94A3B8; }
  .nl-title { font-size: 14px; font-weight: 700; color: #F8FAFC; font-family: 'Space Grotesk', sans-serif; margin-bottom: 4px; }
  .nl-sub { font-size: 11px; color: #94A3B8; margin-bottom: 14px; }
  .nl-form { display: flex; flex-direction: column; gap: 8px; }
  .nl-input { background: #0F172A; border: 1px solid rgba(255,255,255,0.1); color: #F8FAFC; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-family: 'Inter', sans-serif; outline: none; transition: .2s; }
  .nl-input:focus { border-color: #00C4B4; }
  .nl-input::placeholder { color: #475569; }
  .nl-btn { background: linear-gradient(135deg, #00C4B4, #7C3AED); color: #fff; border: none; padding: 8px 14px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; transition: opacity .15s; }
  .nl-btn:hover { opacity: 0.9; }

  /* SEARCH EMPTY */
  .search-empty { display: none; text-align: center; padding: 60px 24px; color: #475569; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; }

  /* FOOTER */
  .footer { text-align: center; padding: 32px 24px; color: #334155; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; border-top: 1px solid rgba(255,255,255,0.04); }
  .footer a { color: #475569; text-decoration: none; }
  .footer a:hover { color: #00C4B4; }

  /* FAB */
  .fab-group { position: fixed; bottom: 28px; right: 24px; display: flex; flex-direction: column; gap: 10px; z-index: 200; }
  .fab { width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.08); background: #1E2937; color: #94A3B8; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .2s; }
  .fab:hover { border-color: #00C4B4; color: #00C4B4; }
  .fab.active { border-color: #00C4B4; color: #00C4B4; background: rgba(0,196,180,0.1); }

  /* MOBILE */
  @media (max-width: 600px) {
    .hero-title { font-size: 20px; }
    .ticker-bar { display: grid; grid-template-columns: 1fr 1fr; }
    .ticker-item { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 12px; }
    .section { padding: 28px 16px; }
    .news-item { padding-left: 12px; }
    .news-title { font-size: 14px; }
    .news-summary { font-size: 12px; }
    .topics-nav { overflow-x: auto; flex-wrap: nowrap; justify-content: flex-start; padding: 10px 16px; }
    .nl-input { width: 100%; }
  }
</style>
</head>
<body>
<canvas id="neural-bg"></canvas>

<div class="hero">
  <div class="hero-title">Daily Briefing</div>
  <div class="hero-brand">Renata Doro IA &amp; Cripto</div>
  <div class="hero-date">${datePT}</div>
</div>

<div class="ticker-bar">
  <div class="ticker-item">
    <span class="ticker-label">BTC/USD</span>
    <span class="ticker-value ticker-loading" id="btc-usd">—</span>
  </div>
  <div class="ticker-item">
    <span class="ticker-label">BTC/BRL</span>
    <span class="ticker-value ticker-loading" id="btc-brl">—</span>
  </div>
  <div class="ticker-item">
    <span class="ticker-label">ETH/USD</span>
    <span class="ticker-value ticker-loading" id="eth-usd">—</span>
  </div>
  <div class="ticker-item">
    <span class="ticker-label">Fear &amp; Greed</span>
    <span class="ticker-value ticker-fng ticker-loading" id="fng">—</span>
  </div>
</div>

${threadSection}

<div class="pagination">
  ${prevBtn}
  ${dateDropdown}
  ${nextBtn}
  ${hojeBtn}
</div>
<div class="topics-nav">
  ${topicNav}
  <button class="topic-pill" onclick="toggleSearch()" style="color:#475569;border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);">🔍 Buscar</button>
</div>
<div class="search-bar" id="searchBar">
  <input class="search-input" id="searchInput" type="text" placeholder="Buscar notícias..." oninput="filterNews(this.value)">
</div>
${sections}
<div class="search-empty" id="searchEmpty">Nenhuma notícia encontrada</div>
<div class="footer">
  Daily Briefing &nbsp;·&nbsp; <a href="https://x.com/renatadoro1" target="_blank">@renatadoro1</a>
  &nbsp;·&nbsp; <a href="https://cripto-educacional.pages.dev" target="_blank">Cripto Educacional</a>
  &nbsp;·&nbsp; © ${today.getUTCFullYear()}
</div>
<div class="nl-overlay" id="nlOverlay">
  <div class="nl-modal-box">
    <button class="nl-modal-close" onclick="toggleNewsletter()">✕</button>
    <div class="nl-title">Receba o Daily Briefing</div>
    <div class="nl-sub">Todo dia no seu email. Gratuito.</div>
    <form class="nl-form" action="https://formspree.io/f/mqejkokq" method="POST" onsubmit="return nlSubmit(this)">
      <input class="nl-input" type="email" name="email" placeholder="seu@email.com" required>
      <button class="nl-btn" type="submit">Inscrever</button>
    </form>
  </div>
</div>
<div class="fab-group">
  <button class="fab" id="fabNewsletter" onclick="toggleNewsletter()" title="Receber por email">✉</button>
  <button class="fab" id="fabSearch" onclick="toggleSearch()">🔍</button>
  <button class="fab" onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})">↓</button>
</div>
<script>
  // Rede neural animada no fundo
  (function() {
    const canvas = document.getElementById('neural-bg');
    const ctx = canvas.getContext('2d');
    function draw() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const W = canvas.width, H = canvas.height;
      const nodes = [];
      for (let i = 0; i < 35; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H });
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            ctx.strokeStyle = 'rgba(0,196,180,' + (0.07 * (1 - dist / 180)) + ')';
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }
      nodes.forEach(function(n) {
        ctx.fillStyle = 'rgba(0,196,180,0.15)';
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2); ctx.fill();
      });
    }
    draw(); window.addEventListener('resize', draw);
  })();

  // Formata labels do dropdown de datas
  (function() {
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const sel = document.getElementById('date-select');
    if (!sel) return;
    Array.from(sel.options).forEach(function(opt) {
      const parts = opt.value.split('-');
      if (parts.length === 3) opt.textContent = parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
    });
  })();

  function goToDate(slug) { if (slug) window.location.href = '../' + slug + '/'; }

  // Botão "Hoje" — aparece apenas quando não estamos na página de hoje
  (function() {
    function todayBRT() {
      const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
      return d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0') + '-' + String(d.getUTCDate()).padStart(2,'0');
    }
    const today = todayBRT();
    const parts = window.location.pathname.split('/').filter(Boolean);
    const current = parts[parts.length - 1] || '';
    const btn = document.getElementById('btnHoje');
    if (btn && current !== today) {
      btn.href = '/' + today + '/';
      btn.style.display = 'inline-flex';
    }
  })();

  // Share buttons
  document.querySelectorAll('.news-item').forEach(function(item) {
    const title = item.dataset.title || item.querySelector('.news-title')?.textContent || '';
    const url = item.dataset.shareUrl || window.location.href;
    const wa = item.querySelector('.share-wa');
    const x = item.querySelector('.share-x');
    if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(title + '\\n' + url);
    if (x) x.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url) + '&via=renatadoro1';
  });

  // Fio condutor do dia
  function toggleThread() {
    const section = document.getElementById('thread-section');
    const btn = document.querySelector('.topic-pill[data-topic="thread"]');
    if (!section) return;
    const isOpen = section.style.display !== 'none';
    section.style.display = isOpen ? 'none' : 'block';
    btn.classList.toggle('active', !isOpen);
  }

  // Filtro por nicho
  function filterTopic(topic) {
    const sections = document.querySelectorAll('.section');
    const pills = document.querySelectorAll('.topic-pill[data-topic]');
    pills.forEach(function(p) { p.classList.remove('active'); });
    document.querySelector('.topic-pill[data-topic="' + topic + '"]').classList.add('active');
    sections.forEach(function(s) {
      s.style.display = (topic === 'all' || s.id === topic) ? '' : 'none';
    });
  }

  // Accordion das notícias
  function toggleItem(item) {
    const isOpen = item.classList.contains('open');
    item.classList.toggle('open', !isOpen);
  }

  // Busca
  function toggleSearch() {
    const bar = document.getElementById('searchBar');
    const btn = document.getElementById('fabSearch');
    const open = bar.classList.toggle('open');
    btn.classList.toggle('active', open);
    if (open) document.getElementById('searchInput').focus();
    else { filterNews(''); document.getElementById('searchInput').value = ''; }
  }
  function filterNews(q) {
    const term = q.toLowerCase().trim();
    const items = document.querySelectorAll('.news-item');
    const sections = document.querySelectorAll('.section');
    let any = false;
    items.forEach(function(item) {
      const match = !term || (item.dataset.searchable||'').toLowerCase().includes(term);
      item.classList.toggle('hidden', !match);
      if (match) any = true;
    });
    sections.forEach(function(s) {
      const vis = s.querySelectorAll('.news-item:not(.hidden)').length > 0;
      s.style.display = (!term || vis) ? '' : 'none';
    });
    document.getElementById('searchEmpty').style.display = (term && !any) ? 'block' : 'none';
  }

  // Ticker de preços
  async function updateTicker() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,brl');
      const data = await res.json();
      const btcUsd = data?.bitcoin?.usd;
      const btcBrl = data?.bitcoin?.brl;
      const ethUsd = data?.ethereum?.usd;
      if (btcUsd) { const el = document.getElementById('btc-usd'); el.textContent = '$' + btcUsd.toLocaleString('en-US'); el.classList.remove('ticker-loading'); }
      if (btcBrl) { const el = document.getElementById('btc-brl'); el.textContent = 'R$ ' + btcBrl.toLocaleString('pt-BR'); el.classList.remove('ticker-loading'); }
      if (ethUsd) { const el = document.getElementById('eth-usd'); el.textContent = '$' + ethUsd.toLocaleString('en-US'); el.classList.remove('ticker-loading'); }
    } catch(e) {}
    try {
      const res2 = await fetch('https://api.alternative.me/fng/');
      const data2 = await res2.json();
      const val = data2?.data?.[0];
      if (val) {
        const el = document.getElementById('fng');
        el.textContent = val.value + ' — ' + val.value_classification;
        el.classList.remove('ticker-loading');
        const v = parseInt(val.value);
        if (v >= 55) el.classList.add('up');
        else if (v <= 40) el.classList.add('down');
      }
    } catch(e) {}
  }
  updateTicker();
  setInterval(updateTicker, 5 * 60 * 1000);

  function toggleNewsletter() {
    const overlay = document.getElementById('nlOverlay');
    const btn = document.getElementById('fabNewsletter');
    const isOpen = overlay.classList.contains('open');
    overlay.classList.toggle('open', !isOpen);
    btn.classList.toggle('active', !isOpen);
  }

  function nlSubmit(form) {
    var btn = form.querySelector('.nl-btn');
    if (btn) { btn.textContent = 'Enviando...'; btn.disabled = true; }
    return true;
  }
</script>
</body>
</html>`;
}

// ─── NETLIFY DEPLOY ────────────────────────────────────────────────────────

export async function deployToNetlify(slug, htmlContent, token, siteId) {
  const authHeaders = { Authorization: `Bearer ${token}` };

  let existingHashes = {};
  try {
    const siteResp = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers: authHeaders });
    const site = await siteResp.json();
    const deployId = site.published_deploy?.id;
    if (deployId) {
      const deployResp = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}`, { headers: authHeaders });
      const deploy = await deployResp.json();
      existingHashes = deploy.files || {};
      console.log(`Arquivos existentes: ${Object.keys(existingHashes).length}`);
    }
  } catch (e) {
    console.warn('Não foi possível buscar deploy existente:', e.message);
  }

  const htmlBuf = Buffer.from(htmlContent, 'utf-8');
  const redirectBuf = Buffer.from(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/${slug}/"><title>Daily Briefing</title></head><body><script>window.location.replace("/${slug}/")<\/script></body></html>`,
    'utf-8'
  );

  const newFiles = {
    [`/${slug}/index.html`]: htmlBuf,
    '/index.html': redirectBuf,
  };

  const allHashes = { ...existingHashes };
  for (const [path, buf] of Object.entries(newFiles)) {
    allHashes[path] = sha1(buf);
  }

  const deployResp = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: allHashes }),
  });
  if (!deployResp.ok) throw new Error(`Netlify deploy error ${deployResp.status}: ${await deployResp.text()}`);

  const deployData = await deployResp.json();
  const deployId = deployData.id;
  const required = new Set(deployData.required || []);

  for (const [path, buf] of Object.entries(newFiles)) {
    if (!required.has(sha1(buf))) continue;
    const up = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}/files${path}`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/octet-stream' },
      body: buf,
    });
    if (!up.ok) throw new Error(`Upload error ${up.status} for ${path}`);
    console.log(`Uploaded: ${path}`);
  }

  const url = `https://${siteId}.netlify.app/${slug}/`;
  console.log(`Deploy concluído: ${url}`);
  return url;
}

// ─── PIPELINE PRINCIPAL ────────────────────────────────────────────────────

export async function runBriefing() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const token = process.env.NETLIFY_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não definida');
  if (!token)  throw new Error('NETLIFY_TOKEN não definida');
  if (!siteId) throw new Error('NETLIFY_SITE_ID não definida');

  const today = nowBR();
  const slug = dateSlug(today);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  DAILY BRIEFING — ${slug}`);
  console.log(`${'─'.repeat(50)}\n`);

  const articles = await fetchArticles();
  if (!articles.length) throw new Error('Nenhum artigo coletado');

  const { grouped, threadOfDay } = await selectAndSummarize(articles, apiKey);

  // Busca arquivos existentes no deploy para prev/next e dropdown de datas
  let prevExists = false, nextExists = false;
  let allSlugs = [slug];
  try {
    const siteResp = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers: { Authorization: `Bearer ${token}` } });
    const site = await siteResp.json();
    const deployId = site.published_deploy?.id;
    if (deployId) {
      const deployResp = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}`, { headers: { Authorization: `Bearer ${token}` } });
      const deploy = await deployResp.json();
      const files = deploy.files || {};

      const prev = new Date(today); prev.setDate(prev.getDate() - 1);
      const next = new Date(today); next.setDate(next.getDate() + 1);
      prevExists = (`/${dateSlug(prev)}/index.html` in files);
      nextExists = (`/${dateSlug(next)}/index.html` in files);

      // Extrai todos os slugs de data existentes
      const existingSlugs = Object.keys(files)
        .filter(p => /^\/\d{4}-\d{2}-\d{2}\/index\.html$/.test(p))
        .map(p => p.split('/')[1]);
      allSlugs = [...new Set([...existingSlugs, slug])].sort();
    }
  } catch {}

  const prev = new Date(today); prev.setDate(prev.getDate() - 1);
  const next = new Date(today); next.setDate(next.getDate() + 1);

  const html = generateHTML(
    grouped,
    today,
    prevExists ? dateSlug(prev) : null,
    nextExists ? dateSlug(next) : null,
    allSlugs,
    threadOfDay
  );

  const url = await deployToNetlify(slug, html, token, siteId);

  const total = Object.values(grouped).reduce((s, v) => s + v.length, 0);
  console.log(`\n✅ ${total} notícias publicadas!`);
  console.log(`🔗 ${url}\n`);

  return url;
}
