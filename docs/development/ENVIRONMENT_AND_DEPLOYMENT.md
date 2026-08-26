# Development and Deployment

## Reference environment

- Linux CI and deployment build;
- Node active LTS and pnpm, exact versions pinned in the first coding PR;
- modern evergreen desktop browser with WebGL;
- Playwright browsers installed in a pinned CI image/container;
- no Python or private service required for static mode.

Windows and macOS may be used for local development, but Linux CI is authoritative for builds and screenshot baselines.

## Planned build modes

### Static

```text
VITE_STUDIO_MODE=static
VITE_PUBLIC_FIXTURE_BASE=./fixtures
```

Uses committed reviewed fixtures and has no API dependency.

### Live, future

```text
VITE_STUDIO_MODE=live
VITE_API_BASE_URL=https://public-api.example
VITE_WS_BASE_URL=wss://public-api.example
```

Only public endpoint locations may appear in browser configuration. Secrets never use `VITE_*` variables.

## GitHub Pages requirements

- Vite base path: `/mission-studio-showcase/` unless a custom domain changes it to `/`;
- build and deploy through GitHub Actions;
- copy Cesium Workers, ThirdParty, Assets, and Widgets to the expected static base path;
- use routes compatible with static hosting, initially a single application route or hash routing;
- provide a useful offline/static fallback if remote basemap or asset services fail;
- never commit `dist` to `main`.

## Data and asset budgets

The first coding PR should propose measurable budgets for:

- initial JavaScript/CSS load;
- Cesium static assets;
- committed fixture size;
- first meaningful paint and interactive readiness on a normal laptop;
- frame stability during playback;
- maximum chart update rate;
- screenshot test duration.

Do not commit a full HSI cube. Use a small reviewed crop/derived profile or external public assets with attribution and graceful fallback.

## Visual regression discipline

- generate baselines on the same Linux image used in CI;
- pin browser, font, viewport, fixture, clock, and reduced-motion setting;
- mask only genuinely nondeterministic external content;
- review every changed baseline;
- keep separate representative views for Story Mode, Operator Mode, event inspection, comparison, and error states.

## Planned checks

- format/lint/typecheck;
- unit tests for event ordering, seek, projection, and comparison;
- JSON Schema fixture validation;
- accessibility checks;
- Playwright interaction tests;
- screenshot regression;
- Pages subpath build smoke test;
- secret/prohibited-reference scan.

