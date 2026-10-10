import json, csv, re, os, datetime, unicodedata, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
import rpo_filter

ROOT = "C:/Users/Samo/Desktop/investors"
RS = ROOT + "/raw/scout"


def mtime(path):
    return datetime.datetime.fromtimestamp(os.path.getmtime(path)).isoformat(timespec="seconds")


rows = []  # (name, source, url, found_at, ico)

# --- SIH
sih_found = mtime(RS + "/scout_sih_extract.txt")
for n in ["CB Investment Management", "Vision Ventures", "Zero Gravity Capital",
          "Limerock Investment Holding (predtým Limerock Fund Manager)", "Neulogy Ventures", "CB ESPRI",
          "Sociálni Inovátori Impact Capital", "Wasteland Investment Management", "CEE Capital Management",
          "IPM Avanea Eco Management"]:
    rows.append((n, "sih", "https://www.sih.sk/", sih_found, ""))
rows.append(("Slovak Investment Holding, a.s.", "sih", "https://www.sih.sk/", sih_found, "47759097"))

# --- NBS
f = RS + "/scout_nbs_subjekty_filtered.json"
d = json.load(open(f, encoding="utf-8"))
for i in d["institutions"]:
    ico = (i.get("id") or "").strip()
    if not re.fullmatch(r"\d{6,8}", ico):
        ico = ""
    rows.append((i["name"], "nbs", "https://subjekty.nbs.sk/api/json", mtime(f), ico))

# --- ESMA
for fn, url in [("scout_esma_euveca_all.json", "https://registers.esma.europa.eu/solr/esma_registers_upreg/select?q=ae_entityTypeCode:EVC&rows=1000&wt=json"),
                ("scout_esma_aifm_active_all.json", "https://registers.esma.europa.eu/solr/esma_registers_upreg/select?q=ae_entityTypeCode:aif%20AND%20ae_status:Active&rows=5000&wt=json")]:
    d = json.load(open(RS + "/" + fn, encoding="utf-8"))
    for x in d["response"]["docs"]:
        if "SLOVAKIA" in (x.get("ae_homeMemberState", ""), x.get("ae_hostMemberState", "")):
            rows.append((x["ae_entityName"], "esma", url, mtime(RS + "/" + fn), ""))

# --- RPO name search
EXCL_CLEAR = re.compile(r"construction|security|safety|\bcars\b|pharma|\bimport\b|\bbau\b|building|insurance|accounting|press fund|"
                        r"real estate|reality|realit|property|estate|leasing|\btrans\b|"
                        r"hudobný fond|literárny fond|výtvarných umení|fond ochrany vkladov|garančný fond|pozemkový fond|"
                        r"fondy eu|eu-fondy|štrukturálne fondy|bytového fondu|fond na podporu|law \+ funds|capital & law|legal capital", re.I)
rpo_excluded = []
seen_rpo = set()
for term, name, ico, url in rpo_filter.rows():
    if EXCL_CLEAR.search(name):
        rpo_excluded.append((term, name, ico))
        continue
    if ico in seen_rpo:
        continue
    seen_rpo.add(ico)
    rows.append((name, "rpo_nazov", url, mtime(RS + f"/rpo_nazov/scout_rpo_nazov_{term}_ALL_active.json"), ico if re.fullmatch(r"\d{6,8}", ico) else ""))

# --- clanok (media articles, publication date within 2023-10-09..2026-10-09)
ART = {
    "forbes_inobat": ["Bromo Capital", "IPM Group", "Cielo Capital", "Slovenský investičný holding"],
    "forbes_wewell": ["Crowdberry Investment Management", "Zero Gravity Capital", "Zero One Hundred"],
    "forbes_patrongo": ["Venture to Future Fund", "SpeedUp Venture Capital Group", "Zero Gravity Capital", "Lighthouse Ventures", "P&J Capital"],
    "startitup_mlatilik": ["Czech Founders VC", "Nextech Ventures"],
    "startitup_daitable700": ["Czech Founders VC", "MIG Investors"],
    "startitup_165mil": ["Slovenská sporiteľňa (Seed Starter)", "Energy Venture Pals", "JIC Ventures", "DEPO Ventures", "Venture Buddies"],
    "startitup_40tisic": ["Czech Founders VC"],
    "startitup_vzdelavanie1mil": ["Simpact Ventures", "ZAKA VC", "Zero One Hundred", "DEPO Ventures"],
    "startitup_veslo": ["Slovak Investment Holding", "Venture to Future Fund"],
    "startitup_amerika": ["Slovenská sporiteľňa (Seed Starter)", "Venture to Future Fund"],
    "startitup_seedstarter_prve": ["Slovenská sporiteľňa (Seed Starter)"],
    "startitup_oxford417": ["Oxford Science Enterprises", "OTB Ventures", "In-Q-Tel", "Y Combinator", "Kaya VC", "ZAKA VC"],
    "startitup_tri_slovenky": ["Slovak Investment Holding"],
    "startitup_petrzalka": ["Slovak Investment Holding"],
    "startitup_truban_zvada": ["Flying Founders"],
    "vestbee_cequence": ["Jet Ventures", "Jet Investment"],
    "vestbee_sloneek36": ["Purple Ventures", "Venture to Future Fund", "Vision Ventures", "Presto Ventures"],
    "vestbee_talentiqa": ["Purple Ventures", "Venture to Future Fund"],
    "recursive_sloneek5m": ["Orbit Capital", "Venture to Future Fund"],
    "vestbee_cee_june2026": ["J&T Ventures", "Slovenská sporiteľňa (Seed Starter)", "Slovak Investment Holding"],
    "vestbee_cee_q1_2026": ["Underground Ventures", "TomEnterprise AB", "Society Pass"],
    "recursive_sensible": ["Oxford Science Enterprises"],
    "sme_crowdberry_sporitelna": ["Crowdberry", "Slovenská sporiteľňa (Seed Starter)"],
    "vestbee_top_vc_slovakia": ["Neulogy Ventures", "Vision Ventures", "365.fintech", "Zero Gravity Capital", "CB Investment Management",
                                "Innovations and Technologies Fund", "LRJ Capital", "Eterus Capital", "IPM Growth"],
}
art_meta = {}
for short, names in ART.items():
    p = RS + f"/scout_clanok_{short}.txt"
    head = open(p, encoding="utf-8").read(800)
    url = re.search(r"^URL: (.+)$", head, re.M).group(1).strip()
    found = re.search(r"^FETCHED_AT: (.+)$", head, re.M).group(1).strip()
    art_meta[short] = (url, found)
    for n in dict.fromkeys(names):
        rows.append((n, "clanok", url, found, "47759097" if n in ("Slovak Investment Holding", "Slovenský investičný holding") else ""))

# --- saia (ecosystem reports / SAPIE)
srs = RS + "/scout_saia_startup_report_slovensko_2025_slsp.txt"
for n in ["Neulogy Ventures", "Slovenská sporiteľňa (Seed Starter)", "Crowdberry"]:
    rows.append((n, "saia", "https://cdn0.erstegroup.com/content/dam/sk/slsp/www_slsp_sk/Aktuality/startup-report-slovensko-2025.pdf", mtime(srs), ""))
rows.append(("Vision Ventures", "saia", "https://sapie.sk/generalmembers1", mtime(RS + "/scout_saia_sapie_generalmembers1.txt"), ""))

# --- dedup
LEGAL = [r"investičný fond s premenlivým základným imaním", r"správca podlimitných rizikových fondov", r"v likvidácii", r"v konkurze",
         r"organizačná zložka", r"pobočka slovenská republika", r"správ\. ?spol\.", r"spol\. ?s ?r\. ?o\.", r"s\. ?r\. ?o\.", r"a\. ?s\.",
         r"j\. ?s\. ?a\.", r"k\. ?s\.", r"\bsicav\b", r"\bse\b", r"\bgmbh\b", r"\bab\b", r"družstvo", r"o\.c\.p\.", r"\(predtým[^)]*\)"]


def norm(n):
    s = n.lower()
    for p in LEGAL:
        s = re.sub(p, " ", s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9&]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


name2ico = collections.defaultdict(set)
for n, src, url, fa, ico in rows:
    if ico:
        name2ico[norm(n)].add(ico)
# manual alias: Slovak name of SIH
name2ico[norm("Slovenský investičný holding")].add("47759097")

keys = []
for n, src, url, fa, ico in rows:
    if ico:
        k = "ICO:" + ico
    else:
        icos = name2ico.get(norm(n), set())
        k = "ICO:" + next(iter(icos)) if len(icos) == 1 else "N:" + norm(n)
    keys.append(k)

cid = {}
out = []
seen_pair = set()
for (n, src, url, fa, ico), k in zip(rows, keys):
    if k not in cid:
        cid[k] = f"C{len(cid) + 1:03d}"
    pair = (cid[k], src)
    if pair in seen_pair:
        continue
    seen_pair.add(pair)
    out.append([cid[k], n, src, url, fa, ico])

with open(ROOT + "/data/candidates.csv", "w", encoding="utf-8", newline="") as fh:
    w = csv.writer(fh, quoting=csv.QUOTE_MINIMAL)
    w.writerow(["candidate_id", "name", "discovery_source", "discovery_url", "found_at", "ico_hint"])
    w.writerows(out)

c = collections.Counter(r[2] for r in out)
print("rows", len(out), "distinct", len(cid), dict(c))
multi = collections.Counter(r[0] for r in out)
print("candidates in >=2 sources:", sum(1 for v in multi.values() if v >= 2))
for k, v in multi.items():
    if v >= 2:
        print(k, [ (r[1], r[2]) for r in out if r[0] == k])
json.dump(rpo_excluded, open(RS + "/rpo_nazov/scout_rpo_nazov_excluded_clearly_unrelated.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("rpo excluded clearly unrelated:", len(rpo_excluded))
