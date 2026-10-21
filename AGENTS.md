# Repository instructions

Keep the Status, Findings, and TODO sections current after meaningful work.

## Scope

Maintain the read-only Tinkercad exporter and local Layerling converter. Never modify or delete source Tinkercad designs. Do not commit, push, create a PR, or publish unless the user requests it.

## Layout and checks

- `tinkercad-import/bookmarklet.html`: exporter and installation page.
- `tinkercad-import/convert.py`: standard-library converter and CLI.
- `tinkercad-import/test_converter.py`, `test_exporter.cjs`: portable synthetic regressions.
- `tinkercad-import/verify_geometry.py`: compare stored geometry against a capture.
- `tools/package_release.py`: build an explicitly allowlisted source distribution.
- `.local/`: ignored private data, historical notes, and machine-specific diagnostics.

Run `python tinkercad-import/convert.py --self-test`, `node --test tinkercad-import/test_exporter.cjs`, and `git diff --check`. Do not add private captures or generated projects to shared tests.

## Status

- Publication cleanup complete: personal captures, generated projects, historical task logs, and machine-specific browser helpers are preserved under `.local/publication-archive-2026-10-21/`.
- Public documentation describes setup, conversion limits, testing, and the proposed native integration. Existing converter and exporter repairs are retained.
- User selected MIT licensing. The root LICENSE and source distribution include its full notice and terms.
- All 13 converter and three exporter tests pass locally and from an extracted source ZIP. A synthetic CLI conversion verifies with zero stored vertex error; package hashes and relative documentation links validate. Windows/Linux CI is configured but has not run on GitHub.
- Private GitHub repository `taylormadearmy/tinkercad-layerling-importer` created for the tested source-only snapshot with fresh history. The original development checkout's history and remote remain unchanged.

## Findings

- Capture evaluated world geometry per `versions_id`; missing geometry must fail explicitly. Preserve source normals and precision.
- Group result meshes and editable operands serve different purposes. Keep source operand visibility so Ungroup restores hole cutters.
- Serialize large arrays in bounded chunks and test the actual download path.
- Deduplication must compare geometry, not only dimensions, centers, or axes. Never snap valid source parts to hide display artifacts.
- Tinkercad testkit and Layerling's project reader are external compatibility boundaries.
- The original development checkout's Git history contains personal model data. The new source-only repository excludes that history; ignoring or archiving files alone does not remove historical versions.
- The MIT license covers the code; imported designs retain their own ownership and licensing.

## TODO

- [x] Finish portable checks and inspect the source distribution.
- [x] Apply the user-selected MIT license and include it in the source distribution.
- [x] Create the requested private repository from a reviewed source-only snapshot with fresh history.
- Review the native integration plan with Layerling maintainers before implementing it.
