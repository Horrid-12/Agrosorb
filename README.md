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

Model and transition checks (no browser needed):

```bash
npx tsx scripts/check-engine.ts     # model invariants
npx tsx scripts/check-scenarios.ts  # challenge objectives still pass
npx tsx scripts/check-store.ts      # scenario switching, treatment sequence, bypass
```

## Stack

React 18 · TypeScript · Vite · Three.js (React Three Fiber + drei) · Tailwind CSS v4 ·
Framer Motion · Zustand · Recharts · Lucide React

## Architecture
[![Architecture diagram for Agrosorb](https://gitdiagram.com/horrid-12/agrosorb/diagram.png)](https://gitdiagram.com/horrid-12/agrosorb?utm_source=readme&utm_medium=picture)
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
- **Nutrients** — simplified media-contact attenuation for phosphate and a deliberately
  weak attenuation for nitrate (real nitrate control needs biological or ion-exchange
  processes); removals are reported separately
- **pH** — each bed nudges pH toward neutral, proportional to depth
- **Loading & saturation** — illustrative per-centimetre solids / adsorption capacity
- **Hydraulic overload** — flow above the 4 L/min design rate shortens contact time and
  bypasses a modelled fraction of influent around the media
- All coefficients live in `src/simulation/models/constants.ts`

## Environmental scenarios

Five selectable pollution scenarios change the simulated influent, the scene art
direction and the teaching focus:

| Scenario | Focus |
| --- | --- |
| Soil erosion | Suspended sediment, turbidity, filter loading |
| Pesticide runoff | Dissolved model contaminant (visual tracers only) and adsorption |
| Fertilizer pollution | Nitrate / phosphate and receiving-water algal bloom |
| Mixed contamination | Sediment + chemicals + nutrients together |
| Extreme rainfall | Hydraulic overload, flooding and bypass |

Rainfall and erosion genuinely re-derive the influent while chemistry is in automatic
mode; manually editing a chemistry value switches to manual override. Selecting an
environmental scenario leaves any challenge mode.

The 3D scene responds to the same state: storm clouds, rain, wind-swayed crops, erosion
rills, turbidity-tinted water, runoff particles, rising water levels, overflow, algal
bloom and day/night lighting. Click the filtration station (or the **Inspect** tab) to
open a live cross-section with falling water, sediment accumulation, loading and
adsorption saturation. Coloured particles are visual tracers, not measurements or real
molecules.

## Keyboard shortcuts

| Key | Action |
| --- | ------ |
| `Space` | Toggle rainfall |
| `S` | Scenario & chemistry controls |
| `C` | Filter configurator |
| `I` | Filter inspection |
| `R` | Results dashboard |
| `Esc` | Close panel |

## Accessibility & fallbacks

- WebGL failure or small screens switch to a **2D schematic fallback** (CSS diorama,
  live from the store) — no static screenshots anywhere.
- All controls are keyboard-reachable with visible focus states; 3D interactions are
  duplicated in the HUD.
