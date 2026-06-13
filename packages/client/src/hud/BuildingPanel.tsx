import { useEffect, useState } from 'react';
import { toolToBuilding, type BuildingStatsResponse, type BuildingWindowStats } from '@agent-citadel/shared';
import { useWorld } from '../store';
import { useSettings } from '../settings';
import { getTheme } from '../theme';

const EMPTY: BuildingWindowStats = { today: 0, week: 0, month: 0 };

/** Panel budynku: ile jednostek teraz pracuje + zużycie tokenów dziś / 7 dni / 30 dni. */
export function BuildingPanel() {
  const buildingId = useWorld((s) => s.selectedBuildingId);
  const heroes = useWorld((s) => s.heroes);
  const peons = useWorld((s) => s.peons);
  const select = useWorld((s) => s.selectBuilding);
  const themeId = useSettings((s) => s.themeId);
  const [stats, setStats] = useState<BuildingStatsResponse | undefined>();
  const [loading, setLoading] = useState(false);

  // Statystyki historyczne: skan transkryptów po stronie serwera (cache 60 s).
  // Odświeżamy przy otwarciu i co 60 s, dopóki panel jest widoczny.
  useEffect(() => {
    if (!buildingId) return;
    let alive = true;
    const load = () => {
      setLoading(true);
      fetch('/building-stats')
        .then((r) => r.json())
        .then((d: BuildingStatsResponse) => alive && setStats(d))
        .catch(() => {})
        .finally(() => alive && setLoading(false));
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [buildingId]);

  if (!buildingId) return null;

  const def = getTheme(themeId).buildings.find((b) => b.id === buildingId);
  const win = stats?.buildings[buildingId as keyof typeof stats.buildings] ?? EMPTY;

  // "Teraz pracuje" — na żywo ze stanu świata (bohaterowie + peony przy tym budynku).
  const workerHeroes = Object.values(heroes).filter(
    (h) => h.state === 'working' && toolToBuilding(h.currentTool, h.toolDetail) === buildingId,
  );
  const workerPeons = Object.values(peons).filter(
    (p) => p.state === 'working' && toolToBuilding(p.currentTool) === buildingId,
  );
  const workingNow = workerHeroes.length + workerPeons.length;

  return (
    <div className="hud-panel sidepanel">
      <div className="head">
        <div>
          <strong>{def?.label ?? buildingId}</strong>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
            Teraz pracuje: <b>{workingNow}</b>
            {workingNow > 0 ? ` (${workerHeroes.length} sesji, ${workerPeons.length} peonów)` : ''}
          </div>
        </div>
        <button className="ghost" onClick={() => select(undefined)}>
          ✕
        </button>
      </div>

      {workingNow > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          {workerHeroes.map((h) => (
            <div key={h.sessionId} className="line assistant" style={{ alignSelf: 'stretch', maxWidth: '100%' }}>
              🦸 {clip(h.title, 40)} · {h.toolDetail ? clip(h.toolDetail, 30) : h.currentTool}
            </div>
          ))}
          {workerPeons.map((p) => (
            <div key={p.agentId} className="line assistant" style={{ alignSelf: 'stretch', maxWidth: '100%' }}>
              ⛏️ {clip(p.description ?? 'peon', 40)}
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #33332f', paddingTop: 8 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, marginBottom: 6 }}>
          Zużycie tokenów (wyjściowych){loading ? ' …' : ''}
        </div>
        <Row label="Dziś" value={win.today} />
        <Row label="7 dni" value={win.week} />
        <Row label="30 dni" value={win.month} />
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6 }}>
          Atrybucja: tokeny → budynek użytego narzędzia; rozumowanie → budynek bieżącej pracy. Skan transkryptów (cache 60 s).
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      <b>{formatK(value)}</b>
    </div>
  );
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatK(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}
