RSS_FEEDS = {
    "geopolitica": [
        # Breaking news — alta prioridade
        "https://feeds.apnews.com/apnews/world-news",       # AP News
        "https://feeds.apnews.com/apnews/us-news",          # AP News EUA
        "https://feeds.reuters.com/reuters/worldNews",
        "http://feeds.bbci.co.uk/news/world/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",  # NYT World
        # Brasil
        "https://g1.globo.com/rss/g1/mundo/feed.xml",      # G1 Mundo
        # Complementares
        "https://www.theguardian.com/world/rss",
        "https://www.aljazeera.com/xml/rss/all.xml",
        "https://rss.dw.com/rdf/rss-en-world",
        "https://feeds.skynews.com/feeds/rss/world.xml",
        "https://www.npr.org/rss/rss.php?id=1004",
    ],
    "economia": [
        "https://feeds.apnews.com/apnews/business",
        "https://feeds.reuters.com/reuters/businessNews",
        "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",  # NYT Business
        "http://feeds.bbci.co.uk/news/business/rss.xml",
        "https://www.cnbc.com/id/10001147/device/rss/rss.html",
        "https://www.theguardian.com/business/rss",
        "https://www.forbes.com/business/feed/",
        "https://feeds.a.dj.com/rss/RSSWorldNews.xml",     # Wall Street Journal
        # Brasil
        "https://www.infomoney.com.br/feed/",               # InfoMoney
        "https://valor.globo.com/rss/",                     # Valor Econômico
    ],
    "ia": [
        "https://www.technologyreview.com/feed/",           # MIT Technology Review
        "https://feeds.bloomberg.com/technology/news.rss",  # Bloomberg Technology
        "https://www.theverge.com/rss/index.xml",           # The Verge
        "https://techcrunch.com/feed/",                     # TechCrunch geral
        "https://techcrunch.com/category/artificial-intelligence/feed/",
        "https://venturebeat.com/category/ai/feed/",
        "https://www.wired.com/feed/tag/artificial-intelligence/rss",
        "https://www.theguardian.com/technology/artificialintelligenceai/rss",
        "https://feeds.apnews.com/apnews/technology",
        "https://thehackernews.com/feeds/posts/default",
    ],
    "web3": [
        "https://decrypt.co/feed",
        "https://www.theblock.co/rss.xml",
        "https://cointelegraph.com/tags/web3/rss",
        "https://beincrypto.com/category/web3/feed/",
        "https://www.forbes.com/crypto-blockchain/feed/",
    ],
    "crypto": [
        # Internacional
        "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "https://cointelegraph.com/rss",
        "https://cryptoslate.com/feed/",
        "https://bitcoinmagazine.com/.rss/full/",
        "https://www.forbes.com/digital-assets/feed/",
        "https://decrypt.co/feed",
        # Brasil
        "https://br.cointelegraph.com/rss",                 # CoinTelegraph BR
        "https://livecoins.com.br/feed/",                   # Livecoins
        "https://portaldobitcoin.uol.com.br/feed/",         # Portal do Bitcoin
        "https://cointimes.com.br/feed/",                   # Cointimes
    ],
}

ACCENT_COLORS = {
    "geopolitica": "#EF4444",
    "economia": "#10B981",
    "ia": "#8B5CF6",
    "web3": "#F59E0B",
    "crypto": "#F97316",
}

TOPIC_NAMES = {
    "geopolitica": "Geopolítica",
    "economia": "Economia",
    "ia": "Inteligência Artificial",
    "web3": "Web3",
    "crypto": "Criptomoedas",
}

TOPIC_ORDER = ["geopolitica", "economia", "ia", "web3", "crypto"]
