import os
import sys
from datetime import datetime
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

load_dotenv()


def main():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print()
        print("❌  API key não encontrada.")
        print("    Abra o arquivo .env e adicione sua chave:")
        print("    ANTHROPIC_API_KEY=sk-ant-...")
        print()
        sys.exit(1)

    print()
    print("━" * 45)
    print("  DAILY BRIEFING  —  @renatadoro1")
    print("━" * 45)
    print()

    # 1. Fetch articles
    print("📡  Buscando notícias...")
    from fetcher import fetch_all_articles
    articles = fetch_all_articles()
    print(f"    {len(articles)} artigos coletados\n")

    if not articles:
        print("❌  Nenhum artigo encontrado. Verifique sua conexão.")
        sys.exit(1)

    # 2. Select top 10 with Claude
    print("🤖  Selecionando as 10 melhores com Claude...")
    from ai_selector import select_top_news
    grouped_news = select_top_news(articles, api_key)
    total = sum(len(v) for v in grouped_news.values())
    print(f"    {total} notícias selecionadas e resumidas em português\n")

    # 3. Generate web page
    print("🌐  Gerando página web...")
    from renderer import generate_web_page
    date_folder = datetime.now().strftime("%Y-%m-%d")
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", date_folder)
    html_content, html_path = generate_web_page(grouped_news, output_dir)
    print(f"    Página salva em: {html_path}\n")

    # 4. Deploy to Netlify
    netlify_token = os.getenv("NETLIFY_TOKEN")
    netlify_site_id = os.getenv("NETLIFY_SITE_ID")

    if netlify_token and netlify_site_id:
        print("🚀  Enviando para Netlify...")
        try:
            from netlify_deploy import deploy_to_netlify
            output_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
            url = deploy_to_netlify(output_base, date_folder, netlify_token, netlify_site_id)
            print()
            print("━" * 45)
            print(f"✅  Briefing publicado!")
            print(f"🔗  {url}")
            print("━" * 45)
            print()
            if sys.platform == "win32":
                import subprocess
                subprocess.run(['clip'], input=url.encode(), check=True)
                print("📋  Link copiado para a área de transferência!")
                print()
        except Exception as e:
            print(f"❌  Erro no Netlify: {e}")
            print(f"    A página está salva localmente em: {html_path}")
            print()
    else:
        print("━" * 45)
        print(f"✅  Página gerada!")
        print(f"📁  {html_path}")
        print("━" * 45)
        print()
        print("ℹ️  Para gerar um link: adicione NETLIFY_TOKEN e NETLIFY_SITE_ID no .env")
        print()
        if sys.platform == "win32":
            os.startfile(os.path.abspath(output_dir))


if __name__ == "__main__":
    main()
