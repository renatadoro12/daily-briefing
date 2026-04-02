@echo off
echo.
echo ========================================
echo   DAILY BRIEFING - Instalacao
echo ========================================
echo.

echo Instalando dependencias Python...
pip install -r requirements.txt

echo.
echo Instalando navegador (Chromium)...
playwright install chromium

echo.
echo ========================================
echo   Instalacao concluida!
echo ========================================
echo.
echo Proximo passo:
echo   1. Copie o arquivo .env.example para .env
echo   2. Adicione sua chave Anthropic no .env
echo   3. Execute rodar.bat
echo.
pause
