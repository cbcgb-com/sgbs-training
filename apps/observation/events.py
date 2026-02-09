"""Event cards for "what" / sequence of events (Luke 7:36-50)."""

# Default order: summary of events without quoting scripture
LUKE_7_36_50_EVENTS = [
    {"id": "e1", "label": "法利赛人请耶稣吃饭，耶稣到他家里坐席"},
    {"id": "e2", "label": "一个女人（罪人）拿香膏来到耶稣脚前"},
    {"id": "e3", "label": "女人哭，用眼泪湿耶稣的脚，用头发擦乾，亲脚，抹香膏"},
    {"id": "e4", "label": "请耶稣的法利赛人心里说：这人若是先知，必知道摸他的是谁"},
    {"id": "e5", "label": "耶稣对西门说：我有句话要对你说"},
    {"id": "e6", "label": "耶稣讲比喻：债主免了两个欠债人的债，谁更爱他？"},
    {"id": "e7", "label": "西门回答：是那多得恩免的人。耶稣说：你断的不错"},
    {"id": "e8", "label": "耶稣转向女人，对西门对比：你没给我洗脚、亲嘴、抹油，这女人都做了"},
    {"id": "e9", "label": "耶稣说：她许多的罪都赦免了，因为她的爱多"},
    {"id": "e10", "label": "耶稣对女人说：你的罪赦免了"},
    {"id": "e11", "label": "同席的人心里说：这是甚麽人，竟赦免人的罪呢？"},
    {"id": "e12", "label": "耶稣对女人说：你的信救了你，平平安安回去吧"},
]


def get_events_for_passage(passage: dict) -> list[dict]:
    """Return default event cards for the passage (Luke 7:36-50 only)."""
    ref = passage.get("reference_en", "")
    if "Luke 7:36" in ref or "7:36" in ref:
        return LUKE_7_36_50_EVENTS
    return []
