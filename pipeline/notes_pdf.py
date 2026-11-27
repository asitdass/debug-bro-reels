"""Builds the DSA-101 freebie: a written explanation of the problem with code in Python, Java, C++ and JavaScript.

usage: python3 pipeline/notes_pdf.py <slug> [out.pdf]
Reads episodes/<slug>/episode.json and notes.json (shape: src/dsaSchema.js). The text is real text, so readers can
search it and copy the code.
"""
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (CondPageBreak, KeepTogether, ListFlowable, ListItem, Paragraph, Preformatted,
                                SimpleDocTemplate, Spacer, Table, TableStyle)

ROOT = Path(__file__).resolve().parent.parent
INK = colors.HexColor("#1b1f33")
MUTED = colors.HexColor("#5b6380")
AMBER = colors.HexColor("#ffc857")
CREAM = colors.HexColor("#fff7e0")
CODE_BG = colors.HexColor("#f3f4f9")
LINE = colors.HexColor("#d9dcea")
WIDTH = A4[0] - 36 * mm

BODY = ParagraphStyle("body", fontName="Helvetica", fontSize=10.5, leading=15.5, textColor=INK, spaceAfter=6)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=9, leading=12.5, textColor=MUTED, spaceAfter=0)
CELL = ParagraphStyle("cell", parent=BODY, fontSize=9.5, leading=13, spaceAfter=0)
MONO = ParagraphStyle("mono", parent=CELL, fontName="Courier", fontSize=9)
H1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=21, leading=26, textColor=INK, spaceAfter=6)
H2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13.5, leading=17, textColor=INK, spaceBefore=12, spaceAfter=6)

LANGS = [("python", "Python"), ("java", "Java"), ("cpp", "C++"), ("javascript", "JavaScript")]


def p(text, style=BODY):
    return Paragraph(escape(text), style)


def heading(text):
    # start a new page rather than leave a heading stranded at the bottom
    return [CondPageBreak(32 * mm), Paragraph(escape(text), H2)]


def bullets(items, numbered=False):
    return ListFlowable([ListItem(p(t, BODY), leftIndent=16) for t in items], bulletType="1" if numbered else "bullet",
                        start=None if numbered else "•", bulletFontName="Helvetica-Bold", bulletFontSize=10, leftIndent=14)


def boxed(flow, fill=CODE_BG, edge=LINE):
    t = Table([[flow]], colWidths=[WIDTH])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), fill), ("BOX", (0, 0), (-1, -1), 0.8, edge),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return t


def code_block(code):
    longest = max(code.split("\n"), key=len)
    size = 9.2
    while size > 6 and stringWidth(longest, "Courier", size) > WIDTH - 22:
        size -= 0.2
    return boxed(Preformatted(code, ParagraphStyle("code", fontName="Courier", fontSize=size, leading=size * 1.35, textColor=INK)))


def grid(rows, widths, head=True):
    t = Table(rows, colWidths=widths, repeatRows=1 if head else 0)
    style = [("GRID", (0, 0), (-1, -1), 0.6, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
             ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]
    if head:
        style.append(("BACKGROUND", (0, 0), (-1, 0), CREAM))
    t.setStyle(TableStyle(style))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(AMBER)
    canvas.rect(0, A4[1] - 5 * mm, A4[0], 5 * mm, stroke=0, fill=1)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8.5)
    canvas.drawString(18 * mm, 10 * mm, "@debug_bro  |  DSA-101")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build(slug, out):
    folder = ROOT / "episodes" / slug
    ep = json.loads((folder / "episode.json").read_text(encoding="utf-8"))
    n = json.loads((folder / "notes.json").read_text(encoding="utf-8"))
    meta = ep["dsa"]

    story = [
        p(f"DSA-101  |  Question {meta['n']:02d}  |  LeetCode {meta['leetcode']}  |  {meta['difficulty']}  |  {meta['category']}", SMALL),
        Spacer(1, 4),
        p(n["title"], H1),
        *heading("The problem"),
        p(n["problem"]),
    ]
    for k, ex in enumerate(n["examples"], 1):
        story += [KeepTogether([boxed([p(f"Example {k}:  {ex['input']}", MONO), p(f"Output:     {ex['output']}", MONO),
                                       Spacer(1, 3), p(ex["why"], CELL)]), Spacer(1, 6)])]

    b = n["brute"]
    story += [*heading("Picture it"), boxed(p(n["analogy"], CELL), CREAM, AMBER),
              *heading("First idea: brute force"), p(b["explain"]), p(f"Time {b['time']}, space {b['space']}.", SMALL),
              *heading("The key insight"), *[p(t) for t in n["insight"]],
              *heading("Algorithm, step by step"), bullets(n["steps"], numbered=True)]

    run = n["dryRun"]
    cols = len(run["headers"])
    # give each column room in proportion to its longest text
    longest = [max(len(r[i]) for r in [run["headers"], *run["rows"]]) + 4 for i in range(cols)]
    widths = [WIDTH * x / sum(longest) for x in longest]
    rows = [[p(h, CELL) for h in run["headers"]]] + [[p(c, MONO) for c in r] for r in run["rows"]]
    story += [CondPageBreak(60 * mm), *heading("Dry run"), p(run["input"], MONO), Spacer(1, 5), grid(rows, widths)]

    story += [*heading("The code")]
    for key, label in LANGS:
        c = n["code"][key]
        story += [KeepTogether([p(label, ParagraphStyle("lang", parent=H2, fontSize=11.5, spaceBefore=6, spaceAfter=3)),
                                code_block(c["code"]), Spacer(1, 4), p(c["note"], SMALL), Spacer(1, 6)])]

    cx = n["complexity"]
    story += [*heading("Complexity"),
              grid([[p("Time", CELL), p(cx["time"], MONO), p(cx["timeWhy"], CELL)],
                    [p("Space", CELL), p(cx["space"], MONO), p(cx["spaceWhy"], CELL)]],
                   [WIDTH * 0.12, WIDTH * 0.2, WIDTH * 0.68], head=False),
              *heading("Mistakes to avoid"), bullets(n["mistakes"]),
              *heading("How to say it in the interview"), bullets(n["interview"]),
              *heading("Practise next")]
    story += [bullets([f"LeetCode {q['leetcode']}, {q['name']}: {q['why']}" for q in n["practice"]])]

    doc = SimpleDocTemplate(str(out), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm,
                            bottomMargin=17 * mm, title=n["title"], author="@debug_bro")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(out)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    slug = sys.argv[1]
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "out" / slug / "notes.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)
    build(slug, out)
