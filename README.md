# Databáza investorov z verejných dát: štúdia uskutočniteľnosti

Hlavný dokument je [plan.md](plan.md). Zadanie pilotu je v [prompts/pilot-prompt.md](prompts/pilot-prompt.md). Podrobný priebeh pilotu je v [logs/run_summary.md](logs/run_summary.md).

## Ako sme postupovali

**Zadanie:** zistiť, či sa iba z verejných dát dá postaviť spoľahlivá databáza investorov do firiem (VC, PE, family office, angel, veľký súkromný investor), aká dobrá bude a koľko bude stáť pre celý svet.

Pravidlá zadania platili počas celej štúdie:
- iba verejne dostupné dáta,
- agregátory (Crunchbase, LinkedIn, PitchBook, Dealroom) iba ako tip, nikdy ako dôkaz,
- nič neodhadovať bez zdroja,
- postupovať po bodoch a po každom bode čakať na pripomienky.

Štúdia mala päť bodov. Po každom z nich nasledovali otázky a rozhodnutia (pozri ďalšiu časť).

| Krok | Čo sme robili | Výstup |
|---|---|---|
| **1. Profily typov** | Pre každý typ investora sme určili, čo do neho patrí a čo nie, ako sa dokladá existencia a aktivita a aké zdroje sú k dispozícii. Najprv sme si ujasnili, čo sa vôbec ráta ako investícia. | plan.md, bod 1 |
| **2. Spôsob overenia** | Úrovne dôkazov A až D (štátny register, nezávislá tretia strana, vlastné tvrdenie investora, agregátor) a päť brán, ktorými prechádza každý kandidát: G1 register, G2 rozsah, G3 činnosť, G4 aktivita za 36 mesiacov, G5 typ. Ďalej metriky presnosti s intervalmi spoľahlivosti P90, P95 a P98. | plan.md, bod 2 |
| **3. Odhad počtov** | Rešerš, koľko investorov každého typu existuje a koľko sa ich dá nájsť v štátnych zoznamoch podľa krajín (úroveň 1: EÚ, USA, UK; úroveň 2: Ázia a ďalšie). Ku každému číslu je uvedený zdroj. | plan.md, bod 3 |
| **4. Pilot: VC fondy v SR** | Skutočný beh na jednej krajine a jednom type s vopred stanovenými kritériami úspechu (KU0 až KU5). Podrobnosti sú pod tabuľkou. | `data/`, `logs/` |
| **5. Model nákladov** | Prepočet nameranej spotreby z pilotu na celý svet: výpočet, registre, človek, fixné náklady. | plan.md, bod 5 |
| **Zlepšenie po pripomienke (PC19 Capital)** | Kontrola registrov pred vyradením, návrat 88 vyradených, predtriedenie, plný výskum 31 subjektov, úprava pravidiel G4 a G5. | `scripts/footprint.js`, `g4_rules.js`, `pretriage.js` |
| **Vyhodnotenie** | Toto README a stránka na ručnú kontrolu ([data/review.html](data/review.html)). | |

**Ako bežal pilot (bod 4)**

Pilot robil reťazec agentov (Claude Opus 5.5) a skriptov:

1. **Holdout.** Dva nezávislé zoznamy fondov (EIF a členovia SLOVCA) sme odložili bokom. Scout ich nesmel vidieť, aby sa dalo zmerať, koľko skutočných fondov sám nájde (KU3).
2. **Scout** zozbieral 1 334 kandidátov z registra NBS, ESMA, SIH, SAPIE, článkov a hľadania podľa názvu v RPO.
3. **Registrátor** (skript nad RPO API) overil existenciu a stav (G1) a krajinu (G2).
4. **Triedenie** podľa hlavnej činnosti (NACE) vyradilo zjavne nefinančné firmy (G3). Kandidáti so silným signálom išli rovno na plný výskum, ostatní na rýchly skríning.
5. **Rýchly skríning** urobil pri každom kandidátovi 2 až 4 webové dopyty. Do plného výskumu postúpili iba tí, pri ktorých sa našiel dôkaz investície.
6. **Výskumník** pri každom kandidátovi zbieral tvrdenia. Každé tvrdenie má URL, úroveň zdroja, dátum, doslovný citát a kópiu zdroja v `raw/`.
7. **Overovateľ** nezávisle znova otvoril každý zdroj a overil citát, IČO, dátum a úroveň. Úvahy výskumníka nevidel. Pri zamietnutí mal výskumník jeden opakovaný pokus.
8. **Klasifikátor** (skript) rozhodol podľa brán G1 až G5 iba z potvrdených tvrdení.
9. **Kontrola dohľadateľnosti** (skript) overila, že každý údaj v databáze má zdroj a citát (KU0).
10. **Človek** vstupuje až po dokončení behu. Na slepú kontrolu sa náhodne vybrala vzorka 169 záznamov a 109 tvrdení.

**Čo sa menilo počas behu** (všetko je zapísané v [logs/run_summary.md](logs/run_summary.md)):
- Výpadok RPO API (asi 40 minút) sme preklenuli cez ORSR a dotknuté tvrdenia sme potom overili znova.
- Triedenie podľa NACE by vyradilo aj skutočné VC (kódy 70.20, 82.99), preto sme tieto kódy povolili.
- Prvá verzia skríningu bola príliš široká, tak sme ju zúžili.
- Na pokyn používateľa sme dáta očistili od vyradených. Ostal iba zoznam vyradených s dôvodom a kľúčovým dôkazom (`data/vyradene.csv`).
- Po pripomienke k PC19 Capital sme doplnili kontrolu registrov (ORSR, RÚZ) pred vyradením. Ukázalo sa, že webový skríning nestačí ako dôkaz, že subjekt neinvestoval. Registre vrátili 88 vyradených, predtriedenie ich zúžilo na 31 a plný výskum našiel 2 skutočné VC fondy, ktoré skríning predtým chybne vyradil. Pri tom sme pridali pravidlá, že vlastná dcéra nie je investícia a že kontrolný podiel nie je znak VC.

## Rozhodnutia k položeným otázkam

Po každom bode štúdie som položil otázky Q1 až Q21. Číslo Q18 nebolo použité: po Q17 nasledovala rovno Q19. Tvoje odpovede sú zapísané v plan.md ako pravidlá R1 až R18 a platia pre celú štúdiu. Q19 až Q21 sú zatiaľ otvorené.

**Bod 1: profily typov** (plan.md 1.7)

| Otázka | Ako znela | Rozhodnutie | Pravidlo |
|---|---|---|---|
| Q1 | Rátame ako investície iba podiely v neverejných firmách, alebo aj akcie na burze a konvertibilné úvery? | Podiel v neverejnej firme alebo konvertibilný nástroj (konvertibilný úver, SAFE). Nie akcie na burze ani bežné úvery. Výnimka: odkúpenie burzovej firmy fondom PE (take-private) sa ráta. | R1 |
| Q2 | Hranica medzi angelom a veľkým súkromným investorom podľa fázy firmy a typu podielu, nie podľa sumy? | Áno. Navyše: zaradenie musí vyplývať z doložených investícií. Ak fáza ani typ podielu nie sú doložené, typ je `sukromny_investor_neurceny` a nehádá sa. | R2 |
| Q3 | Má sa multi-family office, ktorý priamo investuje do firiem, rátať ako family office? | Áno, s podtypom `multi_family_office`, ale iba s doloženými priamymi investíciami do firiem. Kto investuje iba ako LP do cudzích fondov, je mimo rozsahu. | R3 |
| Q4 | Nerátať drobného investora cez crowdfundingovú platformu ako angela? | Drobný investor cez platformu nie je angel. Platforma sa vyradí ako sprostredkovateľ. | R4 |
| Q5 | Budú mená fyzických osôb zverejnené, alebo databáza ostane interná? | V rámci možností iba interné použitie. | R5 |

**Bod 2: spôsob overenia** (plan.md 2.8)

| Otázka | Ako znela | Rozhodnutie | Pravidlo |
|---|---|---|---|
| Q6 | V krajinách bez verejného registra prijať namiesto neho záznam LEI z GLEIF (najviac úroveň B)? | Zatiaľ neriešiť, označiť ako TODO. Status `register_nedostupny`. | R6 |
| Q7 | Fond, pri ktorom sa VC a PE nedá rozlíšiť z doložených investícií, dostane neurčený typ? | Rozdiel VC a PE je zväčša podľa firmy, do ktorej sa investuje (zrelosť). Ak je to otázne, záznam dostane príznak `typ_nerozhodnuty` (VC|PE) a overí sa ručne. Odpoveď prišla pod číslom Q8, podľa obsahu patrí ku Q7. | R7 |
| Q8 | Ak investície ukazujú rovnako na dva typy, dať typ „neurčený“, alebo uprednostniť jeden? | Nerozhodné prípady sa overia ručne. Automatické riešenie sa zatiaľ nerobí. | R8 |
| Q9 | Akú presnosť merania chceš? | Vyskúšať viac meraní naraz: P90, P95 a P98. | R9 |
| Q10 | Upraviť zadanie pilotu podľa bodu 2 pred spustením? | Upraviť. | R10 |
| – | Pri angelovi treba doložiť ranú fázu aj menšinový podiel? (doplňujúca otázka bez čísla) | Áno, pre angela to tak nastaviť a pravidlo prehodnotiť podľa skutočných výsledkov. | R11 |

**Bod 3: odhad počtov** (plan.md 3.10)

| Otázka | Ako znela | Rozhodnutie | Pravidlo |
|---|---|---|---|
| Q11 | Má model nákladov pokryť aj krajiny mimo USA, EÚ a UK? | Úroveň 1: EÚ, USA, UK. Úroveň 2: Izrael, Singapur, Hongkong, Japonsko, India, Čína a ďalšie. | R12 |
| Q12 | Naplánovať po pilote kalibračné vzorky? | Naplánovať, ale nevykonať. | R13 |
| Q13 | Čím nahradiť holdout (referenčný zoznam, ktorý Scout nedostane), keď sa stránka SIH nenačítala? | EIF a členovia SLOVCA, iba subjekty registrované v SR. Obidva zdroje sa Scoutovi odoberú. Stránku SIH skúsiť otvoriť v prehliadači a zlyhanie zapísať do README ako limit nástroja. Žiadosť na SIH podľa infozákona sa môže poslať paralelne, ale pilot na nej nestojí. | R14 |
| Q14 | Akú kontaktnú adresu používať pre SEC a ďalšie zdroje? | Fiktívnu adresu projektu (`research@example.org`), nikdy osobný e-mail. | R15 |

**Bod 4: pilot** (plan.md 4.9 a 4.10)

| Otázka | Ako znela | Rozhodnutie | Pravidlo |
|---|---|---|---|
| Q15 | Stanoviť hranice úspechu pilotu vopred? | Áno: KU0 dohľadateľnosť 100 % (kontroluje sa automaticky), KU1 presnosť záznamov ≥ 95 % (falošný investor je najdrahšia chyba), KU2 presnosť polí ≥ 90 %, KU3 pokrytie holdoutu ≥ 80 %, KU4 chybné vyradenia ≤ 10 %, KU5 podiel neistých ≤ 25 % (najlepšie pod 10 %). | R16 |
| Q16 | Kto robí ručnú kontrolu a kto je druhý kontrolór? | Človek vstupuje až po úplnom dokončení behu (human in the loop). Priebežné kontroly sú automatické. | R17 |
| Q17 | Súhlasíš s kalibračnými vzorkami K1 až K6? | Zatiaľ ich nespúšťať. Najprv pilot a bod 5, v ktorom sa K1 až K6 uvedú ako odporúčaný ďalší krok. | R18 |

**Bod 5: model nákladov** (plan.md 5.7), otvorené

| Otázka | Ako znela | Stav |
|---|---|---|
| Q19 | Akú hodinovú sadzbu použiť pre ručnú kontrolu? | otvorená. Bez sadzby sa ľudská zložka nákladov dá vyjadriť iba v hodinách. |
| Q20 | Ktorá úroveň presnosti (P90, P95 alebo P98; ±5 alebo ±10 p. b.) má byť základom rozpočtu? | otvorená |
| Q21 | Má model počítať aj s lacnejším modelom pre skríning a Registrátora? | otvorená. Ak áno, treba to najprv zmerať na vzorke. |

**Rozhodnutia počas behu a po ňom**

| Kedy | Rozhodnutie |
|---|---|
| pred bodom 5 | Najprv spustiť pilot, až potom písať model nákladov. |
| po pilote | Očistiť dáta od vyradených: ponechať iba zoznam vyradených s dôvodom a kľúčovým dôkazom. |
| po očistení | Pushnúť výsledky na GitHub (súkromný repozitár) a pokračovať bodom 5. |
| ručná kontrola PC19 Capital | Firma existuje, ale verejne neinvestovala. Algoritmus to musí vedieť rozpoznať a doložiť, nielen sa spoliehať na to, že web nič nenašiel. |
| návrh predtriedenia | Schválené: lacné predtriedenie vrátených subjektov a plný výskum iba pri tých, ktoré sa podobajú na VC. Potom push na GitHub. |
| kontrolná stránka | Do [data/review.html](data/review.html) pridať záložky „Reálne záznamy“ (iba zaradení) a „Porovnanie“ (zaradení vedľa neistých) so všetkými dôkazmi na ručné overenie. |

**Ďalšie otvorené otázky (vznikli počas behu)**

| Č. | Otázka |
|---|---|
| – | Šesť nejasností v pravidlách overovania, pri ktorých Overovatelia rozhodovali rôzne: ktorá závierka je „pred investíciou“, verdikt pri investícii mimo okna, úroveň zdroja SIH, citát zložený z výkazu a šablóny RÚZ, prevody v rámci skupiny a úroveň zahraničných registrov. Podrobnosti sú v [logs/run_summary.md](logs/run_summary.md). |
| – | Úroveň zdroja pri zmluvách v Centrálnom registri zmlúv (B alebo C). Zatiaľ platí C. |

## Výsledok a odporúčanie (stav 2026-10-10)

**Odpoveď v skratke**

1. **Dá sa to postaviť a výpočet je lacný.** Pilot (VC fondy v SR) vytvoril 16 záznamov investorov, pri ktorých je každý údaj dohľadateľný k zdroju a doslovnému citátu. Spotreboval 19,2 mil. tokenov, teda asi 77 USD pri referenčnej cene. Pre celý svet vychádza výpočet rádovo na stovky až desaťtisíce USD na vrstvu.
2. **Či je to spoľahlivé, zatiaľ nevieme.** Ručná kontrola pilotu neprebehla, takže presnosť záznamov (KU1), polí (KU2) ani chybné vyradenia (KU4) nie sú zmerané. Zo šiestich kritérií úspechu je jedno splnené (KU0), jedno nesplnené (KU5) a štyri zatiaľ nevieme rozhodnúť.
3. **Globálne to má zmysel iba čiastočne:**
   - **Áno** pre VC a PE v krajinách, kde regulátor zverejňuje zoznam správcov (USA, EÚ EuVECA, Čína, Japonsko, Singapur, Hongkong, Kórea).
   - **Najvyššia kvalita** je tam, kde register ukazuje spoločníkov firiem: SR, ČR (s.r.o.), čiastočne UK a DE.
   - **Nie, zatiaľ,** pre angelov, family offices a veľkých súkromných investorov. Neexistuje pre nich zoznam kandidátov, ťažko sa dokladá identita a ide o osobné údaje.
4. **Celkovú cenu neurčuje výpočet, ale ľudská kontrola a dostupnosť registrov.** Ľudskú zložku nevieme vyčísliť, kým nezmeriame čas človeka na záznam.
5. **AI agentov sa úplne zbaviť nedá, ale väčšinu práce môže robiť kód.** 75 % potvrdených faktov pochádza z registrov a kód ich vie získať zadarmo. Rozhodnúť, čo podiel znamená (vlastná dcéra, prevod v skupine, holding podnikateľa alebo VC), však kód nevie: z 31 subjektov, ktoré pravidlá kódu označili ako podobné VC, výskum potvrdil 2. Odporúčané je hybridné riešenie (pozri [Dá sa AI nahradiť kódom?](#dá-sa-ai-nahradiť-kódom)).

**Odporúčanie:** zatiaľ nestavať celý svet. Najprv prejsť rozhodovacím bodom podľa časti [Ďalšie kroky](#ďalšie-kroky-rozhodovací-bod). Kritérium pre rozšírenie: presnosť záznamov ≥ 95 % (KU1) a zmeraný čas človeka na záznam.

### Výsledok pilotu: VC fondy registrované v SR

**Lievik**

| Krok | Subjekty | Poznámka |
|---|---|---|
| Kandidáti (Scout) | 1 334 | 1 179 z hľadania podľa názvu v RPO, ostatné z NBS, ESMA, SIH, SAPIE a článkov |
| Vyradení registrom a rozsahom (G1, G2) | 61 + 28 | zaniknuté, v likvidácii, mimo SR |
| Vyradení podľa činnosti v RPO (NACE) | 612 | |
| Rýchly skríning (web, 2–4 dopyty) | 608 | do plného výskumu postúpilo 14 (2,3 %) |
| Kontrola registrov pred vyradením (ORSR, RÚZ) | 602 | 88 vyradených vrátila na výskum; po predtriedení išlo na plný výskum 31 |
| Plný výskum a nezávislé overenie | 66 | 35 v prvom kole, 31 po kontrole registrov |
| **V databáze** | **34** | 16 zaradených, 10 s nerozhodnutým typom, 8 neistých |
| Vyradení so zdôvodnením | 1 296 | `data/vyradene.csv`, pri každom dôvod a kľúčový dôkaz |

**Zaradení (16):**

| Podtyp | Počet |
|---|---|
| VC | 13 |
| štátny fond | 2 |
| korporátne VC | 1 |

V `data/investors.json` je 67 investícií. Každý údaj je naviazaný na potvrdené tvrdenie: 741 tvrdení, 327 hodnôt.

**Kritériá úspechu** (plan.md 4.10, zdroj: [logs/metrics.md](logs/metrics.md))

| Kritérium | Hranica | Výsledok |
|---|---|---|
| KU0 dohľadateľnosť | 100 % | **splnené**: 327/327 hodnôt, 741/741 tvrdení |
| KU1 presnosť záznamov | ≥ 95 % | **nezmerané**, čaká na ručnú kontrolu (169 záznamov) |
| KU2 presnosť polí | ≥ 90 % | **nezmerané**, čaká na ručnú kontrolu (109 tvrdení) |
| KU3 pokrytie holdoutu (EIF, SLOVCA) | ≥ 80 % | 4/4 subjekty v rozsahu nájdené a zaradené. Pri n = 4 sa to štatisticky nedá rozhodnúť (P95: 51–100 %). |
| KU4 chybné vyradenia | ≤ 10 % | **nezmerané**, čaká na ručnú kontrolu |
| KU5 podiel neistých (plne skúmaní) | ≤ 25 % | **nesplnené**: 18/41 = 43,9 % |

**Čo pilot zistil o kvalite**

- **Najlepší zdroj je spätné vyhľadávanie v obchodnom registri** (investor → firmy, kde je spoločníkom). Je zadarmo a stojí 0 tokenov, lebo ho robí skript. Našiel portfóliové firmy, ktoré web aj výskumníci prehliadli: pri NDF II 5 firiem, pri ZGC Fund I 6 firiem.
- **Webové vyhľadávanie nestačí ako dôkaz, že subjekt neinvestoval.**
  - Pri 88 z 580 vyradení (15 %) registre ukázali investičnú aktivitu, ktorú web nenašiel.
  - Výskum medzi nimi potvrdil 2 skutočné VC fondy, ktoré rýchly skríning chybne vyradil (Impact Ventures, SIIC Fund).
  - Ostatní boli väčšinou holdingy podnikateľov.
- **Automatické overenie zachytí veľa chýb, ale nie všetky.**
  - Overovateľ zamietol 14 % tvrdení v prvom kole a 10 % v druhom. Najčastejšie išlo o nesprávnu úroveň zdroja.
  - Chyby v type investora sa však našli až pri zmene pravidiel, bez človeka. Fund Rating a IPM Avanea Eco Management boli zaradení ako VC, hoci majú kontrolné podiely (PE). Avialytica Fund je pravdepodobne vehikel angela.
- **Pravidlá ešte nie sú stabilné.**
  - Za jeden deň sa pravidlá G4 a G5 upravili sedemkrát.
  - Overovatelia rozhodovali nejednotne v šiestich bodoch, zoznam je v [logs/run_summary.md](logs/run_summary.md).
  - Pri 18 z 34 záznamov v databáze rozhoduje človek (neisté záznamy a nerozhodnutý typ).
- **Kvalitu určujú registre, nie model.** Dôkaz investície na úrovni A (štátny register) existuje iba tam, kde register ukazuje spoločníkov. Na Slovensku chýbajú menšinoví akcionári akciových spoločností a zahraničné podiely. Kvôli tomu skončilo 7 záznamov ako „neisté“: registre ukazujú aktivitu, ale nedá sa priradiť ku konkrétnej firme.

### Spotreba zdrojov (štatistiky)

**Výpočet** (zdroj: [logs/usage.csv](logs/usage.csv); všetko Claude Opus 5.5)

| Krok | Behov | Tokeny | Tokeny na beh |
|---|---|---|---|
| Scout | 1 | 275 566 | – |
| Registrátor (skript / agent) | 1 267 / 1 | 0 / 207 232 | 0 / – |
| Rýchly skríning (dávky po 40) | 16 | 1 922 106 | ≈ 3 200 na kandidáta |
| Výskumník (vrátane opakovaného pokusu) | 64 | 10 663 500 | ≈ 167 000 |
| Overovateľ (vrátane opakovaného pokusu) | 65 | 6 164 103 | ≈ 95 000 |
| Kontrola registrov (skript) | 602 subjektov | 0 | 9 518 HTTP požiadaviek |
| **Spolu** | | **19 232 507** | |

Cena podľa [cenníka Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) (otvorené 2026-10-10). Spotreba bola zaznamenaná iba ako súčet tokenov, bez rozdelenia na vstup, výstup a cache, preto je cena pásmo:

| | Tokeny | všetko ako cache (0,20 $/M) | referencia: všetko ako vstup (4 $/M) | všetko ako výstup (20 $/M) |
|---|---|---|---|---|
| celý pilot | 19,2 M | 3,8 $ | **77 $** | 385 $ |
| na zaradený záznam (16) | 1,20 M | 0,24 $ | **4,8 $** | 24 $ |
| na záznam v databáze (34) | 0,57 M | 0,11 $ | **2,3 $** | 11 $ |

**Čas**
- Hlavná fáza pilotu (asi 30 plných výskumov s overením) trvala asi 45 minút. Bežalo pri nej 20 agentov súčasne.
- Návrat 31 subjektov (výskum a overenie) trval asi 20 minút.
- Kontrola registrov skriptom trvala asi 35 minút.
- Medián plného výskumu jedného subjektu bol 12,5 min v prvom kole a 7 min v druhom.

**Človek:** zatiaľ 0 hodín, lebo ručná kontrola neprebehla. Je to najväčšia nezmeraná položka.

### Aký okruh investorov sa dá získať z verejných zdrojov

Rozhodujú dve veci:
- **Zoznam kandidátov s menami:** existuje štátny zoznam, z ktorého sa dajú investori vybrať podľa mena?
- **Dôkaz investície:** ukazuje register, kto je spoločníkom ktorej firmy?

Čísla sú z plan.md 3.1 až 3.7 a 3.11, zdroje sú uvedené tam.

| Typ | Menovité zoznamy zo štátnych zdrojov (kandidáti) | Dá sa získať? |
|---|---|---|
| **VC** | USA 2 271 – 3 273 správcov (SEC, Form ADV); EÚ 447 správcov EuVECA; Japonsko 4 589 ohlasovateľov fondov (asi 2 220 záznamov „venture fund“); Čína 11 087 správcov VC a PE spolu (AMAC); Kórea 246; Austrália asi 150 ESVCLP a 128 VCLP (fondy); SR 28 + 10 správcov bez určenia typu | **áno, menovite** |
| **PE** | USA najviac 4 603 správcov (širšia definícia); EHP 3 133 správcov AIF bez uvedenej stratégie; Japonsko asi 713 záznamov „buyout fund“; Singapur 1 320 a Hongkong 2 358 správcov všetkých stratégií | **áno, ale typ** sa mimo USA a Japonska musí odvodiť z investícií |
| **Family office** | žiadny menovitý zoznam; Singapur viac ako 2 000 SFO a Hongkong viac ako 3 380 SFO sú iba počty | **nie menovite**, dá sa iba odvodiť z registrov spoločníkov, s nízkou spoľahlivosťou |
| **Angel** | žiadny menovitý zoznam; UK 33 220 daňových žiadateľov, Japonsko 11 929 daňových potvrdení a India 3 820 akreditovaných investorov sú iba počty | **nie menovite**; odvodiť sa dá v SR, ČR a UK z registrov spoločníkov, ale ide o osobné údaje (GDPR) |
| **Veľký súkromný investor** | žiadny zoznam, iba horné hranice podľa majetku (Knight Frank) | **nie** |

**Dôkaz investície podľa krajiny:**

| Úroveň | Krajiny | Čo to znamená |
|---|---|---|
| A, register spoločníkov zadarmo | SR, ČR (s.r.o.), Brazília (bez výšky podielu) | investície sa dajú doložiť skriptom |
| A, iba čiastočne | UK (spoločníci iba pri zmene), DE (iba skenované dokumenty) | |
| A, za poplatok za každú firmu | Singapur 5,50 SGD, Hongkong 16 – 23 HKD, Izrael 12 ILS, Austrália | cena rastie s počtom portfóliových firiem |
| A zo zákona, ale automatizovaný prístup je blokovaný | India (MCA), Čína (GSXT), Izrael (gov.il) | |
| iba B (médiá) | USA, Holandsko, Francúzsko | spoločníci súkromných firiem nie sú verejní |

Typ investora (VC alebo PE) na úrovni A uvádzajú iba podania na americkú SEC, označenie EuVECA a japonská FSA. Čína (AMAC) uvádza VC a PE spolu, bez rozlíšenia.

**Realistický okruh:** VC a PE správcovia z regulačných zoznamov, menovite asi 28 000 kandidátov v ôsmich vrstvách so známym počtom. Najvyššia kvalita je v krajinách s registrom spoločníkov. Angeli, family offices a súkromní investori sa z verejných zdrojov menovite a spoľahlivo získať nedajú.

### Reálne náklady na globálne rozšírenie

Náklady majú štyri zložky. Merané alebo zo zdroja sú iba výpočet a poplatky registrov. Človek a fixné položky sú parametre, ktoré pilot zatiaľ nezmeral.

| Zložka | Z čoho vychádza | Suma |
|---|---|---|
| **Výpočet (AI agenti)** | meranie z pilotu: plný výskum a overenie stojí 0,23 – 0,27 mil. tokenov na subjekt, teda asi 1 USD pri referenčnej cene | 8 vrstiev so zoznamom správcov (27 923 kandidátov, plan.md 5.4): plný výskum všetkých **1 481 – 148 084 USD, referencia 29 616 USD**; skríning a výskum iba postupujúcich, referencia 1 034 USD |
| **Registre** | cenníky registrov (plan.md 3.11) | SR, ČR, UK, USA zadarmo; pri plnom výskume Singapur asi **32 670 SGD**, Hongkong **169 776 – 244 053 HKD**; Izrael, India, Japonsko a Austrália za poplatok, súčet nevyčíslený |
| **Kód: napojenie na registre** | pre SR vznikol skript počas pilotu (spustenie zadarmo, 35 min pre 602 subjektov) | jednorazová práca pre každý register, **nevyčíslená**; pri blokovaných registroch (IL, IN, CN) ide navyše o právne posúdenie alebo ručný zber |
| **Človek** | štatistická kontrolná vzorka: 97 záznamov na vrstvu, až 200 vrstiev, teda až **19 400 záznamov**; k tomu ručné rozhodnutie neistých prípadov (v pilote 18 z 34 záznamov v databáze, teda 53 %) | pri 5, 15 alebo 30 min na záznam iba samotná vzorka **1 617, 4 850 alebo 9 700 hodín** (scenáre, nie odhad); hodinová sadzba nie je stanovená (otázka Q19) |
| **Fixné** | právne posúdenie (GDPR, podmienky registrov), prevádzka | **nevyčíslené** |

**Záver k nákladom**
- AI výpočet je pri globálnom rozsahu v tisícoch až nízkych desaťtisícoch USD. Je to najmenšia a najlepšie zmeraná položka.
- Reálnu cenu určí ľudská práca:
  - kontrola vzorky v rozsahu tisícov hodín,
  - k tomu ručné rozhodovanie neistých prípadov,
  - poplatky registrov v ázijských krajinách,
  - napojenie na každý register.
- Kým nebude zmeraný čas človeka na záznam (ručná kontrola pilotu) a lievik pri regulačných zoznamoch (kalibračné vzorky K1, K2 a K6), celkovú sumu nevieme poctivo uviesť.

### Dá sa AI nahradiť kódom?

**Čiastočne. Fakty získa kód, ale na rozhodnutie, čo znamenajú, sú AI agenti (alebo človek) zatiaľ nutní.** Vyplýva to priamo z dát pilotu:

| Krok | Kto ho robil v pilote | Dá sa nahradiť kódom? | Dôkaz z pilotu |
|---|---|---|---|
| Kandidáti zo štátnych zoznamov (NBS, ESMA, SEC, AMAC, FSA) | Scout (AI), 0,28 mil. tokenov | **áno**, ide o štruktúrované zoznamy | |
| Kandidáti z článkov a médií | Scout (AI) | **nie**, text je neštruktúrovaný | |
| Existencia, stav, činnosť podľa NACE (G1 až G3) | skript | **áno**, už je kódom | 1 267 behov, 0 tokenov |
| Podiely, dátumy vstupu a vklady (ORSR), finančný majetok (RÚZ) | skript | **áno**, už je kódom | 602 subjektov, 9 518 požiadaviek, 0 tokenov |
| Väčšina faktov v databáze | Výskumník (AI) z registrov | **áno**, ak je register | 556 zo 741 potvrdených tvrdení (75 %) je úrovne A z registrov; 15 zo 16 zaradených má investíciu v okne doloženú registrom; 10 zo 16 ju nájde priamo skript; 5 ďalších investuje cez spravované fondy (väzba správca → fond je v registri NBS, teda tiež kódovateľná); G-Force má investície doložené iba z médií |
| Kontrola, že citát je v kópii zdroja (KU0) | skript | **áno**, už je kódom | 741/741 |
| Pravidlá zaradenia (G4, G5) | skript | **áno**, už je kódom | |
| **Čo podiel znamená:** vlastná dcéra, prevod v rámci skupiny, ready-made firma, holding podnikateľa alebo investícia VC | Výskumník (AI) | **nie spoľahlivo** | Pravidlá kódu označili 31 subjektov ako podobné VC. Výskum potvrdil zaradenie iba pri 2 a jeden z nich je pochybný. Z 11 s „menšinovým podielom v mladej firme“ bolo 9 osobných holdingov alebo prevodov; z 10 registrovaných v NBS ani jeden nebol zaradený ako VC; z 10 s rastom podielov v RÚZ tiež ani jeden. |
| Činnosť subjektu (G3) z webu a poznámok k závierke | Výskumník (AI) | **nie** | 27 zo 44 potvrdených tvrdení o činnosti je z webu, médií alebo poznámok (úroveň B a C) |
| Investície z médií (úroveň B) | Výskumník (AI) | **nie** | v USA, Holandsku a Francúzsku je to jediný zdroj investícií |
| Skenované PDF, zahraničné registre (napr. český obchodný register) | Výskumník (AI) | čiastočne (OCR, adaptér pre každý register) | ZEPHYR mal všetky podiely v ČR |
| Overenie, že citát naozaj dokladá tvrdenie | Overovateľ (AI) | **nie**; mechanickú časť robí skript | Overovateľ zamietol 10 až 14 % tvrdení |

**Záver:**
- Najlacnejšie a najspoľahlivejšie je **hybridné riešenie: najprv kód, AI iba tam, kde treba čítať alebo rozhodovať.**
- Kód zbiera kandidátov zo zoznamov, údaje z registrov a uplatňuje pravidlá.
- AI agent číta neštruktúrovaný text (web, médiá, PDF) a posudzuje nejasné prípady.
- V pilote AI výsledky zároveň slúžili na zlepšovanie kódu. Pravidlá o vlastných dcérach a kontrolných podieloch vznikli z toho, čo našli agenti. Podiel AI teda môže časom klesať, nulový však nebude: nové vzorce (prevody, ready-made skupiny) najprv musí niekto rozpoznať.
- **Čisto kódové riešenie by v SR dávalo veľa falošných investorov.** Z pravidlami vybraných kandidátov by bolo platných asi 1 – 2 z 31. Pre krajiny bez registra spoločníkov (USA, NL, FR) by kód investície vôbec nenašiel.

### Je tu reálny prínos za vynaložené zdroje?

| Oblasť | Prínos | Hodnotenie |
|---|---|---|
| VC a PE v krajinách so zoznamom správcov a otvoreným registrom spoločníkov (SR, ČR, UK) | záznamy s dôkazom pri každom údaji, portfóliá z registra aj tam, kde web mlčí, zdôvodnené vyradenia | **áno**, výpočet je zanedbateľný a cenu určí ručná kontrola |
| VC a PE v krajinách so zoznamom správcov, ale bez registra spoločníkov (USA, JP, CN, SG, HK) | identita a typ od regulátora (A), investície iba z médií (B) | **pravdepodobne áno**, ale presnosť bude nižšia; overia to K1 a K2 |
| Angel, family office, veľký súkromný investor | chýba zoznam kandidátov, identitu je ťažké doložiť a ide o osobné údaje (GDPR) | **zatiaľ nie**; náklady sa nedajú ani vyčísliť (plan.md 5.4) |

Porovnanie s komerčnými databázami (PitchBook, Crunchbase, Dealroom) sme nerobili a ich cenu ani presnosť zo zdroja nemáme. Rozdiel je v prístupe: tu má každý údaj URL, doslovný citát a úroveň dôkazu, kým agregátory slúžia iba ako tip.

### Ďalšie kroky (rozhodovací bod)

1. **Ručná kontrola pilotu.** Treba vyplniť [data/review.html](data/review.html): slepá kontrola vzorky (169 záznamov a 109 tvrdení) a potom overenie všetkých 34 subjektov v databáze v záložkách „Reálne záznamy“ a „Porovnanie“. Až tým sa zmerajú KU1, KU2, KU4 a čas človeka na záznam (M6). Bez toho sa nedá rozhodnúť.
2. **Zjednotiť šesť nejasných pravidiel overovania** (logs/run_summary.md, „Otvorené otázky“). Patrí sem napríklad závierka „pred investíciou“, verdikt pri investícii mimo okna aktivity a úroveň zdroja SIH.
3. **Kalibračné vzorky K1 (VC USA), K2 (PE USA) a K6 (VC ČR)** (plan.md 5.6). Zmerajú lievik pri regulačných zoznamoch a presnosť tam, kde chýba register spoločníkov.
4. **Rozhodnutie:** rozšíriť na ďalšie krajiny iba vtedy, ak KU1 ≥ 95 % a známy čas človeka na záznam dá rozpočet, ktorý dáva zmysel.

## Štruktúra

| Cesta | Obsah |
|---|---|
| `plan.md` | plán štúdie (body 1–5) |
| `prompts/pilot-prompt.md` | zadanie pilotu: VC fondy registrované v SR |
| `data/` | výstupy pilotu: `investors.json` (zaradení), `decisions.csv`, `claims.csv`, `vyradene.csv` (zoznam vyradených s dôvodom), `orsr_podiely.csv` a `footprint.csv` (podiely z ORSR a finančný majetok z RÚZ) |
| `raw/` | kópie otvorených zdrojov (dôkazy) ponechaných subjektov |
| `logs/` | súhrn behu, spotreba, log chýb, metriky |
| `scripts/` | skripty pilotu, napríklad `footprint.js` (ORSR, RÚZ), `g4_rules.js`, `pretriage.js`, `classify.js`, `metrics.js` |

## Limity nástrojov

Príklady, keď nástroj agenta zlyhal, hoci zdroj existuje. Pri zbere dát treba s nimi počítať.

### Stránky generované JavaScriptom (SIH, 2026-10-09)

- **Čo zlyhalo:** pri rešerši k bodu 3 sa zoznam fondov Slovak Investment Holding (https://www.sih.sk) cez WebFetch (jednoduché stiahnutie HTML) „nenačítal“. Agent ho vyhodnotil ako nedostupný.
- **Príčina:** zoznam partnerských fondov je v záložkách, ktoré stránka vkladá a zobrazuje cez JavaScript. Na stránke je navyše cookie lišta, ktorá blokuje klikanie.
- **Riešenie:** otvoriť stránku v skutočnom prehliadači (Playwright, Chromium) a prečítať `document.body.textContent` vrátane skrytých záložiek. Kópia je v [raw/sih_homepage_2026-10-09.txt](raw/sih_homepage_2026-10-09.txt). Obsahuje 9 správcov fondov s kapitálom SIH.
- **Ponaučenie:** „nedostupná stránka“ z WebFetch neznamená, že údaj neexistuje. Pred zápisom „zdroj nedostupný“ treba stránku skúsiť otvoriť v prehliadači. Platí to aj pre pravidlo „nedostupná URL = údaj neexistuje“ v pilote.
