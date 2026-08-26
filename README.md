# Mission Studio Showcase

Mission Studio Showcase is the public, browser-based window into a planned mission-intelligence system. It will visualize how mission intent becomes a validated plan, how observations become evidence, how belief changes under uncertainty, and why a resource-constrained system chooses to act, revisit, downlink, escalate, or abstain.

This repository is currently **documentation-first**. It contains the public experience contract, visual architecture, static deployment plan, public data boundary, and implementation gates—but no application code yet.

The companion private `mission-studio` repository owns the mission compiler, Agent gateway, validators, planners, deterministic engine, high-fidelity adapters, private casefiles, and internal deployment. This public repository never imports private source code. It consumes only sanitized, versioned public contracts and fixtures.

## What the first demo should prove

A useful mission-intelligence demo is not a rotating globe. A visitor should be able to see and interrogate this loop:

```text
Mission intent
  -> action graph
  -> observation
  -> evidence
  -> belief update
  -> resource-aware decision
  -> outcome and counterfactual
```

The first public scenario is Mission-Adaptive Hyperspectral Intelligence, comparing a fixed policy with an adaptive evidence-seeking policy under storage, link, timing, and uncertainty constraints.

## Planned public experience

- 3D globe with orbit, assets, AOI, sensor footprints, links, and mission events;
- mission intent, objectives, constraints, and action graph;
- evidence, belief, uncertainty, and next-action explanation;
- power, thermal, compute, storage, and contact-window timeline;
- play, pause, seek, event inspection, and branch comparison;
- Story Mode for a guided 90-second narrative;
- Operator Mode for direct exploration;
- fixed versus adaptive outcome comparison;
- static offline fixtures by default, with an optional live API mode later.

## Repository map

```text
apps/                    Planned React/Vite web application
packages/                Planned public contracts, UI, and Cesium adapter
public/fixtures/          Small attributed runtime traces
public/assets/            Small redistributable visual assets
docs/                    Architecture, UX, plan, contracts, scenario
tests/                   Planned interaction, contract, accessibility, visual tests
AGENTS.md                 Required handoff context for coding agents
project.yaml              Machine-readable linkage and current gate
```

## Recommended reading order

1. [Public architecture](docs/architecture/PUBLIC_ARCHITECTURE.md)
2. [Public contract](docs/contracts/PUBLIC_TRACE_CONTRACT.md)
3. [Experience specification](docs/ux/EXPERIENCE_SPEC.md)
4. [Implementation roadmap](docs/planning/IMPLEMENTATION_ROADMAP.md)
5. [Development and deployment](docs/development/ENVIRONMENT_AND_DEPLOYMENT.md)
6. [First scenario](docs/scenarios/ADAPTIVE_HSI.md)

## Status

`Planning / repository bootstrap / no application code`

The initial implementation must work entirely offline from a deterministic public trace. A live backend is an enhancement, not a requirement for the public demo.

## License

License selection is pending an explicit owner decision. Until a license is added, public visibility does not grant permission to copy, modify, or redistribute the repository beyond what applicable law provides. External code contributions should wait for that decision.

