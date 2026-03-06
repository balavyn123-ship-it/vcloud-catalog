#!/bin/zsh
# ─────────────────────────────────────────────
#  VclouD — Оновити каталог і задеплоїти сайт
#  Використання: ./deploy.sh
# ─────────────────────────────────────────────

NETLIFY_TOKEN="nfp_GPCvnA6PeAjzymTNxBYTsxA2MdQaWqqXe76d"
SITE_ID="ab69a37c-34ed-4404-bb79-b34506bd093e"
TOOLS_DIR="$(dirname "$0")/tools"
ROOT_DIR="$(dirname "$0")"

echo "════════════════════════════════════════"
echo "  VclouD — Деплой каталогу"
echo "════════════════════════════════════════"

# Крок 1 — Запуск парсера (якщо є catalog.xlsx)
if [ -f "$TOOLS_DIR/catalog.xlsx" ]; then
    echo "\n📊 Знайдено catalog.xlsx — запускаю парсер...\n"
    cd "$TOOLS_DIR"
    python3 catalog_parser.py
    cd "$ROOT_DIR"
else
    echo "\nℹ️  catalog.xlsx не знайдено — деплою без парсингу"
    echo "   (поклади catalog.xlsx в папку tools/ щоб додати товари)\n"
fi

# Крок 2 — Пакування сайту
echo "\n📦 Пакую файли сайту..."
zip -r /tmp/vcloud_v2_deploy.zip \
    index.html \
    product.html \
    css/ \
    js/ \
    img/ \
    netlify.toml \
    -x "*.DS_Store" \
    -x "__pycache__/*"

SIZE=$(du -sh /tmp/vcloud_v2_deploy.zip | cut -f1)
echo "   Розмір архіву: $SIZE"

# Крок 3 — Деплой на Netlify
echo "\n🚀 Деплою на Netlify..."
RESPONSE=$(curl -s -X POST \
    "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" \
    -H "Authorization: Bearer $NETLIFY_TOKEN" \
    -H "Content-Type: application/zip" \
    --data-binary @/tmp/vcloud_v2_deploy.zip)

STATE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('state','error'))" 2>/dev/null)
URL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ssl_url') or d.get('deploy_ssl_url',''))" 2>/dev/null)

if [ "$STATE" = "uploaded" ] || [ "$STATE" = "ready" ]; then
    echo "\n✅ Сайт успішно задеплоєно!"
    echo "🔗 $URL"
else
    echo "\n❌ Помилка деплою. Відповідь:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
fi

echo "\n════════════════════════════════════════"
