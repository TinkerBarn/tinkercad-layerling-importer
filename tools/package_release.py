"""Build a source-only ZIP without Git history or private development fixtures."""

import hashlib
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FILES = (
    ".gitattributes",
    ".gitignore",
    ".github/workflows/tests.yml",
    "AGENTS.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "README.md",
    "docs/publishing.md",
    "docs/plans/tinkercad-import-integration.md",
    "tinkercad-import/README.md",
    "tinkercad-import/bookmarklet.html",
    "tinkercad-import/convert.py",
    "tinkercad-import/test_converter.py",
    "tinkercad-import/test_exporter.cjs",
    "tinkercad-import/verify_geometry.py",
    "tools/package_release.py",
)


def main():
    paths = list(FILES)
    # Read all inputs before replacing a previous package.
    sources = {name: (ROOT / name).read_bytes() for name in paths}
    checksums = "".join(
        f"{hashlib.sha256(data).hexdigest()}  {name}\n"
        for name, data in sources.items()
    )
    output = ROOT / "dist" / "tinkercad-layerling-importer.zip"
    output.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in sources.items():
            archive.writestr(name, data)
        archive.writestr("SHA256SUMS", checksums)
    print(f"Wrote {output} ({len(sources)} source files plus checksums)")


if __name__ == "__main__":
    main()
