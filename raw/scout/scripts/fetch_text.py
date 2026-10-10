"""Usage: py -I fetch_text.py <short_name> <url>  -> saves raw/scout/scout_<short>.txt (plain text) and prints length + title."""
import sys, re, html, urllib.request, datetime, gzip

UA = "Mozilla/5.0 (compatible; investor-research research@example.org)"
short, url = sys.argv[1], sys.argv[2]
req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "sk,en;q=0.8", "Accept-Encoding": "gzip"})
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        if r.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
        final = r.geturl()
        status = r.status
except Exception as e:
    print("FAIL", url, e)
    sys.exit(1)
t = raw.decode("utf-8", "replace")
title = re.search(r"<title[^>]*>(.*?)</title>", t, re.S | re.I)
title = html.unescape(title.group(1).strip()) if title else ""
dates = re.findall(r'"(?:datePublished|dateModified)"\s*:\s*"([^"]+)"', t)
meta_date = re.findall(r'article:published_time"\s+content="([^"]+)"', t)
body = re.sub(r"<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", t, flags=re.S | re.I)
body = re.sub(r"<br\s*/?>|</p>|</h\d>|</li>|</div>", "\n", body, flags=re.I)
body = re.sub(r"<[^>]+>", " ", body)
body = html.unescape(body)
body = re.sub(r"[ \t\r\f\v]+", " ", body)
body = re.sub(r"\n\s*\n+", "\n", body)
hdr = f"URL: {url}\nFINAL_URL: {final}\nHTTP: {status}\nFETCHED_AT: {datetime.datetime.now().isoformat(timespec='seconds')}\nTITLE: {title}\nDATES: {dates[:3]} {meta_date[:1]}\n\n"
open(f"C:/Users/Samo/Desktop/investors/raw/scout/scout_{short}.txt", "w", encoding="utf-8").write(hdr + body)
print(status, len(body), title, dates[:2], meta_date[:1])
