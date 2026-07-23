import httpx
url = "https://httpbin.org/get?date=2026-05-25 04:00"
r = httpx.get(url)
print(r.url)
