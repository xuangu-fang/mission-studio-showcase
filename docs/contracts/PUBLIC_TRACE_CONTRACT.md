# Public Trace Contract

The exact JSON Schemas will be created during Showcase Gate A/Core Gate 1 coordination. This document defines the public semantic minimum.

## Public manifest

Each fixture or live run starts with a manifest containing:

- public contract version;
- scenario, policy, and producer versions;
- run IDs and comparison grouping;
- time range and clock scale;
- asset and attribution list;
- value-status legend: observed, derived, inferred, synthetic, calibrated, counterfactual;
- integrity checksum when artifacts are released.

## Public runtime event

Required concepts:

- monotonically increasing `seq`;
- stable event ID;
- simulation/event time;
- event type and actor category;
- correlation and causation references;
- display-safe payload;
- provenance summary;
- classification/status labels for numeric values.

Initial event types should cover:

- mission/plan lifecycle;
- observation acquired;
- evidence produced;
- belief updated;
- resource updated;
- action proposed/selected/rejected/started/completed/failed/abstained;
- link/fault/constraint event;
- outcome updated.

## Public summaries

- `PublicResourceState`: normalized resource value, unit, margin, warning/violation state, synthetic/calibrated label.
- `PublicEvidenceSummary`: claim, direction, confidence/score, observation references, method label.
- `PublicBeliefSummary`: hypothesis, confidence/score, unknowns, evidence references, threshold state.
- `PublicDecisionSummary`: candidates, selected/rejected action, constraint/utility summary, abstention reason.
- `PublicCasefileSummary`: outcome metrics, supported versions, provenance completeness, attribution.

## Explicitly excluded

- raw model prompts/responses;
- API/provider details not required for public provenance;
- private artifact paths or signed URLs;
- partner or customer identifiers;
- proprietary calibration and hardware profiles;
- internal stack traces, network topology, or endpoint names;
- unrestricted high-dimensional data payloads.

## Compatibility

The Showcase must refuse unsupported major versions with a useful message, preserve fixtures for supported versions, and test ordering/gap/duplicate behavior. It must never silently reinterpret a renamed or semantically changed field.

