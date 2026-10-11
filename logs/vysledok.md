# Konečný výsledok pilotu (VC fondy v SR)

Čas výpočtu: 2026-10-11T07:24:07.798Z. Zdroj overenia: data/review_db_filled.csv (34 subjektov, pouzivatel_2026-10-11).

## Konečný stav databázy

| stav | počet |
|---|---|
| aktivny_investor | 22 |
| iny_typ | 2 |
| neinvestuje | 5 |
| neoveritelne | 5 |

**Aktívni investori podľa typu**

| typ | počet |
|---|---|
| VC | 18 |
| typ_nerozhodnuty | 3 |
| PE | 1 |

## Presnosť algoritmu

- **KU1 presnosť záznamov** (zaradený algoritmom je aktívny investor): 14/16 = 87,5 %. Intervaly: P90: 68,4 % – 95,8 % · P95: 64,0 % – 96,5 % · P98: 58,9 % – 97,2 %. Hranica ≥ 95 %: P90 nerozhodnuteľné, P95 nerozhodnuteľné, P98 nerozhodnuteľné.
- **M3 presnosť typu** (medzi správne zaradenými rovnaký typ): 12/14 = 85,7 %.
- **Nerozhodnutý typ (10)**: aktívny investor 8, z toho typ určený pri overení 7; neinvestuje 2.
- **Neistí (8)**: neoveritelne 5, iny_typ 1, neinvestuje 2.
- **Zhoda algoritmu s overením (investor áno/nie aj typ)**: 21/34.
- **KU3 pokrytie holdoutu**: holdout IČO, ktoré overenie potvrdilo ako aktívneho investora: 3; všetky sú v databáze. Holdoutové subjekty mimo databázy (vyradené algoritmom) overenie nezahŕňalo.

## Výťažnosť regulačného zoznamu (register NBS: správca AIF, AIF, EuVECA)

- V zozname 71 SK subjektov; medzi kandidátmi chýbalo 0.
- Aktívny investor po overení: 16/71 = 22,5 % (P90: 15,5 % – 31,6 % · P95: 14,4 % – 33,5 % · P98: 13,2 % – 35,8 %).
- V databáze (na ručné overenie): 22/71 = 31,0 % (P90: 22,8 % – 40,6 % · P95: 21,4 % – 42,5 % · P98: 20,0 % – 44,7 %).
- Pokrytie aktívnych investorov zoznamom: 16/22 = 72,7 % (P90: 55,3 % – 85,2 % · P95: 51,8 % – 86,8 % · P98: 47,9 % – 88,5 %). Mimo zoznamu: Slovak Investment Holding, a. s.; Eterus Capital, a. s.; National Development Fund II., a.s.; 365.fintech, a.s.; Impact Ventures, s. r. o.; Avialytica Fund s. r. o.

## Nezhody

| subjekt | algoritmus | overenie | poznámka |
|---|---|---|---|
| Zero Gravity Capital s.r.o. (52651894) | typ_nerozhodnuty | aktivny_investor / VC | správca ZGC Fund I |
| Neulogy Ventures, a. s. (47367610) | zaradeny / VC | iny_typ | poradenstvo; investuje luxemburský fond, nie SK firma |
| Sociálni Inovátori Impact Capital, s.r.o. (54184339) | typ_nerozhodnuty | aktivny_investor / VC | správca SIIC Fund |
| CEE Capital Management, a. s. (50491211) | typ_nerozhodnuty | neinvestuje | posledné investície 06/2023, fond v divestícii |
| Occam Investments s. r. o. (55387845) | zaradeny / VC | neinvestuje | EuVECA, ale žiadna investícia do cudzej firmy |
| CB ESPRI Impact One s. r. o. (54546702) | typ_nerozhodnuty | aktivny_investor / VC |  |
| Ethernum Capital s. r. o. (55356907) | zaradeny / VC | aktivny_investor / typ_nerozhodnuty | VC alebo PE; 50 % v Dr. Martin holding |
| IPM Avanea Eco s.r.o. (52261948) | typ_nerozhodnuty | aktivny_investor / VC | formálne; projektové SPV v odpadoch |
| ZGC Fund I., s.r.o. (52768058) | typ_nerozhodnuty | aktivny_investor / VC |  |
| Limerock Investment Holding, s.r.o. (47777028) | typ_nerozhodnuty | neinvestuje | fond v likvidácii, investície 2015–2016 |
| SIIC Fund, s.r.o. (54544378) | typ_nerozhodnuty | aktivny_investor / VC |  |
| ZEPHYR AIF a. s. (51145979) | typ_nerozhodnuty | aktivny_investor / PE | 100 % podiely v českých firmách |
| Avialytica Fund s. r. o. (56494904) | zaradeny / VC | aktivny_investor / typ_nerozhodnuty | VC alebo angel; vlastník neznámy |

## Čo overenie nemeria

- **KU4 chybné vyradenia:** 1 296 vyradených subjektov overenie nezahŕňalo.
- **KU2 presnosť polí:** jednotlivé tvrdenia sa ručne neoverovali.
- Overenie prebehlo nad dôkazmi, ktoré zozbierali agenti. Nemeria, či agenti nejakú investíciu neprehliadli.
