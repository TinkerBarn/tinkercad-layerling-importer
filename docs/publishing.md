# Publishing notes

## Build a source snapshot

From the repository directory:

```sh
python tinkercad-import/convert.py --self-test
node --test tinkercad-import/test_exporter.cjs
python tools/package_release.py
```

The package is written to `dist/tinkercad-layerling-importer.zip`. Its explicit file list excludes `.git`, `.local`, design captures, screenshots, generated projects, historical task diaries, and machine-specific diagnostics. The ZIP includes `SHA256SUMS` for its source files. Review its contents before sharing.

The archived development material remains in `.local/publication-archive-2026-10-21/`. It includes the previous repository instructions, environment details, test evidence, and helper scripts. Those helpers retain their historical assumptions and are not part of the supported public workflow.

## Git history

Earlier commits in the original development checkout contain full design captures, generated projects, screenshots, and personal environment details. Removing those files from the current tree does not remove them from history. Do not push that development history to a public remote. Source ZIPs and the new source-only GitHub repository exclude it.

A new repository initialized from the reviewed source ZIP avoids carrying that history; this is the approach used for the private GitHub repository. Alternatively, an explicitly authorized history rewrite can remove it; collaborators and existing clones would need coordination. The original development checkout and its remote remain unchanged.

## Before a release

- Include the selected MIT license and confirm the right to distribute any additional code or fixtures.
- Review the ZIP file list and checksum manifest.
- Run the tests from an extracted copy without the local archive.
- Check the exporter and converted output against the current Tinkercad and Layerling versions using a design cleared for sharing.
- Describe compatibility limits and distinguish automated geometry checks from manual renderer checks.
