# Source Ledger

Accessed 2026-08-26. These official sources support initial technology and deployment choices; they do not prove Mission Studio performance.

| Source | Supports | Boundary |
| --- | --- | --- |
| [CesiumJS fundamentals](https://cesium.com/learn/cesiumjs-fundamentals/) | browser-based cross-platform 3D globe and dynamic geospatial visualization | application performance and UX remain to be measured |
| [CesiumJS quickstart](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/) | required hosted Workers/Assets/Widgets and NPM setup | token/basemap policy remains an owner decision |
| [Cesium CZML](https://cesium.com/learn/cesiumjs/ref-doc/CzmlDataSource.html) | time-dynamic entities and clock-aware processing | domain truth remains the project event contract |
| [Vite static deployment](https://vite.dev/guide/static-deploy.html) | GitHub Pages build and repository base path | exact workflow created in first coding PR |
| [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) | Actions artifact deployment | Pages remains static hosting |
| [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) | size, bandwidth, build, and intended-use boundaries | not suitable as product backend/SaaS runtime |
| [Apache ECharts dynamic data](https://echarts.apache.org/handbook/en/how-to/data/dynamic-data/) | data-driven chart updates | update rates and accessibility require testing |
| [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) | screenshot regression | baselines require a stable environment and review |
| [NASA Open MCT](https://nasa.github.io/openmct/about-open-mct/) | telemetry/time visualization reference | not selected as the primary Showcase shell |
| [STAC](https://stacspec.org/en/about/stac-spec/) | public geospatial asset metadata | does not define evidence/belief contracts |
| [EMIT tutorials](https://earth.jpl.nasa.gov/emit/events/4/emit-data-tutorial-series/) | candidate HSI data and analysis workflow | redistribution/fixture choice requires review |
| [EnMAP data access](https://www.enmap.org/data_access/) | candidate analysis-ready HSI products | access and license terms require review |
| [NASA/JPL EMIT first mineral maps](https://www.jpl.nasa.gov/news/nasa-dust-detective-delivers-first-maps-from-space-for-climate-science/) | high-resolution hyperspectral context image used in the HSI Payload POC; credit NASA/JPL-Caltech | contextual illustration only; not matched to the synthetic trace geography or time |
| [NASA Applied Sciences — Fires](https://appliedsciences.nasa.gov/what-we-do/disasters/fires) | Landsat Camp Fire imagery used as wildfire Payload context | contextual illustration only; not an operational fire product or exact trace scene |
| [ESA Sentinel-1 — English Channel](https://www.esa.int/ESA_Multimedia/Images/2019/04/English_Channel) | maritime SAR context image showing ships as bright radar returns; contains modified Copernicus Sentinel data (2016–18), processed by ESA | used under CC BY-SA 3.0 IGO for POC context; not matched to the synthetic search trace |
| [JPL image use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/) | attribution and reuse boundary for the NASA/JPL image | no endorsement implied; visible credit retained in the Payload UI |
