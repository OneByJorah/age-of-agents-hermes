import { GameCanvas } from './GameCanvas';
import { MissionLog } from './hud/MissionLog';
import { Minimap } from './hud/Minimap';
import { Portraits } from './hud/Portraits';
import { ResourceBar } from './hud/ResourceBar';
import { SidePanel } from './hud/SidePanel';
import { BuildingPanel } from './hud/BuildingPanel';
import { ThemeSwitch } from './hud/ThemeSwitch';
import './hud/hud.css';

export function App() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <GameCanvas />
      <ThemeSwitch />
      <ResourceBar />
      <MissionLog />
      <SidePanel />
      <BuildingPanel />
      <Portraits />
      <Minimap />
    </div>
  );
}
