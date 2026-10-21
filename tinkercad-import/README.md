# Conversion details

Start with the [setup and usage instructions](../README.md).

## Optional Python CLI

Python 3.10+ is required only for this path. Use a capture exported through the bookmarklet's advanced troubleshooting option:

```sh
python tinkercad-import/convert.py path/to/tinkercad-design.json -o MyDesign.lyl --name MyDesign
```

Use `py` on Windows or `python3` on macOS/Linux if needed. Replace the example paths with your own files.

## Geometry and editing

Every leaf and evaluated boolean group needs a mesh keyed by its unique `versions_id`. Positions use Tinkercad world coordinates; normals are included when available. The exporter applies each node's actual world transform, including nested placement, scaling, and reflections. The converter changes axes from `(x,y,z)` to `(x,z,-y)` for Layerling.

Boolean groups carry both their evaluated result and their editable operands. The group displays the result mesh. Ungroup restores the solid and hole cutters with their source visibility. A visible hole cutter is translucent; an explicitly hidden source object stays hidden.

Imported parts can be selected, moved, resized, recolored, and ungrouped. Tinkercad generator parameters do not become native Layerling sketch constraints or parametric features. Geometry is the source tessellation rather than an analytic CAD boundary representation.

Coincident solid surfaces within one bundle root are suppressed only after comparing complete geometry and normals at capture precision. The last matching source surface and material remain visible; suppressed copies remain as hidden editable nodes. Triangle ordering and cyclic vertex rotations can differ, but reversed winding stays distinct. Both converters also recognize alternate triangulations of a closed convex surface with matching orientation. Nearby parts and equal bounding boxes are insufficient to suppress a surface. Boolean operands and objects in different roots remain separate.

Missing or malformed geometry stops conversion. The converter does not infer a replacement box, cone, or primitive from a preset name. Tree-only exports and old preset-name mesh caches need a fresh capture.

## Export format

The bookmarklet captures a JSON object internally and converts it to a Layerling project. The optional JSON capture script is available from the console instructions. A saved JSON export can be converted from the install page. The capture contains:

- `format`: `tinkercad-evaluated-world-v1`.
- `shapes`: the source shape tree.
- `meshes`: per-node evaluated meshes keyed by `versions_id`, each with `space: "world"`, flat triangle `positions`, and optional `normals`.
- `diagnostics`: capture metadata for troubleshooting.

Each triangle uses nine position values. The exporter handles indexed geometry before capture. The browser converter writes a Layerling version 2 project ZIP containing `project.json` and hashed mesh assets. It uses uncompressed ZIP entries to avoid a runtime library, so `.lyl` files can be larger than those from Python's compressed ZIP. The Python converter remains available as a command-line alternative.

## Troubleshooting

**`RangeError: Invalid string length` while exporting JSON:** replace the saved bookmark with the current version. Diagnostic JSON exports serialize numeric arrays in bounded chunks. Direct `.lyl` conversion retains captured geometry in memory, so very large designs can still exceed available browser memory.

**Nothing downloaded:** keep the progress panel open and click **Download .lyl again** when the project is ready. Closing the panel releases its download. Clicking the bookmark after completion starts a fresh capture; clicking while it is busy keeps the current capture.

**A path containing `$env:USERPROFILE` fails:** that syntax belongs to PowerShell. Windows Command Prompt uses `%USERPROFILE%`. Provide an absolute path if your shell does not expand the example.

**Missing geometry:** wait for the design to finish loading and export again. A repeated failure may indicate a Tinkercad API change or unsupported scene state. Do not remove the error check to produce a partial project.

**Faceted outlines on curved parts:** generated projects enable Layerling's standard outline mode. In the tested reader, automatic mesh outlines used a 14-degree crease cutoff while standard outlines used 25 degrees. Changing workspace display settings can make source tessellation more visible.

## Verification and limits

`convert.py --self-test` runs the Python converter regression suite. `node --test test_exporter.cjs` checks bounded serialization and incomplete-capture refusal. `node --test test_browser_converter.cjs` checks browser archive generation and strict geometry rejection. These use synthetic fixtures.

`verify_geometry.py capture.json design.lyl` checks ZIP integrity, asset hashes, mesh counts, and every stored world vertex against the capture. Optional `--rendered file.json` compares a separately collected renderer capture in both directions, allowing vertex reordering. This repository does not include a portable renderer-capture tool.

`python tools/check_browser_parity.py` compares the shipped browser converter with Python on synthetic assemblies, checking project structure, exact mesh bytes, hashes, and ZIP CRCs. Add `--capture path/to/capture.json` for a local assembly. See the [review record and manual compatibility checklist](../docs/browser-release-checks.md).

Manual checks should include grouped appearance, Ungroup, hole visibility, and save/reopen in Layerling. The local development archive contains prior design-specific evidence; it is excluded from distribution. No universal compatibility promise is made for future Tinkercad APIs, Layerling readers, materials, or file sizes.
