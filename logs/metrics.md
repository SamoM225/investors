# Metriky pilotu

Čas výpočtu: 2026-10-10T08:03:14.597Z
Skontrolovaných záznamov: 0 / 169; tvrdení: 0

| metrika | hodnota | n | P90 | P95 | P98 |
|---|---|---|---|---|---|
| M1 presnosť polí (tvrdení) | – | 0 | n/a | n/a | n/a |
| M2 presnosť záznamov (zaradení) | – | 0 | n/a | n/a | n/a |
| M3 presnosť typu | – | 0 | n/a | n/a | n/a |
| M4 chybné vyradenia | – | 0 | n/a | n/a | n/a |
| M5 pokrytie holdoutu – Scout | 4/4 = 100.0 % | 4 | 59.7 % – 100.0 % | 51.0 % – 100.0 % | 42.5 % – 100.0 % |
| M5 pokrytie holdoutu – výsledná databáza | 4/4 = 100.0 % | 4 | 59.7 % – 100.0 % | 51.0 % – 100.0 % | 42.5 % – 100.0 % |
| M8 podiel neistých (všetci, ktorí prešli G3) | 7/602 = 1.2 % | 602 | 0.6 % – 2.1 % | 0.6 % – 2.4 % | 0.5 % – 2.7 % |
| M8 podiel neistých (iba plne skúmaní) | 7/22 = 31.8 % | 22 | 18.3 % – 49.4 % | 16.4 % – 52.7 % | 14.4 % – 56.4 % |

M0 dohľadateľnosť: 100.00 % (logs/traceability.md)
M6 čas človeka: nevyplnené
M7 výpočtové náklady: spolu 12013677 tokenov (podrobne logs/run_summary_stats.md)
Capture-recapture (EIF × SLOVCA, v rozsahu): n1=1, n2=4, m=1, N̂ = 4.0. Zoznamy nie sú nezávislé (EIF ⊂ SLOVCA), odhad je iba ilustračný.
Zaradených v databáze: 15.
Cohenova kappa: vyžaduje dvoch kontrolórov (double_review = 1); ak druhý nie je, „nemerané“.

## Kritériá úspechu (plan.md 4.10)

| KU | kritérium | hranica | P90 | P95 | P98 |
|---|---|---|---|---|---|
| KU0 | dohľadateľnosť | 100 % | splnené | splnené | splnené |
| KU1 | presnosť záznamov (M2) | ≥ 95 % | n/a | n/a | n/a |
| KU2 | presnosť polí (M1) | ≥ 90 % | n/a | n/a | n/a |
| KU3 | pokrytie holdoutu (M5, výsledná databáza) | ≥ 80 % | nerozhodnuteľné | nerozhodnuteľné | nerozhodnuteľné |
| KU4 | chybné vyradenia (M4) | ≤ 10 % | n/a | n/a | n/a |
| KU5 | podiel neistých (M8, plne skúmaní) | ≤ 25 % | nerozhodnuteľné | nerozhodnuteľné | nerozhodnuteľné |

KU1: na štatistické potvrdenie 95 % treba aspoň P90 52, P95 73, P98 103 kontrolovaných zaradených záznamov (všetky správne). Kontrolovaných: 0.
