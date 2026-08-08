#!/usr/bin/env python3
"""Regenerate docs/Rivet-Engineering-Primer.pdf from rivet-primer.html.

    python3 docs/primer/build-pdf.py            # build the PDF
    python3 docs/primer/build-pdf.py --verify   # build, then audit each page

`rivet-primer.html` is the same file published as the web artifact: a fragment
with no <html>/<head>/<body>, because the artifact host wraps it at publish
time. This script wraps it for standalone rendering, forces the light theme,
layers on print CSS, and drives headless Chrome's --print-to-pdf.

--verify rasterizes every page through macOS PDFKit (pdf2png.jxa.js) and reports
how much of each page's text block is actually filled. Catches the failure this
document is prone to: a tall figure or table that won't fit in the space left on
a page gets bumped whole to the next one, leaving half a sheet blank.
Requires Pillow + numpy; skipped automatically if they aren't installed.
"""

import pathlib
import re
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "rivet-primer.html"
PRINT_HTML = HERE / "rivet-primer-print.html"
PDF = HERE.parent / "Rivet-Engineering-Primer.pdf"

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PRINT_CSS = """
/* ---- Print / PDF ------------------------------------------------------
   A4 inside the margins is ~700 CSS px, below the 860px mobile breakpoint —
   so every mobile rule has to be explicitly undone here, or the annotation
   gutter collapses and the measure runs to ~90 characters.
   ---------------------------------------------------------------------- */
@page { size: A4; margin: 12mm 10mm 14mm; }

@media print {
  html, body {
    background: #FDFDFE !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
    font-size: 13.5px;
  }

  :root { --gutter: 6.5rem; --gap: 1.75rem; --col: 72ch; }

  .sheet { max-width: none; padding: 0; }

  /* Restore the two-column drawing-sheet layout the mobile query removed. */
  section {
    grid-template-columns: var(--gutter) minmax(0, var(--col));
    gap: 0 var(--gap);
    padding: 1.9rem 0;
  }
  .note {
    position: static;
    padding: 0.5rem 0 0;
    border-bottom: 0;
    margin-bottom: 0;
  }
  .note b { display: block; margin: 0 0 0.45rem; }
  .meta div { border-right: 1px solid var(--rule); border-bottom: 0; }

  /* 12.75rem fits the longest key (.claude/settings.local.json) on one line at
     the 13.5px print base — narrower and it wraps a single orphan character. */
  .row { grid-template-columns: minmax(6rem, 12.75rem) minmax(0, 1fr); gap: 0 1.25rem; }

  .titleblock { padding-top: 0; margin-bottom: 2.6rem; break-after: avoid; }

  /* Diagrams and wide tables take their natural width — no scroll affordance. */
  .frame, .scroll { overflow: visible !important; }
  figure svg { min-width: 0; }

  /* Keep atomic blocks whole across the page break — but NOT tables. A 15-row
     table with break-inside:avoid jumps wholesale to the next page and leaves
     half a sheet blank; splitting it with a repeating header reads better. */
  figure, pre, .rule-box, .rail, .row, .meta, footer { break-inside: avoid; }
  table { break-inside: auto; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  h2, h3 { break-after: avoid; }
  p  { orphans: 2; widows: 2; }

  figure { margin-bottom: 1.2rem; }
  figcaption { margin-top: 0.7rem; padding-top: 0.55rem; }

  a { text-decoration: none; }
}
"""


def build() -> None:
    frag = SRC.read_text()
    m = re.search(r"<title>(.*?)</title>", frag, re.S)
    title = m.group(1).strip() if m else "Rivet — Engineering Primer"
    frag = re.sub(r"<title>.*?</title>\s*", "", frag, count=1, flags=re.S)

    PRINT_HTML.write_text(
        f"""<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
</head>
<body>
{frag}
<style>{PRINT_CSS}</style>
</body>
</html>
"""
    )

    if not pathlib.Path(CHROME).exists():
        sys.exit(f"Chrome not found at {CHROME} — install it or edit CHROME in this script.")

    subprocess.run(
        [
            CHROME,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=8000",
            f"--print-to-pdf={PDF}",
            SRC.as_uri().replace(SRC.name, PRINT_HTML.name),
        ],
        check=True,
        capture_output=True,
    )
    print(f"built {PDF.relative_to(PDF.parents[2])}  ({PDF.stat().st_size // 1024} KB)")


def verify() -> None:
    """Rasterize each page and report how full it is."""
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        print("verify skipped — needs `pip install pillow numpy`")
        return

    pages = HERE / "pages"
    if pages.exists():
        shutil.rmtree(pages)
    pages.mkdir()

    subprocess.run(
        ["osascript", "-l", "JavaScript", str(HERE / "pdf2png.jxa.js"), str(PDF), str(pages), "1.6"],
        check=True,
        capture_output=True,
    )

    fills = []
    for p in sorted(pages.glob("page-*.png")):
        a = np.asarray(Image.open(p).convert("L"))
        h, w = a.shape
        # Crop to the printable text block (A4 with 12mm/14mm/10mm margins).
        box = a[int(h * 12 / 297) : int(h * 283 / 297), int(w * 10 / 210) : int(w * 200 / 210)]
        rows = np.where((box < 235).sum(axis=1) > 0)[0]
        used = (rows[-1] + 1) / box.shape[0] * 100 if len(rows) else 0.0
        fills.append((p.stem[-2:], used))

    for n, u in fills:
        flag = "  <-- short: a figure or table was bumped to the next page" if u < 82 else ""
        print(f"p{n} {u:5.0f}%  {'#' * int(u / 4)}{'.' * (25 - int(u / 4))}{flag}")

    body = [u for _, u in fills[:-1]]  # the final page is legitimately short
    print(f"\n{len(fills)} pages | mean fill excluding the final page: {sum(body)/len(body):.0f}%")


if __name__ == "__main__":
    build()
    if "--verify" in sys.argv:
        verify()
