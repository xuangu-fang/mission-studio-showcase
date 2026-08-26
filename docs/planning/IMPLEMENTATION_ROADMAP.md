# Implementation Roadmap

## Showcase Gate 0 — Repository bootstrap

Deliver documentation, repository boundary, public contract proposal, UX specification, Linux/Pages plan, and Agent handoff.

Exit condition: a coding agent can identify the first vertical slice and explain why no private repository access is needed.

## Showcase Gate A — Trace-driven visual skeleton

Build:

- React/TypeScript/Vite application;
- public trace schema validation;
- deterministic playback clock and projection layer;
- design tokens and small domain-component catalog;
- Cesium world view;
- mission graph, evidence/belief panel, resource ribbon, and timeline;
- one fixed/adaptive fixture pair;
- Story and Operator modes;
- GitHub Pages deployment workflow;
- Playwright interaction, accessibility, and visual regression.

Evidence gate:

- every view stays synchronized after seek and reset;
- a selected decision reveals its causal observation/evidence/resource chain;
- fixed/adaptive comparison uses identical clock and initial conditions;
- static build works at `/mission-studio-showcase/`;
- no backend or private access is required;
- screenshot baselines are stable in pinned Linux CI.

Stop/reduce if most effort goes to 3D decoration while evidence/action causality remains unclear.

## Showcase Gate B — Public adaptive HSI scenario

Build:

- reviewed public scene/crop and attribution;
- spatial-spectral evidence interaction;
- link interruption or storage-pressure branch;
- time-to-knowledge, utility/bit, violations, and evidence completeness;
- public casefile summary and downloadable fixture manifest.

Evidence gate: an external viewer can correctly explain why the adaptive and fixed policies diverged without reading source code.

## Showcase Gate C — Optional live-connected mode

Build only after the static demo is strong:

- environment-configured API base URL;
- HTTPS/WebSocket event client;
- reconnect/gap/unsupported-version states;
- simulation/live status label;
- authentication only if required by the API;
- static fallback.

Evidence gate: live and static inputs produce the same projection semantics, and no credential is embedded in the frontend bundle.

## Showcase Gate D — Community and benchmark surface

- public scenario/trace contribution format;
- documented contract releases;
- comparison gallery;
- links to papers, benchmarks, and reproducible artifacts;
- license and contribution workflow approved.

## Suggested first issues

1. Bootstrap exact Node/pnpm versions and Vite subpath build.
2. Implement minimal public RuntimeEvent schema and validator.
3. Build deterministic playback/projection package without UI.
4. Establish design tokens and four domain components.
5. Render a minimal Cesium fixture with local fallback imagery strategy.
6. Synchronize timeline, mission graph, and evidence panel.
7. Add fixed/adaptive comparison and Story Mode choreography.
8. Deploy Pages and establish Playwright baselines.

