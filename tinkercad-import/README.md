# Conversion details

Start with the [setup and usage instructions](../README.md).

## Geometry and editing

Every leaf and evaluated boolean group needs a mesh keyed by its unique `versions_id`. Positions use Tinkercad world coordinates; normals are included when available. The exporter applies each node's actual world transform, including nested placement, scaling, and reflections. The converter changes axes from `(x,y,z)` to `(x,z,-y)` for Layerling.

Boolean groups carry both their evaluated result and their editable operands. The group displays the result mesh. Ungroup restores the solid and hole cutters with their source visibility. A visible hole cutter is translucent; an explicitly hidden source object stays hidden.

Imported parts can be selected, moved, resized, recolored, and ungrouped. Tinkercad generator parameters do not become native Layerling sketch constraints or parametric features. Geometry is the source tessellation rather than an analytic CAD boundary representation.

Coincident solid surfaces within one bundle root are suppressed only after comparing complete geometry. The last matching source surface and material remain visible; suppressed copies remain as hidden editable nodes. Matching alternate triangulations also requires matching vertex clouds and closed convex surfaces. Nearby parts and equal bounding boxes are insufficient to suppress a surface.

Missing or malformed geometry stops conversion. The converter does not infer a replacement box, cone, or primitive from a preset name. Tree-only exports and old preset-name mesh caches need a fresh capture.

## Export format

The bookmarklet downloads a JSON object with:

- `format`: `tinkercad-evaluated-world-v1`.
- `shapes`: the source shape tree.
- `meshes`: per-node evaluated meshes keyed by `versions_id`, each with `space: "world"`, flat triangle `positions`, and optional `normals`.
- `diagnostics`: capture metadata for troubleshooting.

Each triangle uses nine position values. The exporter handles indexed geometry before capture. The converter writes a Layerling version 2 project ZIP containing `project.json` and hashed mesh assets.

## Troubleshooting

**`RangeError: Invalid string length` while exporting:** replace the saved bookmark with the current version. The exporter serializes numeric arrays in bounded chunks and assembles Blobs without creating one whole-design string. Very large designs can still exceed available browser memory.

**A path containing `$env:USERPROFILE` fails:** that syntax belongs to PowerShell. Windows Command Prompt uses `%USERPROFILE%`. Use the command for your shell in the root README, or provide an absolute path.

**Missing geometry:** wait for the design to finish loading and export again. A repeated failure may indicate a Tinkercad API change or unsupported scene state. Do not remove the error check to produce a partial project.

**Faceted outlines on curved parts:** generated projects enable Layerling's standard outline mode. In the tested reader, automatic mesh outlines used a 14-degree crease cutoff while standard outlines used 25 degrees. Changing workspace display settings can make source tessellation more visible.

## Verification and limits

`convert.py --self-test` runs the converter regression suite. `node --test test_exporter.cjs` checks bounded serialization, the actual download function, and failure without a partial download. Both use synthetic fixtures.

`verify_geometry.py capture.json design.lyl` checks ZIP integrity, asset hashes, mesh counts, and every stored world vertex against the capture. Optional `--rendered file.json` compares a separately collected renderer capture in both directions, allowing vertex reordering. This repository does not include a portable renderer-capture tool.

Manual checks should include grouped appearance, Ungroup, hole visibility, and save/reopen in Layerling. The local development archive contains prior design-specific evidence; it is excluded from distribution. No universal compatibility promise is made for future Tinkercad APIs, Layerling readers, materials, or file sizes.
