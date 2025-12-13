# VclouD Catalog

Каталог товарів з автоматичною синхронізацією з OLX.

## Деплой на Netlify

1. Папка для деплою: `/v2`
2. Build command: (порожній - статичний сайт)
3. Publish directory: `v2`

## Структура

```
v2/
├── index.html      # Головна сторінка каталогу
├── product.html    # Сторінка товару
├── css/
│   └── style.css   # Стилі (темна тема)
├── js/
│   ├── app.js      # Логіка каталогу
│   ├── products.js # База товарів (406 товарів)
│   └── product-page.js # Логіка сторінки товару
└── img/            # Зображення (опційно)
```

## Оновлення товарів

Для оновлення товарів з OLX запусти:
```bash
python3 olx_requests_scraper.py
python3 fix_titles_v2.py
```
