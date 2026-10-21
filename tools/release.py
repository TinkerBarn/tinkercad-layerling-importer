"""Prepare releases and stage their exact assets for Pages. Requires GitHub CLI."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile

from package_release import FILES, ROOT

REPOSITORY = "taylormadearmy/tinkercad-layerling-importer"
ASSETS = ("tinkercad-layerling-importer.zip", "tinkercad-layerling-browser.zip")
BROWSER_FILES = ("index.html", "LICENSE.txt", "README.txt")


def run(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def gh(*args):
    return run("gh", *args)


def api(path):
    return json.loads(gh("api", f"repos/{REPOSITORY}/{path}"))


def version_for(tag):
    if not re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+", tag):
        raise ValueError("Tag must be v followed by major.minor.patch")
    return tag[1:]


def validate_version(tag):
    if version_for(tag) != (ROOT / "VERSION").read_text().strip():
        raise ValueError("Tag does not match VERSION in this commit")


def tag_commit(tag):
    version_for(tag)
    ref = api(f"git/ref/tags/{tag}")["object"]
    if ref["type"] != "commit" or not re.fullmatch(r"[0-9a-f]{40}", ref["sha"]):
        raise ValueError("Expected a lightweight release tag pointing at a commit")
    return ref["sha"]


def require_tests(commit):
    runs = api(f"actions/workflows/tests.yml/runs?head_sha={commit}&per_page=100")["workflow_runs"]
    if not any(item["head_sha"] == commit and item["event"] == "push"
               and item["conclusion"] == "success" for item in runs):
        raise ValueError("Tests must pass on a push of this exact commit before release")


def verify_checksums(folder):
    manifest = (folder / "SHA256SUMS").read_text().splitlines()
    parsed = {}
    for line in manifest:
        match = re.fullmatch(r"([0-9a-f]{64})  ([a-z-]+\.zip)", line)
        if not match or match[2] not in ASSETS or match[2] in parsed:
            raise ValueError("Unexpected or duplicate checksum entry")
        parsed[match[2]] = match[1]
    if set(parsed) != set(ASSETS):
        raise ValueError("Checksums must cover both release ZIPs")
    for name, digest in parsed.items():
        if hashlib.sha256((folder / name).read_bytes()).hexdigest() != digest:
            raise ValueError(f"Checksum mismatch: {name}")


def read_browser_zip(path):
    with zipfile.ZipFile(path) as archive:
        if sorted(archive.namelist()) != sorted(BROWSER_FILES) or archive.testzip():
            raise ValueError("Browser ZIP must contain exactly the three site files")
        return {name: archive.read(name) for name in BROWSER_FILES}


def verify_assets(folder, *, compare_source=True):
    verify_checksums(folder)
    browser = read_browser_zip(folder / ASSETS[1])
    with zipfile.ZipFile(folder / ASSETS[0]) as archive:
        if sorted(archive.namelist()) != sorted((*FILES, "SHA256SUMS")) or archive.testzip():
            raise ValueError("Source ZIP differs from the source allowlist")
        checksums = archive.read("SHA256SUMS").decode().splitlines()
        expected = [f"{hashlib.sha256(archive.read(name)).hexdigest()}  {name}" for name in FILES]
        if checksums != expected:
            raise ValueError("Source file checksum mismatch")
        if compare_source:
            for name in FILES:
                if archive.read(name) != (ROOT / name).read_bytes():
                    raise ValueError(f"Release source differs from tagged commit: {name}")
        if browser["index.html"] != archive.read("tinkercad-import/bookmarklet.html"):
            raise ValueError("Browser and source installers differ")
        if browser["LICENSE.txt"] != archive.read("LICENSE"):
            raise ValueError("Browser and source licenses differ")
    return browser


def download(tag):
    folder = ROOT / "dist" / "download"
    folder.mkdir(parents=True, exist_ok=True)
    # Exact patterns keep unrelated assets out; --clobber permits a failed-job retry.
    gh("release", "download", tag, "--repo", REPOSITORY, "--dir", str(folder),
       "--pattern", "*.zip", "--pattern", "SHA256SUMS", "--clobber")
    return folder


def prepare(tag):
    validate_version(tag)
    commit = run("git", "rev-parse", "HEAD")
    require_tests(commit)
    # Refuse to replace existing releases or version tags.
    refs = api("git/matching-refs/tags/" + tag)
    releases = api("releases?per_page=100")
    if any(ref["ref"] == "refs/tags/" + tag for ref in refs) or any(r["tag_name"] == tag for r in releases):
        raise ValueError("Version already exists; use a new version or resume publication")
    for script in ("tools/package_release.py", "tools/check_release.py"):
        run("python", script)
    verify_assets(ROOT / "dist")
    notes = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    (ROOT / "dist/notes.md").write_text(notes + f"\nSource commit: `{commit}`\n", encoding="utf-8")
    gh("api", "--method", "POST", f"repos/{REPOSITORY}/git/refs",
       "-f", "ref=refs/tags/" + tag, "-f", "sha=" + commit)
    gh("release", "create", tag, "--repo", REPOSITORY, "--verify-tag", "--target", commit,
       "--draft", "--prerelease", "--title", f"{tag} preview", "--notes-file", str(ROOT / "dist/notes.md"),
       *(str(ROOT / "dist" / name) for name in (*ASSETS, "SHA256SUMS")))
    print("Draft prepared from tested commit " + commit)


def stage(tag, *, rollback=False):
    commit = tag_commit(tag)
    if not rollback:
        validate_version(tag)
        if commit != run("git", "rev-parse", "HEAD"):
            raise ValueError("Checkout must match the exact release tag")
        require_tests(commit)
    release = api(f"releases/tags/{tag}")
    if rollback and release["draft"]:
        raise ValueError("Rollback requires a published release")
    names = [asset["name"] for asset in release["assets"]]
    if sorted(names) != sorted((*ASSETS, "SHA256SUMS")):
        raise ValueError("Release must contain exactly the two ZIPs and SHA256SUMS")
    folder = download(tag)
    if rollback:
        # Older versions may have a different source allowlist. Hosting uses only
        # the strict browser archive after verifying both external ZIP digests.
        verify_checksums(folder)
        browser = read_browser_zip(folder / ASSETS[1])
        if f"Version {version_for(tag)}".encode() not in browser["index.html"]:
            raise ValueError("Rollback installer version differs from tag")
    else:
        browser = verify_assets(folder)
    site = ROOT / "dist/site"
    site.mkdir(parents=True, exist_ok=True)
    if any(item.name not in BROWSER_FILES for item in site.iterdir()):
        raise ValueError("Unexpected existing site file")
    for name, data in browser.items():
        (site / name).write_bytes(data)
    if not rollback and release["draft"]:
        gh("release", "edit", tag, "--repo", REPOSITORY, "--draft=false")
    print(f"Verified exact {tag} assets and staged site")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("prepare", "resolve", "publish", "rollback"))
    parser.add_argument("tag")
    args = parser.parse_args()
    version_for(args.tag)
    if args.mode == "prepare":
        prepare(args.tag)
    elif args.mode == "resolve":
        commit = tag_commit(args.tag)
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
                output.write("commit=" + commit + "\n")
        print(commit)
    else:
        stage(args.tag, rollback=args.mode == "rollback")


if __name__ == "__main__":
    main()
