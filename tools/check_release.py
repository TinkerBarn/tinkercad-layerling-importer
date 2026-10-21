"""Check source ZIP contents, hashes, and portable checks from an extracted copy."""
import hashlib
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

from package_release import FILES, ROOT


def main():
    source = ROOT / "dist/tinkercad-layerling-importer.zip"
    with tempfile.TemporaryDirectory(prefix=".release-", dir=ROOT / "tinkercad-import") as directory:
        folder = Path(directory).resolve()
        assert folder.is_relative_to(ROOT)
        with zipfile.ZipFile(source) as archive:
            assert archive.namelist() == list(FILES) + ["SHA256SUMS"]
            assert archive.testzip() is None
            for line in archive.read("SHA256SUMS").decode().splitlines():
                digest, name = line.split("  ", 1)
                assert name in FILES
                assert hashlib.sha256(archive.read(name)).hexdigest() == digest
            archive.extractall(folder)
        for command in (
            [sys.executable, "tinkercad-import/convert.py", "--self-test"],
            ["node", "--test", "tinkercad-import/test_browser_converter.cjs", "tinkercad-import/test_exporter.cjs"],
            [sys.executable, "tools/check_browser_parity.py"],
        ):
            subprocess.run(command, cwd=folder, check=True)
    with zipfile.ZipFile(ROOT / "dist/tinkercad-layerling-browser.zip") as archive:
        assert archive.namelist() == ["index.html", "LICENSE.txt", "README.txt"]
        assert archive.testzip() is None
        assert archive.read("index.html") == (ROOT / "tinkercad-import/bookmarklet.html").read_bytes()
    print("Source and browser bundles verified; portable checks pass from the extracted source ZIP")


if __name__ == "__main__":
    main()
