import requests
from urllib.parse import quote_plus
import re

headers = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}

query = quote_plus("Nike Air Max 90 кросівки")
r = requests.get(f"https://duckduckgo.com/?q={query}&iax=images&ia=images", headers=headers, timeout=10)
vqd = re.search(r'vqd=["\']([\d-]+)["\']', r.text)
print("VQD:", vqd.group(1) if vqd else "not found")
print("Status:", r.status_code)

if vqd:
    img_resp = requests.get(
        f"https://duckduckgo.com/i.js?q={query}&vqd={vqd.group(1)}&o=json",
        headers=headers, timeout=10
    )
    data = img_resp.json()
    results = data.get("results", [])
    print(f"Знайдено {len(results)} фото")
    for item in results[:3]:
        print(" ", item.get("image", "")[:80])
