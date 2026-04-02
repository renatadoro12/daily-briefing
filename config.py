RSS_FEEDS = {
    "geopolitica": [
        # Suas fontes
        "https://www.theguardian.com/world/rss",
        "https://feeds.reuters.com/reuters/worldNews",
        # Complementares
        "http://feeds.bbci.co.uk/news/world/rss.xml",
        "https://www.aljazeera.com/xml/rss/all.xml",
        "https://rss.dw.com/rdf/rss-en-world",
        "https://feeds.skynews.com/feeds/rss/world.xml",
    ],
    "economia": [
        # Suas fontes
        "https://www.forbes.com/business/feed/",
        "https://feeds.reuters.com/reuters/businessNews",
        "https://www.theguardian.com/business/rss",
        # Complementares
        "http://feeds.bbci.co.uk/news/business/rss.xml",
        "https://www.cnbc.com/id/10001147/device/rss/rss.html",
        "https://www.ft.com/?format=rss",
    ],
    "ia": [
        # Suas fontes
        "https://www.technologyreview.com/feed/",          # MIT Technology Review
        "https://thehackernews.com/feeds/posts/default",   # The Hacker News
        "https://www.therundown.ai/rss",                   # The Rundown AI
        # Complementares
        "https://venturebeat.com/category/ai/feed/",
        "https://www.wired.com/feed/tag/artificial-intelligence/rss",
        "https://techcrunch.com/category/artificial-intelligence/feed/",
        "https://www.theguardian.com/technology/artificialintelligenceai/rss",
    ],
    "web3": [
        # Suas fontes
        "https://www.forbes.com/crypto-blockchain/feed/",
        # Complementares
        "https://decrypt.co/feed",
        "https://www.theblock.co/rss.xml",
        "https://cointelegraph.com/tags/web3/rss",
        "https://beincrypto.com/category/web3/feed/",
    ],
    "crypto": [
        # Suas fontes
        "https://www.forbes.com/digital-assets/feed/",
        # Complementares
        "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "https://cointelegraph.com/rss",
        "https://cryptoslate.com/feed/",
        "https://bitcoinmagazine.com/.rss/full/",
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
