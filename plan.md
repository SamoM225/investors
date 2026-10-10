# Plán štúdie uskutočniteľnosti: databáza investorov z verejných dát

**Otázka štúdie:** Dá sa iba z verejných dát postaviť spoľahlivá databáza investorov do firiem? Aká dobrá bude a koľko bude stáť pre celý svet?

**Stav dokumentu**

| Bod | Obsah | Stav |
|---|---|---|
| 1 | Profily typov investorov | pripomienky zapracované (R1–R5) |
| 2 | Spôsob overenia | pripomienky zapracované (R6–R10) |
| 3 | Odhad počtov a spoľahlivosti pre každý typ | pripomienky zapracované (R12–R15). Úroveň 2 doplnená (3.11), čaká na pripomienky. |
| 4 | Pilot: VC v SR | beh dokončený (2026-10-10), čaká na ručnú kontrolu. Výsledky: [logs/run_summary.md](logs/run_summary.md) |
| 5 | Model nákladov na celý svet | návrh na pripomienky (ľudská zložka čaká na ručnú kontrolu pilotu) |

---

## 0. Spoločný rámec

### 0.1 Čo evidujeme pri každom investorovi

| Pole | Význam |
|---|---|
| `sektor_investora` | čím sa investor sám zaoberá (napr. správa fondov, priemysel rodiny, hlavné podnikanie osoby) |
| `zameranie_sektory` | do ktorých sektorov investuje |
| `zameranie_fazy` | do ktorých fáz firiem investuje |
| `ticket_typicky` | typická výška jednej investície |
| `kapital_celkovy` | celkový investičný kapitál |

Každá hodnota je samostatné tvrdenie (claim) a má: URL, úroveň dôkazu A–D, dátum publikácie zdroja, dátum prístupu a doslovný citát. Platí formát `claims.csv` z pilotu.

Pri zameraní evidujeme vždy dve hodnoty, deklarované (čo o sebe tvrdí investor, úroveň C) a skutočné (odvodené z overených investícií). Ak sa líšia, je to informácia, nie chyba.

### 0.2 Spoločné pravidlá, ktoré platia pre všetky typy

- Úrovne dôkazov A–D a brány G1–G4 preberáme z [prompts/pilot-prompt.md](prompts/pilot-prompt.md). Bod 1 ich iba prispôsobuje typom. Úplný postup overenia popíše bod 2.
- **Investícia do firmy** (rozhodnutie R1) = podiel v neverejnej firme alebo konvertibilný nástroj (konvertibilný úver, SAFE). Neráta sa: akcie na burze, bežné úvery, granty, nehnuteľnosti a investícia iba ako LP do cudzieho fondu. **Výnimka:** odkúpenie burzovej firmy fondom PE a jej stiahnutie z burzy (take-private) sa ráta.
- **Okno aktivity** = 36 mesiacov pred dátumom behu, rovnako ako v pilote.
- **Agregátory** (Crunchbase, LinkedIn, PitchBook, Dealroom) a ďalšie zrkadlá a crowdsourcované zdroje (napr. OpenCorporates, Wikidata) sú úroveň D. Slúžia iba ako tip na kandidáta, nikdy ako dôkaz. Údaj z nich treba vždy nájsť v pôvodnom zdroji.
- **Identita:** právnickú osobu identifikuje registračné číslo v jej jurisdikcii (IČO, Companies House number, SEC CRD/CIK) a ak existuje, aj LEI. Fyzickú osobu identifikuje meno a kombinácia údajov z registrového záznamu (dátum narodenia, ak ho register zverejňuje, a firmy, v ktorých figuruje). Nikdy ju neidentifikuje iba meno.
- **Kontaktné údaje v dopytoch na zdroje** (napr. hlavička User-Agent, ktorú vyžaduje SEC): používa sa iba fiktívna adresa projektu `investor-research research@example.org`, nikdy osobný e-mail (R15, pozri 3.9). Doména example.org je vyhradená na príklady, takže nepatrí nikomu skutočnému. Riziko: zdroj môže takéto dopyty odmietnuť. Ak sa to stane, zapíše sa to do logu ako nedostupný zdroj.

### 0.3 Čo znamená „očakávaná spoľahlivosť“ v tomto bode

Bod 1 nedáva čísla (tie patria do bodu 3 a každé bude mať zdroj). Spoľahlivosť tu vyjadrujeme ako **najvyššiu úroveň dôkazu, ktorú pre daný údaj bežne očakávame**:

| Hodnotenie | Význam |
|---|---|
| **vysoká** | údaj sa dá bežne doložiť úrovňou A (štátny register, regulačné podanie) |
| **stredná** | údaj sa dá bežne doložiť úrovňou B (tretia strana), úroveň A len výnimočne |
| **nízka** | bežne existuje iba úroveň C (vlastné tvrdenie) alebo nič |

Toto hodnotenie je hypotéza. Pilot (bod 4) ju zmeria pre VC v SR. Ostatné typy a krajiny sa overia vzorkou v bode 3.

---

## 1. Profily typov investorov

### 1.0 Ako rozlíšiť typy, keď sa prekrývajú

Jeden subjekt má práve jeden primárny typ. Rozhoduje sa v tomto poradí a platí prvé pravidlo, ktoré sedí:

1. **Fyzická osoba** (alebo jej osobný holding bez profesionálneho tímu, pozri 1.4 a 1.5) → **angel**, **veľký súkromný investor** alebo **`sukromny_investor_neurceny`**. Osobný holding sa eviduje ako *vehicle* osoby, nie ako samostatný investor. O type rozhodujú iba doložené investície (rozhodnutie R2):
   - doložená raná fáza a menšinový podiel → angel,
   - doložená neskoršia fáza alebo kontrolný podiel → veľký súkromný investor,
   - investícia je doložená, ale fáza ani typ podielu nie → `sukromny_investor_neurceny`. Typ sa nehádá.
2. **Subjekt, ktorý spravuje majetok jednej alebo viacerých rodín** a priamo investuje do firiem mimo vlastných prevádzok → **family office** (podtyp `single_family_office` alebo `multi_family_office`). Ak investuje iba ako LP do cudzích fondov → `mimo_rozsahu` (rozhodnutie R3).
3. **Správca kapitálu tretích strán (fond alebo správca fondu)** → **VC** alebo **PE** podľa stratégie:
   - ak existuje regulačná klasifikácia, rozhoduje ona (SEC Form ADV „venture capital fund“ / „private equity fund“, registrácia EuVECA → VC),
   - inak rozhodujú overené investície: menšinové podiely vo firmách v ranej a rastovej fáze → VC, kontrolné (väčšinové) podiely v zrelých firmách → PE,
   - *growth equity* je hraničný prípad. Zaradí sa podľa väčšiny overených investícií a označí sa príznakom `hranicny_typ`,
   - ak sa typ nedá jednoznačne určiť → `typ_nerozhodnuty` (`VC|PE`) a ručná kontrola (presné pravidlá v 2.3, rozhodnutie R7).
4. Nič z toho → `vyradeny_typ` s kategóriou z pilotu.

Korporátne VC, štátne fondy a investujúce akcelerátory sú **podtypy VC** (rovnako ako v pilote), nie samostatné typy.

---

### 1.1 Venture capital (VC)

**Definícia**

- **Áno:** fond alebo správca fondu, ktorý investuje spravovaný kapitál do menšinových podielov v neverejných firmách v ranej až rastovej fáze. Patria sem aj podtypy `korporatne_VC` (kapitál materskej firmy), `statny_fond` (verejný kapitál, napr. fondy fondov) a `akcelerator_investujuci` (akcelerátor, ktorý za kapitál preukázateľne berie podiel).
  - Regulačné kotvy definície: americká definícia „venture capital fund“ v SEC Rule 203(l)-1 (17 CFR 275.203(l)-1) a európske označenie EuVECA podľa nariadenia (EÚ) č. 345/2013.
- **Nie:** crowdfundingové platformy (vyradené ako sprostredkovateľ, rozhodnutie R4), poradcovia a M&A butiky, banky a čistí veritelia (venture debt bez podielu), grantové schémy, inkubátory bez kapitálu, buyout fondy (→ PE), fyzické osoby (→ angel).

**Brána existencie (G1)**

- Správca alebo fond je zapísaný v obchodnom registri svojej jurisdikcie a nie je v likvidácii ani zaniknutý (úroveň A).
- Bonus, nie podmienka: licencia alebo registrácia správcu u regulátora (NBS, register ESMA, SEC). Prečo nie podmienka: malí správcovia môžu fungovať v režime, ktorý verejný register s menom nevytvára, a pilot to tak už rieši („nie je stop, len chýbajúci bonus“).

**Dôkaz aktivity (G4)**

- Aspoň 1 investícia za 36 mesiacov doložená úrovňou A alebo B:
  - A: fond je zapísaný ako spoločník portfóliovej firmy s dátumom zápisu (ORSR pri s.r.o.; Companies House cez zoznam akcionárov v confirmation statement),
  - B: tlačová správa portfóliovej firmy, článok v médiách, zoznam investícií štátneho fondu fondov alebo EIF.

**Zdroje**

| Účel | Zdroj | Úroveň |
|---|---|---|
| existencia, stav (SR) | ORSR (orsr.sk), RPO (rpo.statistics.sk) | A |
| licencia správcu (SR) | register subjektov NBS | A |
| správca a typ fondu (EÚ) | register ESMA: Investment Fund Managers, EuVECA | A |
| správca, typ a hodnota fondu (USA) | SEC Form ADV, Schedule D, sekcia 7.B.(1): otázka 10 (typ fondu) a otázka 11 (gross asset value) | A |
| spoločníci portfóliovej firmy | ORSR (SR), Companies House (UK) | A |
| finančné údaje správcu | Register účtovných závierok (registeruz.sk) | A, iba ako proxy |
| investície, zameranie, ticket | fondy fondov (SIH/NRF, EIF), tlačové správy, médiá | B |
| deklarované zameranie, portfólio | web fondu, výročná správa | C |
| kandidáti | Crunchbase, Dealroom a ďalšie agregátory | D, iba tip |

**Očakávaná spoľahlivosť**

| Údaj | Hodnotenie | Prečo |
|---|---|---|
| existencia | vysoká | správca aj fond sú právnické osoby v registri |
| zaradenie do typu | vysoká v USA a pri EuVECA, stredná inde | Form ADV a EuVECA dávajú typ priamo z regulačného podania. Inde sa typ odvodzuje z investícií (B) a z webu (C). |
| aktivita | stredná až vysoká | v SR vidno spoločníkov s.r.o. v ORSR (A). Akcionárov a.s. ORSR spravidla neuvádza a americké štátne registre spoločníkov nezverejňujú, tam ostáva úroveň B. |
| sektor investora | vysoká | je daný typom (správa fondov). Kód činnosti uvádza register. |
| zameranie | deklarované nízka, skutočné stredná | deklarácia je C. Skutočné zameranie vyžaduje aspoň 2 overené investície. |
| ticket | stredná | pri fondoch so štátnym kapitálom ho dávajú podmienky programu (B), inak web (C) |
| kapitál | vysoká v USA, inde stredná | Form ADV otázka 11 (A). V EÚ ide o oznámenie o uzavretí fondu (B) alebo web (C). Celkové aktíva zo závierky sú iba proxy. |

---

### 1.2 Private equity (PE)

**Definícia**

- **Áno:** fond alebo správca fondu, ktorý investuje spravovaný kapitál prevažne do kontrolných (väčšinových) podielov v zrelých neverejných firmách (buyout), vrátane growth equity s kontrolnými podielmi a odkúpení burzových firiem (take-private, rozhodnutie R1).
- **Nie:** hedge fondy, realitné fondy, dlhové a infraštruktúrne fondy (Form ADV ich vedie ako samostatné kategórie), priemyselné holdingy, ktoré kupujú firmy do vlastnej prevádzky (strategickí kupci), poradcovia a M&A butiky, VC (→ 1.1).

**Brána existencie (G1)**

- Rovnaká ako pri VC: správca alebo fond v obchodnom registri, aktívny (A). Regulačná registrácia je bonus. V USA a EÚ ju veľkí správcovia spravidla majú (Form ADV, register AIFM).

**Dôkaz aktivity (G4)**

- Aspoň 1 akvizícia alebo investícia za 36 mesiacov s dôkazom A alebo B:
  - A: rozhodnutie alebo oznámenie o koncentrácii od antimonopolného úradu (Európska komisia, národné úrady vrátane PMÚ SR), zápis fondu ako spoločníka alebo konečného užívateľa výhod portfóliovej firmy (ORSR pri s.r.o., Companies House PSC, RPVS iba pri partneroch verejného sektora),
  - A: pri take-private dokumenty k ponuke na prevzatie podané u regulátora (v USA na SEC EDGAR, v EÚ ponuky schvaľované národným orgánom dohľadu) a oznámenie o vyradení akcií z obchodovania,
  - B: tlačová správa kupujúceho alebo predávajúceho, médiá.
- PE transakcie sú veľké a kontrolné, preto sa častejšie objavia v antimonopolných rozhodnutiach a v registroch skutočných vlastníkov než menšinové VC investície.

**Zdroje**

| Účel | Zdroj | Úroveň |
|---|---|---|
| existencia, stav | národné obchodné registre (ORSR/RPO, Companies House, …) | A |
| správca a typ fondu (USA) | SEC Form ADV, Schedule D 7.B.(1), otázka 10 „private equity fund“ a otázka 11 | A |
| správca (EÚ) | register ESMA Investment Fund Managers, národní regulátori | A |
| akvizície | rozhodnutia o koncentráciách (EK, národné úrady) | A |
| vlastníctvo portfólia | ORSR (spoločníci s.r.o.), Companies House PSC, RPVS (iba partneri verejného sektora) | A |
| investície, ticket, veľkosť fondu | tlačové správy, médiá | B |
| deklarované zameranie | web, výročné správy | C |
| kandidáti | PitchBook, Dealroom a ďalšie agregátory | D, iba tip |

**Očakávaná spoľahlivosť**

| Údaj | Hodnotenie | Prečo |
|---|---|---|
| existencia | vysoká | právnické osoby v registroch |
| zaradenie do typu | vysoká v USA, stredná v EÚ | Form ADV rozlišuje PE a VC. Register ESMA pole pre stratégiu nemá (overené v bode 3), preto sa v EÚ typ odvodzuje z transakcií. |
| aktivita | vysoká až stredná | kontrolné transakcie nad prahmi sa notifikujú antimonopolným úradom (A). Menšie transakcie pod prahmi iba B. |
| sektor investora | vysoká | daný typom |
| zameranie | stredná | skutočné zameranie sa dá odvodiť z verejných akvizícií |
| ticket | nízka | ceny transakcií sa často nezverejňujú. Antimonopolné rozhodnutia uvádzajú obraty cieľových firiem, nie cenu. |
| kapitál | vysoká v USA, inde stredná | Form ADV otázka 11 (A). Inde oznámenia o uzavretí fondu (B). |

---

### 1.3 Family office (FO)

**Definícia**

- **Áno:** subjekt, ktorý spravuje majetok rodiny a jeho časť investuje priamo do podielov vo firmách mimo vlastných prevádzok rodiny. Podtypy (rozhodnutie R3):
  - `single_family_office`: spravuje majetok jednej rodiny. Regulačná kotva: americká definícia v SEC Rule 202(a)(11)(G)-1 (iba klienti z rodiny, vlastníctvo a kontrola rodinou, neprezentuje sa verejnosti ako investičný poradca).
  - `multi_family_office`: spravuje majetok viacerých rodín. Zaradí sa **iba s doloženými priamymi investíciami do firiem**.
- **Nie:**
  - FO (single aj multi), ktorý investuje iba ako LP do cudzích fondov → `mimo_rozsahu`,
  - holding, ktorý iba drží rodinnú firmu (`vyradeny_typ`: holding vlastných prevádzok),
  - privátne banky a správcovia majetku, ktorí priamo neinvestujú do firiem,
  - nadácie, ktoré iba poskytujú granty.

**Brána existencie (G1)**

- Entita FO je v obchodnom registri a aktívna (A).
- Dodatočná brána typu: väzba na rodinu doložená úrovňou A (spoločníci s.r.o. v ORSR, PSC v UK, RPVS iba pri partneroch verejného sektora. Registre skutočných vlastníkov v EÚ už väčšinou nie sú verejné, pozri 3.6) **a** dôkaz, že entita spravuje majetok, nie prevádzku (B alebo C).

**Dôkaz aktivity (G4)**

- Aspoň 1 investícia do firmy mimo rodinnej skupiny za 36 mesiacov s dôkazom A (FO ako spoločník alebo akcionár v registri) alebo B (tlačová správa, médiá).

**Zdroje**

| Účel | Zdroj | Úroveň |
|---|---|---|
| existencia, stav | národné obchodné registre | A |
| väzba na rodinu | ORSR, spoločníci s.r.o. (SR), Companies House PSC (UK), RPVS (iba partneri verejného sektora) | A |
| investície | spoločníci v obchodných registroch, tlačové správy | A, B |
| sektor investora (zdroj bohatstva rodiny) | registre (vlastníctvo prevádzkovej firmy), médiá | A, B |
| deklarované zameranie | web FO (ak existuje) | C |
| kandidáti | agregátory, zoznamy členov združení FO, médiá | D alebo B, iba ako tip |

**Očakávaná spoľahlivosť**

| Údaj | Hodnotenie | Prečo |
|---|---|---|
| existencia entity | vysoká | ak sa entita nájde, je v registri |
| nájdenie kandidáta | nízka | single family office nemusí byť nikde označený ako FO. V USA ho práve Rule 202(a)(11)(G)-1 vyníma z povinnosti podávať Form ADV, takže regulačný zoznam neexistuje. |
| zaradenie do typu | nízka až stredná | slovo „family office“ nie je v registri. Typ sa skladá z väzby na rodinu (A) a z povahy činnosti (B alebo C). |
| aktivita | stredná | investície do s.r.o. a do firiem v UK sú v registri (A). Veľká časť investícií ide cez fondy alebo SPV a FO v nich nevidno. |
| sektor investora | stredná až vysoká | prevádzková firma rodiny sa dá doložiť z registra |
| zameranie, ticket | nízka | FO spravidla nezverejňujú stratégiu |
| kapitál | nízka | spravidla sa nezverejňuje. Rebríčky bohatstva v médiách uvádzajú majetok rodiny, čo nie je investičný kapitál. Môže ísť najviac o proxy s príznakom. |

---

### 1.4 Angel investor

**Definícia**

- **Áno:** fyzická osoba, ktorá investuje vlastné peniaze do menšinových podielov v neverejných firmách v ranej fáze. Môže investovať priamo, cez osobný holding alebo v syndikáte.
- **Nie:** zakladateľ, ktorý investuje do vlastnej firmy, zamestnanec s ESOP, mentor bez podielu, drobný investor cez crowdfundingovú platformu (rozhodnutie R4), osoba, ktorá investuje iba ako LP cez fond (investorom je fond), osoba s doloženou neskoršou fázou alebo kontrolným podielom (→ 1.5).
- **Zaradenie musí vyplývať z doložených investícií** (rozhodnutie R2). Treba doložiť ranú fázu aj menšinový podiel. Ak nie sú doložené, osoba dostane typ `sukromny_investor_neurceny` (pozri 1.0).
- Pomocná opora pre definíciu: EBAN (európske združenie business angels) opisuje angela ako súkromnú osobu, ktorá priamo investuje časť osobného majetku do nových a rastúcich súkromných firiem. Tento opis sme zatiaľ našli len cez sekundárny zdroj a pred použitím ho treba overiť na eban.org.

**Brána existencie (G1)**

- Fyzická osoba nemá vlastný záznam v obchodnom registri. G1 sa preto nahrádza **bránou identity**: osoba figuruje v registri (A) ako spoločník, akcionár alebo konečný užívateľ výhod aspoň jednej firmy a dá sa jednoznačne odlíšiť od menovcov (dátum narodenia, ak ho register zverejňuje, adresa, kombinácia firiem).
- Ak osoba investuje cez osobný holding, holding musí prejsť štandardnou G1 a väzba osoba → holding musí byť doložená úrovňou A.

**Dôkaz aktivity (G4)**

- Aspoň 1 investícia za 36 mesiacov do firmy, ktorú osoba nezaložila, doložená úrovňou A (zápis ako spoločník s dátumom) alebo B (tlačová správa startupu, ktorá ho menuje).

**Zdroje**

| Účel | Zdroj | Úroveň |
|---|---|---|
| identita, podiely | ORSR, Companies House (spoločníci, PSC) | A |
| investície | tlačové správy startupov, médiá | B |
| sektor investora (vlastné podnikanie) | registre (firmy, v ktorých je spoločník alebo štatutár), médiá | A, B |
| deklarované zameranie | osobný web, profily v sieťach angelov | C |
| kandidáti | siete angelov (napr. Klub podnikateľských anjelov Slovenska, EBAN), Crunchbase, LinkedIn | B alebo C pri zoznamoch členov, D pri agregátoroch, iba ako tip |

**Očakávaná spoľahlivosť**

| Údaj | Hodnotenie | Prečo |
|---|---|---|
| identita | stredná | bez jednoznačného identifikátora hrozí zámena menovcov |
| zaradenie do typu | nízka až stredná | z registra vieme, že osoba drží podiel, ale nie vždy, či ide o investíciu, spoluzaloženie alebo zamestnanecký podiel |
| aktivita | stredná v SR a UK, nízka inde | závisí od toho, či register zverejňuje spoločníkov. Investície cez syndikáty a SPV sú neviditeľné. |
| sektor investora | stredná | doloží sa z vlastných firiem osoby |
| zameranie | nízka až stredná | málo investícií na osobu, skutočné zameranie často nedosiahne minimum 2 overených investícií |
| ticket, kapitál | nízka | výšku podielu jednotlivca médiá uvádzajú výnimočne. Majetok osoby nie je investičný kapitál. |

**Osobitné riziko: osobné údaje.** Angel je fyzická osoba. Rozhodnutie R5: údaje o fyzických osobách budú v rámci možností iba na interné použitie. Aj interná databáza s menami, podielmi a investičným správaním je však spracúvanie osobných údajov podľa GDPR (potrebný právny základ, napr. oprávnený záujem, minimalizácia údajov a posúdenie informačnej povinnosti pri údajoch získaných z iných zdrojov). Toto nie je právne posúdenie. Štúdia ho musí zahrnúť ako samostatné riziko a nákladovú položku (bod 5). Pravidlá pre prácu s osobnými údajmi sú v 2.7.

---

### 1.5 Veľký súkromný investor

**Definícia (rozhodnutie R2)**

- **Áno:** fyzická osoba, ktorá investuje vlastný kapitál priamo alebo cez osobný holding bez profesionálneho tímu, a to do neskorších fáz alebo do kontrolných podielov vo firmách, ktoré sama nezaložila ani neriadi. Neskoršia fáza alebo kontrolný podiel musia byť doložené aspoň pri jednej investícii. Inak osoba dostane typ `sukromny_investor_neurceny`.
- **Nie:**
  - angel (rané fázy, menšinové podiely → 1.4),
  - osoba s vlastnou štruktúrou na správu majetku rodiny (→ family office),
  - investor iba do akcií na burze (rozhodnutie R1),
  - investor iba do nehnuteľností,
  - majiteľ, ktorý iba drží firmu, ktorú sám vybudoval.
- Hranicu oproti angelovi navrhujeme stanoviť **podľa fázy a typu podielu, nie podľa sumy**. Pre prahovú sumu nemáme zdroj a odhadovať ju nechceme.

**Brána existencie (G1)**

- Rovnaká ako pri angelovi (brána identity). Osobný holding musí prejsť štandardnou G1.

**Dôkaz aktivity (G4)**

- Aspoň 1 investícia za 36 mesiacov s dôkazom A (spoločník alebo konečný užívateľ výhod v registri, rozhodnutie o koncentrácii pri kontrolnej akvizícii, oznámenie o významnom podiele pri kótovaných firmách) alebo B (médiá).

**Zdroje**

| Účel | Zdroj | Úroveň |
|---|---|---|
| identita, podiely | ORSR (spoločníci s.r.o.), Companies House (akcionári, PSC), RPVS (iba partneri verejného sektora) | A |
| kontrolné akvizície | rozhodnutia o koncentráciách | A |
| investície | médiá, tlačové správy | B |
| sektor investora (zdroj bohatstva) | registre (vlastné firmy), médiá | A, B |
| kandidáti | rebríčky bohatstva v médiách, agregátory | B alebo D, iba ako tip |

**Očakávaná spoľahlivosť**

| Údaj | Hodnotenie | Prečo |
|---|---|---|
| identita | stredná až vysoká | známe osoby sa ľahšie odlíšia od menovcov |
| zaradenie do typu | nízka | hranica oproti family office je z verejných dát často nerozhodnuteľná (nevidno, či osoba má tím). Hranicu oproti angelovi rieši pravidlo R2, ale očakávame veľa záznamov `sukromny_investor_neurceny`. |
| aktivita | stredná | kontrolné a veľké transakcie sa objavia v registroch a médiách |
| sektor investora | vysoká | zdroj bohatstva je spravidla verejne doložiteľný |
| zameranie | nízka až stredná | odvodené z malého počtu transakcií |
| ticket | nízka až stredná | pri veľkých transakciách médiá cenu niekedy uvádzajú |
| kapitál | nízka | rebríčky bohatstva sú odhady médií o celkovom majetku, nie investičný kapitál. Môžu byť najviac proxy s príznakom. |

Rovnaké osobitné riziko osobných údajov ako pri angelovi.

---

### 1.6 Súhrn

| Typ | Existencia | Zaradenie do typu | Aktivita | Zameranie | Ticket | Kapitál |
|---|---|---|---|---|---|---|
| VC | vysoká | vysoká (USA, EuVECA) / stredná | stredná až vysoká | stredná | stredná | vysoká (USA) / stredná |
| PE | vysoká | vysoká (USA) / stredná | vysoká až stredná | stredná | nízka | vysoká (USA) / stredná |
| Family office | vysoká, ale ťažko sa hľadá | nízka až stredná | stredná | nízka | nízka | nízka |
| Angel | stredná (identita) | nízka až stredná | stredná (SR, UK) / nízka | nízka až stredná | nízka | nízka |
| Veľký súkromný investor | stredná až vysoká (identita) | nízka | stredná | nízka až stredná | nízka až stredná | nízka |
| `sukromny_investor_neurceny` | stredná (identita) | nie je určené (podľa definície) | stredná | nízka | nízka | nízka |

**Hlavné zistenie bodu 1 (hypotéza na overenie):** spoľahlivosť klesá v poradí VC/PE → family office → fyzické osoby. Pre VC a PE existujú regulačné podania, ktoré dokladajú existenciu, typ a v USA aj veľkosť fondu. Pre family office a fyzické osoby sa typ skladá z nepriamych dôkazov a údaje o tickete a kapitáli spravidla nie sú verejné vôbec. Druhá veľká premenná je **jurisdikcia**: či register zverejňuje spoločníkov (SR pri s.r.o. a UK áno, štátne registre USA nie). Bod 3 to preto bude odhadovať po kombináciách typ × krajina.

### 1.7 Rozhodnutia k bodu 1

| Č. | Téma | Rozhodnutie |
|---|---|---|
| R1 | čo je investícia | podiel v neverejnej firme alebo konvertibilný nástroj (konvertibilný úver, SAFE). Nie akcie na burze ani bežné úvery. Výnimka: take-private fondom PE sa ráta. |
| R2 | angel vs. veľký súkromný investor | hranica podľa fázy firmy a typu podielu, nie podľa sumy. Zaradenie musí vyplývať z doložených investícií. Ak fáza ani typ podielu nie sú doložené, typ je `sukromny_investor_neurceny`. |
| R3 | multi-family office | family office s podtypom `multi_family_office`, iba s doloženými priamymi investíciami do firiem. Ak investuje iba ako LP do cudzích fondov, je `mimo_rozsahu`. |
| R4 | crowdfunding | drobný investor cez platformu nie je angel. Platforma je vyradená ako sprostredkovateľ. |
| R5 | fyzické osoby | údaje v rámci možností iba na interné použitie |

---

## 2. Spôsob overenia

Pri každom zázname treba doložiť dve veci:

1. subjekt je skutočný a aktívny investor,
2. je zaradený do správneho typu (a podtypu).

Postup vychádza z pilotu ([prompts/pilot-prompt.md](prompts/pilot-prompt.md)) a rozširuje ho na všetky typy a krajiny. Miesta, kde sa líši od pilotu, sú označené **[zmena]** a zhrnuté v 2.8.

### 2.1 Úrovne dôkazov

| Úroveň | Typ zdroja | Príklady |
|---|---|---|
| A | štátny register alebo podanie u štátneho orgánu **[zmena]** | obchodné registre (ORSR, RPO, Companies House), registre skutočných vlastníkov tam, kde sú verejné (PSC v UK, RPVS iba pre partnerov verejného sektora; v EÚ väčšinou neverejné, pozri 3.6), registre regulátorov (NBS, ESMA, SEC), podania na SEC EDGAR (Form ADV, dokumenty k ponuke na prevzatie), rozhodnutia antimonopolných úradov, registre účtovných závierok |
| B | nezávislé potvrdenie tretej strany | tlačová správa portfóliovej firmy alebo protistrany transakcie, článok v médiách, zoznam investícií fondu fondov alebo EIF, oznámenie emitenta na burze |
| C | vlastné tvrdenie investora | web, portfólio, výročná správa, tlačová správa investora |
| D | agregátor, zrkadlo, crowdsourcovaný zdroj | Crunchbase, LinkedIn, PitchBook, Dealroom, OpenCorporates, Wikidata. Slúžia iba ako tip na kandidáta. |

Pravidlá na určenie úrovne:

- **Úroveň určuje pôvodca informácie, nie miesto, kde sme ju našli.** Výpis z registra skopírovaný na agregátore je D, kým ho neotvoríme priamo v registri.
- **Článok, ktorý iba preberá tlačovú správu investora, je C, nie B** **[spresnenie]**. Médium tu nie je nezávislý zdroj, iba ďalej šíri vlastné tvrdenie investora.
- **Dva zdroje B sú nezávislé**, iba ak ich vydali rôzni vydavatelia a nevychádzajú z tej istej tlačovej správy. Päť článkov z jednej tlačovej správy je jeden zdroj.
- Hodnota odvodená z iného údaja (napr. celkové aktíva zo závierky ako náhrada veľkosti fondu) má príznak `proxy` a nikdy nenahrádza priamy údaj.

### 2.2 Brány

Brány sa vyhodnocujú v poradí. Pri prvej nesplnenej sa spracovanie zastaví a zapíše sa, na ktorej bráne subjekt skončil.

| Brána | Otázka | Áno | Nie |
|---|---|---|---|
| G1 Register / identita | **Právnická osoba:** je v registri svojej jurisdikcie a nie je v likvidácii ani zaniknutá? **Fyzická osoba:** figuruje v registri (A) ako spoločník, akcionár alebo konečný užívateľ výhod a dá sa jednoznačne odlíšiť od menovcov? | pokračuj | právnická osoba: **STOP** `vyradeny_register`. Fyzická osoba: `vyradeny_identita` **[zmena]**. Ak register krajiny nie je verejne dostupný alebo nefunguje: `register_nedostupny` **[zmena]**. **TODO (R6):** postup pre krajiny bez verejného registra sa zatiaľ nerieši. |
| G2 Rozsah | Spadá subjekt do krajín a typov, ktoré daný beh spracúva? Nie je to FO, ktorý investuje iba ako LP (R3), ani drobný crowdfundingový investor (R4)? | pokračuj | `mimo_rozsahu` |
| G3 Typ činnosti | Investuje vlastný alebo spravovaný kapitál do investícií podľa R1? | pokračuj | `vyradeny_typ` + kategória |
| G4 Aktivita | Má aspoň 1 investíciu podľa R1 za 36 mesiacov s dôkazom A alebo B? | pokračuj | len dôkaz C: `neiste`. Žiadny dôkaz: `vyradeny_neaktivny`. |
| G5 Zaradenie do typu **[zmena]** | Dajú sa typ a podtyp odvodiť z potvrdených tvrdení podľa pravidiel v 2.3? | `zaradeny` + typ | fyzická osoba bez doloženej zrelosti firmy aj typu podielu: `zaradeny` s typom `sukromny_investor_neurceny` (R2). Typ sa nedá jednoznačne určiť: `typ_nerozhodnuty` s dvojicou kandidátskych typov (napr. `VC\|PE`) a **ručná kontrola** (R7, R8). |

Kategórie pre `vyradeny_typ` (z pilotu, doplnené o rozhodnutia R3 a R4): poradenstvo/M&A, **sprostredkovateľ (crowdfundingová platforma)**, banka/úver, grant/dotácia, inkubátor bez kapitálu, holding vlastných prevádzok, **správca majetku bez priamych investícií**, iné (s popisom).

G5 je oddelená od G3 zámerne. G3 rozhoduje, či subjekt vôbec je investor. G5 rozhoduje, aký typ investora to je. Chyby v týchto dvoch rozhodnutiach majú iné príčiny aj iné následky, preto ich chceme merať oddelene (2.6, metriky M2 a M3).

### 2.3 Pravidlá zaradenia do typu (G5)

Pri každej overenej investícii sa zisťujú dva vstupy pre G5: **zrelosť cieľovej firmy** a **typ podielu**.

**Zrelosť cieľovej firmy** (R7). Podľa nej sa hlavne rozlišuje VC a PE, rovnako aj angel a veľký súkromný investor. Určuje sa takto:

1. **Výslovný údaj v zdroji A alebo B** (tvrdenie `faza`), teda názov kola alebo opis transakcie:

   | Údaj v zdroji | Zrelosť |
   |---|---|
   | pre-seed, seed, Series A | raná |
   | Series B a neskoršie, growth | rastová |
   | buyout, take-private, kúpa väčšinového podielu v zavedenej firme | zrelá |

2. **Ak výslovný údaj chýba: veľkosť firmy** (tvrdenie `velkost_firmy`) podľa definície MSP v odporúčaní Komisie 2003/361/ES (príloha, čl. 2). Berú sa údaje z poslednej účtovnej závierky pred investíciou (A):

   | Kategória | Zamestnanci | Tržby a/alebo bilančná suma | Zrelosť (návrh) |
   |---|---|---|---|
   | mikro | menej ako 10 | najviac 2 mil. € | raná |
   | malá | menej ako 50 | najviac 10 mil. € | rastová |
   | stredná | menej ako 250 | tržby najviac 50 mil. € alebo bilančná suma najviac 43 mil. € | zrelá |
   | veľká | nad hranicami strednej | — | zrelá |

   - Kategórie a hranice sú prevzaté z odporúčania. **Priradenie kategórie k zrelosti je však náš návrh pravidla, nie overený fakt.** Kalibruje sa v pilote: porovná sa s rozhodnutím človeka (metrika M3) a pri fondoch s regulačnou klasifikáciou (Form ADV, EuVECA) s ich typom.
   - Ak firma nezverejňuje počet zamestnancov, kategória sa určí iba z finančných údajov a dostane príznak `proxy`.
   - Odporúčanie sčítava údaje partnerských a prepojených podnikov. My sa pozeráme iba na samotnú firmu, preto je aj toto `proxy`.

3. **Ak výslovný údaj a veľkosť firmy protirečia** (napr. „Series B“ v strednej firme), platí výslovný údaj a investícia dostane príznak `zrelost_sporna`.
4. **Ak chýba výslovný údaj aj závierka**, zrelosť je `nedolozena`.

**Typ podielu** je menšinový alebo kontrolný (väčšina hlasov alebo kontrola). Ako sa dokladá:
  - A: rozhodnutie o koncentrácii (kontrola vyplýva už z neho), dokumenty k take-private, pásmo podielu v PSC (UK), vklad voči základnému imaniu v ORSR pri s.r.o. Posledný údaj je iba `proxy`, lebo spoločenská zmluva môže hlasovacie práva upraviť inak.
  - B: médiá, ktoré výslovne uvádzajú „väčšinový“ alebo „menšinový“ podiel.
  - Konvertibilný nástroj sa až do konverzie ráta ako menšinový podiel.

**Pravidlá podľa typu**

| Typ | Vysoká dôvera typu | Stredná dôvera typu | Ak nestačí |
|---|---|---|---|
| VC | regulačná klasifikácia (A): Form ADV „venture capital fund“ alebo registrácia EuVECA, **alebo** aspoň 2 investície so zrelosťou raná alebo rastová | 1 taká investícia | `typ_nerozhodnuty` (`VC\|PE`), ručná kontrola |
| PE | Form ADV „private equity fund“ (A), **alebo** aspoň 2 investície so zrelosťou zrelá (vrátane take-private) | 1 taká investícia | `typ_nerozhodnuty` (`VC\|PE`), ručná kontrola |
| Family office | väzba na rodinu (A) + doklad, že entita spravuje majetok, nie prevádzku (B alebo C) + aspoň 2 priame investície (A alebo B) | to isté, ale len 1 priama investícia | `neiste`, ide na ručnú kontrolu |
| podtyp `single_family_office` / `multi_family_office` | single: vlastníctvo jednou rodinou (A) a žiadny dôkaz klientov mimo nej. Multi: dôkaz klientov z viacerých rodín (registrácia ako poradca = A, web = C) | — | podtyp `null` |
| Angel | aspoň 2 investície so zrelosťou raná a menšinovým podielom | 1 taká investícia | `sukromny_investor_neurceny` |
| Veľký súkromný investor | aspoň 2 investície so zrelosťou rastová či zrelá alebo s kontrolným podielom | 1 taká investícia | `sukromny_investor_neurceny` |

**Zmiešané portfólio a nejasné prípady** (R7, R8). Ak overené investície ukazujú na dva typy (VC aj PE, alebo angel aj veľký súkromný investor), postupuje sa takto:

1. Ak existuje regulačná klasifikácia (A), rozhoduje ona.
2. Ak všetky investície s určenou zrelosťou ukazujú na ten istý typ, subjekt dostane tento typ.
3. Ak väčšina ukazuje na jeden typ, subjekt dostane typ podľa väčšiny a príznak `hranicny_typ`.
4. Inak (rovnosť, väčšina investícií so zrelosťou `nedolozena` alebo `zrelost_sporna`) dostane typ `typ_nerozhodnuty` s dvojicou kandidátskych typov a ide na **ručnú kontrolu**. Človek rozhodne a zapíše dôvod. Ručne rozhodnuté typy sa v metrikách vykazujú zvlášť.

Ako automaticky rozhodovať nerozhodnuté dvojice, sa zatiaľ nerieši. Pilot ukáže, ktoré dvojice a ako často vznikajú.

Deklarácia na vlastnom webe (C) sa do typu nezapočítava nikdy. Eviduje sa iba ako deklarované zameranie (0.1).

### 2.4 Dôvera záznamu

**Dôvera záznamu = nižšia z dvoch hodnôt: dôvera aktivity a dôvera typu.**

- **Dôvera aktivity** sa preberá z pilotu:
  - `vysoka`: G1 z úrovne A a investícia doložená úrovňou A alebo dvomi nezávislými zdrojmi B,
  - `stredna`: G1 z úrovne A a investícia doložená jedným zdrojom B,
  - inak `neiste`.
- **Dôvera typu** sa určí podľa tabuľky v 2.3.
- **Fyzické osoby:** `vysoka` je možná iba vtedy, keď je identita potvrdená registrovým záznamom s ďalším identifikátorom (dátum narodenia, ak ho register zverejňuje, alebo mesiac a rok narodenia v PSC). Pri zhode iba podľa mena a firmy je najviac `stredna`.

Všetky záznamy `neiste` idú na ručnú kontrolu.

### 2.5 Kto overuje

Úlohy zostávajú ako v pilote: Scout → Registrátor → Výskumník → Overovateľ → Klasifikátor. Zmeny:

- **Registrátor** pri fyzickej osobe vyhodnocuje bránu identity namiesto registra a pri nedostupnom registri zapíše `register_nedostupny`.
- **Výskumník** pri každej investícii zbiera aj tvrdenia `faza`, `velkost_firmy` a `typ_podielu` s citátom. Bez nich G5 nemá z čoho rozhodnúť. Tvrdenia o portfóliovej firme majú vlastný identifikátor cieľovej firmy (`target_id`).
- **Overovateľ** okrem kontrol z pilotu overí, že citát dokladá fázu a typ podielu výslovne, nie iba nepriamo. Pri veľkosti firmy overí, že závierka je posledná pred dátumom investície. Pri fyzickej osobe overí, že zdroj hovorí o tej istej osobe (nie o menovcovi). Pri dvoch zdrojoch B overí ich nezávislosť podľa 2.1.
- **Klasifikátor** vyhodnocuje aj G5 podľa 2.3. Zapisuje zrelosť pri každej investícii, typ, podtyp, dôveru aktivity, dôveru typu a príznaky `hranicny_typ` a `typ_nerozhodnuty`.
- Pravidlo nezhody (jeden pokus výskumníka o iný dôkaz) a log chýb sa nemenia. Do logu chýb pribúdajú tri kategórie: **zámena fyzickej osoby**, **nedoložená fáza alebo typ podielu** a **nesprávna závierka** (iný rok alebo iná firma).

### 2.6 Meranie presnosti

Ručná kontrola odpovedá na dve otázky: koľko z toho, čo databáza tvrdí, je pravda, a koľko skutočných investorov nám uniklo.

**Metriky**

| Metrika | Čo meria | Ako |
|---|---|---|
| M1 presnosť tvrdení | podiel tvrdení potvrdených overovateľom, ktoré potvrdí aj človek (citát existuje, dokladá tvrdenie, správny subjekt, dátum, úroveň) | vzorka z `claims.csv` |
| M2 presnosť zaradenia | podiel záznamov `zaradeny`, ktoré sú podľa človeka skutočne aktívni investori | vzorka `zaradeny` |
| M3 presnosť typu | podiel záznamov `zaradeny`, pri ktorých človek určí rovnaký typ aj podtyp | tá istá vzorka |
| M4 chybné vyradenie | podiel záznamov `vyradeny_*`, ktoré sú podľa človeka aktívni investori v rozsahu | vzorka `vyradeny_*` |
| M5 úplnosť | podiel skutočných investorov, ktorých sme našli | porovnanie s referenčným zoznamom, ktorý Scout nedostal (holdout). Doplnkovo odhad celkovej populácie metódou capture-recapture z nezávislých zdrojov kandidátov. Ten sa využije aj v bode 3. |
| M6 čas na záznam | čas agentov a čas človeka na jedného kandidáta, podľa statusu a typu | časové značky v `decisions.csv` a pri ručnej kontrole. Je to vstup pre bod 5. |
| M7 výpočtové náklady | otvorené stránky, volania nástrojov a tokeny na kandidáta a rolu agenta | `logs/usage.csv`. Je to vstup pre bod 5 (pridané v bode 4.1). |
| M0 dohľadateľnosť | podiel hodnôt vo výstupe, ktoré majú potvrdené tvrdenie, URL, kópiu v `raw/` a citát, ktorý sa v kópii naozaj nachádza | automatická kontrola nad celým výstupom (pridané v bode 4.10) |
| M8 podiel neistých | podiel kandidátov, ktorí prešli G3 a skončili ako `neiste` alebo `typ_nerozhodnuty` | automaticky z `decisions.csv` (pridané v bode 4.10) |

**Postup ručnej kontroly**

- Kontrolór dostane identitu subjektu, tvrdenia, URL a kópie z `raw/`. **Nevidí status ani typ od klasifikátora.** Status a typ určí sám, a to rovnakými bránami a pravidlami. Zdroje znova otvorí naživo.
- Na časti vzorky skontrolujú ten istý záznam dvaja ľudia nezávisle. Ich zhoda sa meria (Cohenova kappa). Nezhodu rozhodne tretí. Pri nízkej zhode nie je problém v agentoch, ale v nejednoznačných pravidlách, a treba upraviť bod 1 alebo 2.
- Vzorka sa vrství podľa **typu × krajiny**, lebo spoľahlivosť sa podľa bodu 1 líši hlavne v týchto dvoch rozmeroch.

**Úrovne spoľahlivosti P90, P95, P98** (R9)

Každá metrika sa uvádza ako podiel s intervalom spoľahlivosti (Wilsonov interval), a to súčasne na úrovniach 90 %, 95 % a 98 %. Všetky tri sa počítajú z tej istej vzorky. Vyššia úroveň nevyžaduje viac kontroly, iba dáva širší interval.

Veľkosť vzorky určuje, aký úzky interval dostaneme. Potrebné n na jednu vrstvu v najhoršom prípade (p = 0,5), podľa vzorca n = z² · 0,25 / E², zaokrúhlené nahor:

| Úroveň | z | E = ±10 p. b. | E = ±5 p. b. |
|---|---|---|---|
| P90 | 1,645 | 68 | 271 |
| P95 | 1,960 | 97 | 385 |
| P98 | 2,326 | 136 | 542 |

- **Malé vrstvy:** keď je celá vrstva malá (N záznamov), použije sa korekcia na konečnú populáciu: n' = n / (1 + (n − 1) / N). Napríklad pri N = 50 a n = 97 vychádza n' = 34. Keď n' ≥ N, kontroluje sa celá vrstva. To bude pravdepodobne prípad pilotu.
- **Pre bod 5** sa náklady na ručnú kontrolu prepočítajú pre všetkých šesť variantov z tabuľky. Výber variantu je potom rozhodnutie o rozpočte, nie o metóde.

### 2.7 Osobné údaje (R5)

- **Minimalizácia:** pri fyzickej osobe sa do výstupu dostane meno, väzby na firmy, investície a polia z 0.1. Dátum narodenia a adresa slúžia iba na rozlíšenie identity. Ukladajú sa v oddelenej tabuľke s obmedzeným prístupom a nejdú do `investors.json`.
- **Kópie v `raw/`** z registrov obsahujú osobné údaje. Prístup k nim je obmedzený a lehota ich uchovania sa musí stanoviť.
- **Záznamy fyzických osôb** majú príznak `interne`. Žiadny export ich predvolene neobsahuje.
- **Pred globálnym behom** je potrebné právne posúdenie oprávneného záujmu a informačnej povinnosti. Je to nákladová položka v bode 5. Tento plán nie je právne posúdenie.

### 2.8 Zmeny oproti pôvodnému pilotu a rozhodnutia

**Zmeny oproti pôvodnému pilotu** (všetky sú už prenesené do [prompts/pilot-prompt.md](prompts/pilot-prompt.md), R10)

1. Úroveň A zahŕňa aj podania u štátnych orgánov a rozhodnutia úradov, nielen registre.
2. Článok, ktorý iba preberá tlačovú správu investora, je C. Nezávislosť dvoch zdrojov B má presné pravidlo.
3. Nová brána G5 (zaradenie do typu) a pravidlá v 2.3: zrelosť cieľovej firmy z tvrdení `faza` a `velkost_firmy` a k tomu `typ_podielu`.
4. Nové statusy a typy: `vyradeny_identita`, `register_nedostupny`, `typ_nerozhodnuty`, `sukromny_investor_neurceny`. Nové kategórie vyradenia: sprostredkovateľ, správca majetku bez priamych investícií.
5. Dôvera záznamu = nižšia z dôvery aktivity a dôvery typu.
6. Nové metriky M3, M5 a M6, slepá ručná kontrola, dvojitá kontrola časti vzorky a intervaly na úrovniach P90, P95 a P98.

**Rozhodnutia k bodu 2**

| Č. | Téma | Rozhodnutie |
|---|---|---|
| R6 | krajiny bez verejného registra | zatiaľ sa nerieši. Status `register_nedostupny`, TODO. |
| R7 | VC vs. PE | rozlišujú sa hlavne podľa zrelosti cieľovej firmy. Ak je to veľmi otázne alebo nejednoznačné, záznam dostane príznak nerozdeliteľnosti (`typ_nerozhodnuty`, `VC\|PE`) a ide na ručnú kontrolu. |
| R8 | nerozhodné dvojice typov | zatiaľ sa nerieši automaticky. Typ je nerozhodnutý a ide na ručnú kontrolu. |
| R9 | presnosť merania | vykazovať súčasne P90, P95 a P98. Náklady sa prepočítajú pre viacero variantov. |
| R10 | pilot | [prompts/pilot-prompt.md](prompts/pilot-prompt.md) je upravený podľa bodu 2 |
| R11 | angel | treba doložiť ranú fázu **aj** menšinový podiel, nestačí jedno z nich. Pravidlo sa prehodnotí podľa skutočných výsledkov. |

**TODO**

- R6: postup pre krajiny bez verejného registra (kandidát: LEI z GLEIF ako úroveň B).
- Kalibrácia prevodu veľkosti firmy na zrelosť (2.3) na výsledkoch pilotu.

## 3. Odhad počtov a spoľahlivosti pre každý typ

### 3.0 Metóda a obmedzenia

Pri každom type rozlišujeme tri vrstvy:

| Vrstva | Otázka | Odkiaľ |
|---|---|---|
| **P – populácia** | Koľko ich podľa dostupných odhadov existuje? | štatistiky regulátorov, štúdie, prieskumy, združenia. Odhady agregátorov sú uvedené iba ako orientačný údaj s označením **[D]**. |
| **N – nájditeľné v zoznamoch A** | Koľko subjektov uvádza verejný štátny register alebo regulačné podanie priamo ako tento typ? | registre regulátorov a štátne zoznamy. Je to **dolná hranica** toho, čo nájdeme bez prieskumu jednotlivých investícií. |
| **S – spoľahlivosť** | Akú úroveň dôkazu (bod 0.3) môžeme bežne očakávať? | štrukturálne fakty: čo registre v danej krajine zverejňujú (3.6) |

Pravidlá tohto bodu:

- **Každé číslo má odkaz na zdroj.** Všetky zdroje boli otvorené 2026-10-09 (rešerš podagentov, kontrola doslovných citátov).
- **Neextrapolujeme.** Kde chýba zdroj, píšeme „nenájdené“. Jediné výpočty sú pomery a rozdiely medzi číslami zo zdrojov a sú vždy označené ako výpočet.
- **Pokrytie sveta sa delí na dve úrovne (rozhodnutie R12):**
  - **úroveň 1:** EÚ, USA, UK. Na ne sa vzťahujú tabuľky 3.1–3.7.
  - **úroveň 2:** Izrael, Singapur, Hongkong, Japonsko, India, Čína a ďalšie (Kórea, Austrália, Kanada, SAE, Brazília). Výsledky sú v 3.11.
- **Podiel záznamov podľa dôvery (vysoká / stredná / neisté) zatiaľ nevieme vyčísliť.** Žiadny zdroj ho neuvádza. Zmeria ho až pilot a kalibračné vzorky (3.8).

### 3.1 VC

| Vrstva | Krajina | Číslo | Čo presne sa počíta | Zdroj |
|---|---|---|---|---|
| N | USA (podania SEC) | **2 271** správcov | správcovia, ktorí využívajú výnimku pre VC fondy (exempt reporting advisers, pravidlo 203(l)), rok 2025 | [SEC IM, Investment Adviser Statistics 2025, tab. 1.1](https://www.sec.gov/files/investment/im-investment-adviser-statistics-2025.pdf) |
| N | USA (podania SEC) | **3 273** správcov (2 786 ERA, 487 RIA) | správcovia, ktorí hlásia aspoň 1 fond typu „venture capital fund“, rok 2025 | tamže, tab. 5.3, 5.6, 5.9 |
| N | USA (podania SEC) | 46 027 fondov, hrubé aktíva 2,141 bil. USD | VC fondy (Form ADV, Schedule D 7.B.(1)), rok 2025 | tamže, tab. 5.1, 5.2 |
| N | EÚ/EHP | **447** aktívnych správcov (485 záznamov); SR **2**, ČR 0 | správcovia s označením EuVECA | [register ESMA](https://registers.esma.europa.eu/publication/searchRegister?core=esma_registers_upreg), dopyt 2026-10-09 |
| N | SR | **28** registrovaných správcov AIF + 10 správcovských spoločností | všetci správcovia, nielen VC. Register nemá pole stratégie. | [register NBS](https://subjekty.nbs.sk), export 2026-10-08 |
| P | Európa | **1 249** firiem | firmy, ktoré v roku 2025 investovali do VC (aktivita v roku, nie celkový počet) | [Invest Europe, Activity 2025](https://www.investeurope.eu/media/2icnrmzc/20260507-invest-europe-activity-data-report-2025.pdf) |
| P | EÚ a ďalej | viac ako 700 správcov, viac ako 1 600 fondov | portfólio EIF, všetky typy equity, nielen VC (k 31. 12. 2024) | [EIF](https://assets.foleon.com/eu-central-1/de-uploads-7e3kk3/22890/eif_ee25_masterfile_presentations_-_copy.c347c0d654d6.pdf) |
| P | SR | 12 | riadni členovia SLOVCA (PE, VC aj štátne fondy) | [SLOVCA](https://www.slovca.sk/sk/clenstvo/riadni-clenovia.html) |
| P | ČR | 27 riadnych + asi 50 pridružených | členovia CVCA (PE aj VC) | [CVCA](https://cvca.cz/clenstvi/radni-clenove/) |
| P **[D]** | USA | 2 984 firiem | VC firmy, ktoré získali fond za posledných 8 ročníkov (dáta PitchBook) | [NVCA Yearbook 2026](https://nvca.org/wp-content/uploads/2026/04/NVCA-2026-Yearbook-4.9.26.pdf) |
| P | svet | **nenájdené** | — | — |

**Spoľahlivosť (S)**

- **USA:** existencia a typ sú na úrovni A, z regulačných podaní. Mesačné hromadné dáta SEC obsahujú pri každom správcovi aj počet jeho VC fondov.
  - Pozor: počet fondov nie je počet investorov. V hromadných dátach patrí 22 277 zo 41 771 VC fondov (výpočet: 53 %) jedinému správcovi s jednorazovými vehiklami (SPV). Medzi správcami je aj veľa syndikačných a crowdfundingových platforiem.
  - Aktivita sa dá doložiť väčšinou len úrovňou B. Americké štátne registre spoločníkov nezverejňujú ([Delaware FAQ](https://corp.delaware.gov/faqs/)).
- **EÚ:** typ ukazuje priamo iba označenie EuVECA. To je však dobrovoľné, a preto v strednej a východnej Európe takmer chýba (SR 2, ČR 0). Ostatné registre správcov typ fondu neuvádzajú, takže typ sa musí odvodiť z investícií (2.3).
- **SR:** aktivita sa dá doložiť úrovňou A, keď je cieľová firma s.r.o. (spoločníci a výška vkladu sú v ORSR). Pri a.s. s viacerými akcionármi to nejde (3.6).

### 3.2 PE

| Vrstva | Krajina | Číslo | Čo presne sa počíta | Zdroj |
|---|---|---|---|---|
| N | USA (podania SEC) | **4 603** správcov (2 535 RIA, 2 068 ERA) | správcovia, ktorí hlásia aspoň 1 fond typu „private equity fund“, rok 2025 | [SEC IM 2025, tab. 5.3, 5.6, 5.9](https://www.sec.gov/files/investment/im-investment-adviser-statistics-2025.pdf) |
| N | USA (podania SEC) | 39 500 fondov, hrubé aktíva 11,310 bil. USD | PE fondy, rok 2025 | tamže, tab. 5.1, 5.2 |
| N | USA (Form PF) | 2 047 správcov, 27 682 fondov | iba väčší registrovaní správcovia, 4. štvrťrok 2025 | [SEC Private Fund Statistics](https://www.sec.gov/files/2026-08/Number_of_Funds_and_Advisers_08-05-2026a.json) |
| N | EHP | **3 133** aktívnych správcov AIF; SR **9** | všetci autorizovaní správcovia alternatívnych fondov. **Register nemá pole stratégie.** | [register ESMA (Solr)](https://registers.esma.europa.eu/solr/esma_registers_upreg/select?q=ae_entityTypeCode:aif%20AND%20ae_status:Active&rows=0&wt=json) |
| N | EHP | 7 279 fondov | PE fondy (AIF) ku koncu roku 2022 | [ESMA, EU AIF 2023](https://www.esma.europa.eu/sites/default/files/2024-01/ESMA50-524821-3095_EU_Alternative_Investment_Funds_2023.pdf) |
| N (aktivita) | EÚ | 384 oznámení (2025), 294 (do 30. 9. 2026) | všetky oznámené koncentrácie, bez rozlíšenia typu kupujúceho | [EK, Merger statistics](https://competition-policy.ec.europa.eu/document/download/4b083559-e36c-44c2-a604-f581abd6b42c_en?filename=Merger_cases_statistics.pdf) |
| N (aktivita) | SR | 32 konaní (2024) | konania o koncentráciách na PMÚ SR, bez rozlíšenia typu kupujúceho | [PMÚ SR, výročná správa 2024](https://www.antimon.gov.sk/data/att/03a/4584.bbf496.pdf) |
| P | Európa | **541** firiem (buyout), 678 (growth), 1 854 (všetky PE vrátane VC) | firmy aktívne v roku 2025 | [Invest Europe, Activity 2025](https://www.investeurope.eu/media/2icnrmzc/20260507-invest-europe-activity-data-report-2025.pdf) |
| P | SR | 176 firiem s investíciou PE/VC (2011–2025), 8 fondov | počíta sa podľa krajiny portfóliovej firmy, nie investora | [Invest Europe, CEE 2025](https://www.investeurope.eu/media/z3pasguu/20260623_invest-europe_cee-report-2025.pdf) |
| P | UK | 600 | členovia UK Private Capital (PE, VC, úvery aj poradcovia) | [UK Private Capital](https://www.ukprivatecapital.co.uk/resource/british-private-capital-fundraising-rises-in-2025-investment-remains-steady.html) |
| P **[D]** | svet | 34 100 správcov | „aktívni správcovia PE“ v databáze Preqin (široká definícia vrátane VC) | [CBS library guide](https://libguides.cbs.dk/Preqin) |
| P | svet | **nenájdené z neagregátorského zdroja** | — | — |

**Spoľahlivosť (S)**

- **USA:** existencia a typ sú na úrovni A. Kategória „private equity fund“ vo Form ADV je však zvyšková: zahŕňa všetko, čo nie je hedge, realitný, sekuritizačný, VC ani likviditný fond ([inštrukcie Form ADV](https://www.sec.gov/files/formadv-instructions.pdf)). Patria do nej teda aj úverové a infraštruktúrne fondy. Číslo 4 603 je preto **horná hranica** pre PE v našom zmysle.
- **EÚ:** existencia správcu je na úrovni A, ale typ nie, lebo register ESMA ani národné registre stratégiu neuvádzajú. Britský regulátor FCA stratégiu firiem vôbec neeviduje (FCA FOI12236).
- **Aktivita:** kontrolné transakcie nad prahmi sú doložené rozhodnutiami o koncentrácii (A). Úrady však nevedú štatistiku podľa typu kupujúceho, takže koľko z nich urobili PE fondy, nevieme.

### 3.3 Family office

| Vrstva | Krajina | Číslo | Čo presne sa počíta | Zdroj |
|---|---|---|---|---|
| N | Singapur | **viac ako 2 000** | single family offices s daňovou úľavou MAS (koniec roka 2024). Ide o administratívny počet. Verejný zoznam mien sme nenašli. | [MAS, prejav 2024](https://www.mas.gov.sg/news/speeches/2024/building-a-stronger-tomorrow---family-offices-in-our-flourishing-wealth-management-landscape) (1 650 k 8/2024); [prepis odpovede MAS v parlamente](https://www.caproasia.com/2025/02/06/singapore-mas-chairman-gan-kim-yong-on-family-offices-2000-single-family-offices-awarded-tax-incentives-employ-2200-singapore-citizens-permanent-residents/) (viac ako 2 000) |
| P | Hongkong | 3 384 | single family offices, koniec roka 2025. Je to odhad Deloitte, ktorý zverejnila vláda. Nejde o register. | [HKSAR Government](https://www.info.gov.hk/gia/general/202602/10/P2026021000234.htm) |
| P | USA | „menej ako 1 000 až 5 000“ | rozpätie odhadov tretích strán, ktoré uvádza SEC. Oficiálny počet neexistuje. | [SEC IA-3220](https://www.sec.gov/files/rules/final/2011/ia-3220.pdf) |
| P | Švajčiarsko | 250–300 (2024), asi 300 (2026) | single family offices, odhad združenia SFOA | [HSG 2024](https://www.unisg.ch/en/newsdetail/news/swiss-single-family-offices-study-provides-a-better-understanding/), [HSG 2026](https://www.unisg.ch/en/newsroom/swiss-single-family-offices/) |
| P **[D]** | svet | 8 030 (Severná Amerika 3 180, Európa 2 020, Ázia a Tichomorie 2 290) | single family offices. Model Deloitte postavený na dátach Wealth-X (Altrata), čo je agregátor. | [Deloitte Private 2024](https://www.deloitte.com/content/dam/assets-shared/docs/services/deloitte-private/2024/2024-defining-the-family-office-landscape-executive-report.pdf) |
| podiel | svet | 75 % (2026), 70 % (2025) | podiel FO, ktoré priamo investujú do firiem. Prieskum medzi klientmi Citi (N = 351 a 346), nedá sa preniesť na celú populáciu. | [Citi 2026](https://www.privatebank.citibank.com/doc/family-office/2026-global-family-office-report.pdf), [Citi 2025](https://www.privatebank.citibank.com/doc/family-office/2025-global-family-office-report.pdf) |
| P, N | EÚ, stredná a východná Európa, SR | **nenájdené** | žiadny register ani odhad | — |
| N | multi-family office | **nenájdené** | SEC nevedie MFO ako samostatnú kategóriu | — |

**Spoľahlivosť (S)**

- **Ani jedna krajina nemá verejný zoznam family offices s menami.** Kandidáti sa preto dajú hľadať iba nepriamo: médiá, tlačové správy o investíciách, tipy z agregátorov.
- **Väzbu na rodinu (A) je v EÚ čoraz ťažšie doložiť.** Registre skutočných vlastníkov sa po rozsudku Súdneho dvora EÚ z 22. 11. 2022 v EÚ prevažne uzavreli (3.6). Ostáva reťazec priamych vlastníkov: spoločníci s.r.o. v SR a ČR, PSC v UK.
- **Viditeľnosť:** jediný číselný náznak je zo Švajčiarska: agregátor tam uvádza 91 single family offices pri odhade asi 300, čo je výpočtom asi 30 % ([familyofficehub.io](https://familyofficehub.io/blog/family-offices-in-switzerland-the-complete-guide-2026/) **[D]**). Je to iba tip, nie dôkaz.

### 3.4 Angel investor

| Vrstva | Krajina | Číslo | Čo presne sa počíta | Zdroj |
|---|---|---|---|---|
| P | USA | **445 535** | aktívni angel investori v roku 2024, akademický odhad dopočítaný z prieskumu | [UNH Center for Venture Research](https://paulcollege.unh.edu/sites/default/files/media/2025-12/FY%202024%20Analysis%20Report%20Final.pdf) |
| P | USA | viac ako 15 000 | členovia Angel Capital Association (organizovaní angeli) | [ACA](https://www.angelcapitalassociation.org/about-aca/) |
| P | Európa (39 krajín) | asi **47 600** | angeli v sieťach a združeniach, rok 2024. Čiastočne z dát agregátorov. | [EBAN Statistics Compendium 2024](https://www.eban.org/wp-content/uploads/2025/12/Stats-Compendium-2024.pdf) |
| P | EÚ27 | 170 000–240 000 (spolu); viditeľných 25 000–30 000 | odhad za rok 2010. Neviditeľná časť trhu tvorí „viac ako 50 %, často až 90 %“. | [CSES pre Európsku komisiu, 2012](https://ec.europa.eu/docsroom/documents/7862/attachments/1/translations/en/renditions/pdf) |
| N | UK | **33 220** (EIS), 11 200 (SEIS) | investori, ktorí si uplatnili daňovú úľavu, daňový rok 2024/25. Oficiálna štatistika bez mien. Medzi EIS a SEIS sa investori prekrývajú. | [HMRC 2026](https://www.gov.uk/government/statistics/enterprise-investment-scheme-and-seed-enterprise-investment-scheme-may-2026/enterprise-investment-scheme-and-seed-enterprise-investment-scheme-2026) |
| P **[D]** | UK | asi 50 000 | jednotlivci s podielmi aspoň v 2 firmách s externým kapitálom, odvodené z Companies House (Beauhurst) | [UKBAA / Invest in Women Taskforce 2025](https://www.investinwomentaskforce.org/media/fnpohsgw/iwt-ukbaa-angel-report-2025_final.pdf) |
| P | SR | **120** angelov v 1 sieti, 9 investícií (2024) | iba viditeľný trh | EBAN 2024 (vyššie), tab. 8 |
| P | ČR | 340 angelov v 3 sieťach, 70 investícií | iba viditeľný trh | tamže |

Výpočet: organizovaní angeli tvoria v USA 15 000 / 445 535 ≈ 3 % odhadu populácie.

**Spoľahlivosť (S)**

- **Nikde neexistuje štátny zoznam angelov.** Angela treba odvodiť z registra spoločníkov podľa pravidiel R2 a R11 (2.3).
- **Odvodenie z registrov sa už v praxi používa.** Číslo 50 000 v UK vzniklo práve takto z verejného registra Companies House, aj keď ho zostavil agregátor.
- **Kde sú spoločníci viditeľní, záleží od krajiny** (3.6):
  - **SR a ČR:** spoločníci s.r.o. sú v registri aj s podielom,
  - **UK:** mená akcionárov sa zverejňujú, ale bez dátumu narodenia a iba pri zmene, takže identita osoby je slabšia,
  - **Nemecko:** zoznam spoločníkov GmbH obsahuje aj dátum narodenia, ale sú to skenované dokumenty, ktoré sa dajú sťahovať len po jednom,
  - **USA:** spoločníkov nezverejňuje register žiadneho štátu. Formulár Form D uvádza len počet investorov, nie ich mená ([Form D](https://www.sec.gov/files/formd.pdf)).

### 3.5 Veľký súkromný investor

| Vrstva | Krajina | Číslo | Čo presne sa počíta | Zdroj |
|---|---|---|---|---|
| P (horná hranica) | svet | asi 250 000 | ľudia s investovateľným majetkom nad 30 mil. USD (2025) | [Capgemini, World Wealth Report 2026](https://www.capgemini.com/it-it/wp-content/uploads/sites/15/2026/06/06_05_World-Wealth-Report-2026-Press-Release_ITA.pdf) |
| P (horná hranica) | svet | 556 850 (Severná Amerika 224 470, Európa 140 140) | ľudia s čistým majetkom nad 30 mil. USD (2025) | [Altrata 2026](https://altrata.com/wp-content/uploads/2026/06/Altrata_World-Ultra-Wealth-Report-2026_FINAL.pdf) |
| P (horná hranica) | svet | 713 626 | ľudia s čistým majetkom nad 30 mil. USD (2026) | [Knight Frank 2026](https://www.knightfrank.com/research/article/2026/4/wealth-sizing-model-2026-results) |
| P (horná hranica) | svet | 2 919 až 3 428 | miliardári (UBS 4/2025 až Forbes 3/2026) | [UBS 2025](https://www.ubs.com/content/dam/assets/wm/static/billionaire-ambition-report/ubs-billionaire-ambitions-report-2025-sg.pdf); Forbes cez [E15](https://www.e15.cz/byznys/cesi-maji-po-sesti-letech-zastupce-v-prvni-stovce-nejbohatsich-lidi-sveta-strnad-se-vysvihl-o-733-mist-1431353) |
| P (horná hranica) | SR | 65 ľudí (7 miliardárov v eurách) | rebríček Forbes Slovensko „Najbohatší Slováci 2026“ | [noviny.sk](https://www.noviny.sk/slovensko/1269011-najbohatsi-slovaci-2026-rebricek-sa-rozrastol-o-paet-mien-na-prvom-mieste-doslo-k-zmene) |
| P (horná hranica) | SR | menej ako 1 000 | Knight Frank SR samostatne neuvádza, iba „All other European countries remain below 1,000“ | [Euronews, s odvolaním na Knight Frank](https://www.euronews.com/business/2026/05/06/europes-ultra-rich-club-grew-by-26-in-five-years-led-by-germany) |
| podiel | — | **nenájdené** | podiel bohatých ľudí, ktorí priamo investujú do cudzích firiem | — |

Výpočet: odhady počtu ľudí s majetkom nad 30 mil. USD sa líšia 713 626 / 250 000 ≈ 2,9-krát. Dôvod je rôzna definícia: investovateľný vs. čistý majetok.

**Spoľahlivosť (S)**

- **Máme iba hornú hranicu.** Rebríčky bohatstva sú zoznamy majetku, väčšinou vo vlastnej firme. Nie sú to zoznamy investorov do cudzích firiem.
- **Typ je ťažké doložiť.** Rozlíšiť veľkého súkromného investora od angela vyžaduje doloženú zrelosť firmy alebo kontrolný podiel (R2), a ten často ostane neurčený (`sukromny_investor_neurceny`).
- **Kontrolné transakcie sa v rozhodnutiach o koncentrácii objavia, ale fyzická osoba v nich nie je „dotknutým podnikom“** ([EK, M.6411](https://ec.europa.eu/competition/mergers/cases/decisions/m6411_778_2.pdf)). Štatistika takýchto prípadov neexistuje.

### 3.6 Čo zverejňujú registre (hlavný faktor spoľahlivosti)

**Porovnanie viacerých krajín**

| Údaj | Číslo | Zdroj |
|---|---|---|
| Jurisdikcie, kde sú zákonní vlastníci (spoločníci) verejne online, zadarmo a vždy | **7** zo 141 hodnotených, ďalšie 3 za poplatok do 10 €. SR je „N/A“. | Financial Secrecy Index 2022, otázka 475 (v roku 2025 FSI toto meranie zrušil: [metodika 8.0](https://fsi.taxjustice.net/wp-content/uploads/2025/06/2025-06-FSIMethodology8.0.pdf)) |
| Jurisdikcie, kde sú účtovné závierky verejne online, zadarmo a dajú sa ľahko kopírovať | **5** zo 141 (SR, SI, PL, GB, BE) | [FSI 2026](https://fsi.taxjustice.net/indicator-detail/#indicator=SI08) (dáta len na nekomerčné použitie) |
| Jurisdikcie s funkčným registrom skutočných vlastníkov | 103 z 210 | [Open Ownership](https://www.openownership.org/en/map/) (pri SR a ČR zastarané) |
| Povinne bezplatné firemné dáta v EÚ (HVD, BRIS) | existencia, stav, štatutári, závierky. **Spoločníci nie.** | [nariadenie 2023/138](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023R0138), [smernica 2019/1151](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L1151), [smernica 2025/25](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32025L0025) |
| Verejný prístup k registrom skutočných vlastníkov v EÚ | zrušený rozsudkom Súdneho dvora EÚ z 22. 11. 2022. Podľa AMLD6 je prístup iba pri preukázanom oprávnenom záujme; ten sa predpokladá aj u osôb, ktoré pravdepodobne vstúpia do transakcie s firmou. | [SDEÚ, tlačová správa 188/22](https://curia.europa.eu/jcms/upload/docs/application/pdf/2022-11/cp220188en.pdf), [smernica 2024/1640, čl. 12](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024L1640) |

**Podľa krajiny**

| Krajina | Spoločníci neverejnej firmy | Skutoční vlastníci | Závierky | Hromadné dáta / API | Zdroj |
|---|---|---|---|---|---|
| **SR** | s.r.o.: áno, aj s výškou vkladu. a.s.: iba jediný akcionár. | **neverejné od 17. 8. 2026** (ORSR aj RPO). RPVS je verejný, ale iba pre partnerov verejného sektora. | zadarmo | RPO API (CC BY 4.0, bez kľúča), RÚZ API (CC0). Štruktúrované dáta ORSR ukladá zákon, ale endpoint sme nenašli. | [zákon 29/2026 Z. z.](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2026/29/) § 11, 12, 100, 105, 107; [RÚZ API](https://www.registeruz.sk/cruz-public/home/api) |
| **ČR** | s.r.o.: áno, aj s podielom. a.s.: iba jediný akcionár. | **neverejné od 17. 12. 2025** | zadarmo, ťažšie kopírovateľné | hromadné XML/CSV zadarmo | [zákon 304/2013 § 48](https://www.zakonyprolidi.cz/cs/2013-304), [FAÚ](https://www.fau.gov.cz/assets/cs/cmsmedia/Souhrnn%c3%a9%20informace%20k%20ESM.pdf), [dataor.justice.cz](https://dataor.justice.cz) |
| **UK** | mená a počty akcií, iba pri zmene, bez dátumu narodenia | **verejné** (PSC) | zadarmo | API zadarmo (600 dopytov za 5 min), mesačné hromadné súbory | [CA 2006 s.853F](https://www.legislation.gov.uk/ukpga/2006/46/section/853F), [Companies House API](https://www.api.gov.uk/ch/companies-house/) |
| **USA** | **nie** (Delaware) | neverejné | súkromné firmy nezverejňujú | EDGAR API zadarmo (iba podania na SEC) | [Delaware FAQ](https://corp.delaware.gov/faqs/), [EDGAR API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) |
| **DE** | GmbH: áno, aj s dátumom narodenia a % podielu. Skenované dokumenty, zadarmo od 1. 8. 2022, iba po jednom. | obmedzené | nie vždy online | hromadné dáta nenájdené | [GmbHG § 40](https://www.gesetze-im-internet.de/gmbhg/__40.html), [BT-Drs. 20/4502](https://dserver.bundestag.de/btd/20/045/2004502.pdf) |
| **FR** | štruktúrované údaje nenájdené (iba stanovy ako dokumenty) | obmedzené od 31. 7. 2024 | do 10 € | API/SFTP INPI | [INPI](https://www.inpi.fr/node/6133) |
| **NL** | iba jediný akcionár | neverejné | nie vždy online | platené API (6,40 €/mesiac + 0,02 € za dopyt) | [KVK](https://www.kvk.nl/over-het-handelsregister/geregistreerd-in-het-handelsregister/), [KVK ceny](https://developers.kvk.nl/nl/pricing) |

**Dôsledky pre databázu**

1. **Dôkaz investície na úrovni A je štrukturálne dostupný iba v malom počte krajín.** Spomedzi skúmaných sú to SR a ČR (s.r.o.), čiastočne UK (iba pri zmene) a DE (dokumenty). V USA, NL a FR spoločníkov súkromných firiem verejne nevidno, takže tam ostáva najviac úroveň B.
2. **Slepé miesto je a.s. s viacerými akcionármi** (SR, ČR, NL). Práve takú formu majú často firmy v neskorších kolách, takže sa to týka hlavne PE a veľkých súkromných investorov.
3. **Registre skutočných vlastníkov ako zdroj A takmer zanikli.** Po roku 2022 je v EÚ verejný prakticky iba v niekoľkých štátoch (FSI 2026 uvádza okrem GB ešte EE, DK, SI, LV a IS). Bod 1 bol podľa toho opravený (pozri 3.9).
4. **Typ investora (VC, PE) je na úrovni A dostupný iba z amerických podaní SEC a z označenia EuVECA.** Inde sa typ odvodzuje z investícií.

### 3.7 Súhrn

| Typ | Populácia (P) | Nájditeľné v zoznamoch A (N, dolná hranica) | Očakávaná spoľahlivosť | Hlavné obmedzenie |
|---|---|---|---|---|
| VC | svet: nenájdené. Európa: 1 249 aktívnych firiem v roku 2025. | USA 2 271 až 3 273 správcov; EÚ 447 správcov EuVECA; SR 28 + 10 správcov bez určenia typu | USA: typ A, aktivita B. SR/ČR: typ odvodený, aktivita A pri s.r.o. | v EÚ chýba typ v registroch; v USA platformy na jednorazové vehikly (SPV) |
| PE | svet: nenájdené mimo agregátorov. Európa: 541 buyout a 678 growth firiem aktívnych v roku 2025. | USA najviac 4 603 správcov (širšia definícia); EHP 3 133 správcov AIF bez stratégie | USA: typ A (širší). EÚ: typ z transakcií. Aktivita A pri koncentráciách. | úrady nerozlišujú PE medzi kupujúcimi; slepé miesto pri a.s. |
| Family office | svet [D]: 8 030 SFO. USA: menej ako 1 000 až 5 000. Hongkong: 3 384. | Singapur viac ako 2 000 (bez mien); inde 0 | nízka až stredná | nikde nie je zoznam mien; väzbu na rodinu je v EÚ ťažké doložiť |
| Angel | USA 445 535; Európa 47 600 v sieťach; EÚ27 170–240 tisíc (2010) | 0 s menami; UK 33 220 daňových žiadateľov bez mien | SR/ČR: stredná (s.r.o.); UK: identita slabšia; USA: nízka | dá sa iba odvodiť z registrov spoločníkov |
| Veľký súkromný investor | horná hranica: svet 250 až 714 tisíc (> 30 mil. USD); SR 65 v rebríčku | 0 | nízka | podiel aktívnych investorov nenájdený; slepé miesto pri a.s. |

### 3.8 Ako dopočítať to, čo chýba

- **Podiel záznamov podľa dôvery pre každý typ a krajinu** sa nedá odhadnúť zo zdrojov. Navrhujem ho zmerať:
  1. **Pilot SR VC (bod 4)** dá prvé namerané čísla: podiel podľa dôvery, M1–M6 a čas na záznam.
  2. **Kalibračné vzorky** po pilote, vždy na jednej kombinácii typ × krajina s dobrým zdrojom kandidátov. Sú **naplánované, nie vykonané** (rozhodnutie R13). Plán je v 4.8.
- **Populácia, kde chýba štátny zoznam** (angeli, FO, súkromní investori): odhad metódou capture-recapture z dvoch nezávislých zdrojov kandidátov (2.6, M5). Pilot overí, či je to prakticky možné.
- **Krajiny mimo USA, EÚ a UK:** druhé kolo rešerše (TODO v 3.0).

### 3.9 Opravy bodov 1 a 2 na základe rešerše

- **RPVS** pokrýva iba partnerov verejného sektora nad zákonnými prahmi (100 000 € jednorazovo alebo 250 000 € spolu; [zákon 315/2016 § 2](https://static.slov-lex.sk/static/SK/ZZ/2016/315/20191101.html)). V bodoch 1 a 2 bol uvádzaný ako všeobecný zdroj skutočných vlastníkov, čo je opravené.
- **Údaje o konečných užívateľoch výhod v ORSR a RPO** nie sú od 17. 8. 2026 verejné. **ČR** uzavrela evidenciu skutočných majiteľov 17. 12. 2025. **FR** obmedzila prístup 31. 7. 2024. **NL** má viacstupňový prístup. Brána family office „väzba na rodinu (A)“ sa preto v EÚ dokladá cez spoločníkov s.r.o., nie cez registre skutočných vlastníkov.
- **Register ESMA** nemá pole stratégie. To je potvrdené a v profile PE opravené.
- **Nový zákon o obchodnom registri** č. 29/2026 Z. z. nahradil zákon 530/2003 od 17. 8. 2026. Rozsah zápisu spoločníkov sa nezmenil.
- **Prevádzkové pravidlo** (doplnené do 0.2): pri dopytoch na zdroje, ktoré vyžadujú kontaktný údaj (napr. hlavička User-Agent pre SEC), sa používa iba vyhradená adresa projektu, nikdy osobný e-mail.

### 3.10 Rozhodnutia k bodu 3

| Č. | Téma | Rozhodnutie |
|---|---|---|
| R12 | pokrytie sveta | úroveň 1: EÚ, USA, UK. Úroveň 2: Izrael, Singapur, Hongkong, Japonsko, India, Čína a ďalšie. |
| R13 | kalibračné vzorky | naplánovať (4.8), nevykonať |
| R14 | holdout pilotu | EIF + členovia SLOVCA, iba subjekty registrované v SR. Ide o dva nezávislé zoznamy. Obidva sa Scoutovi odoberú, inak by bol test bezcenný. Stránka SIH sa načítala v prehliadači; kópia je v [raw/sih_homepage_2026-10-09.txt](raw/sih_homepage_2026-10-09.txt) a Scout ju použije. |
| R15 | kontakt v dopytoch | fiktívna adresa projektu (0.2) |

### 3.11 Úroveň 2

Zdroje boli otvorené 2026-10-09. Platia rovnaké pravidlá ako v 3.0. Označenie **[T]** znamená vlastný súčet riadkov z oficiálneho súboru (nie publikované číslo). **[D]** znamená agregátor.

**Registre: čo zverejňujú**

| Krajina | Spoločníci súkromnej firmy | Skutoční vlastníci | Hromadný prístup a cena | Register správcov so stratégiou | Zdroj |
|---|---|---|---|---|---|
| Singapur | **áno, platené:** Business Profile za 5,50 SGD na firmu | neverejné | platené API (EIQ, FIQ), cena nezverejnená | nie (licencie MAS bez stratégie) | [ACRA](https://www.acra.gov.sg/resources/buying-business-information/basic-risk-assessment/), [ACRA API](https://www.acra.gov.sg/about-bizfile/api-marketplace) |
| Hongkong | **áno, platené:** výročné hlásenie NAR1 za 16–23 HKD | neverejné (iba orgány činné v trestnom konaní) | otvorené dáta bez spoločníkov | nie (licencia Type 9 bez stratégie; SFC: niektoré PE firmy licenciu nemajú) | [CR – výročné hlásenie](https://www.cr.gov.hk/en/compliance/annual-return/private-company.htm), [CR – poplatky](https://www.cr.gov.hk/en/services/fees.htm), [CR – SCR](https://www.cr.gov.hk/en/scr/faq.htm) |
| Izrael | **áno, platené:** výpis za 12 ILS (online aj API). Že obsahuje spoločníkov, uvádza iba advokátska kancelária. | nenájdené | zoznam firiem je zadarmo, bez spoločníkov. Automatizovaný prístup na gov.il je blokovaný. | nenájdené | [gov.il – výpis](https://www.gov.il/he/service/company_extract), [sadzobník 2025](https://www.gov.il/BlobFolder/reports/companies-fee-rates-2020/he/companies-fee-rates-2025.pdf) |
| Japonsko | **neoverené** | neverejné | poplatok 330 JPY za položku | **áno:** FSA, 4 589 ohlasovateľov fondov; v zozname fondov asi 2 220 „venture fund“ a asi 713 „buyout fund“ **[T]** | [touki.or.jp](https://www.touki.or.jp/news/12858), [FSA](https://www.fsa.go.jp/menkyo/menkyoj/tokurei.html) |
| India | **áno, zo zákona** (výročné hlásenie obsahuje členov). Portál MCA blokuje automatizovaný prístup. Cena 100 INR je iba zo sekundárneho zdroja. | neoverené | neoverené | **čiastočne:** SEBI, 2 038 AIF; podľa čísla registrácie kat. I 384, kat. II 1 149 **[T]**. Kategórie nie sú totožné s VC a PE. | [SEBI register AIF](https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=16), [SEBI štatistika](https://www.sebi.gov.in/statistics/1392982252002.html) |
| Čína | **áno, zo zákona** (upísaný a splatený vklad, zákon o obchodných spoločnostiach, čl. 40). Register GSXT blokuje automatizovaný prístup. | neverejné | oficiálny hromadný prístup nenájdený | **áno:** AMAC, 11 087 správcov PE a VC (VC a PE spolu, nerozlíšené) | [zákon o obchodných spoločnostiach](https://www.gov.cn/yaowen/liebiao/202312/content_6923395.htm), [AMAC 8/2026](https://www.amac.org.cn/sjtj/tjbg/smjj/202609/P020260924626051449295.pdf) |
| Austrália | **áno, platené, čiastočne:** proprietary firmy hlásia iba 20 najväčších spoločníkov | nenájdené | platené výpisy | **áno:** asi 150 ESVCLP a asi 128 VCLP **[T]** (fondy, nie správcovia) | [zoznam ESVCLP](https://business.gov.au/grants-and-programs/early-stage-venture-capital-limited-partnerships/list-of-early-stage-venture-capital-limited-partnerships) |
| Brazília | **áno, zadarmo, hromadne,** ale bez výšky podielu | nenájdené | mesačné hromadné súbory zadarmo | čiastočne: CVM, 2 185 aktívnych fondov FIP, 425 správcov **[T]**. Veľa FIP sú holdingové vehikly. | [CNPJ metadáta](https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf), [CVM](https://dados.cvm.gov.br/dados/FI/CAD/DADOS/) |
| Kórea, Kanada, SAE | neoverené | Kanada: federálne čiastočne verejné od 22. 1. 2024 | Kanada: hromadné CSV zadarmo; Kórea: OpenDART | Kórea: 246 registrovaných VC firiem (2023) | [e-나라지표](https://www.index.go.kr/unify/idx-info.do?idxCd=1196) |

**Počty investorov**

| Typ | Krajina | Číslo | Čo sa počíta | Trieda | Zdroj |
|---|---|---|---|---|---|
| VC + PE | Čína | 11 087 správcov; 30 840 VC a 29 608 PE fondov | správcovia a fondy registrovaní v AMAC, 8/2026 | oficiálne | [AMAC](https://www.amac.org.cn/sjtj/tjbg/smjj/202609/P020260924626051449295.pdf) |
| VC + PE | India | 2 038 AIF; 103 angel fondov (3/2025) | fondy, nie správcovia | oficiálne | [SEBI register](https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=16), [SEBI 7/2025](https://www.sebi.gov.in/sebi_data/meetingfiles/jul-2025/1751371728036_1.pdf) |
| všetky stratégie | Singapur | 1 320 | licencovaní správcovia fondov, 12/2025 | oficiálne | [MAS 2025](https://www.mas.gov.sg/-/media/mas-media-library/publications/singapore-asset-management-survey/asset-management-survey-report-2025.pdf) |
| všetky stratégie | Hongkong | 2 358 firiem s licenciou Type 9; 1 912 fondov v registri LPF (8/2026) | licencie a fondy | oficiálne | [SFC 2025](https://www.sfc.hk/-/media/EN/files/COM/Reports-and-surveys/AWMAS-report-English.pdf), [register LPF](https://www.cr.gov.hk/en/legislation/lpf/statistics/Remained.htm) |
| VC | Japonsko | 176 VC + 139 CVC | členovia JVCA, 4/2026 | združenie | [JVCA pre FSA](https://www.fsa.go.jp/singi/vc/siryou/20260618/03.pdf) |
| VC | Izrael | 226 | aktívne správcovské spoločnosti VC (2023) | **[D]** (IVC) | [Israel Innovation Authority](https://innovationisrael.org.il/en/press_release/2023-ivc-investor-report/) |
| VC / PE | Kanada | 534 VC, 288 PE (súčet za provincie) | firmy so sídlom v Kanade v databáze CVCA | združenie | [CVCA](https://www.cvca.ca/membership/) |
| Family office | Singapur | viac ako 2 000 | SFO s daňovou úľavou, 12/2025 | oficiálne | [MAS, odpoveď v parlamente 2026](https://www.mas.gov.sg/news/parliamentary-replies/2026/written-reply-on-sfos) |
| Family office | Hongkong | viac ako 3 380 | SFO, odhad Deloitte pre vládu, koniec 2025 | konzultant | [InvestHK](https://www.investhk.gov.hk/en/news/hong-kongs-single-family-offices-total-surpasses-3-380-injecting-over-10-billion-annually-into-local-economy/) |
| Family office | SAE (DIFC) | viac ako 1 250 | „subjekty súvisiace s rodinami“ (širšie ako FO) | oficiálne | [Dubai Media Office](https://mediaoffice.ae/en/news/2026/january/05-01/difc-reaffirms-commitment-to-families) |
| Angel | Japonsko | 11 929 | daňové potvrdenia pre individuálnych investorov, FY2021. Rovnaká osoba môže mať viac potvrdení. | oficiálne | [METI](https://www.chusho.meti.go.jp/keiei/chiiki/angel/record/record.pdf) |
| Angel | Kórea | 233 (2/2025) | zákonom uznaní profesionálni individuálni investori | oficiálne cez médiá | [Unicorn Factory](https://www.unicornfactory.co.kr/article/2025020615151094738) |
| Angel | India | 3 820 (7/2026) | akreditovaní investori (oprávnenie, nie dôkaz investovania) | oficiálne cez médiá | [Cafemutual](https://cafemutual.com/news/cafe-alt/38523-sebi-proposes-allowing-fund-managers-to-grant-accredited-investor-status) |
| Veľký súkromný investor (horná hranica) | CN, IN, JP, AU, CA, SG, HK, BR, IL, AE | 121 000; 19 800; 18 900; 16 400; 12 900; 7 100; 6 700; 5 800; 5 400; 4 800 | ľudia s čistým majetkom nad 30 mil. USD, 2026 (Knight Frank, zaokrúhlené) | konzultant, sekundárne | [Caproasia](https://www.caproasia.com/?p=71763) |

**Dôsledky pre úroveň 2**

1. **Typ správcu je v registroch častejšie než v EÚ.** Čína (AMAC, PE a VC spolu), Japonsko (typ fondu v zozname FSA), Austrália (ESVCLP a VCLP) a čiastočne India (kategórie AIF) ho uvádzajú.
2. **Spoločníci sú verejní vo viacerých krajinách, ale takmer všade za poplatok za každú firmu** (SG, HK, IL, IN, AU). Zadarmo a hromadne iba v Brazílii, a to bez výšky podielu. Náklady na dôkaz úrovne A tu rastú s počtom firiem, nie s počtom investorov. To je dôležitý vstup pre bod 5.
3. **Viaceré registre blokujú automatizovaný prístup** (gov.il, MCA India, GSXT Čína). V bode 5 to znamená položky na právne posúdenie a technickú prácu pre každý register zvlášť, alebo ručný zber.
4. **Registre skutočných vlastníkov nie sú verejné nikde v úrovni 2.** Výnimkou je čiastočne Kanada (federálne firmy).
5. **Neoverené zostáva:** spoločníci v Japonsku, Kórei a Kanade, celá SAE a oficiálne stránky Indie (blokované).

## 4. Pilot: VC fondy registrované v SR

Zadanie behu je v [prompts/pilot-prompt.md](prompts/pilot-prompt.md). Tento bod popisuje, **na čo pilot slúži, čo meria a ako sa jeho výsledky použijú** v bode 5.

### 4.1 Na aké otázky pilot odpovedá

| Otázka | Metrika | Použije sa v |
|---|---|---|
| Koľko tvrdení, ktoré prešli overovateľom, je naozaj správnych? | M1 | odhad chybovosti databázy |
| Koľko zaradených investorov je skutočne aktívnych VC? | M2, M3 | spoľahlivosť (bod 3, vrstva S) |
| Koľko skutočných investorov sme omylom vyradili? | M4 | spoľahlivosť |
| Koľko investorov nám uniklo? | M5 (holdout, capture-recapture) | úplnosť, odhad populácie |
| Koľko stojí jeden záznam (čas a výpočtové náklady)? | M6, M7 | **model nákladov (bod 5)** |
| Funguje prevod veľkosti firmy na zrelosť (2.3)? | kalibrácia zrelosti | pravidlá G5 |
| Ako často vzniká typ `typ_nerozhodnuty` a pri akých dvojiciach? | počty v `run_summary.md` | rozsah ručnej práce v bode 5 |

**M7 – výpočtové náklady (nové):** pri každom kandidátovi a každej role agenta sa zapisuje počet otvorených stránok, počet volaní nástrojov a ak sú dostupné, aj spotrebované tokeny. Bez tohto údaja by bod 5 musel náklady na výpočet odhadovať, čo pravidlá zakazujú. Pilotný prompt je o tento log doplnený.

### 4.2 Prečo práve VC v SR

- Je to kombinácia s **najlepšou dostupnosťou dôkazov A** zo všetkých skúmaných (3.6): ORSR zverejňuje spoločníkov s.r.o. aj s vkladom, RÚZ zverejňuje závierky zadarmo s API a RPO má otvorené API. Pilot teda meria **horný strop** toho, čo sa dá dosiahnuť. Iné krajiny a typy dopadnú horšie.
- Populácia je malá, takže ju možno skontrolovať celú (4.5).
- Slepé miesto, na ktoré treba myslieť: VC investície do a.s. s viacerými akcionármi v ORSR nevidno. Tie zostanú na úrovni B.

### 4.3 Zdroje kandidátov a holdout

| Zdroj | Rola | Veľkosť | Zdroj čísla |
|---|---|---|---|
| Register NBS: registrovaní správcovia AIF + správcovské spoločnosti | Scout | 28 + 10 (bez rozlíšenia stratégie) | export z 2026-10-08, [subjekty.nbs.sk](https://subjekty.nbs.sk) |
| Register ESMA: správcovia AIF so sídlom v SR | Scout | 9 aktívnych | [register ESMA](https://registers.esma.europa.eu/solr/esma_registers_upreg/select?q=ae_entityTypeCode:aif%20AND%20ae_status:Active&rows=0&wt=json), 2026-10-09 |
| Register ESMA: EuVECA v SR | Scout | 2 správcovia, 4 fondy | register ESMA, 2026-10-09 |
| SIH: správcovia fondov s kapitálom SIH | Scout | 9 správcov, z toho 4 v oblasti rastu podnikov | [raw/sih_homepage_2026-10-09.txt](raw/sih_homepage_2026-10-09.txt) |
| RPO (hľadanie podľa názvu), články o investičných kolách, reporty SAIA | Scout | neznáme vopred | — |
| **EIF**: fondy v portfóliu, iba subjekty registrované v SR | **holdout** | zistí sa v kroku 1 pilotu | — |
| **SLOVCA**: riadni členovia, iba subjekty registrované v SR | **holdout** | 12 členov pred filtrom (PE, VC aj štátne fondy) | [SLOVCA](https://www.slovca.sk/sk/clenstvo/riadni-clenovia.html) |

- Holdout tvoria dva nezávislé zoznamy, aby sa dala odhadnúť aj celková populácia (capture-recapture, M5). Scout ich nevidí. Výskumník ich smie použiť ako dôkaz iba pri kandidátoch, ktorých už našiel Scout (R14).
- Celkový počet kandidátov vopred neodhadujeme. Zistí sa po kroku 2 pilotu.

### 4.4 Priebeh a kontrolné body

Človek do behu vstupuje až po jeho úplnom dokončení (R17). Priebežné kontrolné body sú automatické:

1. **Holdout:** zostaví sa a zapíše do logu. Beh pokračuje bez schválenia.
2. **Skúšobný beh na 5 kandidátoch:** spracujú sa celí, od Registrátora po Klasifikátora. Potom prebehne automatická kontrola dohľadateľnosti (4.10, kritérium KU0). Ak neprejde na 100 %, beh sa zastaví s popisom chyby. Ak prejde, pokračuje sa so všetkými kandidátmi.
3. **Dokončenie:** po spracovaní všetkých kandidátov, opätovnej kontrole dohľadateľnosti a vygenerovaní vzorky sa beh zastaví. **Toto je jediné miesto, kde vstupuje človek.**
4. **Metriky:** po vyplnení ručnej kontroly sa vygeneruje `logs/metrics.md` s vyhodnotením kritérií 4.10.

Pilot sa zastaví mimo poradia iba vtedy, keď niektorý zdroj nie je dostupný. Najprv však musí skúsiť stránku otvoriť v prehliadači ([README.md](README.md)).

### 4.5 Ručná kontrola

- **Slepá kontrola:** kontrolór vidí iba `review_sample.csv` bez rozhodnutí agentov. Kľúč s rozhodnutiami agentov je oddelene v `review_key.csv`.
- **Veľkosť vzorky:** variant P98 ±10 p. b. s korekciou na konečnú populáciu (2.6). Pri malej populácii sa skontroluje celá.
- **Kedy:** jednorazovo, až po úplnom dokončení behu (R17).
- **Dvojitá kontrola:** 20 % vzorky skontrolujú dvaja ľudia nezávisle. Z toho sa počíta zhoda kontrolórov (Cohenova kappa). **Ak druhý človek nebude k dispozícii, zhoda sa nemeria** a v `metrics.md` sa uvedie „nemerané“. Agent nemôže byť druhým kontrolórom, lebo nie je nezávislý od systému, ktorý sa meria.
- **Čas človeka** sa zapisuje pri každom zázname (`human_minutes`). Je to vstup pre bod 5.
- **Čo očakávať od malej vzorky:** interval bude široký aj pri kontrole celej populácie. Ilustračný výpočet: ak by bolo 27 z 30 záznamov správnych, 95 % Wilsonov interval je 74–97 %. Pilot preto dá **rádovú** informáciu o presnosti, nie presné číslo.

### 4.6 Výstupy pilotu pre ďalšie body

| Výstup | Súbor | Použitie |
|---|---|---|
| metriky M1–M5 s intervalmi P90, P95 a P98 | `logs/metrics.md` | spoľahlivosť VC v SR |
| čas agentov na kandidáta, podľa statusu a role | `data/decisions.csv`, `logs/usage.csv` | bod 5 |
| výpočtové náklady na kandidáta (M7) | `logs/usage.csv` | bod 5 |
| čas človeka na kontrolovaný záznam | `data/review_sample.csv` | bod 5 |
| podiel záznamov, ktoré idú na ručnú kontrolu (`neiste`, `typ_nerozhodnuty`) | `logs/run_summary.md` | bod 5 |
| kalibrácia prevodu veľkosti firmy na zrelosť | `logs/metrics.md` | úprava pravidiel G5 |
| typy chýb agentov | `logs/agent_errors.md` | úprava promptov |

### 4.7 Riziká pilotu

| Riziko | Dopad | Opatrenie |
|---|---|---|
| Populácia je malá | široké intervaly | kontroluje sa celá populácia. Výsledok sa interpretuje ako rádový. |
| Zoznam EIF nemusí byť verejný | holdout má len jeden zoznam, capture-recapture nejde | zapíše sa do logu, M5 sa počíta iba voči SLOVCA |
| Stránky generované JavaScriptom (SIH) | falošné „nedostupné“ | povinný pokus o otvorenie v prehliadači |
| Slepé miesto pri a.s. | nižšia dôvera pri časti investícií | vykazuje sa zvlášť (koľko investícií je do a.s.) |
| Zmena prevádzkovateľa RPO (nový zákon presúva RPO pod Ministerstvo vnútra) | API môže zmeniť adresu | zapíše sa ako nedostupný zdroj, pilot sa zastaví |
| Pilot meria najlepší prípad | výsledok nadhodnocuje iné typy a krajiny | kalibračné vzorky (4.8) |

### 4.8 Kalibračné vzorky po pilote (naplánované, nevykonané – R13)

Pilot zmeria iba VC v SR. Pre ostatné typy a krajiny navrhujem po jednej malej vzorke s rovnakým postupom (brány G1–G5, overovateľ, slepá ručná kontrola, metriky M1–M7). Každá vzorka je vybraná tak, aby otestovala iné slabé miesto z bodu 3.

| Č. | Typ × krajina | Zdroj kandidátov | Čo testuje |
|---|---|---|---|
| K1 | VC × USA | SEC, správcovia s výnimkou pre VC (`2B(1)`), náhodný výber | typ na úrovni A, ale aktivita iba B (spoločníci nie sú verejní) |
| K2 | PE × USA | SEC, správcovia s aspoň 1 fondom „private equity fund“ | aký podiel zvyškovej kategórie PE je PE v našom zmysle (kontrolné podiely), a nie úverové či infraštruktúrne fondy |
| K3 | angel × UK | Companies House: fyzické osoby s podielmi aspoň v 2 mladých firmách | rozlíšenie osôb bez dátumu narodenia a pravidlá R2 a R11 |
| K4 | family office × UK | médiá a tlačové správy o investíciách, overenie cez PSC (verejný) | či sa FO dá nájsť a doložiť, keď neexistuje žiadny zoznam |
| K5 | veľký súkromný investor × SR | rebríček Forbes Slovensko (65 osôb, celý) | aký podiel bohatých ľudí naozaj investuje do cudzích firiem (3.5: nenájdené v žiadnom zdroji) |
| K6 | VC × ČR | register ČNB a dataor.justice.cz | prenositeľnosť výsledku pilotu do krajiny s podobným registrom |

- Veľkosť každej vzorky sa určí podľa tabuľky v 2.6 a podľa rozpočtu (bod 5).
- Spustenie každej kalibračnej vzorky je samostatné rozhodnutie a vyžaduje vlastný prompt odvodený z pilotu.
- **Poradie (R18):** K1–K6 sa zatiaľ nespúšťajú. Najprv pilot a bod 5. V bode 5 sa K1–K6 uvedú ako odporúčaný ďalší krok na spresnenie odhadu.

### 4.9 Rozhodnutia k bodu 4

| Č. | Téma | Rozhodnutie |
|---|---|---|
| R16 | kritériá úspechu | stanovené vopred (4.10) |
| R17 | človek v slučke | človek vstupuje až po úplnom dokončení behu. Priebežné kontroly sú automatické. |
| R18 | kalibračné vzorky | nespúšťať. Najprv pilot a bod 5, kde sa uvedú ako odporúčaný ďalší krok. |

### 4.10 Kritériá úspechu pilotu (R16)

Kritériá sú stanovené pred spustením pilotu a po ňom sa nemenia.

| Č. | Kritérium | Hranica | Metrika | Ako sa meria |
|---|---|---|---|---|
| KU0 | **Dohľadateľnosť** | **100 %** | M0 | **automaticky** (2.6). Každá hodnota v `investors.json` odkazuje na `claim_id`. Tvrdenie má verdikt `potvrdene`, URL, kópiu v `raw/` a citát, ktorý sa v kópii naozaj nachádza. Bez splnenia KU0 sa nepokračuje na ručnú kontrolu. |
| KU1 | **Presnosť záznamov** (zaradený investor je skutočný aktívny VC) | **≥ 95 %** | M2 | ručná kontrola. Falošný investor je najdrahšia chyba. |
| KU2 | **Presnosť polí** | **≥ 90 %** | M1 | ručná kontrola tvrdení. Údaje môžu byť staré alebo nejednoznačné. |
| KU3 | **Pokrytie podľa holdoutu** | **≥ 80 %** | M5 | automaticky po behu (zhoda IČO s holdoutom, iba subjekty v rozsahu) |
| KU4 | **Chybné vyradenia** | **≤ 10 %** | M4 | ručná kontrola vyradených |
| KU5 | **Podiel neistých** | **≤ 25 %**, cieľ pod 10 % | M8 | automaticky: (`neiste` + `typ_nerozhodnuty`) / kandidáti, ktorí prešli G3. Ide o podiel záznamov, ktoré systém nevie rozhodnúť sám. |

Presnosť typu (M3) nemá stanovenú hranicu. Vykazuje sa, ale nehodnotí.

**Ako sa kritérium vyhodnotí**

Pri každom kritériu sa porovná hranica s intervalom spoľahlivosti (P90, P95, P98), nie iba s bodovým odhadom:

| Verdikt | Podmienka (pre „≥“; pri „≤“ obrátene) |
|---|---|
| **splnené** | aj dolná hranica intervalu je nad hranicou kritéria |
| **nesplnené** | aj horná hranica intervalu je pod hranicou kritéria |
| **nerozhodnuteľné** | hranica kritéria leží v intervale. Vzorka je na rozhodnutie príliš malá. |

Verdikt sa uvádza pre všetky tri úrovne (P90, P95, P98). Automatické kritériá KU0, KU3 a KU5 sa počítajú z celej populácie, takže ich verdikt je priamy.

**Dôležité obmedzenie pre KU1.** Aj keď budú všetky skontrolované záznamy správne, dolná hranica Wilsonovho intervalu dosiahne 95 % až pri n ≥ z² · 0,95 / 0,05 kontrolovaných záznamoch. To je:

| Úroveň | Potrebné n (všetky správne) |
|---|---|
| P90 | 52 |
| P95 | 73 |
| P98 | 103 |

Ak bude zaradených VC v SR menej, pilot **nedokáže KU1 štatisticky potvrdiť**, iba ho vyvrátiť (verdikt „nesplnené“). Výsledok „nerozhodnuteľné“ v takom prípade neznamená zlyhanie. Znamená, že na potvrdenie treba väčšiu populáciu, napríklad kalibračnú vzorku K6 (VC v ČR) alebo K1 (VC v USA).

## 5. Model nákladov na celý svet

Model stojí na **meraniach z pilotu VC v SR** (bod 4, [logs/run_summary.md](logs/run_summary.md), [logs/usage.csv](logs/usage.csv)), na **cenníku modelov** a na **poplatkoch registrov** z bodu 3. Tam, kde chýba zdroj alebo meranie, je položka **parameter** a nie odhad.

> **Stav:** ručná kontrola pilotu ešte neprebehla. Čas človeka na záznam (M6) a presnosť (M1–M4) sú preto zatiaľ parametre. Po vyplnení `data/review_sample.csv` sa doplnia z `logs/metrics.md`.

### 5.1 Jednotkové náklady namerané v pilote

| Krok | Na čo | Tokeny | Čas | Ďalšie |
|---|---|---|---|---|
| Scout | celý beh SR | 275 566 (≈ 207 na kandidáta) | ~20 min | 101 volaní nástrojov, 1 334 kandidátov |
| Registrátor (skript) | kandidát | 0 | sekundy | ~2 dopyty na RPO API |
| Registrátor (agent, nejasné názvy) | kandidát | ≈ 5 900 (207 232 / 35) | – | iba pri 2,6 % kandidátov |
| Triedenie podľa NACE | kandidát | 0 | – | vyradilo 612 kandidátov |
| Rýchly skríning (T2) | kandidát | **≈ 3 160** | ~3 min na dávku 40 | do plného výskumu postúpilo 14/608 = **2,3 %** |
| Plný výskum (T1) | subjekt | **≈ 171 000** | **medián 12,5 min** | ~117 stránok, ~20 tvrdení, ~3,5 cieľovej firmy |
| Overovateľ | subjekt | **≈ 94 000** | ~2–7 min | zamietnutých 14 % tvrdení |
| Opakovaný pokus | subjekt | ~160 000 + 76 000 | – | potrebný pri 1 z 35 subjektov |

Spolu za pilot **12,0 mil. tokenov**: na zaradený záznam (15) ≈ **801 000**, na subjekt v databáze vrátane neistých (22) ≈ 546 000.

**Priepustnosť:** pri limite 20 súbežných agentov sa hlavná fáza (asi 30 plných výskumov s overením) zmestila do ~45 minút. To je rádovo **40 subjektov za hodinu**.

**Lievik pilotu:** 1 334 kandidátov → 22 subjektov v databáze (1,6 %). Hlavný „šum“ je hľadanie podľa názvu v RPO: 1 179 kandidátov, z ktorých sa do databázy nedostal ani jeden, ktorý by nemal aj iný zdroj.

### 5.2 Prepočet na peniaze

Cenník Claude Opus 5.5 (model, na ktorom bežali agenti): vstup **4 $**, výstup **20 $**, čítanie z cache **0,20 $** za milión tokenov. Batch API dáva zľavu 50 %, ale agentové slučky sa ňou bežne nedajú spracovať ([cenník Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), otvorené 2026-10-10).

Pilot zaznamenal iba **súčet tokenov**, bez rozdelenia na vstup, výstup a cache. Cena preto má pásmo:

| Položka | Tokeny | Dolná hranica (všetko ako cache, 0,20 $/M) | Referencia (všetko ako vstup, 4 $/M) | Horná hranica (všetko ako výstup, 20 $/M) |
|---|---|---|---|---|
| celý pilot | 12,0 M | 2,4 $ | 48 $ | 240 $ |
| zaradený záznam | 0,80 M | 0,16 $ | 3,2 $ | 16 $ |
| plný výskum + overenie jedného subjektu | 0,27 M | 0,05 $ | 1,1 $ | 5,3 $ |

**TODO:** v ďalšom behu zapisovať tokeny rozdelené na vstup, výstup a cache. Pásmo sa tým zúži na jedno číslo.

### 5.3 Vzorec pre celý svet

Pre každú vrstvu *s* = typ × krajina:

**Náklady_s = výpočet_s + registre_s + človek_s + fixné_s**

| Zložka | Vzorec | Zdroj parametrov |
|---|---|---|
| výpočet | (K_s · (t_reg + p_T2,s · t_skr) + K_s · (p_T1,s + p_T2,s · p_post,s) · (t_vysk + t_over)) · cena tokenu | t_* z 5.1; K_s, p_* zo zdroja kandidátov v danej vrstve |
| registre | počet plne skúmaných · (1 + 3,5) výpisov · cena výpisu_s | 3,5 cieľovej firmy na subjekt z pilotu; cena výpisu z 3.11 (napr. SG 5,50 SGD, HK 16–23 HKD, IL 12 ILS, NL 0,02 € + 6,40 €/mes.); SR, ČR, UK, USA (EDGAR) zadarmo |
| človek | n_vzorka,s · h_min · sadzba + (neistí_s) · h_min · sadzba | n_vzorka z tabuľky 2.6 podľa zvolenej úrovne (P90/P95/P98, ±5/±10); **h_min = parameter z M6**; **sadzba = parameter** |
| fixné | právne posúdenie (GDPR pri fyzických osobách, podmienky registrov) + technická integrácia registra, ktorý blokuje automatizáciu (gov.il, MCA India, GSXT Čína) | **parameter**, zdroj nemáme |

### 5.4 Príklady pre vrstvy s počtom zo zdroja

Výpočtová zložka pre kandidátov zo štátnych zoznamov (počty N z bodov 3.1, 3.2 a 3.11). Dve krajné stratégie: **všetci do plného výskumu** (horná hranica) a **skríning a do plného výskumu iba 2,3 %** (pomer z pilotu, kde však kandidáti pochádzali z hľadania podľa názvu; pri regulačných zoznamoch bude podiel postupujúcich vyšší, to zmerajú K1–K6).

| Vrstva | N | Plný výskum všetkých: tokeny / USD (0,20 – 4 – 20 $/M) | Skríning + 2,3 %: tokeny / USD (referencia) |
|---|---|---|---|
| VC USA (SEC) | 3 273 | 868 M / 174 – 3 472 – 17 358 | 30 M / 121 |
| PE USA (SEC) | 4 603 | 1 221 M / 244 – 4 882 – 24 411 | 43 M / 170 |
| VC EÚ (EuVECA) | 447 | 119 M / 24 – 474 – 2 371 | 4 M / 17 |
| VC + PE Čína (AMAC) | 11 087 | 2 940 M / 588 – 11 759 – 58 797 | 103 M / 411 |
| VC + PE Japonsko (FSA) | 4 589 | 1 217 M / 243 – 4 867 – 24 337 | 42 M / 170 |
| správcovia Singapur (MAS) | 1 320 | 350 M / 70 – 1 400 – 7 000 | 12 M / 49 |
| správcovia Hongkong (SFC) | 2 358 | 625 M / 125 – 2 501 – 12 505 | 22 M / 87 |
| VC Kórea | 246 | 65 M / 13 – 261 – 1 305 | 2 M / 9 |

Registrová zložka pri plnom výskume všetkých kandidátov, výpočet: Singapur 1 320 · 4,5 · 5,50 SGD = **32 670 SGD**; Hongkong 2 358 · 4,5 · 16–23 HKD = **169 776 – 244 053 HKD**. Pri SR, ČR, UK a SEC je registrová zložka nulová.

**Angeli, family offices, veľkí súkromní investori:** žiadny štátny zoznam kandidátov neexistuje (3.3–3.5). Bez kalibračných vzoriek (K3–K5) nevieme K_s ani p_post, a teda **náklady pre tieto typy zatiaľ nevieme vyčísliť**.

### 5.5 Čo z modelu vyplýva

1. **Výpočet je lacný v porovnaní s ostatnými zložkami.** Aj horná hranica pre najväčšiu vrstvu (Čína, 11 087 správcov, všetci do plného výskumu) je rádovo desiatky tisíc USD. Pri referenčnej cene ide o tisíce až nízke desaťtisíce USD na vrstvu.
2. **Náklady budú určovať človek a fixné položky.** Ručná kontrola pri úrovni P95 ±10 p. b. znamená 97 záznamov na vrstvu. Pri 5 typoch a ~40 krajinách úrovní 1 a 2 je to až 200 vrstiev, teda **až 19 400 kontrolovaných záznamov**. Ich cena = 19 400 · h_min · sadzba. Kým nepoznáme h_min z ručnej kontroly pilotu, túto zložku nevieme vyčísliť.
3. **Registre za poplatok** (SG, HK, IL, IN, AU) sú lineárne v počte portfóliových firiem, nie investorov. Pri plnom výskume sú pri veľkých vrstvách rádovo desaťtisíce v miestnej mene.
4. **Najlacnejšie zníženie nákladov:** spätné vyhľadávanie v ORSR (investor → firmy), ktoré pilot objavil až počas behu. Nahrádza drahé hľadanie investícií cez web. Pri SR subjektoch by malo byť prvým krokom Výskumníka.
5. **Najväčšie riziko kvality nie je cena, ale chyby, ktoré automatika nezachytí** (vymyslený citát zo skenu, zámena subjektu). Ručná kontrola sa preto nedá vynechať, aby sa ušetrilo.

### 5.6 Odporúčaný ďalší krok: kalibračné vzorky K1–K6 (R18)

Model má 4 parametre, ktoré pilot nezmeral a ktoré určujú väčšinu nákladov:

| Parameter | Prečo chýba | Kalibračná vzorka |
|---|---|---|
| p_post a lievik pri regulačných zoznamoch | pilot mal kandidátov z hľadania podľa názvu | K1 (VC USA), K2 (PE USA), K6 (VC ČR) |
| K_s a lievik pri typoch bez zoznamu | žiadny štátny zoznam | K3 (angel UK), K4 (FO UK), K5 (súkromný investor SR) |
| h_min (čas človeka na záznam) | ručná kontrola pilotu ešte neprebehla | ručná kontrola pilotu + K1–K6 |
| rozdelenie tokenov (vstup / výstup / cache) | pilot ho nezaznamenal | každý ďalší beh |

### 5.7 Otvorené otázky k bodu 5

- **Q19 Sadzba kontrolóra:** akú hodinovú sadzbu použiť pre ručnú kontrolu? Bez nej sa ľudská zložka dá vyjadriť iba v hodinách.
- **Q20 Úroveň presnosti pre rozpočet:** ktorý variant z tabuľky 2.6 (P90/P95/P98, ±5/±10 p. b.) má byť základ rozpočtu?
- **Q21 Model pre lacné kroky:** pilot bežal celý na Claude Opus 5.5. Má model počítať aj variant s lacnejším modelom pre skríning a Registrátora? Ak áno, treba to zmerať, nie predpokladať.

---

## Príloha: zdroje použité v bodoch 1 a 2

Stav overenia k 2026-10-09. „Otvorené“ = stránku som v tomto kroku reálne otvoril alebo prečítal jej obsah. „Overiť“ = uvedené z pamäti, pred použitím v bode 3 sa musí otvoriť (pravidlo z pilotu: nedostupná URL = údaj neexistuje).

| Zdroj | URL | Stav |
|---|---|---|
| SEC Form ADV Part 1A, Schedule D 7.B.(1), otázka 10 (typy fondov vrátane „private equity fund“ a „venture capital fund“) a otázka 11 („Current gross asset value of the private fund“) | https://www.sec.gov/about/forms/formadv-part1a.pdf | otvorené |
| ESMA Databases and Registers (Investment Fund Managers, EuVECA, EuSEF, ELTIF) | https://www.esma.europa.eu/databases-and-registers | otvorené |
| Register ESMA EuVECA | https://registers.esma.europa.eu/publication/searchRegister?core=esma_registers_funds | odkaz z otvorenej stránky ESMA |
| Register ESMA Investment Fund Managers | https://registers.esma.europa.eu/publication/searchRegister?core=esma_registers_upreg | odkaz z otvorenej stránky ESMA |
| SEC Family Office Rule, adopting release IA-3220 | https://www.sec.gov/rules/final/2011/ia-3220.pdf | nájdené vyhľadávaním, overiť |
| SEC Rule 203(l)-1 (definícia VC fondu) | https://www.ecfr.gov/current/title-17/chapter-II/part-275/section-275.203(l)-1 | overiť |
| Nariadenie (EÚ) č. 345/2013 o EuVECA | https://eur-lex.europa.eu/eli/reg/2013/345/oj | overiť |
| Odporúčanie Komisie 2003/361/ES, príloha čl. 2 (hranice pre mikro, malé a stredné podniky). Text som prečítal v doslovnej citácii na gov.uk (HMRC manual CIRD92800). Stránka EUR-Lex sa nenačítala. | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32003H0361 · https://www.gov.uk/hmrc-internal-manuals/corporate-intangibles-research-and-development-manual/cird92800 | otvorené (gov.uk). EUR-Lex treba overiť. Overiť aj to, či je odporúčanie stále platné. |
| SEC Form D Data Sets (pre bod 3) | https://www.sec.gov/data-research/sec-markets-data/form-d-data-sets | nájdené vyhľadávaním, overiť |
| Companies House: confirmation statement a údaje o akcionároch | https://www.gov.uk/guidance/filing-your-companys-confirmation-statement | nájdené vyhľadávaním, overiť |
| ORSR | https://www.orsr.sk | overiť |
| RPO | https://rpo.statistics.sk | overiť |
| Register účtovných závierok | https://www.registeruz.sk | overiť |
| RPVS (iba partneri verejného sektora, zákon 315/2016 § 2) | https://rpvs.gov.sk · https://static.slov-lex.sk/static/SK/ZZ/2016/315/20191101.html | otvorené (rešerš k bodu 3) |
| Register subjektov NBS | https://subjekty.nbs.sk | overiť |
| EBAN (definícia business angela) | https://www.eban.org | overiť, zatiaľ iba sekundárny zdroj |
| Klub podnikateľských anjelov Slovenska | URL nenájdená, overiť | overiť |
