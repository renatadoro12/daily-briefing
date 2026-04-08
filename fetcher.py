import re
import feedparser
from datetime import datetime, timedelta, timezone
from config import RSS_FEEDS

BRAZIL_OFFSET = timedelta(hours=-3)


def clean_html(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def fetch_all_articles(max_per_feed=10):
    all_articles = []
    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(hours=24)

    for topic, feeds in RSS_FEEDS.items():
        for feed_url in feeds:
            try:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries[:max_per_feed]:
                    published_utc = None
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                        try:
                            published_utc = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                        except Exception:
                            pass

                    if not published_utc or published_utc < cutoff:
                        continue

                    title = clean_html(entry.get('title', '')).strip()
                    summary = clean_html(
                        entry.get('summary', entry.get('description', ''))
                    )[:400].strip()

                    if not title:
                        continue

                    # Convert to Brazil time (UTC-3)
                    if published_utc:
                        published_br = published_utc + BRAZIL_OFFSET
                        time_str = published_br.strftime("%H:%M")
                    else:
                        published_br = None
                        time_str = ""

                    all_articles.append({
                        'topic': topic,
                        'title': title,
                        'summary': summary,
                        'source': feed.feed.get('title', feed_url),
                        'published': published_br.isoformat() if published_br else None,
                        'time_str': time_str,
                    })

            except Exception as e:
                print(f"  Aviso: não foi possível buscar {feed_url}: {e}")

    return all_articles
