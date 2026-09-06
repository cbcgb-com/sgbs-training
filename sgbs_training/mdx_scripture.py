"""Scripture quotation block for the course docs.

Authoring syntax (a pymdownx.blocks custom block):

    /// scripture | 馬太福音28章16-20節
    十一個門徒往加利利去，到了耶穌約定的山上……

    ///

The reference is the block's argument (after the `|`). Verse content is
ordinary markdown, one paragraph per passage. It renders semantic markup
that the stylesheet dresses in the scripture-page world (paper, ink,
vermilion, gold):

    <blockquote class="scripture">
        <p class="scripture__ref">馬太福音28章16-20節</p>
        <p>十一個門徒往加利利去……</p>
    </blockquote>

Keeping the markup semantic means the visual treatment (引文箋 / 界欄 /
朱印 / 素引 …) stays a pure CSS decision and can change site-wide
without touching any lesson file.

Enable in `mkdocs.yml` under `markdown_extensions`:

    - sgbs_training.mdx_scripture
"""

import xml.etree.ElementTree as etree

from pymdownx.blocks import BlocksExtension
from pymdownx.blocks.block import Block


class Scripture(Block):
    """One quoted passage with its reference as the block argument."""

    NAME = "scripture"
    ARGUMENT = True

    def on_create(self, parent):
        el = etree.SubElement(parent, "blockquote", {"class": "scripture"})
        reference = (self.argument or "").strip()
        if reference:
            ref = etree.SubElement(el, "p", {"class": "scripture__ref"})
            ref.text = reference
        return el


class ScriptureExtension(BlocksExtension):
    """Register the ``scripture`` custom block."""

    def extendMarkdownBlocks(self, md, block_mgr):
        block_mgr.register(Scripture, {})


def makeExtension(*args, **kwargs):
    """Return the extension instance."""
    return ScriptureExtension(*args, **kwargs)
