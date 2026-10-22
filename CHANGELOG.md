# Changelog

## 0.2.3 — Continue export when some geometry fails

- Export the evaluated shapes that Tinkercad can provide when another shape times out or fails.
- Skip a failed Boolean group together with its operands to avoid exporting misleading loose solids or holes.
- Warn in the export panel and installer download for partial projects; fail only when no geometry was captured.

## 0.2.2 — Clearer instructions

- Explain how to show the bookmarks bar on Windows, Linux and Mac.
- Separate one-time bookmark setup from exporting each design.
- Explain dragging the button, the first-use reload, download retry and opening the file in layerling.
- Move technical options and compatibility details into expandable sections.

The export code is unchanged. Existing v0.2.1 bookmarks can keep being used.

## 0.2.1 — Preview

- Resolve draft releases by ID during publication, with a regression for the failed lookup.
- First public hosted preview. The 0.2.0 candidate was retained as an unpublished draft.

Replace your saved bookmark to install this version.

## 0.2.0 — Preview

- Capture and convert directly to `.lyl` from a Tinkercad bookmark.
- Convert earlier JSON captures locally from the install page.
- Preserve evaluated meshes, normals, colors, grouping and editable operands.
- Show progress and a retry download link; prevent simultaneous imports in a tab.
- Distribute a self-contained offline edition, source package and checksums.

Replace your saved bookmark to install this version. This preview depends on undocumented Tinkercad editor tools. See the compatibility notes before relying on a particular browser.
