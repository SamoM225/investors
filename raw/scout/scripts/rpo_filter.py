import json, re, sys
D = r"C:/Users/Samo/Desktop/investors/raw/scout/rpo_nazov"

PAT = {
    "Ventures": r"ventures?\b",
    "Venture": r"venture",
    "Capital": r"\bcapital\b",
    "Fund": r"\bfunds?\b",
    "Fond": r"\bfond\b|\bfondy\b|\bfondu\b",
    "Invest": r"invest",
}
INVEST_KEEP = r"venture|capital|\bfund|\bfond|partners|seed|angel|equity|sicav|investičn\w* fond|private equity|\bvc\b"
EXCL = r"adventure|neinvestičn"


def current_name(x):
    names = [n for n in x["fullNames"] if not n.get("validTo")]
    return (names or x["fullNames"])[-1]["value"]


def rows():
    out = []
    for term, pat in PAT.items():
        d = json.load(open(f"{D}/scout_rpo_nazov_{term}_ALL_active.json", encoding="utf-8"))
        for x in d:
            if x["sourceRegister"]["value"]["value"] != "Obchodný register":
                continue
            if x.get("termination"):
                continue
            n = current_name(x)
            low = n.lower()
            if not re.search(pat, low) or re.search(EXCL, low):
                continue
            if term == "Invest" and not re.search(INVEST_KEEP, low):
                continue
            ico = x["identifiers"][0]["value"] if x.get("identifiers") else ""
            out.append((term, n, ico, x["url"]))
    return out


if __name__ == "__main__":
    import collections
    r = rows()
    print(collections.Counter(t for t, *_ in r))
    seen = set()
    for t, n, i, u in r:
        if i in seen: continue
        seen.add(i)
        if t in sys.argv[1:]:
            print(t, "|", n, "|", i)
