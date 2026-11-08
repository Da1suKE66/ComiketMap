"""Render the verified official PDFs into per-hall references. Never downloads booth records.
Requires PyMuPDF and Pillow; input PDFs live in ignored tmp/pdfs/.
"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path("tmp/pdf-tools")))
import pymupdf as pdf
from PIL import Image

root = Path("public/maps")
root.mkdir(parents=True, exist_ok=True)
circles = pdf.open("tmp/pdfs/c109-appeal.pdf")
clips = {
    "east3": (2, (20, 50, 348, 426)), "east2": (2, (348, 50, 663, 426)), "east1": (2, (663, 50, 1001, 426)),
    "east7": (3, (20, 95, 825, 900)),
    "west1": (4, (118, 672, 428, 1155)), "west2": (4, (448, 672, 744, 1155)),
    "south1": (4, (480, 295, 763, 546)), "south2": (4, (480, 52, 763, 295)),
}
corporate = pdf.open("tmp/pdfs/c108-corporate.pdf")

def render(name, document, page, rect):
    rect = pdf.Rect(rect)
    scale = 2400 / max(rect.width, rect.height)
    pix = document[page].get_pixmap(matrix=pdf.Matrix(scale, scale), clip=rect, alpha=False)
    Image.frombytes("RGB", (pix.width, pix.height), pix.samples).save(root / f"{name}.webp", "WEBP", lossless=True)
    print(name, pix.width, pix.height, (root / f"{name}.webp").stat().st_size)

for name, (page, rect) in clips.items():
    render(name, circles, page, rect)
for name, page, rect in [("west3", 9, (30, 310, 375, 819)), ("south3", 11, (30, 434, 450, 825)), ("south4", 11, (30, 20, 450, 434))]:
    render(name, corporate, page, rect)

# The West 4 floor plan spans the top of the pamphlet's two-page spread.
scale = 2.5
images = []
for page in (9, 10):
    pix = corporate[page].get_pixmap(matrix=pdf.Matrix(scale, scale), alpha=False)
    images.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
spread = Image.new("RGB", (sum(i.width for i in images), max(i.height for i in images)), "white")
spread.paste(images[0], (0, 0))
spread.paste(images[1], (images[0].width, 0))
spread.crop(tuple(int(x * scale) for x in (35, 5, 878, 327))).save(root / "west4.webp", "WEBP", lossless=True)
print("west4", (root / "west4.webp").stat().st_size)
