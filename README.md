# AgroSorb

An interactive, game-themed **environmental engineering simulator**: treat agricultural
runoff through **physical filtration** and **activated carbon adsorption** inside a
low-poly 3D farm diorama.

> **Educational disclaimer** — every water-quality figure in AgroSorb is produced by a
> documented, deterministic educational model. Values are **simulated**, never laboratory
> measurements. The "contaminant" is a generic model compound, not a real pesticide.

## Quick start

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run preview  # serve the production build
```

## Stack

React 18 · TypeScript · Vite · Three.js (React Three Fiber + drei) · Tailwind CSS v4 ·
Framer Motion · Zustand · Recharts · Lucide React

## Architecture

```
src/
  components/
    ui/            # game-style buttons, panels, badges, error boundary
    simulation/    # weather controls, filter configurator
    dashboard/     # results dashboard (Recharts)
    environment/   # procedural 3D terrain, crops, water, rain, station, scenery
    learn/         # learning center
  scenes/          # AgriculturalScene (lazy-loaded 3D experience)
  simulation/
    engine/        # pure, documented filtration model
    models/        # centralized, tunable constants
  stores/          # Zustand store (LocalStorage-persisted settings & history)
  hooks/           # media queries, keyboard controls
  data/            # material definitions, educational content
  pages/           # LandingPage, SimulationPage
  types/           # shared domain types
```

**Separation of concerns:** the simulation engine (`src/simulation`) is pure TypeScript —
no React, no Three.js. UI and rendering read state through the Zustand store only.

## Simulation model (summary)

- **Turbidity** — Beer–Lambert style exponential decay per bed: `T_out = T_in·e^(−k·d)`
- **Model contaminant** — pseudo-first-order adsorption: `C_out = C_in·e^(−K·d·t)`,
  where contact time `t = total depth / flow rate`
- **pH** — each bed nudges pH toward neutral, proportional to depth
- All coefficients live in `src/simulation/models/constants.ts`

## Keyboard shortcuts

| Key | Action |
| --- | ------ |
| `Space` | Toggle rainfall |
| `C` | Filter configurator |
| `R` | Results dashboard |
| `Esc` | Close panel |

## Accessibility & fallbacks

- WebGL failure or small screens switch to a **2D schematic fallback** (CSS diorama,
  live from the store) — no static screenshots anywhere.
- All controls are keyboard-reachable with visible focus states; 3D interactions are
  duplicated in the HUD.
