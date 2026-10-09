# Pilot: overená databáza VC investorov na Slovensku

## Cieľ

Zostav overený zoznam aktívnych VC investorov registrovaných na Slovensku. Pri každom investorovi zisti sektor, fázu, typickú výšku investície (ticket size) a veľkosť kapitálu. Každý údaj musí mať zdroj, dátum a doslovný citát, ktorý ho dokladá.

Nepíš žiadny framework ani aplikáciu. Výstupom sú dátové súbory (CSV/JSON), kópie zdrojov a log chýb. Jednoduché pomocné skripty sú povolené, len ak niektorý krok bez nich nejde.

Dátum behu = dnešný dátum. Okno aktivity = 36 mesiacov pred dátumom behu.

## Rozsah pilotu

**V rozsahu:** správcovia VC fondov a VC fondy registrované v SR (ORSR/RPO), ktoré investujú do podielov vo firmách.

**Mimo rozsahu**, zapíš so statusom `mimo_rozsahu` a dôvodom, ďalej nespracúvaj:
- fyzické osoby (angel investori),
- subjekty registrované mimo SR, aj keď investujú na Slovensku (zapíš krajinu registrácie),
- PE fondy zamerané na odkúpenie zrelých firiem (buyout).

## Tvrdé pravidlá (nikdy neporušiť)

1. **Žiadny údaj bez dôkazu.** Každý údaj má: URL, typ zdroja (A–D), dátum publikácie zdroja, dátum prístupu a doslovný citát zo zdroja, ktorý údaj dokladá.
2. **Nikdy neodhaduj.** Ak údaj nenájdeš, zapíš `null` a dôvod. Hodnota bez zdroja je chyba, nie pomoc.
3. **Nedostupná URL = údaj neexistuje.** Nepoužívaj URL, ktorú si si „pamätáš“, len tie, ktoré si v tomto behu reálne otvoril.
4. **Register je brána.** Ak subjekt nie je v obchodnom registri alebo zanikol, okamžite STOP. Status `vyradeny_register`, žiadne ďalšie hľadanie.
5. **Zakázané zdroje:** Crunchbase, LinkedIn, PitchBook, Dealroom. Ich podmienky zakazujú automatizovaný zber. Môžeš ich spomenúť len ako tip na kandidáta s označením `tip_agregator`, nikdy ako dôkaz.
6. **Kópia každého zdroja.** Text každej otvorenej stránky ulož do `raw/` (názov = claim_id), aby sa dal dôkaz overiť aj neskôr.
7. **Identita cez IČO, nie cez názov.** Podobné názvy („XY Capital“ vs. „XY Capital Partners“) sú častý zdroj chýb. Každý dôkaz musí byť jednoznačne priradený k IČO.

## Úrovne dôkazov

| Úroveň | Typ zdroja | Príklady |
|---|---|---|
| A | štátny register | ORSR, RPO, register účtovných závierok, zoznam NBS, RPVS |
| B | nezávislé potvrdenie tretej strany | tlačová správa portfóliovej firmy, článok v médiách, zoznam fondov SIH/NRF alebo EIF |
| C | vlastné tvrdenie investora | web fondu, jeho portfólio, výročná správa |
| D | agregátor | len ako tip na kandidáta, nikdy ako dôkaz |

## Zdroje pravdy pre každý fakt

| Fakt | Primárny zdroj | Doplnkový zdroj | Ak sa nenájde |
|---|---|---|---|
| Existencia, IČO, sídlo | RPO / ORSR (A) | — | **STOP**, `vyradeny_register` |
| Stav (aktívny, likvidácia, zánik) | ORSR (A) | RPO (A) | likvidácia alebo zánik: **STOP** |
| Licencia správcu fondov | zoznam NBS (A) | — | nie je stop, len chýbajúci bonus |
| Investícia (investor → firma) | ORSR: investor ako spoločník firmy, s dátumom zápisu (A) | tlačová správa, médiá, zoznam SIH/EIF (B) | žiadna za 36 mesiacov: `vyradeny_neaktivny` |
| Výška konkrétnej investície | tlačová správa, médiá (B) | web fondu (C) | `null` |
| Deklarovaný sektor a fáza | web fondu (C) | médiá (B) | `null` |
| Skutočný sektor a fáza | odvodené z overených investícií | — | `null`, ak sú menej ako 2 overené investície |
| Ticket size | podmienky programu SIH/NRF (B), web fondu (C) | médiá (B) | `null` |
| Veľkosť fondu / kapitál | SIH/NRF, médiá (B), web fondu (C) | účtovná závierka (A) | `null` |

Poznámka k účtovnej závierke: celkové aktíva firmy nie sú to isté ako veľkosť fondu. Ak ich použiješ, ulož ich ako samostatný údaj `celkove_aktiva` s označením „proxy“.

## Rozhodovacia matica

Brány sa vyhodnocujú v poradí. Pri prvej nesplnenej sa spracovanie zastaví a zapíše sa, na ktorej bráne subjekt skončil.

| Brána | Otázka | Áno | Nie |
|---|---|---|---|
| G1 Register | Existuje v ORSR/RPO a nie je v likvidácii ani zaniknutý? | pokračuj | **STOP** `vyradeny_register` |
| G2 Rozsah | Je registrovaný v SR a nie je fyzická osoba ani buyout PE? | pokračuj | `mimo_rozsahu` |
| G3 Typ činnosti | Investuje vlastný alebo spravovaný kapitál do podielov vo firmách? | pokračuj | `vyradeny_typ` + kategória (pozri nižšie) |
| G4 Aktivita | Má aspoň 1 investíciu za 36 mesiacov s dôkazom úrovne A alebo B? | `zaradeny` | len dôkaz C: `neiste`; žiadny dôkaz: `vyradeny_neaktivny` |

Kategórie pre `vyradeny_typ`: poradenstvo/M&A, crowdfundingová platforma, banka/úver, grant/dotácia, inkubátor bez kapitálu, holding vlastných prevádzok, iné (s popisom).

**Kategória zaradeného investora:** `VC`, `korporatne_VC`, `statny_fond`, `akcelerator_investujuci`.

**Dôvera zaradeného záznamu:**
- `vysoka`: G1 z úrovne A a investícia doložená úrovňou A alebo dvomi nezávislými zdrojmi B,
- `stredna`: G1 z úrovne A a investícia doložená jedným zdrojom B,
- všetko ostatné je `neiste` a ide na ručnú kontrolu.

## Sub-agenti

Každý agent robí iba svoju úlohu. Overovateľ nikdy nevidí úvahy výskumníka, iba jeho tvrdenia so zdrojmi.

### 1. Scout: hľadač kandidátov
- Zbiera kandidátov zo zdrojov: zoznamy SIH/NRF a EIF, zoznam NBS, reporty SAIA, články o investičných kolách (od startupu k investorovi cez spoločníkov v ORSR), vyhľadávanie v RPO podľa názvu („Ventures“, „Capital“, „Fund“).
- Nič neoveruje. Pri každom kandidátovi zapíše, z ktorého zdroja prišiel (`discovery_source`).
- Výstup: `data/candidates.csv`.

### 2. Registrátor: brána G1 a G2
- Pre každého kandidáta nájde IČO v RPO/ORSR, overí stav a krajinu registrácie.
- Ak nenájde alebo je subjekt zaniknutý: zapíše rozhodnutie a **nepokračuje**.
- Výstup: tvrdenia o existencii v `data/claims.csv`, rozhodnutia v `data/decisions.csv`.

### 3. Výskumník: zber tvrdení
- Iba pre kandidátov, ktorí prešli G1 a G2.
- Hľadá investície (najprv ORSR spoločníci, potom médiá), sektor, fázu, ticket size a veľkosť kapitálu podľa tabuľky zdrojov pravdy.
- Každé tvrdenie zapíše ako samostatný riadok v `data/claims.csv` s citátom a kópiou zdroja v `raw/`.

### 4. Overovateľ: nezávislá kontrola
Dostane iba tvrdenie, URL a citát. Pre každé tvrdenie:
1. znova otvorí URL a overí, že citát na stránke naozaj je,
2. overí, že citát tvrdenie skutočne dokladá, nielen že sa týka podobnej témy,
3. overí, že zdroj hovorí o subjekte s rovnakým IČO, nie o podobne pomenovanom,
4. overí dátum: investícia musí spadať do 36-mesačného okna,
5. overí správnu úroveň dôkazu (A–D).

Verdikt: `potvrdene`, `nepotvrdene` alebo `rozporne`, vždy s krátkym zdôvodnením.

Overovateľ nehľadá nové dôkazy, aby tvrdenie „zachránil“. Iba overuje.

### 5. Klasifikátor: rozhodnutie
- Použije rozhodovaciu maticu **iba na potvrdené tvrdenia**.
- Zapíše status, kategóriu, dôveru a bránu, na ktorej subjekt skončil.

## Riešenie nezhody

Ak overovateľ tvrdenie nepotvrdí, výskumník má **jeden** pokus nájsť iný dôkaz. Ak ani ten neprejde, tvrdenie sa zahodí. Ak tým subjekt stratí dôkaz aktivity, dostane status `neiste` a ide na ručnú kontrolu.

Každé zamietnutie od overovateľa zapíš do `logs/agent_errors.md`: čo výskumník tvrdil, prečo to neprešlo a do akej kategórie chyba patrí (vymyslená URL, citát neexistuje, zámena subjektu, starý dátum, nesprávna úroveň dôkazu, odhadnuté číslo).

## Výstupné súbory

**`data/candidates.csv`**
`candidate_id, name, discovery_source, discovery_url, found_at`

**`data/claims.csv`**
`claim_id, ico, field, value, source_url, source_level, source_published_at, accessed_at, quote, raw_file, verifier_verdict, verifier_note`

**`data/decisions.csv`**
`ico, name, status, failed_gate, category, confidence, reason, last_investment_date, processing_started_at, processing_finished_at`

**`data/investors.json`**
Zaradení investori so všetkými potvrdenými údajmi. Každá hodnota obsahuje odkaz na `claim_id`.

**`data/review_sample.csv`**
Vzorka na ručnú kontrolu s prázdnymi stĺpcami `human_verdict` a `human_note`:
- všetky záznamy `neiste`,
- náhodných 30 % záznamov `zaradeny`,
- náhodných 20 % záznamov `vyradeny_*` (aby sa dalo zmerať, koľko skutočných investorov sme omylom vyradili).

**`logs/agent_errors.md`**
Log chýb agentov.

**`logs/run_summary.md`**
Počty podľa statusu, podľa zdroja kandidátov a podľa brány vyradenia, miera zamietnutí overovateľom a priemerný čas spracovania jedného kandidáta.

## Priebeh behu

1. Scout zozbiera kandidátov, potom deduplikácia podľa IČO a normalizovaného názvu.
2. **Skúšobný beh na 5 kandidátoch. Zastav sa a ukáž mi výsledky skôr, než budeš pokračovať.**
3. Po mojom schválení: Registrátor → Výskumník → Overovateľ → Klasifikátor pre všetkých kandidátov.
4. Vygeneruj `review_sample.csv` a `run_summary.md`.

Ak niektorý zdroj nie je dostupný (register nefunguje, stránka blokuje prístup), nepokračuj odhadom. Zapíš to do logu a zastav sa s otázkou.
