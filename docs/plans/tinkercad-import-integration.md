# Integrate Tinkercad import into Layerling

## Goal

Make an existing Tinkercad design easy to bring into Layerling as an editable assembly, preserving its visible parts, names, colors, nesting, hole operands, and evaluated boolean geometry as closely as the source exposes them. The import must never write to or modify the Tinkercad design.

Local prototype checks demonstrated per-node geometry preservation and Layerling save/reopen on a complex assembly. The private source fixtures and screenshots are excluded from this repository's public files. It remains a browser-assisted prototype: the capture relies on Tinkercad's internal testkit API, and the converter is currently Python rather than part of Layerling. This document is a proposal, not implemented native integration.

## Integration options

| Option | User flow | Fidelity | Main tradeoff |
| --- | --- | --- | --- |
| Tinkercad native mesh export (STL/OBJ) | Export in Tinkercad, then use Layerling's existing Import | Low to medium. It imports geometry with little or no original hierarchy, editability, and hole semantics; OBJ may retain parts/materials. | Lowest implementation and support cost; good fallback, not a faithful project migration. |
| Layerling bookmarklet exporter + import package | Install/drag a bookmark once; open the design in Tinkercad, run “Send to Layerling”, then open the downloaded package in Layerling | Highest demonstrated fidelity. Reads the live scene tree and evaluated per-node meshes; retains editable nodes/operands. | Extra browser handoff; depends on undocumented Tinkercad testkit internals that can change. |
| Browser extension | Click an extension action while viewing a Tinkercad design; extension captures and downloads or hands off the package | Potentially same as bookmarklet, with a clearer, persistent entry point. | Installation, browser permission/security review, multiple-browser maintenance, and store distribution. Still depends on Tinkercad internals. |
| Paste a Tinkercad design URL into Layerling | Paste URL, Layerling fetches or captures the design | Potentially high only for public designs or authenticated browser handoff. | Private designs, login boundaries, CORS, session handling, and privacy make this a poor default; avoid asking Layerling's server to fetch user designs. |
| Official Tinkercad API / first-party integration | Choose Layerling from Tinkercad's own export/share UI | Best possible if Autodesk provides a supported API/handoff. | No supported API/handoff has been established in this prototype; investigate before depending on it. |

## Recommendation

Ship a first-party Layerling import experience around the existing browser-assisted exporter, initially as a single downloaded package accepted by the existing import entry point. Keep ordinary STL/OBJ import as a clearly labeled fallback. Do not make URL fetching or a browser extension a prerequisite for the first release.

The one-time exporter setup is an unavoidable friction point while Tinkercad exposes no supported direct handoff. Reduce it with a short, illustrated setup and then a repeatable two-action flow: **Tinkercad: Send to Layerling** → **Layerling: Open downloaded design**. If product research supports it later, a browser extension can replace bookmark installation without changing the package format or Layerling importer.

## Proposed user experience

### Entry points

- Empty project: a prominent **Import from Tinkercad** action next to the existing open/import affordance.
- Existing project: **File → Import → Tinkercad design…**; append the imported assembly to the current scene rather than replacing it.
- Also accept drag-and-drop of the downloaded package and `.tinkercad.json`/supported package file through the existing dashboard and editor file picker.

### First use

1. Layerling shows a short explanation: the design stays in the user's browser; no Tinkercad credentials are requested; this does not change the source design.
2. Offer **Install exporter bookmark** with browser-specific drag/click directions and a **Use STL/OBJ instead** alternative.
3. Explain that the user opens the design in Tinkercad and clicks the bookmark. If Tinkercad's editor reloads while enabling its capture runtime, show a simple retry cue.
4. The bookmark captures and downloads a single import package. It should name the file after the design when known and show progress, captured object count, and a human-readable failure if evaluated geometry is missing.
5. Returning to Layerling, the downloaded file opens the import review screen; confirm with **Import design**.

### Import review

- Preview the assembly and show design name, solids, groups, holes, mesh count/size, and any unsupported or degraded content.
- Default to preserving Tinkercad visibility and hierarchy. Provide a small number of clear choices: **Keep source visibility** (default) or **Show all parts**; **Import into current design** or **Open as a new design**.
- Make the geometry limitation explicit: imported shapes are editable meshes and group operands, not recovered native Tinkercad parametric sketches or Layerling analytic CAD features.
- For very large files, report size and triangle count before committing; allow cancel without changing the current project.
- On success, select the imported root, frame the assembly in view, and provide Undo. Keep hidden operands available in the outliner.

### Failure and fallback

- Missing/ambiguous evaluated mesh: stop with node name and actionable retry guidance; never guess a primitive or silently omit geometry.
- Tinkercad capture API changed: explain that the exporter is out of date and link to the fallback STL/OBJ path and support report action.
- Oversized package: identify the limiting count/size and suggest exporting selected components or using native STL/OBJ for a flattened result.
- STL/OBJ fallback should state that it may lose hierarchy, holes as editable operands, names, or per-part colors before import.

## Architecture proposal

1. **Stabilize the interchange contract.** Define a versioned package containing design metadata, the tree, and evaluated world-space triangle meshes keyed by stable source node IDs (`versions_id`). Include normals/material data when available, source visibility, units/coordinate convention, source/API version diagnostics, and content hashes. Validate archive paths, declared sizes, triangle counts, finite numeric values, and hashes before allocation/import.
2. **Use a single package download.** The exporter should bundle the current JSON and mesh payloads into one `.tci`/`.tinkercad` ZIP so users do not manage sidecar files. Keep an optional JSON debug export for development only. Choose the extension after confirming it does not conflict with existing file associations.
3. **Move conversion into Layerling.** Port the currently verified conversion behavior from `convert.py` to a typed TypeScript import module that produces the app's internal project/scene representation. Reuse the native mesh asset writer and scene/project validators rather than generating a `.lyl` ZIP with a second implementation. This avoids relying on private `.lyl` serialization details.
4. **Integrate at the import boundary.** Add the package MIME/extension to the editor and dashboard file input/drop handlers and route it through the existing import dialog. Keep `.lyl` as open/replace and the Tinkercad package as scene import/append, with an explicit “open as new design” option.
5. **Preserve source semantics deliberately.** Keep source hierarchy and bundle children. For boolean groups, retain the evaluated result mesh for correct appearance and keep editable operand nodes; hide cutters in normal rendering while retaining them for editing. Preserve exact source mesh geometry and source visibility. Detect coincident duplicate surfaces only with complete-geometry evidence and preserve duplicate source nodes hidden/editable when needed; do not snap or infer geometry.
6. **Make work bounded and cancellable.** Parse/validate off the main thread where possible; stream or chunk mesh decoding; report progress; enforce documented per-file limits; cancel cleanly. Never send the model to a Layerling server or require Tinkercad credentials.
7. **Keep a fallback.** Existing STL/OBJ routes remain unchanged and are offered when the enhanced capture is unavailable.

## Delivery phases

### Phase 0 — Design and compatibility spike

- Confirm current Layerling import dialog, project/scene types, mesh asset insertion, undo transaction, and file-size safeguards.
- Verify which Tinkercad captures can be obtained without mutating the source and document browser/version prerequisites.
- Use an assembly cleared for redistribution as a golden fixture; add small synthetic fixtures for a primitive, nested bundle, color group, subtraction, imported mesh, custom generator, hidden part, and incomplete capture.
- Agree on package extension/schema and supported capture boundary with Layerling maintainers before implementation.

### Phase 1 — Native package reader

- Implement package validation and the TypeScript conversion path behind a feature flag or isolated import handler.
- Reuse geometry and serialization tests from the prototype, including exact per-vertex checks, node counts, save/reopen, invalid/missing mesh failures, and malicious archive boundaries.
- Import to a new design first; keep append behind explicit review until undo/rollback and ID remapping are proven.

### Phase 2 — User-facing guided handoff

- Add the entry points, one-time bookmark installation guidance, progress/error states, preview, visibility choice, and STL/OBJ fallback.
- Localize strings and test keyboard, touch, and desktop-browser file handling.
- Verify on a range of designs and supported browsers, beyond the original development fixture.

### Phase 3 — Reduce handoff friction

- Evaluate a browser extension or Tinkercad-supported integration only after the package contract is stable and the bookmarklet workflow demonstrates demand.
- Keep capture and Layerling package reader separate so changing the capture transport does not change import semantics.

## Acceptance criteria

- A first-time user can follow the in-product instructions without command line or Python, and a returning user can capture and import with two obvious actions.
- The source Tinkercad design is read-only throughout capture.
- Import is local; no design data or credentials leave the user's browser.
- A valid package opens with the full editable tree, expected visibility/colors, correct boolean results, and no guessed geometry; all source mesh positions match within exporter precision.
- Cancel/failure leaves the current Layerling project untouched; undo removes a completed append as one action.
- Large or malformed inputs fail with clear, actionable errors and bounded resource use.
- A redistributable assembly and representative fixtures pass through Layerling's normal import path, save, close, and reopen.
- The fallback tells users what STL/OBJ will discard.

## Open decisions

- Which package extension and versioning policy fit Layerling conventions?
- Is the first supported flow bookmarklet-only, or does the maintainer want an extension prototype too?
- Should the default after capture open a fresh design or append to the current project? Recommended default: new design for safety, with append explicitly offered.
- What mesh triangle/file limits and minimum supported browser versions match existing importer safeguards?
- Which Tinkercad editor versions/browsers are within the supported compatibility promise, given the undocumented testkit API?

## Evidence and references

- Prototype contract and source: [conversion details](../../tinkercad-import/README.md), [exporter](../../tinkercad-import/bookmarklet.html), and [converter](../../tinkercad-import/convert.py). Design-specific evidence remains in the ignored local archive.
- Layerling's public repository currently documents ordinary imports for STL, OBJ, STEP, SVG, ZIP/3MF workflows and exposes an existing dashboard file picker; the integration should extend the native import boundary instead of asking users to run this prototype converter. See [Layerling README](https://github.com/henmedia/layerling) and [Layerling import entry point](https://github.com/henmedia/layerling/blob/main/apps/web/src/app/page.tsx).
