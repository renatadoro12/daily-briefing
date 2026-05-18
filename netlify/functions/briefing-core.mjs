import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import Parser from 'rss-parser';

// ─── CONFIG ────────────────────────────────────────────────────────────────

const FEEDS = {
  geopolitica: [
    'https://feeds.apnews.com/apnews/world-news',
    'https://feeds.apnews.com/apnews/us-news',
    'https://feeds.reuters.com/reuters/worldNews',
    'http://feeds.bbci.co.uk/news/world/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.theguardian.com/world/rss',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://rss.dw.com/rdf/rss-en-world',
    'https://feeds.skynews.com/feeds/rss/world.xml',
    'https://www.npr.org/rss/rss.php?id=1004',
    'https://g1.globo.com/rss/g1/mundo/feed.xml',
    'https://rss.politico.com/politics-news.xml',
  ],
  economia: [
    'https://feeds.apnews.com/apnews/business',
    'https://feeds.reuters.com/reuters/businessNews',
    'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
    'http://feeds.bbci.co.uk/news/business/rss.xml',
    'https://www.cnbc.com/id/10001147/device/rss/rss.html',
    'https://www.forbes.com/business/feed/',
    'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
    'https://feeds.bloomberg.com/economics/news.rss',
    'https://www.infomoney.com.br/feed/',
    'https://valor.globo.com/rss/',
    'https://api.axios.com/feed/',
    'https://thehill.com/feed/',
    'https://qz.com/feed/',
    'https://www.investopedia.com/feedbuilder/feed/getfeed/?feedType=rss',
  ],
  ia: [
    'https://www.technologyreview.com/feed/',
    'https://feeds.bloomberg.com/technology/news.rss',
    'https://www.theverge.com/rss/index.xml',
    'https://techcrunch.com/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://venturebeat.com/category/ai/feed/',
    'https://www.wired.com/feed/tag/artificial-intelligence/rss',
    'https://feeds.arstechnica.com/arstechnica/index',
    'https://openai.com/blog/rss.xml',
    'https://blog.google/technology/ai/rss/',
    'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
    'https://gizmodo.com/feed/rss',
    'https://spectrum.ieee.org/feeds/feed.rss',
    'https://www.analyticsvidhya.com/feed/',
    'https://towardsdatascience.com/feed',
    'https://www.artificialintelligence-news.com/feed/',
    'https://rss.tecmundo.com.br/feed',
    'https://olhardigital.com.br/feed/',
    'https://canaltech.com.br/rss/',
    'https://startups.com.br/feed/',
    'https://feeds.folha.uol.com.br/tec/rss091.xml',
  ],
  web3: [
    'https://www.theblock.co/rss.xml',
    'https://beincrypto.com/category/web3/feed/',
    'https://thedefiant.io/feed',
    'https://www.bankless.com/feed',
    'https://messari.io/rss/news.xml',
  ],
  crypto: [
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://cointelegraph.com/rss',
    'https://cryptoslate.com/feed/',
    'https://bitcoinmagazine.com/.rss/full/',
    'https://decrypt.co/feed',
    'https://br.cointelegraph.com/rss',
    'https://livecoins.com.br/feed/',
    'https://portaldobitcoin.uol.com.br/feed/',
    'https://cointimes.com.br/feed/',
  ],
};

const ACCENT_COLORS = {
  geopolitica: '#7C3AED',
  economia: '#84CC16',
  ia: '#00C4B4',
  web3: '#3B82F6',
  crypto: '#F59E0B',
};

const TOPIC_NAMES = {
  geopolitica: 'Geopolítica',
  economia: 'Economia',
  ia: 'Inteligência Artificial',
  web3: 'Web3',
  crypto: 'Criptomoedas',
};

const TOPIC_ICONS = {
  geopolitica: '🌍',
  economia: '💰',
  ia: '🤖',
  web3: '🌐',
  crypto: '₿',
};

const TOPIC_ORDER = ['geopolitica', 'economia', 'ia', 'web3', 'crypto'];

const MONTHS_PT = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function nowBR() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000);
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

// ─── RSS FETCH ─────────────────────────────────────────────────────────────

export async function fetchArticles() {
  const parser = new Parser({ timeout: 10000 });
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);

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
    const source = feed.title || new URL(url).hostname;
    for (const item of (feed.items || []).slice(0, 10)) {
      if (!item.title) continue;
      if (!item.pubDate) continue;
      const published = new Date(item.pubDate);
      if (published < cutoff) continue;
      articles.push({
        topic,
        title: item.title.trim(),
        summary: (item.contentSnippet || item.content || '').slice(0, 400).trim(),
        source,
        published,
        link: item.link || item.guid || '',
      });
    }
  }

  console.log(`Total coletado: ${articles.length} artigos`);
  return articles;
}

// ─── CLAUDE SELECT + SUMMARIZE ─────────────────────────────────────────────

export async function selectAndSummarize(articles, apiKey) {
  const client = new Anthropic({ apiKey });

  const today = nowBR();
  const datePT = `${today.getUTCDate()} de ${MONTHS_PT[today.getUTCMonth()]} de ${today.getUTCFullYear()}`;

  const TOPIC_LIMITS = { ia: 6, geopolitica: 6, economia: 6, web3: 6, crypto: 6 };
  const byTopic = {};
  for (const a of articles) {
    if (!byTopic[a.topic]) byTopic[a.topic] = [];
    const limit = TOPIC_LIMITS[a.topic] || 6;
    if (byTopic[a.topic].length < limit) byTopic[a.topic].push(a);
  }
  const balanced = Object.values(byTopic).flat().slice(0, 30);

  let articlesText = '';
  balanced.forEach((a, i) => {
    articlesText += `\n[${i+1}] TEMA: ${a.topic.toUpperCase()}\n`;
    articlesText += `TÍTULO: ${a.title}\n`;
    articlesText += `FONTE: ${a.source}\n`;
    const brHour = (a.published.getUTCHours() - 3 + 24) % 24;
    const brMin = a.published.getUTCMinutes();
    articlesText += `HORA: ${String(brHour).padStart(2,'0')}:${String(brMin).padStart(2,'0')} (horário de Brasília)\n`;
    if (a.link) articlesText += `LINK: ${a.link}\n`;
    if (a.summary) articlesText += `DESCRIÇÃO: ${a.summary.slice(0,150)}\n`;
  });

  const prompt = `Você é um curador de notícias especializado em geopolítica, economia, tecnologia e finanças. Hoje é ${datePT}.

Selecione exatamente 6 notícias por tema: geopolítica, economia, IA, web3 e crypto. Total: 30 notícias. Não repita notícias sobre o mesmo evento.

REGRAS GERAIS — válidas para todos os temas:
1. BREAKING NEWS e eventos de alto impacto têm prioridade ABSOLUTA.
2. Prefira sempre notícias das últimas horas — quanto mais fresca, melhor.
3. Evite duplicatas do mesmo evento — escolha apenas a melhor cobertura.
4. EXCLUIR: análises muito técnicas, notícias de projetos pequenos e irrelevantes, opiniões sem fato concreto.

REGRAS POR TEMA:

GEOPOLÍTICA — priorizar:
- Guerras ativas, escaladas militares e ataques relevantes
- Eleições em países que impactam a ordem global
- Tensões EUA-China, Rússia-Ucrânia, Oriente Médio
- Sanções, embargos e movimentos diplomáticos importantes
- Brasil no cenário internacional
- Crises humanitárias de grande escala
- Fatos políticos que impactam mercados, Fed, BCE ou juros globais
- Decisões de líderes que afetam a economia global

ECONOMIA — priorizar:
- Decisões do Fed, BCE e Banco Central do Brasil
- Dados de inflação, PIB e desemprego
- Crashes e rallies relevantes no mercado de ações
- Commodities (petróleo, ouro) e seu impacto
- Tarifas, sanções e guerras comerciais
- Crises econômicas em países relevantes
- Economia brasileira
- Reflexo de crises geopolíticas nos mercados e inflação

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
- ETFs de cripto

WEB3 — priorizar:
- Lançamentos e atualizações relevantes de protocolos
- Regulação de DeFi e NFTs
- Adoção institucional de Web3
- Hacks e exploits em protocolos
- Parcerias relevantes no ecossistema

Para cada notícia: escreva um resumo em português brasileiro com 10 a 14 linhas, explicando o contexto, o que aconteceu, quem está envolvido, o impacto e as possíveis consequências. Traduza os títulos para português. Inclua o link original da notícia.

Além das notícias, gere um "fio condutor do dia" (campo thread_of_day): um parágrafo editorial de 3 a 4 frases conectando os principais temas do dia, explicando o que une as notícias mais importantes desta edição.

Retorne APENAS JSON válido, sem texto antes ou depois:
{
  "thread_of_day": "Parágrafo editorial de 3 a 4 frases conectando os principais temas do dia.",
  "news": [
    {
      "topic": "geopolitica",
      "title": "Título em português",
      "summary": "Resumo detalhado com 12 a 16 linhas.",
      "source": "Fonte",
      "published_time": "HH:MM",
      "link": "https://..."
    }
  ]
}

ARTIGOS:
${articlesText}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  let text = msg.content[0].text.trim();
  if (text.includes('```json')) text = text.split('```json')[1].split('```')[0].trim();
  else if (text.includes('```')) text = text.split('```')[1].split('```')[0].trim();

  const data = JSON.parse(text);
  const threadOfDay = data.thread_of_day || '';

  const grouped = {};
  for (const item of data.news) {
    if (!item.published_time) item.published_time = '--:--';
    if (!grouped[item.topic]) grouped[item.topic] = [];
    grouped[item.topic].push(item);
  }

  for (const topic of Object.keys(grouped)) {
    grouped[topic].sort((a, b) => b.published_time.localeCompare(a.published_time));
  }

  console.log(`Claude selecionou ${data.news.length} notícias`);
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
          <a class="share-btn share-x" href="#" target="_blank" rel="noopener">&#10005; X</a>
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
  .news-title { font-size: 15px; font-weight: 700; color: #94A3B8; line-height: 1.45; margin-bottom: 10px; font-family: 'Space Grotesk', sans-serif; }
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
