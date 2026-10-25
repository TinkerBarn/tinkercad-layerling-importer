# Tinkercad to Layerling

Bring your Tinkercad design into Layerling so you can keep editing it. Use the saved export bookmark whenever you want to transfer a design.

**TinkerBarn selection preview:** this branch adds an explicit whole-design/selected-parts choice to the partial-export candidate. It is not an upstream release. No export tests have been run for this feature.

**[Download this branch's setup HTML](https://raw.githubusercontent.com/TinkerBarn/tinkercad-layerling-importer/codex/export-selected-parts/tinkercad-import/bookmarklet.html)** · **[Selection API and limits](docs/tinkercad-selection.md)**

## Set up once

1. Download this branch's `bookmarklet.html` using the link above, save it as HTML and open the saved file on your computer. GitHub Pages is not enabled for this preview.
2. Show the bookmarks bar, the strip of saved links below the address bar. In Chrome, Edge or Firefox, press **Ctrl + Shift + B** on Windows/Linux or **⌘ + Shift + B** on Mac. In Safari, choose **View → Show Favorites Bar**. Skip this if the bar is already visible.
3. Click and hold the blue **Export to layerling** button on the page, drag it onto that bar, then let go. A bookmark with the same name should appear.

These bar instructions follow the browser help for [Chrome](https://support.google.com/chrome/answer/157179), [Edge](https://support.microsoft.com/en-us/edge/keyboard-shortcuts-in-microsoft-edge), [Firefox](https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly) and [Safari](https://support.apple.com/guide/safari/ibrwde09262e/mac). See the compatibility notes for which browsers have actually been checked with this importer.

## Export a design

1. Open your design in Tinkercad's editor and wait for it to load. If you see its preview page, click **Edit** first.
2. For a partial selection, select a part or group in Tinkercad first. Use Shift-click for more parts.
3. Click the saved **Export to layerling** bookmark on your browser's bar. Choose **Export whole design** or **Export selected parts**. If Tinkercad reloads, wait for the design to reappear, reselect the parts and click the bookmark again.
4. Wait for **Project ready**. The `.lyl` file usually goes into your **Downloads** folder. If nothing downloads, click **Download .lyl again** in the export panel. If geometry fails, export stops without a project by default. Choose **Continue without failed parts** only if you accept an incomplete design.
5. On [Layerling's start page](https://layerling.com/), click **Open a design or import geometry** and select that file. You can also drag it into the Layerling window.

Your original Tinkercad design stays unchanged. If you continue after an error, failed parts and any affected Boolean group are omitted; the panel reports how many geometry errors occurred. Repeat only **Export a design** for your next design.

Selection is captured when the bookmark opens. Close and reopen the panel to refresh it. Missing, unsupported or stale selections never trigger a whole-design fallback. Selected groups keep every descendant and Boolean operand; overlapping ancestor/child selections are exported once. World positions stay unchanged. Selected-only filenames end in `- selection.lyl`; design-level spatial notes are included only by **Export whole design**.

To convert an earlier JSON capture, use **Convert an earlier JSON export** on the installer page.

To update this preview, replace the saved bookmark from this branch's new installer. The optional online loader and automatic upstream version controls are excluded, both to retain this fork's feature and to stay below the browser bookmark URL limit. Existing bookmarks keep their installed code.

## What transfers

Evaluated triangle geometry, colors, grouping, visibility, and boolean operands are retained. Parts are editable meshes; original parametric sketches are not recovered. Missing evaluated geometry stops conversion instead of producing a partial project. Large designs require available browser memory.

Whole-design exports retain spatial note text and positions within the [documented note limits](tinkercad-import/README.md#verification-and-limits). Older JSON captures that omitted notes need to be captured again. Selected-only exports omit notes because Tinkercad does not expose a supported association between those design-level notes and the selected parts.

Capture reads the open design without modifying it. Conversion stays in your browser; the importer does not upload designs. GitHub hosts the installer and has its own hosting logs. This unofficial preview uses Tinkercad's undocumented editor tools, which can change. It is not affiliated with Autodesk or Layerling.

See [compatibility and checks](docs/browser-release-checks.md) for historical upstream evidence and [selection API notes](docs/tinkercad-selection.md) for this untested fork preview. Include the branch, browser, operating system and error when reporting a problem. Do not attach a private design.

## Developers

Python 3.10+ and Node.js 22 are used for checks. Runtime conversion has no dependencies. See [CONTRIBUTING.md](CONTRIBUTING.md) for build and check commands, [the CLI guide](tinkercad-import/README.md) for optional Python conversion, and [publishing](docs/publishing.md) for releases.

The project is licensed under [MIT](LICENSE).
