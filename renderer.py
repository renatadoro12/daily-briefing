import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright
from config import ACCENT_COLORS, TOPIC_NAMES, TOPIC_ORDER

MONTHS_PT = {
    1: "janeiro", 2: "fevereiro", 3: "março", 4: "abril",
    5: "maio", 6: "junho", 7: "julho", 8: "agosto",
    9: "setembro", 10: "outubro", 11: "novembro", 12: "dezembro"
}


def render_html_to_png(html_content, output_path):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1080, 'height': 1080})
        page.set_content(html_content, wait_until='networkidle')
        page.screenshot(path=output_path)
        browser.close()


def generate_cards(grouped_news, output_dir):
    templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
    env = Environment(loader=FileSystemLoader(templates_dir))

    os.makedirs(output_dir, exist_ok=True)

    today = datetime.now()
    date_str = today.strftime("%d.%m.%Y")
    date_pt = f"{today.day} de {MONTHS_PT[today.month]} de {today.year}"

    output_files = []

    # Cover card
    cover_template = env.get_template('cover.html')
    cover_html = cover_template.render(date=date_str, date_pt=date_pt.upper())
    cover_path = os.path.join(output_dir, '00_capa.png')
    render_html_to_png(cover_html, cover_path)
    output_files.append(cover_path)
    print(f"  ✓ Capa")

    # Topic cards
    card_template = env.get_template('card.html')
    for i, topic in enumerate(TOPIC_ORDER, 1):
        if topic not in grouped_news:
            continue

        card_html = card_template.render(
            topic_name=TOPIC_NAMES[topic],
            accent_color=ACCENT_COLORS[topic],
            date=date_str,
            news_items=grouped_news[topic],
        )

        card_path = os.path.join(output_dir, f'0{i}_{topic}.png')
        render_html_to_png(card_html, card_path)
        output_files.append(card_path)
        print(f"  ✓ {TOPIC_NAMES[topic]}")

    return output_files


def generate_web_page(grouped_news, output_dir):
    templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
    env = Environment(loader=FileSystemLoader(templates_dir))

    today = datetime.now()
    date_pt = f"{today.day} de {MONTHS_PT[today.month]} de {today.year}"

    template = env.get_template('web_page.html')
    html = template.render(
        date_pt=date_pt.upper(),
        grouped_news=grouped_news,
        accent_colors=ACCENT_COLORS,
        topic_names=TOPIC_NAMES,
        topic_order=TOPIC_ORDER,
    )

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'index.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    return html, output_path
