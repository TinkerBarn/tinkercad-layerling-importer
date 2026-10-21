"""Offline release-boundary regressions; no account or network needed."""
import hashlib
from pathlib import Path
import tempfile
import unittest
import zipfile
from unittest.mock import patch

import release


class ReleaseTests(unittest.TestCase):
    def test_tag_validation(self):
        self.assertEqual(release.version_for("v0.2.0"), "0.2.0")
        for value in ("main", "v0.2.0/../../x", "v0.2.0\n", "v1.2.3;whoami"):
            with self.assertRaises(ValueError):
                release.version_for(value)

    def test_version_must_match(self):
        with self.assertRaises(ValueError):
            release.validate_version("v999.0.0")

    def test_zip_rejects_unsafe_extra_and_duplicate_entries(self):
        for extra in ("../bad", "secret.txt", "index.html"):
            with tempfile.TemporaryDirectory(dir=release.ROOT / "tinkercad-import") as directory:
                path = Path(directory) / "browser.zip"
                with zipfile.ZipFile(path, "w") as archive:
                    for name in release.BROWSER_FILES:
                        archive.writestr(name, name)
                    archive.writestr(extra, "bad")
                with self.assertRaises(ValueError):
                    release.read_browser_zip(path)

    def test_checksum_coverage_and_corruption(self):
        with tempfile.TemporaryDirectory(dir=release.ROOT / "tinkercad-import") as directory:
            folder = Path(directory)
            for name in release.ASSETS:
                (folder / name).write_bytes(b"content")
            rows = [hashlib.sha256(b"content").hexdigest() + "  " + name for name in release.ASSETS]
            (folder / "SHA256SUMS").write_text("\n".join(rows))
            release.verify_checksums(folder)
            for invalid in (rows[:1], rows + rows[:1], rows + ["0" * 64 + "  ../bad.zip"]):
                (folder / "SHA256SUMS").write_text("\n".join(invalid))
                with self.assertRaises(ValueError):
                    release.verify_checksums(folder)
            (folder / "SHA256SUMS").write_text("\n".join(rows))
            (folder / release.ASSETS[0]).write_bytes(b"corrupted")
            with self.assertRaises(ValueError):
                release.verify_checksums(folder)

    def test_requires_passing_push_for_exact_commit(self):
        for runs in ([], [{"head_sha": "other", "event": "push", "conclusion": "success"}],
                     [{"head_sha": "a", "event": "push", "conclusion": "failure"}],
                     [{"head_sha": "a", "event": "pull_request", "conclusion": "success"}]):
            with patch.object(release, "api", return_value={"workflow_runs": runs}):
                with self.assertRaises(ValueError):
                    release.require_tests("a")
        with patch.object(release, "api", return_value={"workflow_runs": [
                {"head_sha": "a", "event": "push", "conclusion": "success"}]}):
            release.require_tests("a")


if __name__ == "__main__":
    unittest.main()
