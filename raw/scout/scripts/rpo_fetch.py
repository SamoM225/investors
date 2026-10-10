import json, urllib.request, urllib.parse, datetime, sys, os, time

OUT = r"C:/Users/Samo/Desktop/investors/raw/scout/rpo"
os.makedirs(OUT, exist_ok=True)
UA = "investor-research research@example.org"
BASE = "https://api.statistics.sk/rpo/v1/search?"


def get(params):
    url = BASE + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as r:
                return url, json.loads(r.read().decode("utf-8"))
        except Exception as e:
            print("retry", url, e, file=sys.stderr)
            time.sleep(3)
    raise RuntimeError(url)


def fetch(term, start, end, acc):
    params = {"fullName": term, "onlyActive": "true",
              "establishmentAfter": start.isoformat(), "establishmentBefore": end.isoformat()}
    url, d = get(params)
    res = d.get("results", [])
    if len(res) >= 500 and (end - start).days > 1:
        mid = start + (end - start) / 2
        fetch(term, start, mid + datetime.timedelta(days=1), acc)
        fetch(term, mid, end, acc)
        return
    if len(res) >= 500:
        print("WARN still capped", url, file=sys.stderr)
    fn = f"{OUT}/scout_rpo_nazov_{term}_{start.isoformat()}_{end.isoformat()}.json"
    json.dump({"url": url, "fetched_at": datetime.datetime.now().isoformat(timespec="seconds"), "results": res},
              open(fn, "w", encoding="utf-8"), ensure_ascii=False)
    for x in res:
        acc[x["id"]] = (x, url)


terms = sys.argv[1:]
for term in terms:
    acc = {}
    fetch(term, datetime.date(1950, 1, 1), datetime.date(2026, 12, 31), acc)
    json.dump([{"url": u, **x} for x, u in acc.values()],
              open(f"{OUT}/scout_rpo_nazov_{term}_ALL_active.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(term, len(acc))
