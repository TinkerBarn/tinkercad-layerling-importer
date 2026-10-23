# Contributing

Use synthetic, shareable examples. Do not commit captured designs, generated `.lyl` files, screenshots of private designs, credentials, or local browser profiles.

## Build and check

Install Python 3.10+ and Node.js 22. Install the pinned build-only minifier with the first command below. Browser users need no installation. Run from the repository root (use `py` or `python3` instead of `python` where needed):

```sh
npm ci --ignore-scripts --no-audit --no-fund
python tools/build_browser.py
python tinkercad-import/convert.py --self-test
node --test tinkercad-import/test_browser_converter.cjs tinkercad-import/test_exporter.cjs
python tools/check_browser_parity.py
python tools/package_release.py
python tools/check_release.py
python -m unittest discover -s tools -p "test_release.py"
git diff --check
```

Edit the HTML template and browser modules, then rebuild the generated HTML. The build uses Terser only to remove comments/whitespace and shorten local names; compression rewrites and property renaming are disabled. It rejects either bookmark above Firefox’s 65,536-character URL limit. Commit the generated page with its sources. CI checks freshness on Windows and Linux. The browser regressions execute the actual compact bookmark. The parity check compares browser output with the Python reference across synthetic assemblies; package checks rerun the portable checks from the extracted source ZIP.

For an optional local capture comparison, use `python tools/check_browser_parity.py --capture path/to/capture.json`. Keep that capture outside Git.

## Report a problem

Include the importer version, browser and version, operating system, failure stage and exact error. For CLI problems include the Python version. Start with the error text; provide a minimal shareable example only if needed. Do not include private design data in public issues.

## Review changes

Describe the observed problem, the change, and checks performed. Geometry changes should include a synthetic regression demonstrating the affected behavior. Preserve source objects and fail clearly when capture is incomplete. Browser-engine checks and Layerling open/save checks are separate from simulated DOM tests; describe which checks actually ran.
