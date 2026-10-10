# Pilot: overená databáza VC investorov na Slovensku

## Cieľ

Zostav overený zoznam aktívnych VC investorov registrovaných na Slovensku. Pri každom investorovi zisti:
- sektor investora (čím sa sám zaoberá),
- sektor a fázu investícií,
- typickú výšku investície (ticket size),
- veľkosť kapitálu.

Každý údaj musí mať zdroj, dátum a doslovný citát, ktorý ho dokladá.

Pilot zároveň meria presnosť (koľko záznamov je správnych) a čas na jeden záznam. Z týchto čísel bude vychádzať model nákladov na celý svet. Metodika je v [plan.md](../plan.md), bod 2.

Nepíš žiadny framework ani aplikáciu. Výstupom sú dátové súbory (CSV/JSON), kópie zdrojov a log chýb. Jednoduché pomocné skripty sú povolené, len ak niektorý krok bez nich nejde.

Dátum behu = dnešný dátum. Okno aktivity = 36 mesiacov pred dátumom behu.

## Rozsah pilotu

**V rozsahu:** správcovia VC fondov a VC fondy registrované v SR (ORSR/RPO), ktoré investujú do firiem.

**Investícia** = podiel v neverejnej firme alebo konvertibilný nástroj (konvertibilný úver, SAFE). Nepočíta sa: akcie na burze, bežné úvery, granty, investícia iba ako LP do cudzieho fondu.

**Mimo rozsahu.** Zapíš so statusom `mimo_rozsahu` a dôvodom, ďalej nespracúvaj:
- fyzické osoby (angel investori, súkromní investori),
- subjekty registrované mimo SR, aj keď investujú na Slovensku (zapíš krajinu registrácie),
- family offices,
- fondy, ktoré brána G5 zaradí ako PE (investície do zrelých firiem, buyout, take-private).

## Tvrdé pravidlá (nikdy neporušiť)

1. **Žiadny údaj bez dôkazu.** Každý údaj má: URL, typ zdroja (A–D), dátum publikácie zdroja, dátum prístupu a doslovný citát zo zdroja, ktorý údaj dokladá.
2. **Nikdy neodhaduj.** Ak údaj nenájdeš, zapíš `null` a dôvod. Hodnota bez zdroja je chyba, nie pomoc.
3. **Nedostupná URL = údaj neexistuje.** Nepoužívaj URL, ktorú si si „pamätáš“, len tie, ktoré si v tomto behu reálne otvoril. Skôr než URL vyhlásiš za nedostupnú, skús ju otvoriť v prehliadači. Stránky generované JavaScriptom sa pri jednoduchom stiahnutí javia ako prázdne (príklad SIH v [README.md](../README.md)).
4. **Register je brána.** Ak subjekt nie je v obchodnom registri alebo zanikol, okamžite STOP. Status `vyradeny_register`, žiadne ďalšie hľadanie.
5. **Zakázané zdroje:** Crunchbase, LinkedIn, PitchBook, Dealroom. Ich podmienky zakazujú automatizovaný zber. Môžeš ich spomenúť len ako tip na kandidáta s označením `tip_agregator`, nikdy ako dôkaz. To isté platí pre zrkadlá registrov a crowdsourcované zdroje (napr. OpenCorporates, Wikidata): údaj z nich vždy over v pôvodnom zdroji.
6. **Kópia každého zdroja.** Text každej otvorenej stránky ulož do `raw/` (názov = claim_id), aby sa dal dôkaz overiť aj neskôr.
7. **Identita cez IČO, nie cez názov.** Podobné názvy („XY Capital“ vs. „XY Capital Partners“) sú častý zdroj chýb. Každý dôkaz musí byť jednoznačne priradený k IČO investora. Ak sa týka portfóliovej firmy, aj k jej IČO.
8. **Typ sa nehádá.** Ak sa typ nedá jednoznačne určiť podľa pravidiel G5, zapíš `typ_nerozhodnuty`. Nevyberaj „pravdepodobnejší“ typ.

## Úrovne dôkazov

| Úroveň | Typ zdroja | Príklady |
|---|---|---|
| A | štátny register alebo podanie u štátneho orgánu | ORSR, RPO, register účtovných závierok, zoznam NBS, RPVS, registre ESMA (vrátane EuVECA), rozhodnutia Protimonopolného úradu SR a Európskej komisie |
| B | nezávislé potvrdenie tretej strany | tlačová správa portfóliovej firmy alebo protistrany, článok v médiách, zoznam fondov SIH/NRF alebo EIF |
| C | vlastné tvrdenie investora | web fondu, jeho portfólio, výročná správa, tlačová správa samotného investora |
| D | agregátor | len ako tip na kandidáta, nikdy ako dôkaz |

Pravidlá na určenie úrovne:

- **Úroveň určuje pôvodca informácie, nie miesto, kde si ju našiel.** Výpis z registra skopírovaný na inej stránke je D, kým ho neotvoríš priamo v registri.
- **Článok, ktorý iba preberá tlačovú správu investora, je C, nie B.**
- **Dva zdroje B sú nezávislé**, iba ak ich vydali rôzni vydavatelia a nevychádzajú z tej istej tlačovej správy.
- Hodnota odvodená z iného údaja má príznak `proxy` a nikdy nenahrádza priamy údaj.

## Zdroje pravdy pre každý fakt

| Fakt (`field`) | Primárny zdroj | Doplnkový zdroj | Ak sa nenájde |
|---|---|---|---|
| `existencia` (IČO, sídlo) | RPO / ORSR (A) | — | **STOP**, `vyradeny_register` |
| `stav` (aktívny, likvidácia, zánik) | ORSR (A) | RPO (A) | likvidácia alebo zánik: **STOP** |
| `licencia` správcu fondov | zoznam NBS, register ESMA (A) | — | nie je stop, len chýbajúci bonus |
| `sektor_investora` | RPO, kód SK NACE (A) | web (C) | `null` |
| `investicia` (investor → firma) | ORSR: investor ako spoločník firmy, s dátumom zápisu (A) | tlačová správa, médiá, zoznam SIH/EIF (B) | iba pred oknom: `vyradeny_neaktivny`; žiadna: `vyradeny_bez_investicii` |
| `faza` investície (názov kola, opis transakcie) | tlačová správa portfóliovej firmy, médiá (B) | — | `null` |
| `velkost_firmy` (kategória MSP portfóliovej firmy) | register účtovných závierok: posledná závierka pred dátumom investície (A) | — | `null` |
| `typ_podielu` (menšinový / kontrolný) | ORSR: vklad voči základnému imaniu pri s.r.o. (A, `proxy`), rozhodnutie o koncentrácii (A) | médiá s výslovným „väčšinový/menšinový“ (B) | `null` |
| `vyska_investicie` | tlačová správa, médiá (B) | web fondu (C) | `null` |
| `deklarovany_sektor`, `deklarovana_faza` | web fondu (C) | médiá (B) | `null` |
| skutočný sektor a fáza | odvodené z overených investícií | — | `null`, ak sú menej ako 2 overené investície |
| `ticket_size` | podmienky programu SIH/NRF (B), web fondu (C) | médiá (B) | `null` |
| `velkost_fondu` | SIH/NRF, médiá (B), web fondu (C) | — | `null` |
| `celkove_aktiva` | účtovná závierka (A) | — | `null` |

Poznámky:
- Celkové aktíva firmy nie sú to isté ako veľkosť fondu. Ukladaj ich iba ako samostatný údaj `celkove_aktiva` s príznakom `proxy`.
- Konvertibilný nástroj sa až do konverzie ráta ako menšinový podiel.

## Zrelosť cieľovej firmy

Zrelosť cieľovej firmy rozhoduje, či je investícia typu VC alebo PE. Určuje sa pri každej overenej investícii, v tomto poradí:

1. **Výslovný údaj** (`faza`, úroveň A alebo B):

   | Údaj v zdroji | Zrelosť |
   |---|---|
   | pre-seed, seed, Series A | raná |
   | Series B a neskoršie, growth | rastová |
   | buyout, take-private, kúpa väčšinového podielu v zavedenej firme | zrelá |

2. **Ak výslovný údaj chýba:** `velkost_firmy` podľa definície MSP (odporúčanie Komisie 2003/361/ES, príloha čl. 2) z poslednej závierky pred investíciou:

   | Kategória | Zamestnanci | Tržby a/alebo bilančná suma | Zrelosť |
   |---|---|---|---|
   | mikro | menej ako 10 | najviac 2 mil. € | raná |
   | malá | menej ako 50 | najviac 10 mil. € | rastová |
   | stredná | menej ako 250 | tržby najviac 50 mil. € alebo bilančná suma najviac 43 mil. € | zrelá |
   | veľká | nad hranicami strednej | — | zrelá |

   Ak počet zamestnancov nie je zverejnený, urči kategóriu iba z finančných údajov a označ ju `proxy`. Ber údaje iba za samotnú firmu, bez partnerských a prepojených podnikov. Aj tu ide o `proxy`.

3. **Ak výslovný údaj a veľkosť firmy protirečia:** platí výslovný údaj a investícia dostane príznak `zrelost_sporna`.
4. **Ak chýba výslovný údaj aj závierka:** zrelosť je `nedolozena`.

Priradenie kategórie MSP k zrelosti je pravidlo, ktoré pilot kalibruje. Neber ho ako overený fakt.

## Rozhodovacia matica

Brány sa vyhodnocujú v poradí. Pri prvej nesplnenej sa spracovanie zastaví a zapíše sa, na ktorej bráne subjekt skončil.

| Brána | Otázka | Áno | Nie |
|---|---|---|---|
| G1 Register | Existuje v ORSR/RPO a nie je v likvidácii ani zaniknutý? | pokračuj | **STOP** `vyradeny_register` |
| G2 Rozsah | Je registrovaný v SR, nie je fyzická osoba ani family office? | pokračuj | `mimo_rozsahu` |
| G3 Typ činnosti | Investuje vlastný alebo spravovaný kapitál do investícií podľa definície vyššie? | pokračuj | `vyradeny_typ` + kategória (pozri nižšie) |
| G4 Aktivita | Má aspoň 1 investíciu za 36 mesiacov s dôkazom úrovne A alebo B? | pokračuj | len dôkaz C: `neiste`. Investície iba pred oknom: `vyradeny_neaktivny`. Žiadna investícia do cudzej firmy podľa ORSR, RÚZ a webu: `vyradeny_bez_investicii`. Registre ukazujú investíciu, ktorú výskum nenašiel: `na_vyskum`. Pravidlo je v plan.md 2.2 (Negatívny dôkaz pri G4) a v scripts/g4_rules.js. |
| G5 Zaradenie do typu | Je typ VC jednoznačne doložený podľa pravidiel nižšie? | `zaradeny` | jednoznačne PE: `mimo_rozsahu` (dôvod: PE). Nejednoznačné: `typ_nerozhodnuty`, kandidátske typy `VC\|PE`, ručná kontrola. |

Ak register nefunguje alebo blokuje prístup, nepokračuj odhadom. Zapíš `register_nedostupny`, zapíš to do logu a zastav sa s otázkou.

**Kategórie pre `vyradeny_typ`:**
- poradenstvo/M&A,
- sprostredkovateľ (crowdfundingová platforma),
- banka/úver,
- grant/dotácia,
- inkubátor bez kapitálu,
- holding vlastných prevádzok,
- správca majetku bez priamych investícií,
- investuje iba ako LP do cudzích fondov,
- iné (s popisom).

**Pravidlá G5:**
1. Ak existuje regulačná klasifikácia (A), rozhoduje ona. Registrácia EuVECA = VC.
2. Inak sa pozri na overené investície s určenou zrelosťou: raná a rastová = VC, zrelá = PE.
   - Všetky investície ukazujú na ten istý typ: tento typ.
   - Väčšina ukazuje na jeden typ: typ podľa väčšiny a príznak `hranicny_typ`.
   - Inak (rovnosť alebo väčšina investícií so zrelosťou `nedolozena` či `zrelost_sporna`): `typ_nerozhodnuty`.

**Podtyp zaradeného investora:** `VC`, `korporatne_VC`, `statny_fond`, `akcelerator_investujuci`.

**Dôvera zaradeného záznamu** = nižšia z dvoch hodnôt:

- **Dôvera aktivity:**
  - `vysoka`: G1 z úrovne A a investícia doložená úrovňou A alebo dvomi nezávislými zdrojmi B,
  - `stredna`: G1 z úrovne A a investícia doložená jedným zdrojom B,
  - inak `neiste`.
- **Dôvera typu:**
  - `vysoka`: regulačná klasifikácia (A) alebo aspoň 2 investície so zrelosťou raná či rastová,
  - `stredna`: 1 taká investícia,
  - inak `neiste`.

Všetky záznamy `neiste` a `typ_nerozhodnuty` idú na ručnú kontrolu.

## Sub-agenti

Každý agent robí iba svoju úlohu. Overovateľ nikdy nevidí úvahy výskumníka, iba jeho tvrdenia so zdrojmi.

### 1. Scout: hľadač kandidátov
- Zbiera kandidátov zo zdrojov:
  - zoznam fondov SIH: kópia stránky v `raw/sih_homepage_2026-10-09.txt`. Zoznam je v skrytých záložkách, ktoré sa načítajú cez JavaScript. Pri obnove ho treba otvoriť v prehliadači, bežné stiahnutie stránky ho nezachytí.
  - zoznam NBS (registrovaní správcovia AIF a správcovské spoločnosti),
  - register ESMA (EuVECA, Investment Fund Managers),
  - reporty SAIA,
  - články o investičných kolách (od startupu k investorovi cez spoločníkov v ORSR),
  - vyhľadávanie v RPO podľa názvu („Ventures“, „Capital“, „Fund“).
- **Holdout:** EIF a SLOVCA Scout nedostane a nesmie ich použiť ani na overenie. Ak na ne narazí nepriamo (napr. v článku), kandidáta zapíše so skutočným zdrojom, z ktorého prišiel.
- Nič neoveruje. Pri každom kandidátovi zapíše, z ktorého zdroja prišiel (`discovery_source`). Ak kandidáta nájde vo viacerých zdrojoch, zapíše každý zdroj zvlášť. Bez toho nejde odhadnúť celkový počet investorov (capture-recapture).
- Výstup: `data/candidates.csv`.

### 2. Registrátor: brány G1 a G2
- Pre každého kandidáta nájde IČO v RPO/ORSR, overí stav a krajinu registrácie.
- Ak kandidáta nenájde alebo je subjekt zaniknutý: zapíše rozhodnutie a **nepokračuje**.
- Výstup: tvrdenia o existencii v `data/claims.csv`, rozhodnutia v `data/decisions.csv`.

### 2a. Kontrola registrov: spätné vyhľadávanie podielov (skript, doplnené 2026-10-10)
- `node scripts/footprint.js` pre všetkých, ktorí prešli G1 a G2.
- Zisťuje dve veci:
  - z ORSR, kde je subjekt spoločníkom, komanditistom alebo jediným akcionárom (aj historicky) a ktoré z týchto firiem sú vlastné účelové dcéry,
  - z RÚZ podielové cenné papiere a dlhodobý finančný majetok.
- Výstup: `data/orsr_podiely.csv`, `data/footprint.csv`.
- Ako sa výstup použije:
  - podiel v cudzej firme v okne posunie subjekt do plného výskumu (T1),
  - pri G4 výstup slúži ako negatívny dôkaz.

### 3. Výskumník: zber tvrdení
- Iba pre kandidátov, ktorí prešli G1 a G2.
- EIF a SLOVCA smie použiť ako dôkaz iba pri kandidátoch, ktorých už našiel Scout. Nikdy z nich nepridáva nových kandidátov.
- Hľadá investície (najprv spoločníkov v ORSR, potom médiá), sektor, fázu, ticket size a veľkosť kapitálu podľa tabuľky zdrojov pravdy.
- Pri každej investícii zbiera aj `faza`, `velkost_firmy` a `typ_podielu` portfóliovej firmy (s `target_ico`).
- Každé tvrdenie zapíše ako samostatný riadok v `data/claims.csv` s citátom a kópiou zdroja v `raw/`.

### 4. Overovateľ: nezávislá kontrola
Dostane iba tvrdenie, URL a citát. Pre každé tvrdenie:
1. znova otvorí URL a overí, že citát na stránke naozaj je,
2. overí, že citát tvrdenie skutočne dokladá, nielen že sa týka podobnej témy. Fázu a typ podielu musí citát uvádzať výslovne,
3. overí, že zdroj hovorí o subjekte s rovnakým IČO (investor aj portfóliová firma), nie o podobne pomenovanom,
4. overí dátum: investícia musí spadať do 36-mesačného okna. Pri `velkost_firmy` overí, že ide o poslednú závierku pred dátumom investície,
5. overí správnu úroveň dôkazu (A–D) podľa pravidiel vyššie, vrátane nezávislosti dvoch zdrojov B.

Verdikt: `potvrdene`, `nepotvrdene` alebo `rozporne`, vždy s krátkym zdôvodnením.

Overovateľ nehľadá nové dôkazy, aby tvrdenie „zachránil“. Iba overuje.

### 5. Klasifikátor: rozhodnutie
- Použije rozhodovaciu maticu (G1–G5) **iba na potvrdené tvrdenia**.
- Pri každej investícii určí zrelosť. Zapíše status, typ, podtyp, kandidátske typy, dôveru aktivity, dôveru typu, výslednú dôveru, príznaky a bránu, na ktorej subjekt skončil.

## Riešenie nezhody

Ak overovateľ tvrdenie nepotvrdí, výskumník má **jeden** pokus nájsť iný dôkaz. Ak ani ten neprejde, tvrdenie sa zahodí. Ak tým subjekt stratí dôkaz aktivity, dostane status `neiste` a ide na ručnú kontrolu.

Každé zamietnutie od overovateľa zapíš do `logs/agent_errors.md`: čo výskumník tvrdil, prečo to neprešlo a do akej kategórie chyba patrí. Kategórie:
- vymyslená URL,
- citát neexistuje,
- zámena subjektu,
- starý dátum,
- nesprávna úroveň dôkazu,
- odhadnuté číslo,
- nedoložená fáza alebo typ podielu,
- nesprávna závierka.

## Výstupné súbory

**`data/candidates.csv`**
`candidate_id, name, discovery_source, discovery_url, found_at`
(jeden riadok na každú dvojicu kandidát × zdroj)

**`data/claims.csv`**
`claim_id, ico, target_ico, field, value, flags, source_url, source_level, source_published_at, accessed_at, quote, raw_file, verifier_verdict, verifier_note`

`flags` môže obsahovať `proxy`, `zrelost_sporna`.

**`data/decisions.csv`**
`ico, name, status, failed_gate, type, subtype, candidate_types, confidence_activity, confidence_type, confidence, flags, reason, last_investment_date, processing_started_at, processing_finished_at`

`flags` môže obsahovať `hranicny_typ`.

**`data/investors.json`**
Zaradení investori so všetkými potvrdenými údajmi. Každá hodnota obsahuje odkaz na `claim_id`.

**`data/review_sample.csv`** (pre človeka, **slepý**)
`review_id, ico, name, claim_ids, human_status, human_type, human_subtype, human_note, human_minutes, reviewer_id`

Neobsahuje status, typ ani dôveru od klasifikátora. Kontrolór ich určí sám rovnakými bránami a pravidlami a zdroje otvorí znova naživo.

**`data/review_key.csv`** (kľúč, kontrolór ho nevidí)
`review_id, ico, stratum, agent_status, agent_type, agent_subtype, agent_confidence, double_review`

Ako zostaviť vzorku:
- **Vrstvy (`stratum`):** `zaradeny`, `vyradeny_*` (spolu), `mimo_rozsahu`.
- **Vždy celé:** všetky `neiste` a `typ_nerozhodnuty`.
- **Veľkosť vzorky z vrstvy:** n' = 136 / (1 + 135 / N), kde N je počet záznamov vo vrstve, zaokrúhlené nahor. Ide o variant P98 ±10 p. b. Ak n' ≥ N, berie sa celá vrstva. Výber v rámci vrstvy je náhodný. Zapíš seed.
- **Dvojitá kontrola:** náhodných 20 % vzorky (`double_review = 1`) skontrolujú dvaja ľudia nezávisle. Ak druhý človek nie je k dispozícii, zhoda sa nemeria a v `metrics.md` sa uvedie „nemerané“. Agent nesmie byť druhým kontrolórom.
- **Tvrdenia (M1):** náhodná vzorka z tvrdení `potvrdene` podľa toho istého vzorca, so zoznamom v `data/review_claims.csv` (`claim_id, human_verdict, human_note`).

**`logs/agent_errors.md`**
Log chýb agentov.

**`logs/traceability.md`**
Výsledok kontroly dohľadateľnosti (KU0).

**`logs/usage.csv`** (výpočtové náklady, metrika M7)
`candidate_id, ico, agent_role, started_at, finished_at, pages_opened, tool_calls, input_tokens, output_tokens`

Jeden riadok na každú dvojicu kandidát × rola agenta. Ak počet tokenov nie je dostupný, zapíš `null`. Nikdy ho neodhaduj.

**`logs/run_summary.md`**
- počty podľa statusu, podľa zdroja kandidátov, podľa brány vyradenia a podľa typu,
- počet a dvojice `typ_nerozhodnuty`,
- počet investícií podľa spôsobu určenia zrelosti (výslovne / MSP / sporná / nedoložená),
- miera zamietnutí overovateľom,
- priemerný a mediánový čas spracovania jedného kandidáta podľa statusu.

**`logs/metrics.md`** (až po ručnej kontrole)
- metriky M0–M8 podľa [plan.md](../plan.md), body 2.6 a 4.1, každá s Wilsonovým intervalom na úrovniach P90, P95 a P98,
- tabuľka kritérií KU0–KU5 s verdiktom (splnené / nesplnené / nerozhodnuteľné) na každej úrovni,
- zhoda kontrolórov (Cohenova kappa) na dvojitej vzorke, alebo „nemerané“,
- úplnosť voči holdoutu (koľko subjektov z holdoutu, ktoré sú v rozsahu, Scout našiel),
- čas človeka na jeden záznam,
- kalibrácia zrelosti: pri investíciách, kde je známy výslovný údaj aj kategória MSP, ako často sa zhodujú.

## Priebeh behu

1. **Pred zberom: holdout.**
   - Holdout tvoria dva nezávislé zoznamy: **fondy v portfóliu EIF** a **členovia SLOVCA** ([riadni členovia](https://www.slovca.sk/sk/clenstvo/riadni-clenovia.html)). Z oboch ber iba subjekty registrované v SR (IČO v RPO).
   - Ulož ich do `data/holdout.csv` (`holdout_id, name, ico, holdout_source, source_url, accessed_at`) a kópie zdrojov do `raw/`.
   - Ak zoznam EIF nie je verejne dostupný, zapíš to do logu a holdout bude iba SLOVCA.
   - Scout holdout nevidí.
   - Holdout zapíš do `logs/run_summary.md` a pokračuj bez čakania na schválenie.
2. Scout zozbiera kandidátov, potom deduplikácia podľa IČO a normalizovaného názvu.
3. **Skúšobný beh na 5 kandidátoch** (Registrátor → Výskumník → Overovateľ → Klasifikátor).
   - Potom spusti **kontrolu dohľadateľnosti** (pozri nižšie).
   - Ak nie je 100 %, **zastav sa** a popíš, ktoré hodnoty a prečo neprešli.
   - Ak je 100 %, pokračuj bez čakania na schválenie.
4. Registrátor → Výskumník → Overovateľ → Klasifikátor pre všetkých ostatných kandidátov.
5. Znova spusti kontrolu dohľadateľnosti nad celým výstupom.
   - Hodnoty, ktoré neprejdú, z `investors.json` odstráň a zapíš do logu chýb. Opakuj, kým nie je 100 %.
   - Potom vygeneruj `review_sample.csv`, `review_key.csv`, `review_claims.csv` a `run_summary.md`.
   - **Zastav sa. Toto je jediné miesto, kde vstupuje človek:** ručná kontrola po úplnom dokončení behu.
6. Po vyplnení ručnej kontroly:
   - porovnaj holdout s nájdenými kandidátmi podľa IČO, zvlášť pre EIF a zvlášť pre SLOVCA,
   - zo zhody oboch zoznamov vypočítaj odhad celkovej populácie metódou capture-recapture,
   - vygeneruj `logs/metrics.md` s vyhodnotením kritérií úspechu.

### Kontrola dohľadateľnosti (kritérium KU0)

Automatická kontrola. Jednoduchý skript je povolený. Pre každú hodnotu v `data/investors.json` over:

1. odkazuje na `claim_id`, ktorý existuje v `data/claims.csv`,
2. tvrdenie má `verifier_verdict = potvrdene`,
3. `source_url`, `source_level`, `accessed_at` a `quote` nie sú prázdne,
4. súbor `raw_file` existuje,
5. `quote` sa v súbore `raw_file` naozaj nachádza (porovnanie po zjednotení medzier a úvodzoviek).

Výsledok zapíš do `logs/traceability.md`: počet hodnôt, počet úspešných a zoznam neúspešných s dôvodom.

### Kritériá úspechu

Stanovené pred behom, po ňom sa nemenia ([plan.md](../plan.md), bod 4.10):

| Č. | Kritérium | Hranica | Ako |
|---|---|---|---|
| KU0 | dohľadateľnosť (M0) | 100 % | automaticky, `logs/traceability.md` |
| KU1 | presnosť záznamov (M2) | ≥ 95 % | ručná kontrola |
| KU2 | presnosť polí (M1) | ≥ 90 % | ručná kontrola tvrdení |
| KU3 | pokrytie podľa holdoutu (M5) | ≥ 80 % | automaticky |
| KU4 | chybné vyradenia (M4) | ≤ 10 % | ručná kontrola |
| KU5 | podiel neistých (M8): (`neiste` + `typ_nerozhodnuty`) / kandidáti, ktorí prešli G3 | ≤ 25 %, cieľ pod 10 % | automaticky |

Pri každom kritériu vyhodnoť verdikt na úrovniach P90, P95 a P98:
- **splnené:** celý interval je na správnej strane hranice,
- **nesplnené:** celý interval je na nesprávnej strane,
- **nerozhodnuteľné:** hranica leží v intervale.

Pri KU1 uveď aj počet kontrolovaných záznamov a minimálne n potrebné na potvrdenie 95 % (P90 52, P95 73, P98 103).

Ak niektorý zdroj vyžaduje kontaktný údaj v požiadavke (napr. hlavičku User-Agent), použi iba `investor-research research@example.org`. Nikdy nepoužívaj osobný e-mail.

Ak niektorý zdroj nie je dostupný (register nefunguje, stránka blokuje prístup), nepokračuj odhadom. Zapíš to do logu a zastav sa s otázkou.
