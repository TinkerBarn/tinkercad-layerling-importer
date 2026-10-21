# Tinkercad to Layerling

Convert the design open in Tinkercad into an editable Layerling `.lyl` project. No server, Python install, or browser extension is needed.

**[Open the installer](https://taylormadearmy.github.io/tinkercad-layerling-importer/)** · **[Download the offline browser edition](https://github.com/taylormadearmy/tinkercad-layerling-importer/releases/download/v0.2.1/tinkercad-layerling-browser.zip)**

## Use

1. Open the installer and drag **Export to layerling** onto your bookmarks bar. Show the bookmarks bar first if it is hidden.
2. Open your design in the Tinkercad editor and click the saved bookmark. If the editor reloads, wait for the design to load and click it again.
3. Wait for **Project ready**. If the download does not start, click **Download .lyl again** in the progress panel.
4. Open the downloaded file in Layerling using **File → Open** or drop it onto the window.

For offline installation, extract the browser ZIP and open `index.html`. To convert an earlier JSON capture, use **Convert an earlier JSON export** on the installer page.

To update, replace the saved bookmark from the new installer. Existing bookmarks keep their installed code.

## What transfers

Evaluated triangle geometry, colors, grouping, visibility, and boolean operands are retained. Parts are editable meshes; original parametric sketches are not recovered. Missing evaluated geometry stops conversion instead of producing a partial project. Large designs require available browser memory.

Capture reads the open design without modifying it. Conversion stays in your browser; the importer does not upload designs. GitHub hosts the installer and has its own hosting logs. This unofficial preview uses Tinkercad's undocumented editor tools, which can change. It is not affiliated with Autodesk or Layerling.

See [compatibility and checks](docs/browser-release-checks.md). Report problems through [GitHub Issues](https://github.com/taylormadearmy/tinkercad-layerling-importer/issues/new?template=bug.yml); include the version, browser, operating system and error. Do not attach a private design.

## Developers

Python 3.10+ and Node.js 22 are used for checks. Runtime conversion has no dependencies. See [CONTRIBUTING.md](CONTRIBUTING.md) for build and check commands, [the CLI guide](tinkercad-import/README.md) for optional Python conversion, and [publishing](docs/publishing.md) for releases.

The project is licensed under [MIT](LICENSE).
