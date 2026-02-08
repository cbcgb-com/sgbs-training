"""Passage text in three versions: Simplified Chinese, Traditional Chinese, NIV English."""

import re
from typing import TypedDict

# Luke 7:36-50 — 耶穌在西門家 / Jesus at Simon the Pharisee's house
# Sources: NIV (Bible Gateway), CUV Traditional, CUV Simplified (Chinese Union Version)


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


def _split_niv_verses(text: str) -> list[Verse]:
    """Split NIV passage (inline verse numbers like '36 When... 37 A woman...')."""
    # Split on " number " to get boundaries; first segment is empty or leading, then (num, content) pairs
    parts = re.split(r"\s+(\d+)\s+", text.strip())
    verses: list[Verse] = []
    i = 1
    while i < len(parts) - 1:
        num = int(parts[i])
        content = (parts[i + 1] or "").strip()
        verses.append({"n": num, "text": content})
        i += 2
    return verses


def get_passage_verses(passage: dict) -> dict[str, list[Verse]]:
    """Return passage as verse lists for simplified, traditional, niv."""
    return {
        "simplified": _split_chinese_verses(passage["simplified"]),
        "traditional": _split_chinese_verses(passage["traditional"]),
        "niv": _split_niv_verses(passage["niv"]),
    }

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
    "traditional": """36 有一個法利賽人請耶穌和他吃飯；耶穌就到法利賽人家裡去坐席。
37 那城裡有一個女人，是個罪人，知道耶穌在法利賽人家裡坐席，就拿著盛香膏的玉瓶，
38 站在耶穌背後，挨著他的腳哭，眼淚溼了耶穌的腳，就用自己的頭髮擦乾，又用嘴連連親他的腳，把香膏抹上。
39 請耶穌的法利賽人看見這事，心裡說：這人若是先知，必知道摸他的是誰，是個怎樣的女人，乃是個罪人。
40 耶穌對他說：西門！我有句話要對你說。西門說：夫子，請說。
41 耶穌說：一個債主有兩個人欠他的債；一個欠五十兩銀子，一個欠五兩銀子；
42 因為他們無力償還，債主就開恩免了他們兩個人的債。這兩個人那一個更愛他呢？
43 西門回答說：我想是那多得恩免的人。耶穌說：你斷的不錯。
44 於是轉過頭來向著那女人，便對西門說：你看見這女人麼？我進了你家，你沒有給我水洗腳；但這女人用眼淚溼了我的腳，用頭髮擦乾。
45 你沒有與我親嘴；但這女人從我進來的時候就不住的用嘴親我的腳。
46 你沒有用油抹我的頭；但這女人用香膏抹我的腳。
47 所以我告訴你，他許多的罪都赦免了，因為他的愛多；但那赦免少的，他的愛就少。
48 於是對那女人說：你的罪赦免了。
49 同席的人心裡說：這是甚麼人，竟赦免人的罪呢？
50 耶穌對那女人說：你的信救了你；平平安安的回去罷！""",
    "niv": """36 When one of the Pharisees invited Jesus to have dinner with him, he went to the Pharisee's house and reclined at the table. 37 A woman in that town who lived a sinful life learned that Jesus was eating at the Pharisee's house, so she came there with an alabaster jar of perfume. 38 As she stood behind him at his feet weeping, she began to wet his feet with her tears. Then she wiped them with her hair, kissed them and poured perfume on them. 39 When the Pharisee who had invited him saw this, he said to himself, "If this man were a prophet, he would know who is touching him and what kind of woman she is—that she is a sinner." 40 Jesus answered him, "Simon, I have something to tell you." "Tell me, teacher," he said. 41 "Two people owed money to a certain moneylender. One owed him five hundred denarii, and the other fifty. 42 Neither of them had the money to pay him back, so he forgave the debts of both. Now which of them will love him more?" 43 Simon replied, "I suppose the one who had the bigger debt forgiven." "You have judged correctly," Jesus said. 44 Then he turned toward the woman and said to Simon, "Do you see this woman? I came into your house. You did not give me any water for my feet, but she wet my feet with her tears and wiped them with her hair. 45 You did not give me a kiss, but this woman, from the time I entered, has not stopped kissing my feet. 46 You did not put oil on my head, but she has poured perfume on my feet. 47 Therefore, I tell you, her many sins have been forgiven—as her great love has shown. But whoever has been forgiven little loves little." 48 Then Jesus said to her, "Your sins are forgiven." 49 The other guests began to say among themselves, "Who is this who even forgives sins?" 50 Jesus said to the woman, "Your faith has saved you; go in peace." """,
}

PASSAGE = LUKE_7_36_50
