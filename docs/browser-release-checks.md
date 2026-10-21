# Compatibility and release checks

## Support level

Version 0.2.1 is a preview for desktop browsers. A user has reported successful direct conversion. Automated checks run on Windows and Linux; they do not establish Safari, Firefox or mobile compatibility. Browser-engine and Layerling save/reopen checks must be recorded separately below as they are completed.

The bookmark uses modern JavaScript, Web Crypto, Blob downloads and Tinkercad's undocumented editor tools. Browser policies can block bookmark installation, console pasting or automatic downloads. A persistent download link is provided when automatic download does not start. Large designs depend on available memory.

## Automated evidence

- 14 Python regressions and 19 Node regressions cover evaluated geometry, normals, color inheritance, duplicate surfaces and winding, progress, retry, disposal and capture failure.
- 18 synthetic assemblies compare browser and Python project documents and mesh bytes.
- Source ZIP contents and checksums are verified; portable checks rerun from the extracted source ZIP.
- The offline ZIP and hosted site share identical installer bytes.
- Release checks cover tag validation, external hashes and rejection of unexpected or unsafe archive entries.
- Six release regressions include the draft-release lookup that failed during the initial launch attempt.

Run the commands in CONTRIBUTING.md to reproduce these checks. Simulated page tests do not exercise an actual browser engine. Stored-geometry comparison does not prove the current Layerling renderer displays it correctly.

## Hosted preview checks — 21 October 2026

The v0.2.1 release and Pages deployment completed successfully. All four CI combinations passed: Windows and Linux, each with Python 3.10 and 3.13 and Node.js 22.

Unauthenticated HTTPS requests verified both release ZIP hashes, all three hosted files against the browser ZIP, and the source, issue and compatibility links.

Chrome 155.0.8059.80 on Windows (build 26300) displayed the correct version, executed the complete 62,782-character bookmark link and showed the expected wrong-page guard, showed the missing-file validation message, and downloaded the offline edition.

Bookmark installation and capture from the live Tinkercad editor, JSON file conversion in a real browser, and Layerling open/ungroup/save/reopen remain independently unverified for this release. The successful simulated capture/conversion tests and user-reported imports do not replace these checks. Edge, Firefox, Safari, macOS, Linux desktop browsers and mobile browsers have not been manually verified.

## Manual release checklist

Record browser/version, OS, date and result for each completed check:

- Install the bookmark from the hosted HTTPS page.
- Capture without changing the source, including the first-use reload.
- Observe progress, download and retry.
- Convert an earlier JSON capture from the install page.
- Open a disposable result in Layerling, ungroup a copy and inspect operands.
- Save to a new file, reopen and compare.

Unrecorded checks remain unverified. Do not extend support claims from a single browser to other platforms.
