# Databáza investorov z verejných dát: štúdia uskutočniteľnosti

Hlavný dokument je [plan.md](plan.md). Zadanie pilotu je v [prompts/pilot-prompt.md](prompts/pilot-prompt.md).

## Štruktúra

| Cesta | Obsah |
|---|---|
| `plan.md` | plán štúdie (body 1–5) |
| `prompts/pilot-prompt.md` | zadanie pilotu: VC fondy registrované v SR |
| `data/` | výstupy pilotu: `investors.json` (zaradení), `decisions.csv`, `claims.csv`, `vyradene.csv` (zoznam vyradených s dôvodom), `orsr_podiely.csv` a `footprint.csv` (podiely z ORSR a finančný majetok z RÚZ) |
| `raw/` | kópie otvorených zdrojov (dôkazy) ponechaných subjektov |
| `logs/` | súhrn behu, spotreba, log chýb, metriky |
| `scripts/` | pomocné skripty pilotu |

## Limity nástrojov

Príklady, keď nástroj agenta zlyhal, hoci zdroj existuje. Pri zbere dát treba s nimi počítať.

### Stránky generované JavaScriptom (SIH, 2026-10-09)

- **Čo zlyhalo:** pri rešerši k bodu 3 sa zoznam fondov Slovak Investment Holding (https://www.sih.sk) cez WebFetch (jednoduché stiahnutie HTML) „nenačítal“. Agent ho vyhodnotil ako nedostupný.
- **Príčina:** zoznam partnerských fondov je v záložkách, ktoré stránka vkladá a zobrazuje cez JavaScript. Na stránke je navyše cookie lišta, ktorá blokuje klikanie.
- **Riešenie:** otvoriť stránku v skutočnom prehliadači (Playwright, Chromium) a prečítať `document.body.textContent` vrátane skrytých záložiek. Kópia je v [raw/sih_homepage_2026-10-09.txt](raw/sih_homepage_2026-10-09.txt). Obsahuje 9 správcov fondov s kapitálom SIH.
- **Ponaučenie:** „nedostupná stránka“ z WebFetch neznamená, že údaj neexistuje. Pred zápisom „zdroj nedostupný“ treba stránku skúsiť otvoriť v prehliadači. Platí to aj pre pravidlo „nedostupná URL = údaj neexistuje“ v pilote.
