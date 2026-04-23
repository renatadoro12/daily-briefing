import json
import anthropic
from datetime import datetime

MONTHS_PT = {
    1: "janeiro", 2: "fevereiro", 3: "março", 4: "abril",
    5: "maio", 6: "junho", 7: "julho", 8: "agosto",
    9: "setembro", 10: "outubro", 11: "novembro", 12: "dezembro"
}


def select_top_news(articles, api_key):
    client = anthropic.Anthropic(api_key=api_key.strip())

    today = datetime.now()
    date_pt = f"{today.day} de {MONTHS_PT[today.month]} de {today.year}"

    # Garante até 6 artigos por tema antes de enviar ao Claude
    from collections import defaultdict
    by_topic = defaultdict(list)
    for a in articles:
        by_topic[a['topic']].append(a)
    balanced = []
    for topic_articles in by_topic.values():
        balanced.extend(topic_articles[:6])
    articles = balanced[:30]

    articles_text = ""
    for i, article in enumerate(articles):
        articles_text += f"\n[{i+1}] TEMA: {article['topic'].upper()}\n"
        articles_text += f"TÍTULO: {article['title']}\n"
        articles_text += f"FONTE: {article['source']}\n"
        if article.get('time_str'):
            articles_text += f"HORA: {article['time_str']}\n"
        if article['summary']:
            articles_text += f"DESCRIÇÃO: {article['summary'][:150]}\n"

    prompt = f"""Você é um curador de notícias especializado em geopolítica, economia, tecnologia e finanças. Hoje é {date_pt}.

Abaixo estão artigos coletados de diversas fontes internacionais nas últimas 24 horas.

Sua tarefa:
1. Selecione no máximo 12 das notícias mais importantes e relevantes (use quantas houver se for menos de 12)
2. Distribua obrigatoriamente entre os 5 temas: geopolitica, economia, ia, web3, crypto
3. OBRIGATÓRIO: deve haver pelo menos 1 notícia em CADA um dos 5 temas. Se não houver artigo disponível para algum tema, crie um resumo baseado em contexto geral do dia para aquele tema.
4. Para cada notícia, escreva um resumo DETALHADO em português brasileiro com até 10 frases — explique o contexto, o que aconteceu, quem está envolvido e qual o impacto. Seja informativo e claro, sem jargão excessivo.
5. Traduza os títulos para português brasileiro de forma natural
6. Inclua o campo "published_time" com o horário da notícia (campo HORA do artigo, ou string vazia se não houver)

Retorne APENAS um JSON válido neste formato exato, sem texto adicional:
{{
  "news": [
    {{
      "topic": "geopolitica",
      "title": "Título em português",
      "summary": "Resumo detalhado em até 10 frases.",
      "source": "Nome da fonte",
      "published_time": "HH:MM"
    }}
  ]
}}

ARTIGOS DISPONÍVEIS:
{articles_text}"""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=6000,
        messages=[{"role": "user", "content": prompt}]
    )

    response_text = message.content[0].text.strip()

    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0].strip()

    data = json.loads(response_text)

    def _parse_time(t):
        try:
            h, m = t.split(':')
            return (int(h), int(m))
        except Exception:
            return (0, 0)

    grouped = {}
    for item in data['news']:
        topic = item['topic']
        if not item.get('published_time'):
            item['published_time'] = '--:--'
        if topic not in grouped:
            grouped[topic] = []
        grouped[topic].append(item)

    # Sort each topic oldest → newest
    for topic in grouped:
        grouped[topic].sort(key=lambda x: _parse_time(x.get('published_time', '')))

    return grouped
