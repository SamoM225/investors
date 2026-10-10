# Výskumník – opakovaný pokus (Riešenie nezhody), FIT, IČO 47051981

- Začiatok: 2026-10-09T19:34:22Z
- Koniec: 2026-10-09T19:40:30Z
- Dôvod: Overovateľ zamietol RES-006 a RES-009 (`citat_neexistuje`), pretože citát kombinoval VS 2025 (príloha 12593664) s údajom z VS 2024, ktorý v prílohe 12593664 nie je. Úroveň má byť C. Pri RES-007 a RES-010 (`typ_podielu`) má byť úroveň C a chýbal príznak `proxy`.

## Čo som urobil

- **VS 2024** (RÚZ výročná správa id 6480696, príloha **11809714**, podaná 2025-06-25) som znova stiahol, vykreslil s. 1, 3 a 7 a prečítal ich ako obrázok. Na **s. 3** je tabuľka „podiel v % k 31.12.2024“: ELEARN.AERO a.s. | 20, Trigen a.s. | 30.
- **VS 2025** (príloha 12593664) som znova stiahol, vykreslil s. 1, 3 a 7 a skontroloval:
  - s. 3: ELEARN.AERO a.s. | 27, Trigen a.s. | 40,
  - s. 7: sekcia L, „pokračovala v investíciách…“.
- Nový zápis má **jeden zdroj na riadok** a úroveň **C**:
  - RES-021 / RES-024: `investicia` (follow-on) podľa VS 2025. Stav k 2025-12-31, presný dátum nie je uvedený.
  - RES-022 / RES-025: `podiel_pred_investiciou` podľa VS 2024 (20 % a 30 % k 31.12.2024). Tieto riadky dokladajú zmenu podielu z druhého dokumentu.
  - RES-023 / RES-026: `typ_podielu` = menšinový, s príznakmi `proxy` a `typ_neuvedeny_vyslovne`.
- Pôvodné riadky 001–020 som nemenil (overené kontrolným súčtom prvých 21 riadkov pred zápisom a po ňom).

## Ďalšie hľadanie (bez nových tvrdení)

- **VS 2023** (príloha 10944797, s. 3): ELEARN.AERO 20 a Trigen 30 aj k 31.12.2023. V roku 2024 sa teda podiely v týchto dvoch firmách nemenili a zmena patrí do roku 2025.
- **RPO, s.r.o. ciele:**
  - Joint Custody s. r. o. (47934743): vklad FIT 2463 € platil od 2018-03-17 až do zániku 2025-12-10.
  - People2People, s. r. o. (51225221): vklad FIT 300000 € platil od 2020-04-24 až do zániku.
  - Ani v jednej firme nevznikol v okne nový ani zvýšený vklad FIT.
- **RÚZ cieľov FY2025:**
  - ELEARN.AERO, poznámky (RTF 12233559): akcionárov neuvádzajú, 0 zamestnancov.
  - Trigen, poznámky (PDF 12409615): „Spoločnosť je súčasťou konsolidovaného celku – Fond inovácií a technológií a.s.“ a 0 zamestnancov.
  - Ani jeden dokument neuvádza podiel ani dátum kúpy akcií. Nepoužité.
- **CRZ:**
  - FIT ako dodávateľ alebo objednávateľ má iba zmluvy o podnájme so SBA (2014–2025), memorandá a zmluvu so STU z roku 2013. Investičné zmluvy tam nie sú.
  - ELEARN.AERO má iba inovačnú poukážku SIEA (2023). Trigen nemá žiadnu zmluvu.
- **Médiá a tlačové správy portfóliových firiem:** 3 webové vyhľadávania nenašli nič o investícii FIT do ELEARN.AERO ani Trigen (iba CB Insights, ktorý je zakázaný ako zdroj).

## Čo naďalej chýba

- Presný dátum follow-onov a ich výška. RPO pri a.s. akcionárov neuvádza a základné imanie oboch a.s. sa nezmenilo. Ide teda o prevod akcií alebo inú formu, ktorú zdroje neuvádzajú.
- Zdroj úrovne A alebo B pre tieto follow-ony neexistuje, k dispozícii sú iba vlastné výročné správy investora (C).

## Otvorené stránky (približne 35 HTTP požiadaviek a 3 webové vyhľadávania)

- RÚZ: 19
  - PDF výročných správ: 3 (VS 2024, 2025, 2023)
  - API: 2 vyrocna-sprava, 2 uctovne-jednotky, 2 uctovna-jednotka, 4 uctovna-zavierka, 3 uctovny-vykaz
  - prílohy závierok cieľov: 3
- RPO: 4 (2 search, 2 entity)
- CRZ: približne 12 dotazov vrátane opakovaných
- Web search: 3, iba ako tip
