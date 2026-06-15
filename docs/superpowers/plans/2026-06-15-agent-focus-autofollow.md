# Focus-zoom na portrecie + autofollow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Podwójny klik portretu bohatera robi focus+zoom kamery na jednostce, a panel agenta dostaje checkbox „autofollow", który po włączeniu robi focus+zoom i śledzi bohatera, dopóki użytkownik nie przeciągnie mapy.

**Architecture:** Stan `autofollow` w zustand store (reset przy każdej zmianie zaznaczenia = opt-in per agent). `GameView` zyskuje `focusOnUnit(id)` (animate center+scale) wołane przez podwójny klik i przez włączenie checkboxa; ticker co klatkę centruje kamerę na wybranej jednostce gdy `autofollow` włączony; `drag-start` viewportu wyłącza `autofollow`. Warstwa Pixi weryfikowana wizualnie (preview), logika store unit-testem.

**Tech Stack:** React 19, zustand, PixiJS v8 + pixi-viewport, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-15-agent-focus-autofollow-design.md`
**Branch:** `feat/agent-focus-autofollow` (na bazie `main` @ v0.1.4)

---

## File Structure

| Plik | Rola | Akcja |
|---|---|---|
| `packages/client/src/store.ts` | Stan świata (zustand): `autofollow` + `setAutofollow` + reset przy `select`/`selectBuilding` | Modify |
| `packages/client/tests/store.test.ts` | Test logiki autofollow w store | Create |
| `packages/client/src/game/view.ts` | `focusOnUnit(id)`, follow w tickerze, `drag-start` → wyłącz autofollow | Modify |
| `packages/client/src/i18n.ts` | Etykieta `autofollow` (EN/PL) | Modify |
| `packages/client/src/hud/Portraits.tsx` | `onDoubleClick` → focus+zoom | Modify |
| `packages/client/src/hud/SidePanel.tsx` | Checkbox autofollow w nagłówku | Modify |

Komendy pomocnicze (uruchamiane z korzenia repo `/Users/mpawelczuk/RTS agents`):
- Test pojedynczy: `npm run test -w @agent-citadel/client -- <plik>`
- Typecheck klienta: `npx tsc --noEmit -p packages/client`
- Pełny test: `npm test`

---

## Task 1: Store — stan `autofollow` (TDD)

Dodajemy do zustand store flagę `autofollow`, setter i reset przy każdej zmianie zaznaczenia (klik innego agenta / budynku / zamknięcie panelu zerują follow — opt-in per agent).

**Files:**
- Modify: `packages/client/src/store.ts`
- Test: `packages/client/tests/store.test.ts`

- [ ] **Step 1: Napisz failing test**

Create `packages/client/tests/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorld } from '../src/store';

beforeEach(() => {
  useWorld.setState({ autofollow: false, selectedSessionId: undefined, selectedBuildingId: undefined });
});

describe('autofollow w store', () => {
  it('domyślnie wyłączony', () => {
    expect(useWorld.getState().autofollow).toBe(false);
  });

  it('setAutofollow(true) włącza', () => {
    useWorld.getState().setAutofollow(true);
    expect(useWorld.getState().autofollow).toBe(true);
  });

  it('select(id) resetuje autofollow do false i ustawia zaznaczenie', () => {
    useWorld.getState().setAutofollow(true);
    useWorld.getState().select('hero-1');
    expect(useWorld.getState().autofollow).toBe(false);
    expect(useWorld.getState().selectedSessionId).toBe('hero-1');
  });

  it('select(undefined) (zamknięcie panelu) też resetuje autofollow', () => {
    useWorld.getState().setAutofollow(true);
    useWorld.getState().select(undefined);
    expect(useWorld.getState().autofollow).toBe(false);
  });

  it('selectBuilding(id) resetuje autofollow', () => {
    useWorld.getState().setAutofollow(true);
    useWorld.getState().selectBuilding('forge');
    expect(useWorld.getState().autofollow).toBe(false);
  });
});
```

- [ ] **Step 2: Uruchom test — ma się wywalić**

Run: `npm run test -w @agent-citadel/client -- store.test.ts`
Expected: FAIL — `autofollow` i `setAutofollow` nie istnieją (TypeError / asercje czerwone).

- [ ] **Step 3: Dodaj `autofollow` do interfejsu store**

W `packages/client/src/store.ts`, w `interface WorldStore`, dodaj pole po `selectedBuildingId?: string;`:

```ts
  /** Czy kamera ma śledzić wybranego bohatera (opt-in per agent; reset przy zmianie zaznaczenia). */
  autofollow: boolean;
```

oraz w sekcji akcji, po `selectBuilding(buildingId?: string): void;`:

```ts
  setAutofollow(on: boolean): void;
```

- [ ] **Step 4: Dodaj wartość początkową i akcje**

W `packages/client/src/store.ts`, w obiekcie zwracanym przez `create<WorldStore>(...)`:

Dodaj wartość początkową po `notifications: [],`:

```ts
  autofollow: false,
```

Zamień `select` i `selectBuilding`, dokładając reset `autofollow: false`:

```ts
  // Wybór jednostki i budynku wzajemnie się wykluczają (jeden panel po prawej).
  // Zmiana zaznaczenia zeruje autofollow — to opt-in per agent, nie globalny tryb.
  select: (selectedSessionId) => set({ selectedSessionId, selectedBuildingId: undefined, autofollow: false }),
  selectBuilding: (selectedBuildingId) => set({ selectedBuildingId, selectedSessionId: undefined, autofollow: false }),
```

Dodaj akcję `setAutofollow` (np. zaraz po `selectBuilding`):

```ts
  setAutofollow: (autofollow) => set({ autofollow }),
```

- [ ] **Step 5: Uruchom test — ma przejść**

Run: `npm run test -w @agent-citadel/client -- store.test.ts`
Expected: PASS (5 testów).

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/store.ts packages/client/tests/store.test.ts
git commit -m "feat(store): stan autofollow + reset przy zmianie zaznaczenia"
```

---

## Task 2: GameView — `focusOnUnit`, follow w tickerze, drag-cancel

`focusOnUnit(id)` centruje i przybliża kamerę na jednostce (wzorzec z `resetView()` — `animate({position,scale})`). Ticker, gdy `autofollow` włączony, co klatkę trzyma kamerę na wybranej jednostce. `drag-start` viewportu wyłącza autofollow. Warstwa Pixi nie ma sensownego unit-testu (brak canvasu) — weryfikujemy typecheckiem i wizualnie.

**Files:**
- Modify: `packages/client/src/game/view.ts`

- [ ] **Step 1: Dodaj stałą `FOCUS_ZOOM_FACTOR`**

W `packages/client/src/game/view.ts`, zaraz po `const MAX_ZOOM = 5;` (linia ~41), dodaj:

```ts
/** Krotność skali „cover" przy focusie na jednostce (podwójny klik / autofollow). */
const FOCUS_ZOOM_FACTOR = 2.5;
```

- [ ] **Step 2: Dodaj metodę `focusOnUnit` po `centerOnUnit`**

W klasie `GameView`, zaraz po metodzie `centerOnUnit` (po linii ~286), dodaj:

```ts
  /** Wycentruj i przybliż kamerę na jednostce (podwójny klik portretu / włączenie autofollow). */
  focusOnUnit(id: string): void {
    const unit = this.units.get(id);
    if (!unit) return;
    const cover = this.coverScale();
    const max = Math.max(MAX_ZOOM, cover * 1.2);
    const target = Math.min(max, Math.max(cover, cover * FOCUS_ZOOM_FACTOR));
    const { x, y } = this.theme.projection.toScreen(unit.gx, unit.gy);
    this.userZoomed = true; // jak zoomBy — refit() przy resize nie cofnie zoomu focusa
    this.viewport.animate({
      position: { x: x + this.worldOffset.x, y: y + this.worldOffset.y },
      scale: target,
      time: 350,
      ease: 'easeInOutSine',
    });
  }

  /** Gdy autofollow włączony: trzymaj kamerę na wybranej jednostce (zoom bez zmian). */
  private followSelected(id: string): void {
    const unit = this.units.get(id);
    if (!unit) return;
    const { x, y } = this.theme.projection.toScreen(unit.gx, unit.gy);
    this.viewport.moveCenter(x + this.worldOffset.x, y + this.worldOffset.y);
  }
```

- [ ] **Step 3: Wepnij follow do tickera**

W `packages/client/src/game/view.ts`, w callbacku `this.app.ticker.add(...)` (linie ~244–257), tuż po pętli `for (const [id, unit] of this.units) { ... }` a przed `this.wanderIdle();`, dodaj:

```ts
      if (selected && useWorld.getState().autofollow) this.followSelected(selected);
```

(`selected` jest już zdefiniowane w tym callbacku jako `const selected = useWorld.getState().selectedSessionId;`.)

- [ ] **Step 4: Wyłącz autofollow przy przeciąganiu mapy**

W `packages/client/src/game/view.ts`, w `init()`, zaraz po istniejących liniach:

```ts
    this.viewport.on('wheel-scroll', () => (this.userZoomed = true));
    this.viewport.on('pinch-start', () => (this.userZoomed = true));
```

dodaj:

```ts
    // Ręczne przeciągnięcie mapy przejmuje sterowanie → zrywa autofollow.
    this.viewport.on('drag-start', () => useWorld.getState().setAutofollow(false));
```

- [ ] **Step 5: Typecheck klienta**

Run: `npx tsc --noEmit -p packages/client`
Expected: brak błędów (czyste wyjście). W szczególności `useWorld.getState().autofollow` i `setAutofollow` typują się dzięki Task 1.

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/game/view.ts
git commit -m "feat(view): focusOnUnit (center+zoom) + autofollow w tickerze + drag zrywa follow"
```

---

## Task 3: UI — i18n + podwójny klik portretu + checkbox w panelu

Spinamy mechanikę z UI: etykieta autofollow (EN/PL), podwójny klik portretu woła `focusOnUnit`, checkbox w nagłówku panelu agenta włącza/wyłącza autofollow i przy włączeniu robi początkowy focus.

**Files:**
- Modify: `packages/client/src/i18n.ts`
- Modify: `packages/client/src/hud/Portraits.tsx`
- Modify: `packages/client/src/hud/SidePanel.tsx`

- [ ] **Step 1: Dodaj etykietę do i18n**

W `packages/client/src/i18n.ts`, w `interface UiStrings`, po `notifJump: string;` dodaj:

```ts
  autofollow: string;
```

W obiekcie `EN`, po `notifJump: 'click to jump',` dodaj:

```ts
  autofollow: 'Follow',
```

W obiekcie `PL`, po `notifJump: 'kliknij, by skoczyć',` dodaj:

```ts
  autofollow: 'Podążaj',
```

- [ ] **Step 2: Podwójny klik portretu → focus+zoom**

W `packages/client/src/hud/Portraits.tsx`, na elemencie `<div className={...portrait...}>` dodaj `onDoubleClick` zaraz po istniejącym `onClick={...}`:

```tsx
            onDoubleClick={() => {
              select(hero.sessionId);
              getGameView()?.focusOnUnit(hero.sessionId);
            }}
```

(`select` i `getGameView` są już zaimportowane i używane w tym pliku — bez nowych importów.)

- [ ] **Step 3: Checkbox autofollow w panelu agenta**

W `packages/client/src/hud/SidePanel.tsx`:

(a) Dodaj import widoku gry — po linii `import { teamColorHex } from '../game/placeholders';` dodaj:

```ts
import { getGameView } from '../game/view';
```

(b) W komponencie `SidePanel`, obok istniejących selektorów (po `const select = useWorld((s) => s.select);`) dodaj:

```ts
  const autofollow = useWorld((s) => s.autofollow);
  const setAutofollow = useWorld((s) => s.setAutofollow);
```

(c) W nagłówku zamień sam przycisk zamknięcia:

```tsx
        <button className="ghost" onClick={() => select(undefined)}>
          ✕
        </button>
```

na grupę „checkbox + zamknij":

```tsx
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: 'none' }}>
          <button className="ghost" onClick={() => select(undefined)}>
            ✕
          </button>
          <label
            className="px"
            title={t.autofollow}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', opacity: 0.85, whiteSpace: 'nowrap' }}
          >
            <input
              type="checkbox"
              checked={autofollow}
              onChange={(e) => {
                const next = e.target.checked;
                setAutofollow(next);
                if (next && selected) getGameView()?.focusOnUnit(selected);
              }}
            />
            {t.autofollow}
          </label>
        </div>
```

- [ ] **Step 4: Typecheck klienta**

Run: `npx tsc --noEmit -p packages/client`
Expected: brak błędów. (`t.autofollow`, `s.autofollow`, `s.setAutofollow`, `getGameView().focusOnUnit` muszą się typować.)

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/i18n.ts packages/client/src/hud/Portraits.tsx packages/client/src/hud/SidePanel.tsx
git commit -m "feat(hud): podwójny klik portretu (focus+zoom) + checkbox autofollow w panelu"
```

---

## Weryfikacja końcowa

- [ ] **Pełny typecheck + testy + build**

Run: `npm test && npx tsc --noEmit -p packages/client`
Expected: wszystkie testy zielone (w tym nowe 5 z `store.test.ts`); typecheck czysty.

- [ ] **Weryfikacja wizualna (dev-serwer, tryb demo)**

Uruchom dev w trybie demo (syntetyczni bohaterowie): `npm run demo`. W przeglądarce (preview):
1. **Podwójny klik** na portret w lewym dolnym rogu → kamera płynnie centruje i przybliża na tym bohaterze.
2. Zaznacz bohatera (klik), w panelu po prawej **zaznacz checkbox „Podążaj/Follow"** → kamera robi focus+zoom i jedzie za bohaterem, gdy ten się przemieszcza.
3. **Przeciągnij mapę** myszą → checkbox sam się odznacza, kamera przestaje śledzić.
4. **Kliknij inny portret** → autofollow znika (reset per agent), panel pokazuje nowego bohatera.

Dowód: zrzut ekranu po podwójnym kliku (widoczne przybliżenie) i log konsoli bez błędów.

---

## Self-Review (wykonane przy pisaniu planu)

**Pokrycie specu:**
- Autofollow „centruj+przybliż, drag wyłącza" → Task 2 (focusOnUnit + followSelected + drag-start) i Task 3 (checkbox woła focusOnUnit przy włączeniu).
- Zoom focusa ≈ 2.5× cover, przycięty → Task 2 Step 1–2 (`FOCUS_ZOOM_FACTOR`, clamp do `[cover, max]`).
- Pojedynczy klik bez zmian, podwójny addytywny → Task 3 Step 2 (dodany `onDoubleClick`, `onClick` nietknięty).
- Reset per agent → Task 1 (reset w `select`/`selectBuilding`), test pokrywa.
- i18n EN/PL → Task 3 Step 1.
- Testy: store unit-test (Task 1), Pixi wizualnie (Weryfikacja końcowa).

**Placeholdery:** brak — każdy krok z konkretnym kodem i komendą.

**Spójność typów/nazw:** `autofollow: boolean` + `setAutofollow(on: boolean)` zdefiniowane w Task 1, używane identycznie w Task 2 (`getState().autofollow`/`setAutofollow`) i Task 3 (`s.autofollow`/`s.setAutofollow`). `focusOnUnit(id: string)` zdefiniowane w Task 2, wołane w Task 3 (Portraits, SidePanel). `t.autofollow` dodane w Task 3 Step 1, użyte w Step 3.
