"""Passage text for observation app — Luke 7:36-50 simplified Chinese only."""

import re
from typing import TypedDict

# Luke 7:36-50 — 耶穌在西門家 / Jesus at Simon the Pharisee's house
# Source: CUV Simplified (Chinese Union Version)


class Verse(TypedDict):
    n: int
    text: str


def _split_chinese_verses(text: str) -> list[Verse]:
    """Split Chinese passage (one verse per line, leading digit(s))."""
    verses: list[Verse] = []
    for line in text.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^(\d+)\s*(.*)$", line)
        if m:
            verses.append({"n": int(m.group(1)), "text": (m.group(2) or "").strip() or line})
        else:
            verses.append({"n": 0, "text": line})
    return verses


LUKE_7_36_50 = {
    "reference_zh": "路加福音 7:36–50",
    "reference_en": "Luke 7:36–50",
    "simplified": """36 有一个法利赛人请耶稣和他吃饭；耶稣就到法利赛人家里去坐席。
37 那城里有一个女人，是个罪人，知道耶稣在法利赛人家里坐席，就拿着盛香膏的玉瓶，
38 站在耶稣背後，挨着他的脚哭，眼泪湿了耶稣的脚，就用自己的头发擦乾，又用嘴连连亲他的脚，把香膏抹上。
39 请耶稣的法利赛人看见这事，心里说：这人若是先知，必知道摸他的是谁，是个怎样的女人，乃是个罪人。
40 耶稣对他说：西门！我有句话要对你说。西门说：夫子，请说。
41 耶稣说：一个债主有两个人欠他的债；一个欠五十两银子，一个欠五两银子；
42 因为他们无力偿还，债主就开恩免了他们两个人的债。这两个人那一个更爱他呢？
43 西门回答说：我想是那多得恩免的人。耶稣说：你断的不错。
44 於是转过来向着那女人，便对西门说：你看见这女人麽？我进了你的家，你没有给我水洗脚；但这女人用眼泪湿了我的脚，用头发擦乾。
45 你没有与我亲嘴；但这女人从我进来的时候就不住的用嘴亲我的脚。
46 你没有用油抹我的头；但这女人用香膏抹我的脚。
47 所以我告诉你，他许多的罪都赦免了，因为他的爱多；但那赦免少的，他的爱就少。
48 於是对那女人说：你的罪赦免了。
49 同席的人心里说：这是甚麽人，竟赦免人的罪呢？
50 耶稣对那女人说：你的信救了你；平平安安的回去罢！""",
}

PASSAGE = LUKE_7_36_50


def get_passage_verses(passage: dict) -> list[Verse]:
    """Return passage as list of verses (simplified only)."""
    return _split_chinese_verses(passage["simplified"])
