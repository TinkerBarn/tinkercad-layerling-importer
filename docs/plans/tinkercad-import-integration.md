# Tinkercad importer: standalone roadmap

## Goal

Make an existing Tinkercad design easy to bring into Layerling as an editable assembly, preserving its visible parts, names, colors, nesting, hole operands, and evaluated boolean geometry as closely as the source exposes them. The import must never write to or modify the Tinkercad design.

The separate-tool approach was requested by the Layerling maintainer. The repository now has a self-contained browser bookmarklet that captures and writes a `.lyl` file locally, plus an offline page for converting earlier JSON captures. Python remains as a CLI reference. Browser output matches Python on synthetic assemblies and the archived development capture. A full browser matrix and Layerling open/save/reopen check remain outstanding.

## Integration options

| Option | User flow | Fidelity | Main tradeoff |
| --- | --- | --- | --- |
| Tinkercad native mesh export (STL/OBJ) | Export in Tinkercad, then use Layerling's existing Import | Low to medium. It imports geometry with little or no original hierarchy, editability, and hole semantics; OBJ may retain parts/materials. | Lowest implementation and support cost; good fallback, not a faithful project migration. |
| Layerling bookmarklet exporter + import package | Install/drag a bookmark once; open the design in Tinkercad, run “Send to Layerling”, then open the downloaded package in Layerling | Highest demonstrated fidelity. Reads the live scene tree and evaluated per-node meshes; retains editable nodes/operands. | Extra browser handoff; depends on undocumented Tinkercad testkit internals that can change. |
| Browser extension | Click an extension action while viewing a Tinkercad design; extension captures and downloads or hands off the package | Potentially same as bookmarklet, with a clearer, persistent entry point. | Installation, browser permission/security review, multiple-browser maintenance, and store distribution. Still depends on Tinkercad internals. |
| Paste a Tinkercad design URL into Layerling | Paste URL, Layerling fetches or captures the design | Potentially high only for public designs or authenticated browser handoff. | Private designs, login boundaries, CORS, session handling, and privacy make this a poor default; avoid asking Layerling's server to fetch user designs. |
| Official Tinkercad API / first-party integration | Choose Layerling from Tinkercad's own export/share UI | Best possible if Autodesk provides a supported API/handoff. | No supported API/handoff has been established in this prototype; investigate before depending on it. |

## Recommendation after maintainer feedback

Keep this as an independent, unofficial converter. The Layerling maintainer prefers not to put the undocumented Tinkercad capture API inside Layerling, where Autodesk changes would become a core product maintenance burden. The maintainer is open to linking a published standalone tool from Layerling's guide.

The first implementation is a browser-only bookmarklet that captures the open Tinkercad design, converts it locally in JavaScript, and downloads a `.lyl` directly. Runtime needs no server, Python, Node install, or upload. The install page is a self-contained local HTML file; static GitHub Pages hosting can distribute the same page later without processing designs. The page can also convert earlier JSON exports. Keep ordinary Tinkercad OBJ/STL as another option when the internal capture stops working, with fidelity loss explained.

This makes the returning-user flow one click: **open design in Tinkercad → click bookmark → open downloaded `.lyl` in Layerling**. First use adds one bookmark setup step. Start with desktop Chrome, Edge, and Firefox on Windows, macOS, and Linux; test Safari/macOS before claiming support. Mobile browsers are out of scope initially.

## Standalone distribution and implementation

1. **Share one conversion contract.** The browser converter is a dependency-free JavaScript module in `tinkercad-import/browser-convert.js`; extraction stays in the install page and download stays in the bookmark entry. A small build script embeds the same source in the generated HTML and bookmarklet.
2. **Keep the bookmark self-contained.** `tools/build_browser.py` generates the install page and `javascript:` link. The installed bookmark makes no network request and sends no design data anywhere; it uses Tinkercad's page context, creates the `.lyl` Blob, and downloads it. Users reinstall/update the bookmark after replacing the generated page.
3. **Keep the source maintainable.** Keep readable source, synthetic tests, build script, generated bookmarklet page, and release notes in the standalone repository. CI rebuilds the distributable and checks that the generated output is current. The Python CLI remains useful as a parity oracle and optional local fallback.
4. **Minimize browser permissions.** A bookmarklet asks for no extension permissions and runs only when the user clicks it on the Tinkercad page. Explain clearly that it is unofficial, reads the current design through an undocumented internal interface, performs conversion locally, and may stop working if Tinkercad changes. Users should be able to inspect the source before installing it.
5. **Keep bookmarklet size under control.** The current generated link is self-contained, but its installed size and behavior still need checks in browsers we plan to support. If practical size or browser restrictions become a problem, keep the JSON-to-LYL page as the fallback. Static hosting still needs no running server, and model data stays in the browser. An extension is a later option only if bookmarklet limits materially hurt usability.
6. **Avoid a desktop wrapper initially.** Electron/Tauri would create OS-specific installers, signing/update work, and a larger support surface without fixing the dependency on Tinkercad's in-page API. A browser bookmarklet is the most portable and low-maintenance first packaging format for desktop users.

### Distribution choices

| Choice | User experience | Maintenance / portability |
| --- | --- | --- |
| Self-contained bookmarklet that downloads `.lyl` | One click after bookmark setup; no intermediate JSON or terminal | Best fit. Static hosting only, same JavaScript across desktop OS/browser families. Build output size and browser differences need validation. |
| Bookmarklet + static/offline converter page | Capture JSON, open/drop into converter, download `.lyl` | Easiest to debug and keeps the bookmarklet small. Extra handoff step; static hosting or a local HTML file, no runtime server. |
| Browser extension | Toolbar click, auto-update, possibly smoother file handoff | Better polish if needed; store submissions, permissions, browser-specific builds, and ongoing compatibility work add cost. Reuse the same JS core. |
| Native desktop app | App window and file handling | Highest packaging, signing, update, and OS maintenance. Not recommended for first release. |

## User experience

### First use

1. Open the downloaded install page or the static HTTPS site. The page shows the tool version and local-conversion instructions.
2. Drag **Export to layerling** to the browser's bookmarks bar.
3. Open a design in Tinkercad and click the bookmark. If enabling the editor tools reloads the page, click again when the design is ready.
4. Watch capture, conversion, and packaging progress. The completed project downloads as one `.lyl` named after the design.
5. Open the `.lyl` through Layerling's existing project-open workflow.

### Returning use and recovery

- Open a design, click the saved bookmark, and open the downloaded project. Additional clicks during capture focus the existing progress panel.
- If the automatic download is blocked, use **Download .lyl again**. The completed Blob stays available until the panel is closed or replaced.
- Errors stay visible in the panel and produce no partial project. Close the panel and retry after the design finishes loading.
- Earlier JSON captures can be converted from the same install page, including when that page is opened offline.
- Updating the install page does not update existing bookmarks. Replace the saved bookmark to install the new code.

### Failure and fallback

- Missing/ambiguous evaluated mesh: stop with node name and actionable retry guidance; never guess a primitive or silently omit geometry.
- Tinkercad capture API changed: explain that the exporter is out of date and link to the fallback STL/OBJ path and support report action.
- Oversized package: identify the limiting count/size and suggest exporting selected components or using native STL/OBJ for a flattened result.
- STL/OBJ fallback should state that it may lose hierarchy, holes as editable operands, names, or per-part colors before import.

## Standalone architecture

1. **Capture boundary:** the exporter in `bookmarklet.template.html` reads the source tree and evaluated world meshes keyed by `versions_id`, including normals and source visibility. It owns the fragile Tinkercad API interaction.
2. **Conversion boundary:** `browser-convert.js` validates the tree and meshes, changes coordinate axes, preserves hierarchy and operands, and writes the existing Layerling v2 document and hashed mesh assets. Missing geometry stops conversion.
3. **Source semantics:** evaluated boolean meshes provide the displayed result; operands retain source visibility for editing and Ungroup. Duplicate suppression requires complete surface evidence, preserves winding and normals, and keeps suppressed nodes editable.
4. **Download boundary:** `browser-ui.js` owns progress, one active capture per tab, filename handling, retained Blob URLs, and cleanup. Conversion does not send the model to a server.
5. **Distribution:** `tools/build_browser.py` embeds the source into the install page. `tools/package_release.py` produces a browser-only ZIP, static-site folder, and allowlisted source ZIP. Generated-page freshness and package verification run in CI.
6. **Compatibility evidence:** Python remains the reference writer. Differential checks compare project documents and exact binary assets; independent stored-geometry checks and manual Layerling/browser checks cover different boundaries.

## Delivery phases

### Phase 0 — Standalone prototype and compatibility spike (complete)

- Confirm `.lyl` archive details and current Layerling project/scene schema so the standalone writer stays compatible.
- Verify which Tinkercad captures can be obtained without mutating the source and document browser/version prerequisites.
- Use an assembly cleared for redistribution as a golden fixture; add small synthetic fixtures for a primitive, nested bundle, color group, subtraction, imported mesh, custom generator, hidden part, and incomplete capture.
- Confirm the standalone distribution approach with the maintainer; a supported Tinkercad file input would be a separate future route.

### Phase 1 — Browser conversion parity (in progress)

- Port package validation and conversion into the browser JavaScript bundle; keep the Python implementation as a parity oracle during transition.
- Reuse geometry and serialization checks from the prototype, including exact per-vertex checks, node counts, save/reopen, invalid/missing mesh failures, ambiguous identities, and ZIP output boundaries.
- Download a `.lyl` that opens and saves through Layerling's ordinary project workflow.

Current state: the dependency-free writer matches Python's v2 document structure and exact mesh bytes on 18 synthetic assemblies and the archived development capture. Closed convex alternate triangulations are supported with consistent orientation. Stored geometry verification covers 537 meshes with zero measured vertex error. ZIP STORE, a progress panel, duplicate-click protection, and persistent download recovery are implemented. Independent Layerling open/save/reopen and cross-browser installation checks remain.

### Phase 2 — Standalone release page and user workflow (partly complete)

- Publish the static bookmarklet installation page, one-time setup guidance, progress/error states, and STL/OBJ fallback.
- Localize strings and test keyboard, touch, and desktop-browser file handling.
- Verify on a range of designs and supported browsers, beyond the original development fixture.

### Phase 3 — Optional distribution improvements

- Evaluate an extension only if real users find bookmark installation or execution limiting. Reuse the same capture/conversion modules.
- Revisit first-party Layerling integration only if Autodesk provides a supported data route or the maintainer asks for it.

## Acceptance criteria

- A first-time desktop user can install the bookmark and follow instructions without command line or Python; a returning user needs one click in Tinkercad and then opens the downloaded `.lyl`.
- The source Tinkercad design is read-only throughout capture.
- Conversion is local; no design data or credentials are sent to the converter publisher or Layerling.
- A valid package opens with the full editable tree, expected visibility/colors, correct boolean results, and no guessed geometry; all source mesh positions match within exporter precision.
- A generated `.lyl` opens in Layerling, saves, closes, and reopens without geometry loss.
- Large or malformed captures fail with clear, actionable errors and bounded resource use.
- A redistributable assembly and representative fixtures pass through the browser converter and Layerling's normal open/save/reopen workflow.
- The fallback tells users what STL/OBJ will discard.

## Open decisions

- The standalone repository uses MIT; public publication still requires the source and redistribution review noted in `docs/publishing.md`.
- Does a self-contained bookmarklet fit comfortably within Chrome, Edge, Firefox, and Safari bookmark behavior?
- Which browsers and Tinkercad editor versions will be listed as tested, given the undocumented testkit API?
- What mesh triangle/file limits keep conversion responsive on ordinary computers?
- Should the Python CLI remain a supported alternative or become developer-only after JavaScript parity?

## Evidence and references

- Prototype contract and source: [conversion details](../../tinkercad-import/README.md), [exporter](../../tinkercad-import/bookmarklet.html), and [converter](../../tinkercad-import/convert.py). Design-specific evidence remains in the ignored local archive.
- The standalone handoff uses Layerling's ordinary `.lyl` project workflow. Background references for possible future integration are the [Layerling repository](https://github.com/henmedia/layerling) and its [web entry point](https://github.com/henmedia/layerling/blob/main/apps/web/src/app/page.tsx).
