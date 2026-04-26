import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import Parser from 'rss-parser';

// ─── CONFIG ────────────────────────────────────────────────────────────────

const FEEDS = {
  geopolitica: [
    // Breaking news — alta prioridade
    'https://feeds.apnews.com/apnews/world-news',           // AP News (melhor para breaking news)
    'https://feeds.apnews.com/apnews/us-news',              // AP News EUA
    'https://feeds.reuters.com/reuters/worldNews',           // Reuters World
    'http://feeds.bbci.co.uk/news/world/rss.xml',           // BBC World
    // Complementares
    'https://www.theguardian.com/world/rss',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://rss.dw.com/rdf/rss-en-world',
    'https://feeds.skynews.com/feeds/rss/world.xml',
    'https://www.npr.org/rss/rss.php?id=1004',              // NPR World News
  ],
  economia: [
    'https://feeds.apnews.com/apnews/business',             // AP News Business
    'https://feeds.reuters.com/reuters/businessNews',
    'https://www.theguardian.com/business/rss',
    'http://feeds.bbci.co.uk/news/business/rss.xml',
    'https://www.cnbc.com/id/10001147/device/rss/rss.html',
    'https://www.forbes.com/business/feed/',
    'https://feeds.a.dj.com/rss/RSSWorldNews.xml',         // Wall Street Journal
  ],
  ia: [
    'https://www.technologyreview.com/feed/',
    'https://venturebeat.com/category/ai/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://www.theguardian.com/technology/artificialintelligenceai/rss',
    'https://www.wired.com/feed/tag/artificial-intelligence/rss',
    'https://feeds.apnews.com/apnews/technology',           // AP News Tech
  ],
  web3: [
    'https://decrypt.co/feed',
    'https://www.theblock.co/rss.xml',
    'https://cointelegraph.com/tags/web3/rss',
    'https://beincrypto.com/category/web3/feed/',
    'https://www.forbes.com/crypto-blockchain/feed/',
  ],
  crypto: [
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://cointelegraph.com/rss',
    'https://cryptoslate.com/feed/',
    'https://bitcoinmagazine.com/.rss/full/',
    'https://www.forbes.com/digital-assets/feed/',
    'https://decrypt.co/feed',
  ],
};

const ACCENT_COLORS = {
  geopolitica: '#EF4444',
  economia: '#10B981',
  ia: '#8B5CF6',
  web3: '#F59E0B',
  crypto: '#F97316',
};

const TOPIC_NAMES = {
  geopolitica: 'Geopolítica',
  economia: 'Economia',
  ia: 'Inteligência Artificial',
  web3: 'Web3',
  crypto: 'Criptomoedas',
};

const TOPIC_ORDER = ['geopolitica', 'economia', 'ia', 'web3', 'crypto'];

const MONTHS_PT = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function nowBR() {
  // BRT = UTC-3 (Brasil aboliu horário de verão em 2019)
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
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Monta lista plana de {topic, url}
  const tasks = [];
  for (const [topic, urls] of Object.entries(FEEDS)) {
    for (const url of urls) tasks.push({ topic, url });
  }

  // Busca todos em paralelo
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

  // Balanceia até 8 por tema, máx 40
  const byTopic = {};
  for (const a of articles) {
    if (!byTopic[a.topic]) byTopic[a.topic] = [];
    if (byTopic[a.topic].length < 8) byTopic[a.topic].push(a);
  }
  const balanced = Object.values(byTopic).flat().slice(0, 40);

  let articlesText = '';
  balanced.forEach((a, i) => {
    articlesText += `\n[${i+1}] TEMA: ${a.topic.toUpperCase()}\n`;
    articlesText += `TÍTULO: ${a.title}\n`;
    articlesText += `FONTE: ${a.source}\n`;
    const h = String(a.published.getHours()).padStart(2,'0');
    const m = String(a.published.getMinutes()).padStart(2,'0');
    articlesText += `HORA: ${h}:${m}\n`;
    if (a.summary) articlesText += `DESCRIÇÃO: ${a.summary.slice(0,150)}\n`;
  });

  const prompt = `Você é um curador de notícias especializado em geopolítica, economia, tecnologia e finanças. Hoje é ${datePT}.

Selecione no máximo 18 das notícias mais importantes. Distribua entre os 5 temas: geopolitica, economia, ia, web3, crypto. Deve haver pelo menos 2 notícias em CADA tema.

REGRAS DE PRIORIDADE — siga nesta ordem:
1. BREAKING NEWS e eventos de alto impacto mundial têm prioridade ABSOLUTA: atentados, guerras, crises, mortes de líderes, crashes de mercado, decisões históricas. Se houver uma notícia dessas, ela DEVE aparecer independentemente de qualquer outra.
2. Prefira notícias das últimas 12 horas sobre notícias mais antigas.
3. Evite duplicatas sobre o mesmo evento — escolha apenas a melhor cobertura.
4. Para geopolítica: priorize EUA, Brasil, Europa, Oriente Médio e guerras ativas.

Para cada notícia: resumo detalhado em português brasileiro com 3 a 5 frases explicando o contexto e o impacto. Traduza os títulos para português.

Retorne APENAS JSON válido, sem texto antes ou depois:
{
  "news": [
    {
      "topic": "geopolitica",
      "title": "Título em português",
      "summary": "Resumo detalhado.",
      "source": "Fonte",
      "published_time": "HH:MM"
    }
  ]
}

ARTIGOS:
${articlesText}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  let text = msg.content[0].text.trim();
  if (text.includes('```json')) text = text.split('```json')[1].split('```')[0].trim();
  else if (text.includes('```')) text = text.split('```')[1].split('```')[0].trim();

  const data = JSON.parse(text);

  // Agrupa por tópico
  const grouped = {};
  for (const item of data.news) {
    if (!item.published_time) item.published_time = '--:--';
    if (!grouped[item.topic]) grouped[item.topic] = [];
    grouped[item.topic].push(item);
  }

  // Ordena mais recente primeiro
  for (const topic of Object.keys(grouped)) {
    grouped[topic].sort((a, b) => b.published_time.localeCompare(a.published_time));
  }

  console.log(`Claude selecionou ${data.news.length} notícias`);
  return grouped;
}

// ─── HTML GENERATION ───────────────────────────────────────────────────────

export function generateHTML(grouped, today, prevSlug, nextSlug) {
  const datePT = `${today.getUTCDate()} de ${MONTHS_PT[today.getUTCMonth()]} de ${today.getUTCFullYear()}`.toUpperCase();
  const dateCompact = `${String(today.getUTCDate()).padStart(2,'0')} ${MONTHS_PT[today.getUTCMonth()].slice(0,3)} ${today.getUTCFullYear()}`;

  const prevBtn = prevSlug
    ? `<a class="page-btn" href="../${prevSlug}/">← Anterior</a>`
    : `<span class="page-btn disabled">← Anterior</span>`;
  const nextBtn = nextSlug
    ? `<a class="page-btn" href="../${nextSlug}/">Próximo →</a>`
    : `<span class="page-btn disabled">Próximo →</span>`;
  const hojeBtn = `<a id="btnHoje" class="page-btn" style="display:none;" href="#">Hoje</a>`;

  const topicNav = TOPIC_ORDER
    .filter(t => grouped[t])
    .map(t => `<a class="topic-pill" href="#${t}" style="color:${ACCENT_COLORS[t]};border-color:${ACCENT_COLORS[t]}40;background:${ACCENT_COLORS[t]}15;">${TOPIC_NAMES[t]}</a>`)
    .join('\n    ');

  const sections = TOPIC_ORDER
    .filter(t => grouped[t])
    .map(t => {
      const items = grouped[t].map(item => `
      <div class="news-item" data-searchable="${escapeHTML(item.title)} ${escapeHTML(item.summary)} ${escapeHTML(item.source)}">
        <div class="news-meta">
          <span class="news-date">${dateCompact}</span>
          <span class="news-time">${escapeHTML(item.published_time)}</span>
          <span class="news-source">${escapeHTML(item.source)}</span>
        </div>
        <div class="news-title">${escapeHTML(item.title)}</div>
        <div class="news-summary">${escapeHTML(item.summary)}</div>
      </div>`).join('');

      return `
  <div class="section" id="${t}">
    <div class="section-header">
      <div class="section-dot" style="background:${ACCENT_COLORS[t]};box-shadow:0 0 10px ${ACCENT_COLORS[t]}80;"></div>
      <div class="section-title" style="color:${ACCENT_COLORS[t]};">${TOPIC_NAMES[t]}</div>
    </div>
    ${items}
  </div>`;
    }).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily Briefing — Professora Crypto</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; color: #e0e0e0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; min-height: 100vh; }
  .hero { padding: 56px 24px 40px; text-align: center; border-bottom: 1px solid #141414; }
  .hero-label { font-size: 11px; letter-spacing: 6px; color: #444; text-transform: uppercase; margin-bottom: 18px; }
  .hero-title { font-size: 52px; font-weight: 900; color: #fff; letter-spacing: -2px; line-height: 1; }
  .hero-date { font-size: 14px; color: #444; margin-top: 20px; letter-spacing: 4px; text-transform: uppercase; }
  .hero-handle { font-size: 13px; color: #2a2a2a; margin-top: 8px; letter-spacing: 1px; }
  .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 16px 24px; border-bottom: 1px solid #111; background: #0a0a0a; }
  .page-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-decoration: none; border: 1px solid #1e1e1e; color: #555; transition: .2s; text-transform: uppercase; }
  .page-btn:hover { border-color: #444; color: #aaa; }
  .page-btn.disabled { opacity: 0.2; pointer-events: none; }
  .page-current { font-size: 12px; color: #333; letter-spacing: 2px; text-transform: uppercase; }
  .topics-nav { display: flex; gap: 8px; justify-content: center; padding: 16px 24px; flex-wrap: wrap; border-bottom: 1px solid #111; background: #0a0a0a; position: sticky; top: 0; z-index: 100; }
  .topic-pill { padding: 6px 16px; border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border: 1px solid; text-decoration: none; transition: opacity 0.15s; cursor: pointer; }
  .topic-pill:hover { opacity: 0.75; }
  .search-bar { display: none; padding: 12px 24px; background: #0d0d0d; border-bottom: 1px solid #111; position: sticky; top: 53px; z-index: 99; }
  .search-bar.open { display: block; }
  .search-input { width: 100%; max-width: 600px; display: block; margin: 0 auto; background: #141414; border: 1px solid #222; color: #e0e0e0; padding: 10px 16px; border-radius: 8px; font-size: 14px; font-family: inherit; outline: none; }
  .search-input:focus { border-color: #444; }
  .search-input::placeholder { color: #333; }
  .section { border-bottom: 1px solid #0f0f0f; padding: 48px 24px; max-width: 760px; margin: 0 auto; }
  .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 1px solid #141414; }
  .section-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .section-title { font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
  .news-item { padding: 28px 0; border-bottom: 1px solid #111; }
  .news-item:last-child { border-bottom: none; padding-bottom: 0; }
  .news-item.hidden { display: none; }
  .news-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  .news-date { font-size: 11px; color: #555; font-weight: 600; background: #111; padding: 3px 8px; border-radius: 4px; }
  .news-time { font-size: 12px; color: #555; font-weight: 700; background: #141414; padding: 3px 8px; border-radius: 4px; }
  .news-source { font-size: 11px; color: #3a3a3a; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
  .news-title { font-size: 21px; font-weight: 700; color: #f0f0f0; line-height: 1.4; margin-bottom: 14px; }
  .news-summary { font-size: 15px; color: #666; line-height: 1.85; }
  .search-empty { display: none; text-align: center; padding: 60px 24px; color: #333; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; }
  .footer { text-align: center; padding: 56px 24px; color: #222; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; border-top: 1px solid #0f0f0f; }
  .fab-group { position: fixed; bottom: 28px; right: 24px; display: flex; flex-direction: column; gap: 10px; z-index: 200; }
  .fab { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #222; background: #111; color: #666; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .2s; }
  .fab:hover { border-color: #444; color: #ccc; }
  .fab.active { border-color: #555; color: #fff; }
  @media (max-width: 600px) { .hero-title { font-size: 36px; } .section { padding: 36px 16px; } .news-title { font-size: 18px; } }
</style>
</head>
<body>
<div class="hero">
  <div class="hero-label">Resumo do dia</div>
  <div class="hero-title">DAILY BRIEFING</div>
  <div class="hero-date">${datePT}</div>
  <div class="hero-handle">Professora Crypto</div>
</div>
<div class="pagination">
  ${prevBtn}
  <span class="page-current">${dateCompact}</span>
  ${nextBtn}
  ${hojeBtn}
</div>
<div class="topics-nav">
  ${topicNav}
  <button class="topic-pill" onclick="toggleSearch()" style="color:#555;border-color:#222;background:#111;">🔍</button>
</div>
<div class="search-bar" id="searchBar">
  <input class="search-input" id="searchInput" type="text" placeholder="Buscar notícias..." oninput="filterNews(this.value)">
</div>
${sections}
<div class="search-empty" id="searchEmpty">Nenhuma notícia encontrada</div>
<div class="footer">Daily Briefing &nbsp;·&nbsp; Professora Crypto</div>
<div class="fab-group">
  <button class="fab" id="fabSearch" onclick="toggleSearch()">🔍</button>
  <button class="fab" onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})">↓</button>
</div>
<script>
  // Botão "Hoje" — aparece apenas quando não estamos na página de hoje
  (function() {
    function todayBRT() {
      const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
      return d.getUTCFullYear() + '-' +
        String(d.getUTCMonth() + 1).padStart(2,'0') + '-' +
        String(d.getUTCDate()).padStart(2,'0');
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
    items.forEach(item => {
      const match = !term || (item.dataset.searchable||'').toLowerCase().includes(term);
      item.classList.toggle('hidden', !match);
      if (match) any = true;
    });
    sections.forEach(s => {
      const vis = s.querySelectorAll('.news-item:not(.hidden)').length > 0;
      s.style.display = (!term || vis) ? '' : 'none';
    });
    document.getElementById('searchEmpty').style.display = (term && !any) ? 'block' : 'none';
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

  const grouped = await selectAndSummarize(articles, apiKey);

  // Verifica prev/next no deploy atual
  let prevExists = false, nextExists = false;
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
    }
  } catch {}

  const prev = new Date(today); prev.setDate(prev.getDate() - 1);
  const next = new Date(today); next.setDate(next.getDate() + 1);

  const html = generateHTML(grouped, today, prevExists ? dateSlug(prev) : null, nextExists ? dateSlug(next) : null);
  const url = await deployToNetlify(slug, html, token, siteId);

  const total = Object.values(grouped).reduce((s, v) => s + v.length, 0);
  console.log(`\n✅ ${total} notícias publicadas!`);
  console.log(`🔗 ${url}\n`);

  return url;
}
