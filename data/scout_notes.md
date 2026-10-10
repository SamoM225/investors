# Scout – poznámky (beh 2026-10-09, okno aktivity 2023-10-09..2026-10-09)

Výstup: `data/candidates.csv` – 1 412 riadkov (kandidát × zdroj), **1 334 rôznych kandidátov**, 65 z nich vo ≥2 zdrojoch.
Kópie zdrojov: `raw/scout/` (pomocné skripty v `raw/scout/scripts/`). Holdout (EIF, SLOVCA, `data/holdout.csv`, `logs/`, `raw/holdout_*`, `raw/rpo/`) nepoužitý ani neotvorený. Crunchbase/LinkedIn/PitchBook/Dealroom nepoužité.

## Počty podľa zdroja (riadky = rôzni kandidáti v danom zdroji)

| discovery_source | počet | zdroj / poznámka |
|---|---|---|
| sih | 11 | `raw/sih_homepage_2026-10-09.txt` (Playwright kópia sih.sk); 10 správcov z viet „…investorom vo fonde spravovanom spoločnosťou X“ + samotný SIH (IČO 47759097, priame investície). Výťah: `scout_sih_extract.txt` |
| nbs | 113 | https://subjekty.nbs.sk/api/json (ZIP, aktualizácia 2026-10-08). Typy: registrovaný správca AIF (28), správcovská spoločnosť (10), registrovaný AIF (33), AIF (32, väčšinou o.p.f. bez IČO), registrovaný samosprávny AIF (10). Bez filtrovania podľa mena. Zahraničné AIF a podfondy nebrané. |
| esma | 12 | Solr: EuVECA so SK = 2 (G-Force, Occam Investments); AIFM Active so SK = 10 (9 SK + Erste Asset Management GmbH pobočka SR) |
| rpo_nazov | 1 227 | api.statistics.sk/rpo/v1/search, `onlyActive=true`, dotazy delené podľa dátumu vzniku (API vracia max. 500). Aktívne zhody: Ventures 232, Venture 367, Capital 1 107, Fund 276, Fond 390, Invest 7 224. Ponechané len: Obchodný register, aktuálny názov obsahuje termín (bez „adventure“, bez neinvestičných fondov); pri „Invest“ len s Venture/Capital/Fund/Fond/Partners/Seed/Angel/Equity/SICAV. Vyradených 61 jasne nesúvisiacich (reality, stavebníctvo, security, EU-fondy poradenstvo, kultúrne fondy, FOV, GFI…) – zoznam v `rpo_nazov/scout_rpo_nazov_excluded_clearly_unrelated.json`. Živnostníci (fyzické osoby) a iné registre (OZ, nadácie, neinvestičné fondy) nebrané. |
| clanok | 45 | 24 článkov s dátumom publikácie v okne (Forbes.sk 3, Startitup.sk 12, Index SME 1, Vestbee 6, The Recursive 2) – zoznam nižšie. Zapísaní všetci menovaní investori typu fond/firma/program (aj zjavne zahraniční – na vyradenie v G2); vynechané fyzické osoby a strategickí priemyselní investori (Gotion, Amara Raja, Rio Tinto, Lilium). |
| saia | 4 | SAIA = SAPIE (Slovak Alliance for Innovation Economy): zoznam členov sapie.sk/generalmembers1 (Vision Ventures). Ekosystémový report „Startup Report Slovensko 2025“ (Slovenská sporiteľňa/Civitta/SASK, PDF) – Neulogy Ventures, Seed Starter, Crowdberry. Samostatný SAPIE report so zoznamom VC fondov sa nenašiel. |

## Články použité (clanok)
forbes_inobat (2024-12-20), forbes_wewell (2023-12-06), forbes_patrongo (2024-08-13), startitup_mlatilik (2025-09-17), startitup_daitable700 (2025-03-20), startitup_165mil (2026-06-02), startitup_40tisic (2025-06-19), startitup_vzdelavanie1mil (2026-02-04), startitup_veslo (2026-07-20), startitup_amerika (2024-05-23), startitup_seedstarter_prve (2023-10-19), startitup_oxford417 (2026-10-07), startitup_tri_slovenky (2026-04-22), startitup_petrzalka (2026-09-22), startitup_truban_zvada (2024-09-04), sme_crowdberry_sporitelna (2024-10-15), vestbee_cequence (2025-06-13), vestbee_sloneek36 (2024-09-10), vestbee_talentiqa (2025-09-29), vestbee_cee_june2026 (2026-07-01), vestbee_cee_q1_2026 (2026-05-19), vestbee_top_vc_slovakia (publ. 2020-10-08, aktualizované 2024-02-21 – zoznam fondov), recursive_sloneek5m (2026-06-16), recursive_sensible (2026-10-07).
Otvorené, ale nepoužité (mimo okna alebo bez mien investorov): forbes_moneyhoon, matsuko, zgc_12mil, eset_startup, herne_studia, crowdberry_rast, hopin; startitup_15mil, cz_sk_milion, lego5mil, seedstarter_smarthead (2023-09-04), fondy_mentoring, daitable50; ecb_forvio, ecb_ineduco; eustartups_sk2024/2026, vestbee_cee_q2_2026, vestbee_largest_2026, vestbee_accelerators_sk, recursive_vestberry, techeu_fintech.

## Zlyhania / obmedzenia
- **Forbes.sk paywall**: forbes_culturepulse, forbes_cequence, forbes_sloneek_52, forbes_definic, forbes_najvacsie_vlani, forbes_sloneek_tri_dni – telo článku orezané, mená investorov v uloženom texte chýbajú. Retry v prehliadači (Playwright) pri forbes_definic – tiež paywall. Kandidáti z nich nezapísaní (tie isté mená väčšinou pokrýva Vestbee/Recursive).
- **index.sme.sk**: HTTP 403 pre skript → retry v Playwright úspešný pre článok Crowdberry/Slovenská sporiteľňa (uložená viditeľná časť pred paywallom). Článok o Twinzo (403) neskúšaný v prehliadači.
- **therecursive.com**: odkazy `?p=` presmerujú na titulnú stránku (uložené ako `scout_clanok_FAILED_redirect_rec*.txt`), `/country/slovakia` a `/news/page/12/` = 404. Polročné prehľady Slovak funding rounds H1/H2 2024–2025 sa nepodarilo otvoriť.
- **Vyhľadávač**: trend.sk, hnonline.sk, aktuality.sk sú pre vyhľadávací nástroj nedostupné; SITA/TASR tlačové správy sa nenašli.
- **saia.sk** je iná organizácia (SAIA, n.o. – akademická agentúra), stiahnutá kópia zmazaná; použité sapie.sk. SAPIE databáza Innovate Slovakia nepoužitá (pravdepodobne agregátor).
- **ESMA**: fondy EuVECA (deti správcov) sa cez `_root_` dotaz nevrátili – zapísaní len správcovia.
- RPO: názvy dedupované podľa aktuálneho názvu; kandidát zachytený cez historický názov nie je (filtrované na aktuálny názov).

## Možné duplicity, ktoré Scout nezlúčil (zlúči Registrátor cez IČO)
„Innovations and Technologies Fund“ (Vestbee) vs. „Fond inovácií a technológií, a.s.“ (NBS/RPO); „Slovak Investment Holding/Slovenský investičný holding“ zlúčené (IČO zo stránky SIH); „Crowdberry“ vs. „Crowdberry Investment Management“ vs. „CB Investment Management“; „IPM Group“ / „IPM Growth“ / „IPM Avanea Eco Management“; „Jet Ventures“ / „Jet Investment“; „Zero One Hundred“ vs. „Zero Gravity Capital“; „Slovenská sporiteľňa (Seed Starter)“ = program banky, zapísaný pod menom banky.
