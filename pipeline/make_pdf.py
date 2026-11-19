"""Joins images into one PDF (the comment-keyword freebie).  usage: python make_pdf.py out.pdf a.jpg b.jpg ..."""
import sys
from PIL import Image

out, files = sys.argv[1], sys.argv[2:]
pages = [Image.open(f).convert("RGB") for f in files]
pages[0].save(out, save_all=True, append_images=pages[1:], resolution=150)
print(out)
