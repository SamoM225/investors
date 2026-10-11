# Pilot: súhrn behu

Beh začal: 2026-10-09T16:45:36Z. Okno aktivity: 2023-10-09 až 2026-10-09.

## Holdout (krok 1)

Zdroje (Scoutovi odobraté):
- EIF, "EIF equity fund partners as at 30 September 2026", Slovensko: 2 správcovia (Sandberg Capital, Neulogy Ventures). Kópia: `raw/holdout_eif_slovakia-equity-fundmanagers_2026-10-09.pdf` (+ `.txt`).
- SLOVCA, riadni členovia: 12 členov, z toho 7 so subjektom registrovaným v SR (overené vyhľadaním v RPO podľa názvu). Kópia: `raw/holdout_slovca_riadni-clenovia_2026-10-09.txt`, záznamy RPO v `raw/rpo/`.
- Mimo SR (v RPO bez aktívneho slovenského subjektu): ARX Equity Partners, CVI, Enterprise Investors, Genesis Capital (organizačná zložka zanikla 2006-08-03), Jet Investment.

Spolu 9 riadkov, 7 unikátnych IČO. Prienik EIF ∩ SLOVCA = 2 IČO (oba subjekty EIF sú aj členmi SLOVCA).

Poznámka: holdout obsahuje aj PE (Sandberg) a štátne subjekty (FIT, NHF). Či sú „v rozsahu“, sa určí rovnakým postupom (G1–G5). Subjekty holdoutu, ktoré Scout nenájde, sa po hlavnom behu spracujú zvlášť s príznakom `holdout_only`, aby sa dalo určiť, či patria do rozsahu (menovateľ pre KU3).
note: scout tokens = subagent_tokens total (input+output nerozlíšené)

## Scout a Registrátor (kroky 2–3)

- Scout: 1 334 kandidátov (1 412 riadkov kandidát × zdroj); rpo_nazov 1 227, nbs 113, clanok 45, esma 12, sih 11, saia(SAPIE) 4; 1 179 iba z rpo_nazov. Spotreba: 275 566 tokenov, 101 volaní nástrojov, ~20 min.
- Registrátor (skript nad RPO API): 1 267 kandidátov s jednoznačným IČO; 25 vyradených v G1 (zánik/likvidácia). 67 bez zhody: 32 podielových fondov (o.p.f./u.p.f., bez právnej subjektivity) => `vyradeny_register`; 35 dorieši agent Registrátora: 3 SK subjekty (z toho 2 duplicity), 28 zahraničných => `mimo_rozsahu`, 4 => `vyradeny_register`. Agent: 207 232 tokenov, 84 volaní.
- Overenie registrových tvrdení (skript, opätovné stiahnutie RPO): 3 795 tvrdení, 3 770 potvrdených, 25 nepotvrdených (stav „likvidácia“ – chyba v overovacom skripte, opravená; týka sa iba vyradených).

## ODCHÝLKA od zadania: triedenie pred výskumom

Dôvod: 1 179 kandidátov z hľadania podľa názvu; plný výskum pri každom by bol neúmerne drahý.

1. **G3 podľa hlavnej činnosti v RPO** (iba kandidáti nájdení výlučne cez rpo_nazov): ponechané kódy SK NACE 64, 66, 70.10, 70.20, 82.99, 82.10; ostatné => `vyradeny_typ` (G3), dôkaz A (statisticalCodes.mainActivity). Kódy 70.20, 82.99, 82.10 boli pridané po zistení, že ich majú aj skutoční VC správcovia (Neulogy 7020, Zero Gravity 7020, Vision Ventures 8299, CB IM 7020). **Zistenie pre štúdiu:** NACE kód nerozlišuje VC správcu spoľahlivo (v T1 aj 7311 reklama, 6820 nehnuteľnosti, 4712 maloobchod). Chybné vyradenia meria M4 (vrstva vyradených vo vzorke).
2. **Úrovne výskumu:** T1 = plný výskum (zdroj sih/esma/clanok/saia, ≥ 2 zdroje, alebo správca z NBS); T2 = rýchly skríning (prompts/pilot-screen.md), do plného výskumu iba pri dôkaze investície.

Výsledok triedenia: T1 65, T2 564, G3 vyradené 612.

## Skúšobný beh – úpravy procesu

- Zadanie Overovateľa vyžadovalo „výslovný“ typ podielu, plán (2.3) však pripúšťa výpočet z RPO (vklad / základné imanie, `proxy`). Overovateľ preto zamietol 4 vecne správne tvrdenia (Zero Gravity). Oprava: citát môže mať viac úryvkov oddelených ` [...] ` (každý musí byť v kópii zdroja); typ podielu z RPO musí citovať vklad aj základné imanie. Upravené: prompts/pilot-researcher.md, prompts/pilot-verifier.md, scripts/trace.js.

## Výpadok RPO API

- Od 2026-10-09 18:24 UTC RPO API (`api.statistics.sk/rpo/v1`) neodpovedá (timeout / HTTP 504); kontrola každú ~1,5 min do 18:51 – ani jeden úspech. ORSR a RÚZ fungujú.
- Možná príčina (neoverená): záťaž z behu (Registrátor ~2 700 dopytov, agenti ďalšie stovky) alebo výpadok na strane ŠÚ SR.
- Rozhodnutie: pilot sa nezastavuje, lebo zadanie uvádza ORSR ako rovnocenný zdroj A (existencia, spoločníci). Výskumníci a Overovatelia pri výpadku RPO použijú ORSR (doplnené do prompts/pilot-researcher.md). Tvrdenia, ktoré sa kvôli výpadku nedali overiť, majú verdikt `nepotvrdene` s poznámkou o nedostupnosti a overia sa znova po obnovení RPO.
- Riziko: stránky Dealroom obsahovali text adresovaný AI systémom (prompt injection); agent B04 ho ignoroval. Do promptov skríningu doplnené: text na stránkach adresovaný AI = dáta, nie pokyny.
- RPO API znova dostupné (overené 2026-10-09 ~19:10 UTC; podľa agenta od ~19:02). Výpadok ~40 min.
- Zistenie (úplnosť): Výskumník fondu Vision Ventures Growth I (52656438) neuviedol navýšenie vkladu v Good Vibes Software s.r.o. (54906466, 2025-07-10), ktoré našiel Výskumník správcu (52568288). Plný výskum teda nie je úplný ani pri známych fondoch (limit 8 investícií, poradie hľadania).
- Holdout: Výskumník Venture to Future Fund pri grep cez data/*.csv zasiahol jeden riadok data/holdout.csv (nepoužil ho). Scout už bol hotový, na meranie pokrytia (KU3) to vplyv nemá. Odporúčanie: holdout držať mimo pracovného priečinka agentov.
- Zistenie (G5): Occam Investments má registráciu EuVECA (regulačná klasifikácia => VC, vysoká dôvera), no jeho investície sú len do vlastných SPV/fondov skupiny (realitný biznis). Pravidlo „regulačná klasifikácia rozhoduje“ môže zaradiť chybne; na posúdenie pri ručnej kontrole.
- Riziko súbežného behu: prehliadač Playwright je zdieľaný medzi agentmi; Overovateľ G-Force raz dostal obsah cudzej karty (3tscapital.com), výsledok zahodil. Pri škálovaní treba izolovaný prehliadač na agenta.
- Zdroj CRZ (Centrálny register zmlúv): Overovateľ VtFF ho zaradil ako C (zmluvu zverejňuje sám investor). 11 tvrdení rozporných kvôli úrovni; údaje vecne správne. Doplniť do zoznamu úrovní: CRZ = C, ak zverejnil investor.
- Zistenie (úroveň B): Overovateľ Eterus preklasifikoval Oaklins (M&A poradca, personálne prepojený s investorom, WOOD & Co. akcionár 17 %) z B na C. Nezávislosť tretej strany treba overovať aj pri poradcoch a spoluinvestoroch.
- Zistenie (dohľadateľnosť): CEE Capital – závierka fondu za 2025 je sken bez textovej vrstvy; Výskumník text prepísal do raw/ (flag prepis_skenu, 9 tvrdení). KU0 to prejde, ale kópia nie je strojová – Overovateľ musí porovnať s PDF. Pri škálovaní treba OCR.
- Zistenie (konzistentnosť Overovateľov): Vestbee raz B (správa o kole, VV Growth I), raz D (zoznam fondov, 365.fintech). Rôzni Overovatelia rozhodujú hraničné zdroje rôzne – potrebný pevný zoznam zdrojov s úrovňou.
- Pevné priradenie hraničných zdrojov doplnené do prompts/pilot-verifier.md počas behu (CRZ=C, RÚZ čísla=A/opis=C, správa o kole=B, zoznamy=D, poradca/spoluinvestor=C, PR=C). Overovatelia spustení skôr rozhodovali podľa vlastného úsudku (výsledky zväčša zhodné).
- KĽÚČOVÉ ZISTENIE: ORSR umožňuje hľadať právnickú osobu ako spoločníka (vrátane histórie). Výskumník ZGC Fund I tak našiel 6 portfóliových firiem, ktoré výskum správcu (ZGC) prehliadol. Spätné vyhľadávanie (investor -> firmy), ktoré RPO API nemá, je dostupné cez ORSR. Pre úplnosť a náklady je to zásadné: mal by to byť prvý krok Výskumníka pri SR subjektoch.
- Overovanie dátumov mimo okna: Overovatelia ich potvrdzujú s poznámkou „MIMO okna“ (dátum sedí so zdrojom); okno aktivity uplatňuje až Klasifikátor. Verdikt rozporne iba pri dátume, ktorý nesedí so zdrojom.
- OTÁZKA PRE POUŽÍVATEĽA: úroveň zmlúv v CRZ. Počas behu zavedené CRZ (zverejnil investor) = C. Protiargument: CRZ je štátny register, zverejnenie je zákonná povinnosť, zmluvu podpisuje aj cieľová firma => obhájiteľné B. Pri NDF II tým 15 tvrdení (konvertibilné úvery, sumy, dátumy) skončilo ako rozporné; pri VtFF 11. Rozhodnutie mení počet doložených investícií štátnych fondov.
- Oprava Klasifikátora (G3): doložená iná činnosť (A/B) bez tvrdenia investuje_do_podielov vyradí subjekt aj pri zapísaných podieloch (Arca Capital Slovakia – podiely vo vlastných dcérach). Pri oboch tvrdeniach príznak g3_sporne.
- KĽÚČOVÉ ZISTENIE (chyba agenta): FIT – Výskumník prepísal zo skenovanej výročnej správy citát (podiely k 31.12.2024), ktorý v PDF nie je (Overovateľ prešiel 38 strán). KU0 to nezachytí, lebo citát je v ručne prepísanej kópii. Prepisy skenov sú miesto, kde môže vzniknúť vymyslený citát; bez OCR a nezávislého porovnania s originálom je dohľadateľnosť len formálna.
- Zistenie (zrelosť z MSP): pri kapitálovo náročných firmách bez tržieb (InoBat Auto: aktíva 45 mil. €, obrat 1,7 mil. €, bez počtu zamestnancov) vychádza podľa pravidla „tržby a/alebo bilančná suma“ kategória mikro => „raná“. Prevod MSP→zrelosť je bez počtu zamestnancov nespoľahlivý; potvrdzuje potrebu kalibrácie (2.3).
- ZÁSAH DO PROSTREDIA: Overovateľ FIT (opakovanie) nainštaloval cez pip knižnicu PyMuPDF do používateľovho Pythonu 3.14 (render skenovaných PDF). Bez súhlasu používateľa; odstránenie: pip uninstall pymupdf.

## Záver automatickej časti behu (2026-10-10)

Podrobné počty: `logs/run_summary_stats.md` (generuje `scripts/report.js`). Chyby agentov: `logs/agent_errors.md`.

**Výsledok klasifikácie (1 330 subjektov po deduplikácii):** zaradeny 15 · typ_nerozhodnuty 6 · neiste 1 · vyradeny_neaktivny 580 · vyradeny_typ 639 · vyradeny_register 61 · mimo_rozsahu 28.
- Zaradení: CB Investment Management, CB Growth ONE, Vision Ventures, Vision Ventures Growth I, Neulogy Ventures, CB ESPRI, Venture to Future Fund, Eterus Capital, Ethernum Capital, G-Force, Occam Investments, IPM Avanea Eco Management, 365.fintech (korporatne_VC), SIH a NDF II (statny_fond).
- typ_nerozhodnuty (VC|PE): Zero Gravity Capital, ZGC Fund I, SI Impact Capital, CEE Capital Management, CB ESPRI Impact One, IPM Avanea Eco – takmer vždy preto, že cieľová firma vznikla v deň investície a nemá závierku pred investíciou (zrelosť nedoložená).
- neiste: Fond inovácií a technológií (navýšenia 2025 doložené iba vlastnou výročnou správou, C).

**KU0 (dohľadateľnosť):** 100 % – 320/320 hodnôt v `investors.json`; všetky potvrdené tvrdenia 4 402/4 402.

**Holdout:** všetkých 7 IČO holdoutu Scout našiel (pokrytie hrubého zberu 100 %). V databáze zaradené 4 (Neulogy, Eterus, VtFF, Vision Ventures); Sandberg (PE, bez SR investície v okne), FIT (neiste), NHF (bez dôkazu v skríningu) – či patria do rozsahu, určí ručná kontrola (menovateľ KU3).

**Overovanie:** 708 tvrdení výskumníkov; 607 potvrdených, 15 nepotvrdených, 86 rozporných (miera zamietnutí 14 %). Kategórie: zlá úroveň zdroja 69, iné 10, nedoložená fáza/typ podielu 8, zámena subjektu 6, citát neexistuje 3, nesprávna závierka 3, starý dátum 2.

**Zrelosť cieľových firiem (potvrdené investície, 105):** výslovne 8, z MSP 51, nedoložená 46, sporná 0.

**Podiel neistých (KU5):** 7 / 602 = 1,2 % voči všetkým, ktorí prešli G3 (väčšina bez výskumu, len skríning); voči plne skúmaným ~7 / 29 (vypočíta `scripts/metrics.js`).

**Spotreba (M7):** spolu ~12,0 mil. tokenov. Plný výskum: 35 kandidátov, ~171 tis. tokenov a medián ~12,5 min na kandidáta; Overovateľ ~94 tis. tokenov na kandidáta; skríning ~3,2 tis. tokenov na kandidáta (608 kandidátov, 16 dávok); Registrátor skript ~2 dopyty RPO na kandidáta, 0 tokenov.

**Ručná kontrola – čaká na človeka:** `data/review_sample.csv` (169 záznamov, slepé; 34 s dvojitou kontrolou) a `data/review_claims.csv` (132 tvrdení). Vrstvy: zaradeny 14/15, vyradeny 124/1 280, mimo_rozsahu 24/28, vždy 7 (neiste + typ_nerozhodnuty). Seed 20261009. Po vyplnení: `node scripts/metrics.js` → `logs/metrics.md`.

## Očistenie dát od vyradených (2026-10-10, na pokyn používateľa)

- Ponechané iba subjekty `zaradeny`, `typ_nerozhodnuty`, `neiste` (22 IČO): `data/decisions.csv`, `data/claims.csv`, `data/investors.json`, `data/research/`, `data/verify/`, ich kópie v `raw/`.
- Vyradené (1 308 riadkov: `vyradeny_*`, `mimo_rozsahu`, duplicity) zhrnuté v **`data/vyradene.csv`**: IČO, názov, status, brána, kategória, dôvod, poznámka (pri plne skúmaných), URL a text kľúčového dôkazu, spôsob spracovania (plný výskum / skríning / triedenie NACE / registrátor), zdroje kandidáta.
- Zmazané: tvrdenia a kópie zdrojov vyradených (3 929 položiek v `raw/`), ich výskum a overenie, medzivýstupy `data/screen/`, `data/triage.csv`, `data/registrar_*.csv`, `raw/registrar/`. `raw/` 95 MB → 42 MB.
- Ponechané bez zmeny: `logs/` (vrátane spotreby a logu chýb), `raw/scout/`, `raw/holdout_*`, `raw/rpo/`, `raw/sih_*`, `data/holdout.csv`, `data/scout_notes.md`.
- Ručná kontrola: v `data/review_sample.csv` odkazujú vyradené záznamy na `data/vyradene.csv`; `data/review_claims.csv` znova vybraná iba z tvrdení ponechaných subjektov (109 z 540, seed 20261009). `scripts/metrics.js` upravený na nový stav.
- Skripty `classify.js`, `triage.js`, `registrar.js`, `report.js` po očistení nemajú všetky vstupy; na opakovanie behu treba zálohu (`scratchpad/backup_pred_cistenim_2026-10-10.tar.gz`, dočasný priečinok relácie).

## Negatívny dôkaz pri G4 a návrat vyradených na výskum (2026-10-10, pripomienka používateľa k PC19 Capital)

### Podnet a zmena algoritmu

Používateľ ručne preveril PC19 Capital (IČO 54235146). Firma existuje, ale na webe ani vo finstate nenašiel žiadne investície. Algoritmus ju vyradil rovnako (`vyradeny_neaktivny`), ale iba na základe 2 až 4 webových dopytov skríningu. Rovnako bolo vyradených 573 z 580 subjektov na G4. Status „neaktívny“ navyše miešal dve rôzne zistenia: „investoval, ale pred oknom“ a „neinvestoval vôbec“.

**PC19 Capital.** ORSR (spätné vyhľadávanie spoločníka) ukazuje, že PC19 je od 2024-01-04 jediným spoločníkom FRRE s. r. o.:
- FRRE je kúpená ready-made firma (pôvodne KASTON A546),
- má rovnaké sídlo ako PC19,
- PC19 do nej vložil 538 000 € (navýšenie vkladu 2024-03-26).

Je to vlastná účelová dcéra, nie investícia do cudzej firmy. Výsledok je `vyradeny_bez_investicii` s kategóriou `iba_vlastne_dcery` a strednou silou dôkazu, lebo závierka fondu je iba v PDF. Finstat podiel nezachytil.

**Zmena algoritmu:**
- **Nové skripty:**
  - `scripts/footprint.js`: ORSR (spoločník, komanditista, akcionár, aj pod bývalými názvami subjektu) a RÚZ (podielové cenné papiere),
  - `scripts/g4_rules.js`: rozhodnutie G4 a sila negatívneho dôkazu,
  - `scripts/apply_g4.js`: uplatnenie pravidla na staré vyradenia,
  - `scripts/pretriage.js`: lacné predtriedenie pred plným výskumom,
  - `scripts/finalize_navrat.js`: premietnutie rozhodnutí do dát.
- **Nové stavy:** `vyradeny_bez_investicii` a medzistav `na_vyskum`.
- **Zapojenie do behu:**
  - `triage.js` posunie do T1 subjekt, ktorý má podiel v cudzej firme v okne,
  - `classify.js` rozhoduje G4 podľa nového pravidla a má režim `--merge <súbor>` na prepočet podmnožiny.
- **Dokumentácia:** plan.md 2.2 a 2.3, prompts/pilot-prompt.md (G4, krok 2a), prompts/pilot-researcher.md (Výskumník začína od `data/orsr_podiely.csv`).
- **Ochrana osobných údajov:** odpovede registrov sú v `.cache/`, mimo gitu, lebo obsahujú mená fyzických osôb.

### Kontrola registrov (602 subjektov, 0 tokenov)

- 9 518 HTTP požiadaviek, 0 chýb ORSR.
- RÚZ: tabuľkový výkaz má 441 subjektov, iba PDF 29, bez riadnej závierky 132.
- ORSR: 639 podielov pri 153 subjektoch, z toho 156 vlastných dcér.

**Chyby skriptov nájdené počas behu (opravené):**
1. **Rast celého finančného majetku v RÚZ.** Ak boli podiely nulové, pravidlo použilo celý dlhodobý finančný majetok, ktorý zahŕňa aj pôžičky. Rast pôžičiek však nie je investícia podľa R1 (zistené pri iea capital a PROXENTA). Teraz sa ráta iba rast podielových cenných papierov.
2. **Neúplný rok 2023.** Okno začína 9. 10. 2023, takže rast za celý rok 2023 investíciu v okne nedokazuje. Rátajú sa iba roky 2024 a 2025.
3. **Firma presunutá k inému súdu.** Výpis pôvodného súdu je zmrazený („Spis odstúpený“) a skript z neho bral podiel ako trvajúci (zistené pri PROXENTA a StorageX). Teraz rozhoduje aktuálny výpis. Opakovaný beh z cache zmenil 28 záznamov podielov.

### Výsledok pre 580 vyradení na G4 a predtriedenie

Registre vrátili do výskumu 88 subjektov: 53 cez ORSR a 35 cez RÚZ.

**Predtriedenie** (`scripts/pretriage.js`) použilo NBS, RPO (vlastníci subjektu, vek, činnosť a podiel v cieľovej firme) a ORSR:

| Výsledok | Počet | Dôvod |
|---|---|---|
| `vyradeny_typ` (G3) | 37 | všetky podiely v okne sú väčšinové alebo vo firmách mimo VC (nehnuteľnosti, ambulancie, doprava, reštaurácie) |
| `mimo_rozsahu` (G2) | 20 | viditeľný je iba rast podielov v RÚZ a subjekt vlastnia iba fyzické osoby, ide o osobný holding |
| plný výskum | 31 | 10 registrovaných v NBS, 11 s menšinovým podielom v mladej firme, 10 s rastom v RÚZ a vlastníkom typu firma |

Ostatné vyradenia ostávajú vyradené, teraz s dôkazom z registrov (`data/vyradene.csv`, stĺpec `sila_negativneho_dokazu`):
- `vyradeny_bez_investicii`: 423,
- `vyradeny_neaktivny`: 69.

### Plný výskum a overenie 31 subjektov

Postup bol rovnaký ako v pilote: Výskumník a nezávislý Overovateľ, ktorý nevidí úvahy výskumníka.

| Rola | Agentov | Tokeny spolu | Tokeny na agenta | Medián času | Otvorené stránky |
|---|---|---|---|---|---|
| Výskumník | 31 | 4,52 mil. | ≈ 146 tis. | 7 min | 1 881 |
| Overovateľ | 31 | 2,70 mil. | ≈ 87 tis. | – | 420 |

Spolu 7,2 mil. tokenov, teda menej, než odhadoval návrh (23 mil. pre všetkých 88 subjektov).

Overovatelia zamietli 20 zo 196 tvrdení, teda 10 % (podrobnosti v `data/verify/`). Opakovaný pokus Výskumníka sa nespúšťal. Zamietnuté tvrdenia sa týkajú opisu činnosti, veľkosti firmy alebo úrovne zdroja a výsledok subjektu nemenia.

**Výsledky:**
- **Skutočné VC, ktoré skríning chybne vyradil:**
  - **SIIC Fund** (fond skupiny SIH): 6 investícií v okne doložených v RPO. Výsledok je `typ_nerozhodnuty`, lebo zrelosť väčšiny cieľových firiem nie je doložená.
  - **Impact Ventures** (impact fond spoluvlastnený CB ESPRI Impact One): `zaradeny` VC s vysokou dôverou.
- **Pravdepodobne falošný `zaradeny`:** **Avialytica Fund** (VC, stredná dôvera). Je to SPV na jednu investíciu (NGA Invest, 29 %) a vlastnia ho fyzické osoby. Podľa plánu 1.0 ide skôr o vehikel angela. Klasifikátor to rozpoznať nevie, preto to treba posúdiť pri ručnej kontrole.
- **`typ_nerozhodnuty`, ide na ručnú kontrolu:**
  - SEOF: odpad a energetika, skôr infraštruktúra,
  - ZEPHYR AIF: 9 českých firiem, prevažne 100 % podiely, mimo dosahu slovenského ORSR,
  - Limerock: podiel v GAMI5 prevzal z likvidovaného vlastného fondu, nejde o nový kapitál.
- **`neiste` s príznakom `registre_nevysvetlene` (7):** registre ukazujú aktivitu, ktorú výskum nevedel priradiť ku konkrétnej firme:
  - Atlas Capital III, V a VI: séria vehiklov jednej osoby, podiely zrejme v a. s. alebo v zahraničí,
  - Monopoly Ventures,
  - APZ Ventures: vlastná dcéra pod bývalým názvom,
  - Hilberman: vlastný fond s podielom 85 %,
  - Icon Group: akcie vlastného fondu.
- **Vyradení po výskume (19):**
  - `vyradeny_typ` (17): osobné holdingy, poradenstvo, pôžičky, nehnuteľnosti, hedge fondy, ready-made skupiny, holding vlastných prevádzok,
  - `mimo_rozsahu` PE (2): Fund Rating (85 % podiely v maloobchode s ovocím) a IPM Avanea Eco Management (pozri nižšie).

### Zmeny klasifikátora po výskume (platia pre všetkých 53 plne skúmaných)

1. **Vlastné účelové dcéry podľa ORSR nie sú investíciou** (R1). Vynechávajú sa v G4 aj v G5.
2. **Typ podielu v G5** (plan.md 1.1 a 2.3). VC investuje do menšinových podielov. Kontrolný podiel pri doloženej zrelosti preto znamená zrelú transakciu (PE). Pri firme založenej v deň vstupu ostáva zrelosť nedoložená a záznam dostane príznak `kontrolny_podiel_bez_zrelosti`.
3. **Po plnom výskume už `na_vyskum` neexistuje.** Nevysvetlený signál z registrov dostane `neiste` s príznakom `registre_nevysvetlene` a ide na ručnú kontrolu.

**Dopad na 22 subjektov ponechaných z pilotu:** **IPM Avanea Eco Management** prechádza z `zaradeny` VC na `mimo_rozsahu` PE. Jej jediná investícia v okne je 100 % podiel v ECOTAP. Ostatní ponechaní nemenia stav, pri CEE Capital, Ethernum, CB Investment a CB Growth ONE pribudli iba príznaky.

### Stav po tomto kroku

- **Ponechaných 34:** `zaradeny` 16, `typ_nerozhodnuty` 10, `neiste` 8.
- **Vyradených 1 296** v `data/vyradene.csv`, s dôvodom a kľúčovým dôkazom. Podrobné dáta 19 nových vyradení sú zmazané podľa pokynu k očisteniu. Záloha je v `scratchpad/backup_pred_finalize_navrat.tar.gz`.
- **KU0 (dohľadateľnosť):** 100 % (327/327 hodnôt, 741/741 tvrdení).
- **KU5 (podiel neistých medzi plne skúmanými):** 18/41 = 43,9 %, **nesplnené** (predtým 24 %). Nárast spôsobilo 7 prípadov `registre_nevysvetlene`. Kontrola registrov odhaľuje aktivitu, ktorú verejné zdroje nevedia priradiť ku konkrétnej firme.

### Otvorené otázky: nejednotné rozhodnutia Overovateľov, treba zjednotiť pravidlá

1. **„Posledná závierka pred investíciou“** sa čítala dvojako: ako závierka zostavená pred investíciou (Shellvest, Fund Rating) aj ako závierka za obdobie, ktoré skončilo pred investíciou (Avialytica, SIIC). Kategóriu firmy to zatiaľ nikde nezmenilo.
2. **Investícia mimo okna** dostala `potvrdene` s poznámkou. Zadanie však uvádza „dátum mimo“ aj ako príklad pre verdikt `rozporne`.
3. **Úroveň zdroja SIH:** všeobecné pravidlo hovorí „SIH = B“. Overovatelia SEOF a SIIC však použili pevné priradenie „akcionár investora = C“, lebo SIH (NDF II) vlastní 95 až 99 % fondu.
4. **Citát zložený z výkazu a šablóny RÚZ** (APZ): úryvky s názvami riadkov sú iba v šablóne, nie vo výkaze.
5. **Prevody a vnútroskupinové kroky** klasifikátor nerozlišuje od investície:
   - prevod podielu zakladateľa do jeho holdingu,
   - vklady ready-made skupín, ktoré trvali 4 až 8 dní,
   - prevzatie podielu z vlastného fondu.

   Tentoraz ich zachytili brány G3 alebo G5, samostatné pravidlo na ne neexistuje.
6. **Cudzie registre:** Výskumník aj Overovateľ zaradili český obchodný register (ZEPHYR) na úroveň A, rovnako ako ORSR. V pravidlách to zatiaľ nie je.

### Incident pri obnove zo zálohy

Pri obnove registrových tvrdení 31 subjektov zo zálohy zlyhal výber súborov (chyba `grep`), a `tar` preto rozbalil do projektu celú zálohu spred očistenia.

**Náprava:**
- 104 sledovaných súborov som vrátil na posledný commit (`git checkout HEAD`).
- 3 920 súborov spred očistenia som zmazal. Ponechal som iba podklady 31 subjektov.
- Znova som urobil úpravy, ktoré záloha prepísala: skripty, kľúč a vzorku ručnej kontroly a formulár.

Výsledky z registrov, nové skripty, plan.md a `vyradene.csv` neboli dotknuté.

## Overenie všetkých 34 subjektov v databáze (2026-10-11)

Zadávateľ overil všetkých 34 subjektov z dôkazov, ktoré zozbierali agenti. Rozhodnutia sú v `data/review_db_filled.csv` a výpočet v `scripts/vysledok.js`. Konečný stav je v `data/databaza_vysledok.csv` a súhrn v `logs/vysledok.md`.

- **Výsledok:** 22 aktívnych investorov (18 VC, 1 PE, 3 s otvoreným typom), 2 iný typ, 5 neinvestuje, 5 sa nedá overiť.
- **KU1:** 14 zo 16 zaradených algoritmom sú aktívni investori, teda 87,5 % (P95: 64,0 – 96,5 %), štatisticky nerozhodnuteľné.
  - Neulogy Ventures, a. s. je poradca luxemburského fondu.
  - Occam Investments je EuVECA bez investície do cudzej firmy.
- **M3 (presnosť typu):** 12/14. Z 10 nerozhodnutých typov sa pri overení 7 dalo určiť.
- **Slabé miesta pravidiel:**
  - regulačné označenie prebije chýbajúcu investíciu,
  - zámena slovenskej firmy so zahraničným fondom,
  - dokúpenie podielu alebo zmena adresy spoločníka v RPO vyzerá ako nový vstup (CEE Capital, CEMTOP Invest 2025-04-11).
- **Obmedzenie:** nejde o slepú kontrolu vzorky. KU2 a KU4 ostávajú nezmerané.
