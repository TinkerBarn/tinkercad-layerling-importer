# Publish a release

GitHub Pages serves the static installer; GitHub Releases stores the offline and source ZIPs. There is no application server. Installed bookmarks contain their own code and must be replaced to update.

## Prepare

1. Update `VERSION`, `CHANGELOG.md` and compatibility evidence. Use a new version for every published change.
2. Run the CONTRIBUTING checks, commit the generated HTML with its sources, and push. Wait for the **Tests** workflow to pass for that exact commit on Windows and Linux.
3. From GitHub Actions, run **Release**, choose **prepare**, and enter the matching tag, for example `v0.2.1`. Run it from the reviewed main revision.
4. Inspect the resulting draft release, both ZIPs and external `SHA256SUMS`. Preparation creates the version tag at the tested commit. Existing tags and releases are never overwritten.

The browser ZIP contains `index.html`, `LICENSE.txt` and `README.txt`; those same files form the hosted site. The source ZIP has an explicit allowlist and an internal file checksum manifest. No private fixtures or Git history are packaged.

## Publish

1. Ensure the source history, Actions logs and assets are suitable for public access. Pages availability depends on the repository visibility and account plan.
2. Enable Pages using **GitHub Actions** in repository settings. Review the `github-pages` deployment environment restrictions.
3. Run **Release** again with **publish** and the prepared tag. The workflow resolves the tag, requires successful tests for its commit, downloads the draft's exact assets, verifies hashes and source contents, publishes the preview release, and deploys the matching browser files.
4. Check the HTTPS installer, versioned download, source and issue links. Record a real browser import and Layerling save/reopen result.

Publication does not rebuild assets. A deployment failure can be retried with the same tag: an already published release is accepted only after its assets pass the same verification. Initial releases are marked as previews.

## Roll back hosting

Run **Release** with **rollback** and an earlier published tag. Its checksums and browser archive are checked before deploying. Published release assets and tags remain intact; the old installer tells users to replace their bookmark. Rollback does not update previously installed bookmarks.

The workflow has one release/deployment concurrency group. Release writes require `contents: write`; Pages deployment uses `pages: write` and `id-token: write` with the `github-pages` environment. Tests have read access. Actions are pinned to commit revisions.
