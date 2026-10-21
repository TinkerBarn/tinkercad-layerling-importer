# Repository instructions

Maintain the read-only Tinkercad exporter and local Layerling converter. Never modify source designs. Keep private captures and generated projects out of Git. Publish only when requested.

## Source layout

- `tinkercad-import/bookmarklet.template.html`: installer and capture code.
- `tinkercad-import/browser-convert.js`, `browser-ui.js`: browser converter and progress UI.
- `tinkercad-import/convert.py`: standard-library reference converter.
- `tools/build_browser.py`: embeds the sources and VERSION in generated `bookmarklet.html`.
- `tools/package_release.py`: explicit source allowlist, offline ZIP, static site and checksums.
- `tools/release.py`: draft preparation and publication from verified assets.

Run the commands in CONTRIBUTING.md when verification is requested. Change source files, then regenerate HTML. Do not edit generated HTML directly. Keep the Status, Findings and TODO sections current after meaningful work.

## Status

Version 0.2.1 preview published with HTTPS Pages hosting. Windows/Linux CI, exact release asset checks and hosted delivery checks pass. See docs/browser-release-checks.md for the limited Chrome verification.

## Findings

Tinkercad capture depends on undocumented editor tools. Imported geometry is editable mesh geometry, not recovered sketches. Browser and Python writers must preserve the same evaluated surfaces.

The REST release-by-tag endpoint does not resolve unpublished drafts. Resolve drafts through the CLI, then request asset metadata by release ID.

## TODO

Record additional browser compatibility results as they are tested.

Complete independent live-editor capture, real-browser JSON conversion and Layerling save/reopen checks before expanding support claims.
