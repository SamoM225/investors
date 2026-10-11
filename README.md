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
| **Overenie a vyhodnotenie** | Zadávateľ overil všetkých 34 subjektov v databáze z dôkazov, ktoré zozbierali agenti. Výsledok je konečný stav databázy a presnosť algoritmu. | [logs/vysledok.md](logs/vysledok.md), [data/databaza_vysledok.csv](data/databaza_vysledok.csv) |

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
| overenie (2026-10-11) | Zadávateľ overil všetkých 34 subjektov v databáze. Jeho rozhodnutie je konečné a zarátava sa do výsledku. |
| kontrolná stránka | Do [data/review.html](data/review.html) pridať záložky „Reálne záznamy“ (iba zaradení) a „Porovnanie“ (zaradení vedľa neistých) so všetkými dôkazmi na ručné overenie. |

**Ďalšie otvorené otázky (vznikli počas behu)**

| Č. | Otázka |
|---|---|
| – | Šesť nejasností v pravidlách overovania, pri ktorých Overovatelia rozhodovali rôzne: ktorá závierka je „pred investíciou“, verdikt pri investícii mimo okna, úroveň zdroja SIH, citát zložený z výkazu a šablóny RÚZ, prevody v rámci skupiny a úroveň zahraničných registrov. Podrobnosti sú v [logs/run_summary.md](logs/run_summary.md). |
| – | Úroveň zdroja pri zmluvách v Centrálnom registri zmlúv (B alebo C). Zatiaľ platí C. |

## Výsledok a odporúčanie (stav 2026-10-11)

**Odpoveď v skratke**

1. **Dá sa to postaviť a výpočet je lacný.** Pilot (VC fondy v SR) z 1 334 kandidátov vytvoril databázu, v ktorej overenie potvrdilo **22 aktívnych investorov** (18 VC, 1 PE, 3 s otvoreným typom). Každý údaj je dohľadateľný k zdroju a doslovnému citátu. Spotreboval 19,2 mil. tokenov, teda asi 77 USD pri referenčnej cene. Pre celý svet vychádza výpočet rádovo na stovky až desaťtisíce USD na vrstvu.
2. **Spoľahlivosť je dobrá, ale cieľ 95 % zatiaľ nie je potvrdený.** Overenie všetkých 34 subjektov v databáze (2026-10-11) ukázalo, že zo 16 investorov, ktorých algoritmus zaradil, je 14 skutočných aktívnych investorov: **presnosť záznamov 87,5 %** (P95: 64 – 96,5 %). Dva boli falošné: Neulogy Ventures, a. s. je poradenská firma a investuje luxemburský fond; Occam Investments je registrovaný ako EuVECA, ale do cudzej firmy neinvestoval. Na štatistické rozhodnutie o 95 % je vzorka 16 záznamov malá. Chybné vyradenia (KU4) a presnosť polí (KU2) zmerané nie sú.
3. **Globálne to má zmysel iba čiastočne:**
   - **Áno** pre VC a PE v krajinách, kde regulátor zverejňuje zoznam správcov (USA, EÚ EuVECA, Čína, Japonsko, Singapur, Hongkong, Kórea).
   - **Najvyššia kvalita** je tam, kde register ukazuje spoločníkov firiem: SR, ČR (s.r.o.), čiastočne UK a DE.
   - **Nie, zatiaľ,** pre angelov, family offices a veľkých súkromných investorov. Neexistuje pre nich zoznam kandidátov, ťažko sa dokladá identita a ide o osobné údaje.
4. **Celkovú cenu neurčuje výpočet, ale ľudská kontrola a dostupnosť registrov.**
   - V SR bol aktívnym investorom asi každý piaty subjekt z regulačného zoznamu (16 zo 71). Zoznam pritom zachytil iba 16 z 22 aktívnych investorov.
   - Prepočet na 8 globálnych vrstiev: asi 6 300 aktívnych investorov (P95: 4 000 – 9 400) a 8 650 záznamov na ručné overenie, pri výpočte asi 30 000 USD.
   - Hodiny človeka nevieme vyčísliť, kým nezmeriame čas na záznam (pozri [Škálovanie](#škálovanie-na-globálny-trh-prepočet-z-konečných-výsledkov)).
5. **AI agentov sa úplne zbaviť nedá, ale väčšinu práce môže robiť kód.** 75 % potvrdených faktov pochádza z registrov a kód ich vie získať zadarmo. Rozhodnúť, čo podiel znamená (vlastná dcéra, prevod v skupine, holding podnikateľa alebo VC), však kód nevie: z 31 subjektov, ktoré pravidlá kódu označili ako podobné VC, výskum potvrdil 2. Odporúčané je hybridné riešenie (pozri [Dá sa AI nahradiť kódom?](#dá-sa-ai-nahradiť-kódom)).

**Odporúčanie:** zatiaľ nestavať celý svet. Najprv opraviť pravidlá, na ktorých algoritmus pri overení zlyhal, a prejsť rozhodovacím bodom podľa časti [Ďalšie kroky](#ďalšie-kroky-rozhodovací-bod). Kritérium pre rozšírenie: presnosť záznamov ≥ 95 % (KU1) na väčšej vzorke a zmeraný čas človeka na záznam.

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
| V databáze po algoritme | 34 | 16 zaradených, 10 s nerozhodnutým typom, 8 neistých |
| Overenie všetkých 34 (2026-10-11) | 34 | rozhodnutie overenia je konečné ([data/databaza_vysledok.csv](data/databaza_vysledok.csv)) |
| **Aktívni investori** | **22** | 18 VC, 1 PE, 3 s otvoreným typom |
| Nie sú investori alebo neinvestujú | 7 | 2 iný typ, 5 bez investície v okne |
| Nedá sa overiť z verejných zdrojov | 5 | registre ukazujú podiely, ale nie ich cieľ, alebo je dôkaz iba vlastné tvrdenie |
| Vyradení so zdôvodnením | 1 296 | `data/vyradene.csv`, pri každom dôvod a kľúčový dôkaz |

**Konečný výsledok po overení** (zdroj: [logs/vysledok.md](logs/vysledok.md), skript `scripts/vysledok.js`)

| Stav | Počet | Subjekty |
|---|---|---|
| **Aktívny investor, VC** | **18** | CB Investment Management, CB Growth ONE, CB ESPRI, CB ESPRI Impact One, Vision Ventures, Vision Ventures Growth I, Zero Gravity Capital, ZGC Fund I, Sociálni Inovátori Impact Capital, SIIC Fund, Impact Ventures, G-Force, Venture to Future Fund, Eterus Capital, IPM Avanea Eco, 365.fintech (korporátne VC), Slovak Investment Holding a National Development Fund II (štátne) |
| **Aktívny investor, PE** | **1** | ZEPHYR AIF |
| **Aktívny investor, typ otvorený** | **3** | Ethernum Capital (VC alebo PE), SEOF (VC alebo PE), Avialytica Fund (VC alebo angel) |
| Iný typ | 2 | Neulogy Ventures, a. s. (poradenstvo), Hilberman Capital (dlhopisy a úvery) |
| Neinvestuje | 5 | Occam Investments, CEE Capital Management, Limerock Investment Holding, Monopoly Ventures, APZ Ventures |
| Nedá sa overiť | 5 | Fond inovácií a technológií, Icon Group, Atlas Capital III, V a VI |

**Presnosť algoritmu voči overeniu**

| Meranie | Výsledok |
|---|---|
| Zaradení algoritmom, ktorí sú aktívni investori (KU1) | **14/16 = 87,5 %** (P90: 68,4 – 95,8 %, P95: 64,0 – 96,5 %, P98: 58,9 – 97,2 %) |
| Správny typ medzi správne zaradenými (M3) | 12/14 = 85,7 % |
| Algoritmus nechal typ otvorený | 10, z toho 8 aktívnych investorov (pri 7 sa typ pri overení určil) a 2 neinvestujú |
| Algoritmus označil ako neistých | 8, z toho 5 sa nedá overiť a 3 nie sú investori |
| Celková zhoda algoritmu s overením (investor áno alebo nie aj typ) | 21/34 |

Algoritmus teda pri zaradení pomýlil iba 2 subjekty, ale pri type bol príliš opatrný: 7 z 10 nerozhodnutých typov sa pri overení dalo určiť.

**Kde sa algoritmus s overením nezhodol** (13 z 34 subjektov, podrobne v [logs/vysledok.md](logs/vysledok.md))

| Druh chyby | Počet | Subjekty | Dá sa opraviť pravidlom v kóde? |
|---|---|---|---|
| Typ nechal otvorený, hoci sa dal určiť | 7 | Zero Gravity Capital, ZGC Fund I, Sociálni Inovátori Impact Capital, SIIC Fund, CB ESPRI Impact One, IPM Avanea Eco (VC); ZEPHYR AIF (PE) | čiastočne: správca by mal prevziať typ fondu, ktorý spravuje (väzba je v registri NBS); zrelosť cieľových firiem z dátumu vzniku v RPO |
| Označil za aktívneho, ale neinvestuje | 3 | Occam Investments (EuVECA, jediný podiel je vehikel vlastného fondu); CEE Capital Management (v okne iba dokúpenie podielu v existujúcej firme); Limerock (fond v likvidácii, investície 2015 – 2016, nový vstup v roku 2026 nie je investícia fondu) | áno: regulačné označenie neurčuje aktivitu; dokúpenie podielu nie je nový vstup |
| Zamenil investora | 1 | Neulogy Ventures, a. s. (poradca; investuje luxemburský fond) | čiastočne: ak register cieľovej firmy ukazuje iného spoločníka, investícia nepatrí skúmanému subjektu |
| Určil typ, ktorý overenie nechalo otvorený | 2 | Ethernum Capital (VC alebo PE), Avialytica Fund (VC alebo angel) | nie, rozhoduje ďalší dôkaz |

**Čo dopadlo dobre:**
- Ak sa „typ nerozhodnutý“ ráta ako aktívny investor, algoritmus označil za aktívnych 26 subjektov. Overenie potvrdilo 22, teda **84,6 %** (P95: 66,5 – 93,9 %).
- Medzi 8 subjektmi, ktoré algoritmus nechal ako neisté, **nebol ani jeden aktívny investor**. Všetkých 22 skutočných investorov bolo medzi zaradenými alebo s nerozhodnutým typom.
- Chyby sa teda týkali hlavne typu a toho, či je investor ešte aktívny. Neisté záznamy neskrývali skutočných investorov.

**Opakovaný beh (2026-10-11).** Celý skriptový reťazec sme spustili znova nad uloženými dôkazmi: klasifikátor (G1 až G5), kontrolu dohľadateľnosti, metriky a výsledok overenia.
- Pre všetkých 34 subjektov vyšlo presne to isté rozhodnutie, typ, príznaky aj dátum poslednej investície. Rovnaké ostali aj investície v `investors.json`.
- Dohľadateľnosť je znova 100 %: 327/327 hodnôt a 741/741 tvrdení.
- Agentov (Scout, Výskumník, Overovateľ) sme znova nespúšťali. Výsledok by sa tým nezlepšil, iba by sa minuli tokeny a dôkazy by sa zmenili.
- Súhrn chýb agentov (`logs/agent_errors.md`) sa už znova vygenerovať nedá, lebo pri očistení sa zmazali overenia vyradených subjektov. Ostáva verzia z pôvodného behu.

**Ako sa overovalo:** overenie urobil zadávateľ nad všetkými 34 subjektmi v databáze z dôkazov, ktoré zozbierali agenti (URL, citát, kópia zdroja). Nebola to slepá kontrola náhodnej vzorky podľa plan.md 4.5. Neoveruje teda, či agenti nejakú investíciu neprehliadli, ani 1 296 vyradených subjektov.

V `data/investors.json` (výstup algoritmu) je 67 investícií a každý údaj je naviazaný na potvrdené tvrdenie: 741 tvrdení, 327 hodnôt.

**Kritériá úspechu** (plan.md 4.10, zdroj: [logs/metrics.md](logs/metrics.md))

| Kritérium | Hranica | Výsledok |
|---|---|---|
| KU0 dohľadateľnosť | 100 % | **splnené**: 327/327 hodnôt, 741/741 tvrdení |
| KU1 presnosť záznamov | ≥ 95 % | 14/16 = **87,5 %**. Bodový odhad je pod hranicou, štatisticky **nerozhodnuteľné** pri n = 16 (P95: 64 – 96,5 %). |
| KU2 presnosť polí | ≥ 90 % | **nezmerané** (tvrdenia sa ručne neoverovali) |
| KU3 pokrytie holdoutu (EIF, SLOVCA) | ≥ 80 % | 3/3 subjekty potvrdené overením sú v databáze (Neulogy podľa overenia nie je investor). Pri n = 3 sa to štatisticky nedá rozhodnúť. |
| KU4 chybné vyradenia | ≤ 10 % | **nezmerané** (vyradení sa neoverovali) |
| KU5 podiel neistých (plne skúmaní) | ≤ 25 % | **nesplnené**: 18/41 = 43,9 % pred overením. Po overení ostáva otvorených 8 z 34 (5 neoveriteľných a 3 s otvoreným typom). |

**Čo pilot zistil o kvalite**

- **Najlepší zdroj je spätné vyhľadávanie v obchodnom registri** (investor → firmy, kde je spoločníkom). Je zadarmo a stojí 0 tokenov, lebo ho robí skript. Našiel portfóliové firmy, ktoré web aj výskumníci prehliadli: pri NDF II 5 firiem, pri ZGC Fund I 6 firiem.
- **Webové vyhľadávanie nestačí ako dôkaz, že subjekt neinvestoval.**
  - Pri 88 z 580 vyradení (15 %) registre ukázali investičnú aktivitu, ktorú web nenašiel.
  - Výskum medzi nimi potvrdil 2 skutočné VC fondy, ktoré rýchly skríning chybne vyradil (Impact Ventures, SIIC Fund).
  - Ostatní boli väčšinou holdingy podnikateľov.
- **Automatické overenie zachytí veľa chýb, ale nie všetky.**
  - Overovateľ zamietol 14 % tvrdení v prvom kole a 10 % v druhom. Najčastejšie išlo o nesprávnu úroveň zdroja.
  - Chyby v type investora sa však našli až pri zmene pravidiel, bez človeka. Fund Rating a IPM Avanea Eco Management boli zaradení ako VC, hoci majú kontrolné podiely (PE).
- **Overenie odhalilo tri slabé miesta pravidiel:**
  - **Regulačné označenie prebije chýbajúcu investíciu.** Occam je EuVECA, a preto ho algoritmus zaradil ako VC, hoci jediný podiel je vo vehikli vlastného fondu.
  - **Slovenská firma sa zamieňa so zahraničným fondom, ktorý investuje.** Neulogy Ventures, a. s. je poradca luxemburského fondu. Investíciu (MultiplexDX) drží fond, nie slovenská firma.
  - **Dokúpenie podielu a zmena adresy spoločníka vyzerajú v RPO ako nový vstup.** Pri CEE Capital je jediná „investícia“ v okne dokúpenie zvyšných 30 % existujúcej firmy. Overenie ju nerátalo ako novú investíciu.
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
| na overeného aktívneho investora (22) | 0,87 M | 0,17 $ | **3,5 $** | 17 $ |

**Čas**
- Hlavná fáza pilotu (asi 30 plných výskumov s overením) trvala asi 45 minút. Bežalo pri nej 20 agentov súčasne.
- Návrat 31 subjektov (výskum a overenie) trval asi 20 minút.
- Kontrola registrov skriptom trvala asi 35 minút.
- Medián plného výskumu jedného subjektu bol 12,5 min v prvom kole a 7 min v druhom.

**Človek:**
- Overenie všetkých 34 subjektov v databáze prebehlo (2026-10-11).
- Čas na záznam sa však nezapísal (stĺpec `human_minutes` je prázdny), preto M6 ostáva nezmerané.
- Je to stále najväčšia nezmeraná položka nákladov.

### Škálovanie na globálny trh (prepočet z konečných výsledkov)

Globálny zber začína pri štátnych zoznamoch správcov fondov. Pilot ukázal, ako dopadne takýto zoznam v SR: v registri NBS je 71 slovenských subjektov s registráciou správcu AIF, AIF alebo EuVECA. Všetkých 71 bolo medzi kandidátmi a výsledok overenia je:

| Výsledok | Zo 71 v zozname NBS | Podiel (P95) |
|---|---|---|
| Aktívny investor (VC alebo PE), potvrdený overením | 16 | **22,5 %** (14,4 – 33,5 %) |
| V databáze, teda na ručné overenie | 22 | **31,0 %** (21,4 – 42,5 %) |
| Vyradení so zdôvodnením (bez investícií, neaktívni, iný typ, zaniknutí) | 49 | 69,0 % |

Pre globálny zber z toho plynú tri veci:
- **Zoznam je dobrý začiatok, ale nie hotová databáza.** Iba asi každý štvrtý až piaty registrovaný subjekt je aktívny investor do firiem. Ostatné sú fondy nehnuteľností, uzavreté fondy, vehikly alebo správcovia bez investícií v okne.
- **Zoznam nepokryje všetkých investorov.** Zo 22 aktívnych investorov bolo v zozname NBS iba 16, teda 72,7 % (P95: 51,8 – 86,8 %). Mimo neho ostali štátne fondy (SIH, NDF II), korporátne VC (365.fintech) a neregistrovaní investori (Eterus, Impact Ventures, Avialytica). Na nich treba Scouta, ktorý číta články a weby, a to robí AI.
- **Ručné rozhodnutie potrebuje asi 1,5 záznamu na jedného aktívneho investora** (34 záznamov v databáze na 22 investorov).

**Prepočet na 8 vrstiev so zoznamom správcov (27 923 kandidátov, plan.md 5.4)**

Platí to iba vtedy, ak by výťažnosť zoznamov bola ako v SR:

| Vrstva | Kandidáti | Očakávaní aktívni investori (P95) | Záznamy na ručné overenie | Hodiny pri 5 – 15 – 30 min na záznam | Výpočet, referencia USD |
|---|---|---|---|---|---|
| VC USA (SEC) | 3 273 | 738 (471 – 1 096) | 1 014 | 85 – 254 – 507 | 3 472 |
| PE USA (SEC) | 4 603 | 1 037 (663 – 1 542) | 1 426 | 119 – 357 – 713 | 4 882 |
| VC EÚ (EuVECA) | 447 | 101 (64 – 150) | 139 | 12 – 35 – 69 | 474 |
| VC + PE Čína (AMAC) | 11 087 | 2 498 (1 597 – 3 714) | 3 435 | 286 – 859 – 1 718 | 11 759 |
| VC + PE Japonsko (FSA) | 4 589 | 1 034 (661 – 1 537) | 1 422 | 118 – 355 – 711 | 4 867 |
| správcovia Singapur (MAS) | 1 320 | 297 (190 – 442) | 409 | 34 – 102 – 205 | 1 400 |
| správcovia Hongkong (SFC) | 2 358 | 531 (340 – 790) | 731 | 61 – 183 – 365 | 2 501 |
| VC Kórea | 246 | 55 (35 – 82) | 76 | 6 – 19 – 38 | 261 |
| **Spolu** | **27 923** | **6 293** (4 021 – 9 354) | **8 652** | **721 – 2 163 – 4 326** | **29 616** |

Pri referenčnej cene to dáva **asi 4,7 USD výpočtu na jedného aktívneho investora** (v pilote 3,5 USD). K tomu treba pripočítať:
- poplatky registrov (Singapur, Hongkong),
- napojenie na registre,
- kontrolnú vzorku vyradených (KU4, 97 záznamov na vrstvu),
- Scouta pre investorov mimo zoznamov.

**Prečo je to iba scenár, nie odhad:**
- **Výťažnosť sa medzi zoznamami líši.** Zoznam SEC „venture capital fund adviser“ je užší ako slovenský register AIF, výťažnosť tam bude pravdepodobne vyššia. Čínsky AMAC (VC a PE spolu, 11 087) je širší, tam bude nižšia. Zmerajú to kalibračné vzorky K1 a K2.
- **Presnosť bude mimo SR nižšia.** V SR 75 % faktov pochádza z registra spoločníkov. V USA, Japonsku a Číne bude dôkaz investície väčšinou iba z médií (úroveň B). Presnosť 87,5 % zo SR sa tam prenášať nedá.
- **Čas človeka na záznam nie je zmeraný.** Preto sú v tabuľke tri scenáre.
- **Pri slovenskom pilote je n malé**, pozri intervaly P95.

**Záver pre globálny trh:** výpočet AI je pri globálnom rozsahu malá položka (asi 30 000 USD pri referenčnej cene). O realizovateľnosti rozhodnú tri veci:
1. **Ľudské overenie:** tisíce hodín, kým algoritmus nedosiahne presnosť, pri ktorej stačí kontrolovať iba vzorku.
2. **Dostupnosť registrov spoločníkov:** mimo SR, ČR a UK je dôkaz investície slabší.
3. **Pokrytie investorov mimo regulačných zoznamov:** v SR to bola štvrtina.

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
| **Človek** | štatistická kontrolná vzorka: 97 záznamov na vrstvu, až 200 vrstiev, teda až **19 400 záznamov**; k tomu ručné rozhodnutie neistých prípadov (v pilote 18 z 34 záznamov v databáze, teda 53 %) | pri 5, 15 alebo 30 min na záznam iba samotná vzorka **1 617, 4 850 alebo 9 700 hodín** (scenáre, nie odhad). Overenie všetkých záznamov v databáze ako v pilote pre 8 vrstiev so zoznamom správcov: 8 652 záznamov, teda **721 – 2 163 – 4 326 hodín** (pozri [Škálovanie](#škálovanie-na-globálny-trh-prepočet-z-konečných-výsledkov)). Hodinová sadzba nie je stanovená (otázka Q19) |
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

1. **Opraviť tri pravidlá, ktoré overenie odhalilo** (regulačné označenie bez investície, zahraničný fond spravovaný slovenským poradcom, dokúpenie podielu). Potom pilot prepočítať.
2. **Doplniť meranie, ktoré chýba:** chybné vyradenia (KU4) a presnosť polí (KU2) zo slepej vzorky v [data/review.html](data/review.html) a čas človeka na záznam (M6). Pri overení 34 subjektov sa čas nezapísal. Stačí ho pri ďalšej kontrole vyplniť v stĺpci „minúty“.
3. **Zjednotiť šesť nejasných pravidiel overovania** (logs/run_summary.md, „Otvorené otázky“). Patrí sem napríklad závierka „pred investíciou“, verdikt pri investícii mimo okna aktivity a úroveň zdroja SIH.
4. **Kalibračné vzorky K1 (VC USA), K2 (PE USA) a K6 (VC ČR)** (plan.md 5.6). Zmerajú lievik pri regulačných zoznamoch a presnosť tam, kde chýba register spoločníkov.
5. **Rozhodnutie:** rozšíriť na ďalšie krajiny iba vtedy, ak KU1 ≥ 95 % na väčšej vzorke a známy čas človeka na záznam dá rozpočet, ktorý dáva zmysel.

## Štruktúra

| Cesta | Obsah |
|---|---|
| `plan.md` | plán štúdie (body 1–5) |
| `prompts/pilot-prompt.md` | zadanie pilotu: VC fondy registrované v SR |
| `data/` | výstupy pilotu: `investors.json` (zaradení), `decisions.csv`, `claims.csv`, `vyradene.csv` (zoznam vyradených s dôvodom), `orsr_podiely.csv` a `footprint.csv` (podiely z ORSR a finančný majetok z RÚZ), `review_db_filled.csv` (overenie 34 subjektov) a `databaza_vysledok.csv` (konečný stav) |
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
