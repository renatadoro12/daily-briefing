RSS_FEEDS = {
    "geopolitica": [
        # Breaking news — alta prioridade
        "https://feeds.apnews.com/apnews/world-news",       # AP News (melhor para breaking news)
        "https://feeds.apnews.com/apnews/us-news",          # AP News EUA
        "https://feeds.reuters.com/reuters/worldNews",
        "http://feeds.bbci.co.uk/news/world/rss.xml",
        # Complementares
        "https://www.theguardian.com/world/rss",
        "https://www.aljazeera.com/xml/rss/all.xml",
        "https://rss.dw.com/rdf/rss-en-world",
        "https://feeds.skynews.com/feeds/rss/world.xml",
        "https://www.npr.org/rss/rss.php?id=1004",          # NPR World News
    ],
    "economia": [
        "https://feeds.apnews.com/apnews/business",         # AP News Business
        "https://feeds.reuters.com/reuters/businessNews",
        "https://www.theguardian.com/business/rss",
        "http://feeds.bbci.co.uk/news/business/rss.xml",
        "https://www.cnbc.com/id/10001147/device/rss/rss.html",
        "https://www.forbes.com/business/feed/",
        "https://feeds.a.dj.com/rss/RSSWorldNews.xml",     # Wall Street Journal
    ],
    "ia": [
        "https://www.technologyreview.com/feed/",           # MIT Technology Review
        "https://venturebeat.com/category/ai/feed/",
        "https://techcrunch.com/category/artificial-intelligence/feed/",
        "https://www.theguardian.com/technology/artificialintelligenceai/rss",
        "https://www.wired.com/feed/tag/artificial-intelligence/rss",
        "https://feeds.apnews.com/apnews/technology",       # AP News Tech
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
        "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "https://cointelegraph.com/rss",
        "https://cryptoslate.com/feed/",
        "https://bitcoinmagazine.com/.rss/full/",
        "https://www.forbes.com/digital-assets/feed/",
        "https://decrypt.co/feed",
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
