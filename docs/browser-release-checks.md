# Compatibility and release checks

## Support level

Version 0.2.0 is a preview for desktop browsers. A user has reported successful direct conversion. Automated checks run on Windows and Linux; they do not establish Safari, Firefox or mobile compatibility. Browser-engine and Layerling save/reopen checks must be recorded separately below as they are completed.

The bookmark uses modern JavaScript, Web Crypto, Blob downloads and Tinkercad's undocumented editor tools. Browser policies can block bookmark installation, console pasting or automatic downloads. A persistent download link is provided when automatic download does not start. Large designs depend on available memory.

## Automated evidence

- 14 Python regressions and 19 Node regressions cover evaluated geometry, normals, color inheritance, duplicate surfaces and winding, progress, retry, disposal and capture failure.
- 18 synthetic assemblies compare browser and Python project documents and mesh bytes.
- Source ZIP contents and checksums are verified; portable checks rerun from the extracted source ZIP.
- The offline ZIP and hosted site share identical installer bytes.
- Release checks cover tag validation, external hashes and rejection of unexpected or unsafe archive entries.

Run the commands in CONTRIBUTING.md to reproduce these checks. Simulated page tests do not exercise an actual browser engine. Stored-geometry comparison does not prove the current Layerling renderer displays it correctly.

## Manual release checklist

Record browser/version, OS, date and result for each completed check:

- Install the bookmark from the hosted HTTPS page.
- Capture without changing the source, including the first-use reload.
- Observe progress, download and retry.
- Convert an earlier JSON capture from the install page.
- Open a disposable result in Layerling, ungroup a copy and inspect operands.
- Save to a new file, reopen and compare.

Unrecorded checks remain unverified. Do not extend support claims from a single browser to other platforms.
