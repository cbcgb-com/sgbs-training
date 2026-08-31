# /// script
# dependencies = ["qrcode", "pillow"]
# ///
"""Regenerate the QR codes embedded on the course homepage (docs/index.md).

- website-qrcode.png      -> the course site itself (mkdocs site_url)
- registration-qrcode.png -> the self-hosted registration form (Convex/Vercel)

Ink-on-white for maximum scan reliability; sized generously for print.
Run from anywhere:  uv run scripts/generate_qrcodes.py
"""

from pathlib import Path

import qrcode

IMAGES = Path(__file__).parent.parent / "docs" / "images"

TARGETS = {
    "website-qrcode.png": "https://cbcgb-com.github.io/sgbs-training/",
    "registration-qrcode.png": "https://sgbs-roster.vercel.app",
}

INK = "#262116"


def main() -> None:
    for filename, url in TARGETS.items():
        qr = qrcode.QRCode(
            error_correction=qrcode.constants.ERROR_CORRECT_Q,
            box_size=12,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color=INK, back_color="white")
        out = IMAGES / filename
        img.save(out)
        print(f"{url} -> {out} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()
