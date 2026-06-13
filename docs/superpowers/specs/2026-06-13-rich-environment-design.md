# Spec: bogate środowisko — teren autotiling, budynki, dekoracje, większa mapa

Data: 2026-06-13
Status: design w trakcie zatwierdzania (brainstorming). Feasibility-research (workflow `rich-terrain-feasibility`) w toku — brief zostanie wpięty do sekcji „Architektura/Render" i „Plan generacji" przed przeglądem użytkownika.

## Cel

Podnieść świat gry z prymitywnych placeholderów (szachownica + budynki-bloki) do **bogatego, generowanego środowiska**: autotilowany teren wielobiomowy, generowane budynki i rozsiane dekoracje, na **większej mapie**. Dla **obu motywów**: fantasy (top-down) i sci-fi (izometria). Spójne z Fazą 1 (bohaterowie PixelLab): wszystko to **własne assety PixelLab generowane offline**, runtime tylko je ładuje.

Kontynuacja [planu Fazy 1](../plans/2026-06-13-pixellab-assets-phase1.md) i [designu pivotu](2026-06-13-pixellab-assets-design.md).

## Zatwierdzone decyzje (brainstorming wizualny)

- **Poziom: „Bogaty"** — autotiling (płynne przejścia między terenami) + dekoracje + generowane budynki + nowy moduł tilemap. (Odrzucono: „obecny" i „umiarkowany 1:1".)
- **Rozmiar mapy fantasy: 40 × 26** (z 26×17, ~2,3× powierzchni). Sci-fi: siatka powiększona proporcjonalnie (dokładny rozmiar dobrany pod izo w planie sci-fi).
- **Paleta fantasy — 4 tereny + 4 dekoracje:**
  - Tereny: `grass` (baza) · `dirt` (ścieżka/ziemia) · `water` · `rock` (kamień).
  - Dekoracje: drzewa · głazy · krzaki · kwiaty.
- **Paleta sci-fi (kosmiczna) — 4 tereny + 4 dekoracje:**
  - Tereny: `regolith` (baza, marsjański pył) · `plating` (płyta metalowa/ścieżka) · `energy` (kanał energii, odpowiednik wody, świeci) · `crater` (skała kraterowa/ruda).
  - Dekoracje: anteny/satelity · zbiorniki · meteoryty/głazy · kryształy/ruda.
- **Układ budynków:** automatyczny re-layout 8 budynków (te same ID/etykiety) + dróg/węzłów ścieżek pod większą mapę; użytkownik weryfikuje pozycje w specu/preview.

## Zakres i dekompozycja

To środowiskowy lift dla dwóch niezależnych motywów. **Jeden spec designu (ten), dwa plany implementacyjne:**

- **Plan A — środowisko fantasy (top-down):** logiczna siatka terenu → autotiling → moduł tilemap; tileset Wang z PixelLab; 8 budynków `create_map_object`; dekoracje; powiększona mapa 40×26 + re-layout + graf ścieżek. Robimy najpierw (top-down sprawdzone w Fazie 1).
- **Plan B — środowisko sci-fi (izometria):** te same systemy w projekcji izo; `create_isometric_tile`; budynki izo; tu materializuje się ryzyko izometrii 2:1 (z designu pivotu). Robimy po A.

Architektura niżej jest **wspólna dla obu** (motyw to dane, nie osobny kod).

## Architektura

Cztery wyraźnie wydzielone jednostki, każda z jedną odpowiedzialnością:

### 1. Logiczna mapa terenu (`terrain-map.ts`, nowy)

- Per-komórka siatki: id terenu z palety motywu (np. `grass|dirt|water|rock`).
- **Generowana deterministycznie** z ziarna motywu (szum proceduralny: plamy biomów — staw wody, połać kamienia, ścieżki ziemne wzdłuż dróg), tak by była powtarzalna (brak losowości w runtime między sesjami → ten sam świat).
- Czysta funkcja `buildTerrainMap(theme) → TerrainId[][]`. Bez Pixi. Testowalna.
- **Punkt wkładu użytkownika (learning):** rozkład biomów (gdzie woda/kamień/ścieżki, jak gęsto) to decyzja projektowa kształtująca „klimat" mapy — przygotuję sygnaturę + TODO.

### 2. Autotiling (`autotile.ts`, nowy)

- Czysta funkcja: logiczna siatka terenu → który **kafel przejścia** narysować w każdej komórce.
- Metoda **4-narożnikowa (Wang/„blob")**: dla każdej komórki bierzemy 4 narożniki (które tereny się stykają) → indeks kafla w tilesetcie przejść. Baza (`grass`/`regolith`) + nakładka (`dirt`/`water`/`rock`) na tileset-parę.
- Bez Pixi, bez assetów — operuje na indeksach. Testowalna na małej siatce.

### 3. Moduł renderowania tilemapy (`tilemap.ts`, nowy)

- Wejście: logiczna siatka + autotiling + załadowane tilesety → rysuje teren do warstwy Pixi.
- **Prymityw renderujący: do potwierdzenia feasibility-researchem** — rekomendacja: `@pixi/tilemap` (CompositeTilemap) jeśli zgodny z Pixi v8; fallback: siatka `Sprite`/`Mesh`. Architektura (1)+(2) jest niezależna od wyboru prymitywu.
- Zastępuje `drawTerrain` (poly-fill szachownica) w `view.ts`. Wyraźnie wydzielony lift — własny moduł, własny test wizualny (jak zapowiadał design pivotu).
- Depth-sorting spójny z istniejącym `projection.depth` (teren pod jednostkami/budynkami).

### 4. Dekoracje (rozsiew obiektów)

- Generowane `create_map_object` (statyczne sprite'y, jak budynki).
- **Deterministyczny rozsiew** (hash z pozycji) z pominięciem komórek budynków, dróg i wody — gęstość sterowalna.
- **Punkt wkładu użytkownika (learning):** progi gęstości/reguły rozsiewu (np. drzewa kępami, kwiaty na trawie, kryształy przy rudzie).

### 5. Budynki — generowane sprite'y

- `create_map_object` (top-down dla fantasy; obiekt izo dla sci-fi), 8 ID/motyw, kotwica w stopie footprintu (jak sprite'y bohaterów: anchor strojona z pikseli).
- Zastępuje proceduralne `buildBuilding`/`buildTopdownHouse`/`buildIsoBlock` w `placeholders.ts`; **fallback** na placeholder zachowany (jak w Fazie 1) — gra działa przez cały rollout.

### Większa mapa + re-layout

- `theme.grid` fantasy → 40×26. Re-pozycjonowanie 8 budynków (rozsunięte) + regeneracja `crossroads`/`edges` grafu ścieżek pod nowy rozmiar i pozycje drzwi. Pozycje do akceptacji w preview.
- Wpływ na `projection`, `pathfind` (WaypointGraph), `view` (granice świata/kamera) — feasibility-research mapuje dokładne punkty zmian.

### Pipeline assetów (rozszerzenie)

- `assets-manifest`/packer rozszerzone o **tilesety** i **map-objects** (budynki, dekoracje) obok atlasów postaci.
- Loader: `sprites.ts` (postacie) + nowy loader kafli/obiektów (lub rozszerzenie) z `index.json` per motyw.
- **Atlasy/kafle commitowane do repo** (własne assety, jak Faza 1).

## Twardy inwariant (bez zmian)

ZERO generacji PixelLab w runtime. Generacja wyłącznie offline (`npm run assets` / sesja MCP). Runtime tylko ładuje gotowe tilesety/obiekty/atlasy. `terrain-map`/`autotile` WYBIERAJĄ/LICZĄ z gotowych assetów — nie generują.

## Plan generacji (szacunek — doprecyzuje feasibility-research)

- **Fantasy:** ~3 tilesety przejść (`grass↔dirt`, `grass↔water`, `grass↔rock`) + 8 budynków + ~4 dekoracje. 
- **Sci-fi:** analogicznie ~3 tilesety izo + 8 budynków izo + ~4 dekoracje.
- Dokładna liczba kafli/generacji i koszt kredytów — z briefu researchu (PixelLab `create_topdown_tileset`/`create_isometric_tile`/`create_map_object`). Budżet: 2000 gen/mies., Faza 1 zużyła 16 — duży zapas.

## Fazowanie

1. **Plan A (fantasy):** terrain-map + autotile (z testami) → tilemap module → generacja tilesetu fantasy + 8 budynków + dekoracje → loader → wpięcie w `view.ts` (zamiana `drawTerrain`/`buildBuilding`) → większa mapa 40×26 + re-layout + graf → walidacja w preview (render/autotiling/kotwice/ścieżki).
2. **Plan B (sci-fi):** to samo w izo; strojenie 2:1.

## Punkty wkładu użytkownika (tryb learning)

1. `buildTerrainMap(theme)` — rozkład biomów (gdzie/jak gęsto woda, kamień, ścieżki).
2. Reguły/progi rozsiewu dekoracji.
3. (z poprzednich faz, bez zmian) `toolToBuilding`, scenariusz demo, progi maszyny stanów, FX/efekt zgonu.
4. Akceptacja re-layoutu budynków na większej mapie.

## Ryzyka i otwarte kwestie techniczne (adresowane przez feasibility-research)

- **Prymityw tilemapy w Pixi v8** (@pixi/tilemap vs sprite-grid) — zgodność z v8.
- **Format tilesetu PixelLab** (ile kafli, czy Wang/narożnikowy, jak mapować na autotile) — pod to dostroić `autotile.ts` i packer.
- **Izometria 2:1** (Plan B) — kompromis 3/4, strojenie skali (z designu pivotu).
- **Wolumen generacji + koszt** — mityguje budżet + fazy + fallback.
- **Re-layout 40×26** — ręczna akceptacja pozycji budynków/dróg.
- **Wydajność** większej mapy (więcej kafli) — wybór prymitywu renderującego to adresuje.

## Niezmienione

- Serwer, protokół WS, typy `shared`, logika stanów/projekcji/waypointów (poza re-layoutem siatki), sprite'y bohaterów/peonów z Fazy 1.
