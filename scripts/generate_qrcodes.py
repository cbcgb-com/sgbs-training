# /// script
# dependencies = ["qrcode", "pillow", "zxing-cpp"]
# ///
"""Regenerate the two QR codes embedded on the course homepage
(docs/index.md), in the roster app's scripture-page theme.

- website-qrcode.png      -> the class-content site (mkdocs site_url,
                             GitHub Pages)
- registration-qrcode.png -> the self-hosted roster app
                             (sgbs-training.citylight.life)

Both codes share one style: rounded ink-to-vermilion radial-gradient
modules on warm paper, with a vermilion 「查」 seal badge at the center
(safe under ERROR_CORRECT_H, 30% redundancy). The QR version is pinned
so both images have identical module counts and visual density; the
roster URL is shorter and would otherwise land one version smaller.

Every generated image is decoded with zxing-cpp and asserted to equal
its target URL — a file ships only if it scans.

Run from anywhere:  uv run scripts/generate_qrcodes.py
"""

from pathlib import Path

import qrcode
import zxingcpp
from PIL import Image, ImageDraw, ImageFont
from qrcode.constants import ERROR_CORRECT_H
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import RadialGradiantColorMask
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer

IMAGES = Path(__file__).parent.parent / "docs" / "images"

# The two live destinations.
TARGETS = {
    "website-qrcode.png": "https://cbcgb-com.github.io/sgbs-training/",
    "registration-qrcode.png": "https://sgbs-training.citylight.life",
}

# Scripture-page palette (apps/roster/src/index.css), as RGB tuples —
# the color mask interpolates element-wise, so hex strings corrupt it.
PAPER = (250, 246, 236)      # #faf6ec
INK = (38, 33, 22)           # #262116
VERMILION = (179, 64, 42)    # #b3402a

# Pinned so both codes render at identical module counts (37x37).
QR_VERSION = 5
BOX_SIZE = 12
BORDER = 4

BADGE_TEXT = "查"
# Font stack: macOS Songti first, then Noto Serif TC if installed.
FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "/System/Library/Fonts/Supplemental/NotoSerifCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit("No CJK serif font found for the badge; install one.")


def make_badge(qr_size: int) -> Image.Image:
    """Vermilion rounded-square seal with a paper 「查」, ~24% of the code."""
    side = round(qr_size * 0.24)
    badge = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    radius = max(6, side // 6)
    # Seal red on paper, with a thin paper inner keyline (double-rule echo).
    draw.rounded_rectangle(
        [0, 0, side - 1, side - 1], radius=radius, fill=VERMILION
    )
    inset = max(2, side // 14)
    draw.rounded_rectangle(
        [inset, inset, side - 1 - inset, side - 1 - inset],
        radius=max(3, (side - 2 * inset) // 6),
        outline=PAPER,
        width=max(1, side // 28),
    )
    font = load_font(round(side * 0.56))
    left, top, right, bottom = draw.textbbox((0, 0), BADGE_TEXT, font=font)
    draw.text(
        ((side - (right - left)) / 2 - left, (side - (bottom - top)) / 2 - top),
        BADGE_TEXT,
        font=font,
        fill=PAPER,
    )
    return badge


def build(url: str) -> Image.Image:
    qr = qrcode.QRCode(
        version=QR_VERSION,
        error_correction=ERROR_CORRECT_H,
        box_size=BOX_SIZE,
        border=BORDER,
    )
    qr.add_data(url)
    qr.make(fit=False)
    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=RadialGradiantColorMask(
            back_color=PAPER, center_color=INK, edge_color=VERMILION
        ),
    ).convert("RGBA")

    badge = make_badge(img.size[0])
    offset = ((img.size[0] - badge.size[0]) // 2, (img.size[1] - badge.size[1]) // 2)
    img.alpha_composite(badge, offset)
    return img.convert("RGB")


def verify(path: Path, expected: str) -> str:
    results = zxingcpp.read_barcodes(Image.open(path))
    if not results:
        raise SystemExit(f"FAIL: {path.name} did not decode")
    decoded = results[0].text
    if decoded != expected:
        raise SystemExit(f"FAIL: {path.name} decodes to {decoded!r}, expected {expected!r}")
    return decoded


def main() -> None:
    for filename, url in TARGETS.items():
        img = build(url)
        out = IMAGES / filename
        img.save(out)
        verify(out, url)
        print(f"{url} -> {out} ({img.size[0]}x{img.size[1]}) [scan-verified]")


if __name__ == "__main__":
    main()