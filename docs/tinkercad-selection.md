# Tinkercad selection export — TinkerBarn fork preview

Branch: `codex/export-selected-parts`, based on the partial-export candidate.
This feature has not been export-tested. No tests were added or run, as requested.
Generated browser files were rebuilt from their sources.

## Inspected selection contract

On 25 October 2026, the public Tinkercad frontend identified editor asset version
`assets_v2_6v4pse`. Its
[`3dviewerBundle.js`](https://editor.tinkercad.com/assets_v2_6v4pse/js/3dviewerBundle.js)
contains `EditorTestKitModel` (webpack module 51670). The downloaded file's SHA-256
is `07ad3bc0c27e35c171c2a3df110e77633bf4bd81199f9909a40fe1f82be329c7`.

That module defines the following read-only methods on `testKit`:

| Method | Implementation contract in the inspected source |
| --- | --- |
| `getSelectionCount()` | Returns `selectionModel.objects.size()`. |
| `getSelectedAt(index)` | Returns `selectionModel.objects.getIndex(index)`, a selected scene-model object. |
| `getSelectedData()` | Serializes those objects' data. It is not used here because only identity and hierarchy are needed before capture. |

The exporter uses the first two methods, feature-detects them, and reads each
selected model's `data.versions_id`. It does not infer selection from the DOM,
navigation state, names, bounds, visibility, or guessed property chains.
The methods are part of Tinkercad's internal testkit, not a stable public SDK.
Source inspection establishes the contract in this asset; it does not establish
compatibility with every editor version or a successful live export.

A requested read-only inspection in Safari was blocked because Safari's
“Allow JavaScript from Apple Events” setting was disabled. No browser security
setting was changed and no exporter execution or source-design mutation was
performed during that inspection.

## Export behavior

- Every bookmark invocation asks for **Export whole design** or **Export selected parts**.
- Selection identities are snapshotted before the panel is inserted, so clicking
  a panel control cannot turn a selected export into a whole-design export.
  Close and reopen the panel after changing the selection.
- Every selected identity must resolve to a unique, live node in
  `testKit.sceneModel`. Missing getters, unsupported selected objects, empty
  selections and stale or ambiguous identities stop selected-only export.
  Whole-design export remains an explicit, separate choice.
- The scene tree, rather than the selection collection's ordering, determines
  the selected roots. A selected descendant whose ancestor is also selected is
  not exported twice. Each selected root keeps all its descendants, including
  hidden geometry and Boolean operands. No ancestor Boolean operation is
  implicitly added when only one of its operands is selected.
- The compact metadata path captures only those roots. The existing metadata
  fallback also filters to the exact selected root identities and rejects a
  missing match; it never falls back to the complete payload.
- World-space meshes, transforms and the usual geometry-failure handling use
  the existing converter path. Filenames for selected-only exports contain
  `- selection`.
- Spatial notes do not have a supported selected-part association. They are
  omitted in selected-only mode; whole-design export retains the existing note
  behavior.
- On first-run testkit activation, Tinkercad may reload. Reselect the parts and
  invoke the bookmark again after that reload.

The console API keeps whole-design capture as its default. A selected-only
capture can explicitly request `exportTinkercadDesign({scope: "selection"})`.

## Installation and publication boundary

Download this branch's `tinkercad-import/bookmarklet.html`, open the saved HTML
file in Safari and drag **Export to layerling** to the Favorites Bar. Replace an
older bookmark to obtain this feature. The source HTML is not a hosted setup
website, and GitHub Pages has not been enabled by this change.

This preview deliberately excludes the upstream online loader and automatic
version/update controls. Loading the original project's hosted runtime would
remove this branch's selection feature. Excluding those optional controls also
keeps the self-contained bookmark within the 65,536-character build limit.
Updates to this preview require replacing the bookmark from its new setup HTML.

Only the new fork feature branch is to be published. The original repository,
existing PR branch and GitHub Pages settings are outside this change.
