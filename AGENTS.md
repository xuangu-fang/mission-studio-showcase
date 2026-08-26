# AGENTS.md

This is the primary handoff for coding agents working on the public Mission Studio visualization.

## Mission

Build a highly legible, visually distinctive, genuinely interactive public experience that shows the causal structure of mission intelligence. The result should be useful as a GitHub Pages demo, paper/project page, partner explanation, and test harness for public trace contracts.

Do not build a generic space dashboard. Do not substitute cinematic decoration for inspectable evidence, belief, resource, and action relationships.

## Read before coding

1. `docs/architecture/PUBLIC_ARCHITECTURE.md`
2. `docs/contracts/PUBLIC_TRACE_CONTRACT.md`
3. `docs/ux/EXPERIENCE_SPEC.md`
4. `docs/planning/IMPLEMENTATION_ROADMAP.md`
5. `docs/development/ENVIRONMENT_AND_DEPLOYMENT.md`
6. `docs/scenarios/ADAPTIVE_HSI.md`
7. `docs/planning/DECISIONS.md`

## First implementation objective

Complete **Showcase Gate A: Trace-driven visual skeleton**.

The first implementation must:

- load one small, schema-valid public runtime trace locally;
- drive every view from the same ordered event source;
- render the world view, mission graph, belief/evidence panel, resource ribbon, and timeline;
- support play, pause, seek, event inspection, and fixed/adaptive comparison;
- implement Story Mode as cancellable choreography over the real trace;
- work without a backend, model provider, login, or private repository access;
- build under the repository subpath used by GitHub Pages;
- pass keyboard, reduced-motion, interaction, contract, and screenshot regression tests in Linux CI.

## Planned stack

- React + TypeScript + Vite;
- CesiumJS behind `packages/cesium-adapter`;
- Apache ECharts for time-series and resource views;
- Radix primitives plus project-owned CSS variables/design tokens;
- Zustand for local playback/inspection state;
- TanStack Query only when live server state is introduced;
- Playwright for interaction and visual regression;
- JSON Schema validation for public fixtures.

The coding agent may propose a different library only with a short decision record tied to a measured UX, bundle, accessibility, or maintenance benefit.

## Public/private invariant

This repository must never require access to the private `mission-studio` repository. Do not copy private source, prompts, traces, partner references, endpoints, hardware profiles, or credentials.

Accepted inputs are:

- reviewed public JSON Schema;
- allowlisted sanitized trace fixtures;
- public or project-authored assets with clear attribution;
- documented public API responses in a future live mode.

If a required field is missing, open a contract issue. Do not infer private implementation details into the public schema.

## UI invariants

1. The event trace is authoritative; UI components derive read models from it.
2. Cesium objects do not become domain state.
3. A visual effect must encode evidence, uncertainty, resource, authority, causality, or outcome.
4. Red means hard violation/fault, not ordinary emphasis.
5. Story Mode is interruptible and every frame maps to a trace event.
6. Operator Mode supports seek and provenance inspection.
7. Fixed and adaptive runs share scale, clock, and initial conditions when compared.
8. Every value is labeled observed, derived, inferred, synthetic, calibrated, or counterfactual.
9. The experience is usable with keyboard navigation and reduced motion.
10. The demo must remain meaningful without a network after initial asset load.

## Visual quality process

- establish design tokens and a small domain component catalog before composing the full screen;
- test representative desktop widths early;
- keep the 3D globe as one information surface, not the entire product;
- use progressive disclosure rather than permanent panel density;
- pin fonts, browser, viewport, and fixtures for screenshot baselines;
- inspect visual diffs instead of automatically accepting changed baselines;
- test Story and Operator modes with the same fixture.

## Security and performance

- never put model/API secrets in `VITE_*` variables or browser code;
- do not load full hyperspectral cubes into the browser;
- keep committed fixtures and assets small;
- use remote public tiles/assets only with attribution, stable terms, and graceful fallback;
- GitHub Pages is a static showcase, not a SaaS backend;
- live mode must use HTTPS/WSS, explicit origin policy, rate limits, and a deliberately narrow API.

## Git hygiene

- default branch: `main`;
- Codex-created branches use `codex/`;
- do not commit `dist`, screenshots outside approved baselines, large cubes, tokens, or private exports;
- update `project.yaml` when contract support or the current gate changes;
- record architecture choices in `docs/planning/DECISIONS.md`.

## Owner-review decisions

- open-source license and contribution policy;
- final public name/domain/branding;
- exact public HSI scene and redistribution terms;
- access-token policy for optional basemaps/terrain;
- any public live API or analytics;
- any transfer from the private core repository.

