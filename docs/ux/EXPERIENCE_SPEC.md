# Experience Specification

## Experience objective

Within 90 seconds, a first-time visitor should understand that Mission Studio is an evidence-to-action workbench—not simply an orbit viewer. Within five minutes, an expert should be able to pause, inspect provenance, compare policies, and identify the constraint that changed an action.

## Two modes, one truth

### Story Mode

- guided focus and camera choreography;
- short explanatory captions tied to specific trace events;
- progresses automatically but can be paused or exited immediately;
- no pre-rendered video or separate story data.

### Operator Mode

- timeline seek and event list;
- action graph and constraint inspection;
- evidence/observation provenance;
- resource margins;
- fixed/adaptive and fork comparison;
- casefile summary.

## Desktop information architecture

```text
┌ Mission intent / SLA ─────────────────────── Run / Compare / Export ┐
├──────────────┬───────────────────────────────────┬───────────────────┤
│ Mission      │                                   │ Belief / Evidence │
│ objectives   │       3D world + AOI + assets     │ hypothesis        │
│ constraints  │       orbit / footprints / links  │ next action + why │
│ action graph │                                   │ authority / risk  │
├──────────────┴───────────────────────────────────┴───────────────────┤
│ Evidence timeline | power | thermal | compute | storage | contact   │
├──────────────────────────────────────────────────────────────────────┤
│ Fixed policy outcome       ↔        Adaptive policy outcome         │
└──────────────────────────────────────────────────────────────────────┘
```

Panels may collapse or appear contextually; do not permanently fill every region with dense telemetry.

## Required interactions

- play, pause, speed, step, seek;
- select an event on the globe or timeline and highlight its causal chain;
- move between observation, evidence, belief update, decision, and outcome;
- switch fixed/adaptive runs without changing time or visual scale;
- inspect resource margins at a selected decision;
- enter/exit Story Mode at the current time;
- reset to a known deterministic state;
- keyboard-accessible focus and event inspection.

## Domain visual semantics

- blue/cyan: plan and available capability;
- amber: uncertainty, waiting evidence, or pressure near a limit;
- red: hard constraint violation or fault only;
- green: evidence-supported state that passed its gate;
- dashed/transparent: forecast, counterfactual, or lower confidence;
- brightness and motion do not carry essential information alone.

## Quality bar

- visually distinctive but not sci-fi clutter;
- readable on a normal laptop display;
- stable playback and seek across all views;
- accessible reduced-motion mode;
- meaningful loading, unsupported-version, and asset-unavailable states;
- screenshot baselines generated and compared in the same pinned Linux environment;
- no full hyperspectral cube downloaded to the browser.

## Spectral interaction

Selecting a map region or observation may show a small server-prepared or fixture-provided spectral profile and evidence marker. The goal is to connect a spatial pixel to the evidence decision—not to reproduce a full hyperspectral analysis desktop.

