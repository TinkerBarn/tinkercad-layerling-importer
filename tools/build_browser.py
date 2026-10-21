"""Build the self-contained browser install page and bookmarklet."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "tinkercad-import" / "bookmarklet.template.html"
CONVERTER = ROOT / "tinkercad-import" / "browser-convert.js"
IMPORTER = ROOT / "tinkercad-import" / "browser-ui.js"
OUTPUT = ROOT / "tinkercad-import" / "bookmarklet.html"
MARKER = "/* CONVERTER_SOURCE */"


def main():
    version = (ROOT / "VERSION").read_text().strip()
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
        raise SystemExit("VERSION must contain a numeric major.minor.patch version")
    template = TEMPLATE.read_text(encoding="utf-8").replace("{{VERSION}}", version)
    converter = CONVERTER.read_text(encoding="utf-8").strip()
    importer = IMPORTER.read_text(encoding="utf-8").strip()
    if template.count(MARKER) != 1:
        raise SystemExit("Expected one converter marker in the install template")
    if template.count("/* IMPORTER_SOURCE */") != 1:
        raise SystemExit("Expected one importer marker in the install template")
    # Escape closing script tags before embedding source in HTML.
    escape = lambda source: re.sub(r"</script", lambda match: "<\\/" + match.group()[2:], source, flags=re.IGNORECASE)
    output = template.replace(MARKER, escape(converter)).replace("/* IMPORTER_SOURCE */", escape(importer))
    OUTPUT.write_text(output, encoding="utf-8", newline="\n")
    source = converter + "\n" + template.split('<script id="exporter">', 1)[1].split("</script>", 1)[0].strip() + "\n" + importer + "\nvoid runLayerlingImport();"
    from urllib.parse import quote
    length = len("javascript:" + quote(source, safe="~!*'()-._"))
    print(f"Built {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes HTML; {length:,} characters in bookmark URL)")


if __name__ == "__main__":
    main()
