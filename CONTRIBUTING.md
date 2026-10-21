# Contributing

The converter uses the Python standard library. The exporter and its tests use browser APIs and Node.js built-ins. There is no dependency installation step for the default checks.

Run from the repository directory:

```sh
python tinkercad-import/convert.py --self-test
node --test tinkercad-import/test_exporter.cjs
git diff --check
```

Use Python 3.10+ and Node.js 22+. CI runs the checks on Windows and Linux. If you change geometry conversion, add a small synthetic case that exercises the affected behavior. If you change capture, test the production download path, including large numeric arrays.

Keep source Tinkercad designs read-only. Preserve source positions, normals, hierarchy, and operand visibility. Do not replace missing geometry with inferred primitives or merge parts solely because their bounds match.

Keep private design exports, generated `.lyl` files, screenshots, credentials, and machine-specific helpers under `.local/`, which is ignored. Tests must run without those files. Use synthetic or explicitly licensed fixtures for shared examples.

When reporting a problem, include your OS, browser, Python version, the failing step, and the error text. Share a minimal reproduction you have permission to distribute. Captures can contain the complete design, including hidden objects; inspect them before sharing.

For manual browser testing, load the application before importing sensitive fixtures and block network requests and WebSockets before exposing their data to the page. Verify grouped display, Ungroup, source visibility, and save/reopen. Stored geometry checks alone do not verify renderer behavior.
