<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img src="https://img.shields.io/badge/Canvas-FF6B6B?style=for-the-badge&logo=html5&logoColor=white">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge">
  <img src="https://img.shields.io/badge/npx-run_now-FF6B6B?style=for-the-badge&logo=npm&logoColor=white">
</div>

<br>

<div align="center">
  <h1>age-of-agents-hermes</h1>
  <p><strong>AI Agent Sessions as Pixel-Art Realm</strong></p>
  <p>Watch your AI coding sessions grow a peaceful pixel-art realm. Run it with npx.</p>
  <p>
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#how-it-works">How It Works</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## Screenshot

![Age of Agents](docs/screenshot.png)
*Pixel-art realm visualization of AI agent coding sessions.*

## Features

- **Real-Time Visualization** — Watch AI agents build a pixel-art world.
- **Agent Activity** — See coding sessions as peaceful realm growth.
- **Multiple Themes** — Fantasy and sci-fi visual modes.
- **Zero Configuration** — Run directly with npx.
- **Lightweight** — No database, no backend, just visualization.
- **Retro Pixel Art** — Beautiful 16-bit style graphics.

## Quick Start

```bash
npx ai-of-agents
```

Open **http://localhost:3000** in your browser.

### Install Globally

```bash
npm install -g ai-of-agents
ai-of-agents
```

### Clone and Run

```bash
git clone https://github.com/OneByJorah/age-of-agents-hermes.git
cd age-of-agents-hermes
npm install
npm start
```

## How It Works

1. **Session Detection** — Connects to your Hermes AgentOS sessions
2. **Activity Mapping** — Maps coding activity to realm events
3. **Pixel Rendering** — Renders a peaceful pixel-art world
4. **Real-Time Updates** — Watch the realm grow as you code

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `THEME` | `fantasy` | Visual theme (fantasy/sci-fi) |
| `HERMES_API` | — | Hermes AgentOS API endpoint |
| `SESSION_FILE` | — | Local session JSON file |

## Visual Themes

| Theme | Description |
|-------|-------------|
| `fantasy` | Medieval castles, forests, and creatures |
| `sci-fi` | Futuristic stations, robots, and technology |

## Architecture

```
Hermes Sessions ──JSON──▶ Node.js Server ──Canvas──▶ Browser
                                    │
                                    ├──▶ Session Parser
                                    ├──▶ Realm Generator
                                    └──▶ Pixel Renderer
```

## Project Structure

```
age-of-agents-hermes/
├── src/
│   ├── index.js           # Main entry point
│   ├── session-parser.js  # Parse agent sessions
│   ├── realm-generator.js # Generate pixel world
│   └── themes/            # Visual theme configs
├── public/
│   ├── index.html         # Main page
│   ├── canvas.js          # Canvas rendering
│   └── styles.css         # Styles
├── package.json
└── README.md
```

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.

## Security

For security concerns, see [SECURITY.md](SECURITY.md). Please report vulnerabilities to **info@jorahone.com** — do not use public issues.

## License

MIT © Jhonattan L. Jimenez

---

<div align="center">
  <p>AI agent sessions as pixel-art realm.</p>
  <p><a href="https://github.com/OneByJorah">@OneByJorah</a></p>
</div>
