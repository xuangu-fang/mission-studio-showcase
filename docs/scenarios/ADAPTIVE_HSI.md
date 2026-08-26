# Public Scenario — Mission-Adaptive Hyperspectral Intelligence

## Public story

A mission author asks the system to gather enough evidence over an area of interest to change a scientific or operational conclusion while respecting a deadline and downlink budget.

The visitor sees two runs with the same initial conditions:

- a fixed policy continues the original acquisition/downlink sequence;
- an adaptive policy responds to rare or incomplete spectral evidence, resource pressure, and link availability.

## Required story beats

1. Mission intent and success gate appear.
2. The action graph is compiled and validated.
3. A public HSI observation arrives over the AOI.
4. Selecting the footprint connects a spatial location to a spectral/evidence summary.
5. Belief changes but may remain below its confidence gate.
6. The adaptive policy retains, revisits, requests evidence, downlinks, or abstains with a visible reason.
7. A storage or link event forces a tradeoff.
8. Fixed and adaptive outcomes converge or diverge in a measurable way.

## Required comparison metrics

- mission completion;
- time-to-knowledge;
- utility per transmitted bit;
- hard-constraint violations;
- evidence/provenance completeness;
- retained rare evidence;
- abstention behavior.

## Public data policy

EMIT and EnMAP are candidates. The selected fixture must include source URL, product identifier, license/terms review, derivation steps, attribution, checksums, and a clear label for synthetic scenario overlays.

No partner data, internal mission target, or private hardware profile may be used as a placeholder.

## Visualization boundary

The goal is not a complete hyperspectral analysis tool. Show only the spatial-spectral relationship needed to understand the evidence and action decision. Heavy cube processing remains outside the browser.

