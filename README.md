# Tinkercad to Layerling importer

Capture an open Tinkercad design and convert it into an editable Layerling `.lyl` project. The importer preserves evaluated triangle geometry, colors, grouping, visibility, and boolean operands.

Imported parts are editable meshes, not recovered parametric sketches. The exporter uses Tinkercad's undocumented testkit API, so compatibility can change. This project is an independent prototype and is not affiliated with Autodesk or Layerling.

## Requirements

- Python 3.10 or later; no Python packages required.
- A desktop browser with access to your Tinkercad design. The exporter has been exercised in Chrome.
- Layerling to open the converted project.
- Node.js 22 or later to run the exporter tests; not needed for conversion.

## Use

1. Download this repository and open [tinkercad-import/bookmarklet.html](tinkercad-import/bookmarklet.html) in your browser.
2. Drag **Export to layerling** onto your bookmarks bar.
3. Open your design in Tinkercad and click the bookmark. If the editor reloads to enable its tools, click it again after the design finishes loading.
4. Convert the downloaded `tinkercad-design.json` using one of the commands below, from the repository directory.
5. Open the resulting `.lyl` file in Layerling.

**PowerShell:**

```powershell
py tinkercad-import/convert.py "$env:USERPROFILE\Downloads\tinkercad-design.json" -o "$env:USERPROFILE\Downloads\MyDesign.lyl" --name MyDesign
```

**Windows Command Prompt:**

```bat
py tinkercad-import/convert.py "%USERPROFILE%\Downloads\tinkercad-design.json" -o "%USERPROFILE%\Downloads\MyDesign.lyl" --name MyDesign
```

**Linux or macOS:**

```sh
python3 tinkercad-import/convert.py "$HOME/Downloads/tinkercad-design.json" -o "$HOME/Downloads/MyDesign.lyl" --name MyDesign
```

The exporter reads the open design without changing its objects. Captures and conversion run locally; this tool does not upload your design. Opening the result in another application is a separate step.

After updating the exporter, replace any saved bookmark: bookmarks contain a copy of the old script.

## Checks

Run from the repository directory, using `py` or `python3` in place of `python` where needed:

```sh
python tinkercad-import/convert.py --self-test
node --test tinkercad-import/test_exporter.cjs
python tinkercad-import/verify_geometry.py path/to/capture.json path/to/design.lyl
```

The automated tests use synthetic data and need no accounts or private designs. Geometry verification compares a converted project's stored vertices with its capture; it does not prove that Layerling's current renderer displays them correctly.

See [conversion details and troubleshooting](tinkercad-import/README.md), [contributing](CONTRIBUTING.md), and the [proposed native integration](docs/plans/tinkercad-import-integration.md).

## Distribution

`python tools/package_release.py` builds a source ZIP from an explicit file list, with SHA-256 checksums. It excludes captures, screenshots, generated projects, local diagnostics, and Git history. See [publishing notes](docs/publishing.md) before distributing the repository itself.

## License

The code is available under the [MIT License](LICENSE). Imported designs retain their own ownership and licensing.
