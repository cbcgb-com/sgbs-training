"""Email-related code and templates."""

from .scriptures import scripture_mapping


def get_lesson_info(scripture_name: str):
    """Get lesson information based on scripture name.

    Args:
        scripture_name: The scripture name (e.g., "Luke", "John", "Ephesians", "James")

    Returns:
        dict: Dictionary containing lesson_number, reading_assignments, additional_exercises, and greeting
    """
    lesson_mapping = {
        "Luke": {
            "lesson_number": 1,
            "greeting": "感恩今天有機會跟大家一起探討查經的意義和裝備！",
            "reading_assignments": [
                "請閱讀[【敘述文體的歸納法查經】](https://cbcgb-com.github.io/sgbs-training/tools/ibs-narrative-notes/)",
                "請閱讀【你們喂他們吃吧】第1和4章",
                "**下週課程預備**：請閱讀[【敘述文】](https://cbcgb-com.github.io/sgbs-training/class-notes/lesson-2-narrative/)第一部分（課前預讀內容），了解敘述文分析的基本原則和文學工具，並在查經筆記中特別留意作者使用了哪些文學技巧（如重複、對比、對話、詳細描述等）",
            ],
            "additional_exercises": [],
        },
        "John": {
            "lesson_number": 2,
            "greeting": "感恩今天有機會跟大家一起學習敘述文的分析技巧！",
            "reading_assignments": [
                "請閱讀[【預備查經題目】](https://cbcgb-com.github.io/sgbs-training/class-notes/lesson-3-questioning/)第一部分（課前預讀內容），了解問題設計的基本原則"
            ],
            "additional_exercises": [
                "問題評估練習：",
                "    1. **主領和觀察員**：對你們設計的查經問題進行自我評估，並提出改進建議",
                "    2. **其他人**：基於你們的查經筆記，設計1-2個查經問題，並對每個問題進行評估：",
                "       - 這個問題可以用「是/否」簡單回答嗎？",
                "       - 這個問題可以直接從經文中找到答案嗎？",
                "       - 這個問題是否清晰，不容易誤解？",
                "       - 這個問題是否引導組員思考，而非僅僅找答案？",
                "    3. 將問題設計、評估結果和改進建議整理到共享的Google文件中，供下週課程深入討論",
            ],
        },
        "Ephesians": {
            "lesson_number": 3,
            "greeting": "感恩今天有機會跟大家一起學習提問題的技術！",
            "reading_assignments": [
                "請閱讀[【論說文體的歸納法查經】](https://cbcgb-com.github.io/sgbs-training/tools/ibs-argumentation-notes/)"
            ],
            "additional_exercises": [
                "史特朗號碼詞彙研究：",
                "    1. 請先閱讀[第四課講義](https://cbcgb-com.github.io/sgbs-training/class-notes/lesson-4-argumentation/)第一部分『字詞研究的工具：聖經原文的史特朗號碼』章節，了解史特朗號碼的使用方法和解經原則",
                "    2. 請選擇以弗所書2:1-10中的三個關鍵詞彙（建議：『死』（第1節）、『活』（第1節）、『恩典』（第5節）），查找其史特朗號碼，並記錄每個詞在經文中的原文含義",
            ],
        },
        "James": {
            "lesson_number": 4,
            "greeting": "感恩今天有機會跟大家一起學習論說文的分析技巧！",
            "reading_assignments": [
                "請閱讀《你們餵他們吃吧》第2和5章",
                "請閱讀第五課第一部分：課前預讀內容",
            ],
            "additional_exercises": [
                "臨場狀況觀察記錄：",
                "    1. 在你的查經筆記或問題設計中，請記錄一次你曾經觀察到的查經聚會中發生的困難情況",
                "    2. 描述當時的情況：發生了什麼？涉及哪些人？對小組氛圍產生了什麼影響？",
                "    3. 記錄帶領者當時採取了什麼措施來嘗試解決或應對這個情況",
                "    4. 思考：你認為帶領者的應對方式是否有效？為什麼？如果換作是你，你會如何處理？",
            ],
        },
    }

    return lesson_mapping.get(
        scripture_name,
        {
            "lesson_number": 1,
            "greeting": "感恩今天有機會跟大家一起探討查經！",
            "reading_assignments": [],
            "additional_exercises": [],
        },
    )


def compose_homework_email(
    lesson_number: int,
    scripture: str,
    questions_doc: dict,
    notes_doc: dict,
    reading_assignments: list = None,
    additional_exercises: list = None,
    greeting: str = "感恩今天有機會跟大家一起探討查經！",
) -> str:
    """Compose a homework email for any lesson.

    Args:
        lesson_number: The lesson number (1-4).
        scripture: The scripture reference.
        questions_doc: Questions document.
            Should be returned from `sgbs_training.docs.create_exercises`.
        notes_doc: Notes document.
            Should be returned from `sgbs_training.docs.create_exercises`.
        reading_assignments: List of reading assignments for the lesson.
        additional_exercises: List of additional exercises for the lesson.
        greeting: Custom greeting message for the lesson.

    Returns:
        str: The email text as Markdown.
    """
    scripture = scripture_mapping[scripture]

    # Standardized role assignments
    leader_observer_text = f"""**主領和觀察員**：設計查經問題，並將問題整理到[『查經題目』]({questions_doc["alternateLink"]})中"""

    others_text = f"""**其他人**：完成查經筆記，並將筆記整理到[『查經筆記』]({notes_doc["alternateLink"]})中"""

    # Build homework content
    homework_items = []

    # Add reading assignments
    if reading_assignments:
        for i, assignment in enumerate(reading_assignments, 1):
            homework_items.append(f"{i}. {assignment}")

    # Add Bible study preparation
    bible_study_num = len(reading_assignments) + 1 if reading_assignments else 1
    homework_items.append(f"{bible_study_num}. 預備查經【{scripture.reference()}】")
    homework_items.append(f"    1. {leader_observer_text}")
    homework_items.append(f"    2. {others_text}")

    # Add additional exercises
    if additional_exercises:
        for i, exercise in enumerate(additional_exercises, bible_study_num + 1):
            homework_items.append(f"{i}. {exercise}")

    # Join homework items
    homework_content = "\n".join(homework_items)

    text = f"""## 小組查經帶領訓練課堂「{lesson_number}」功課

各位主內同工們好！

{greeting}以下是第{lesson_number}堂課的功課：

{homework_content}

{scripture.extra_content()}

如果有任何問題，請隨時跟我聯繫！

主內，<br>
林意 和 Eric
    """
    return text


def compose_homework_email_legacy(
    scripture: str, questions_doc: dict, notes_doc: dict
) -> str:
    """Legacy wrapper for backward compatibility.

    Args:
        scripture: The scripture reference.
        questions_doc: Questions document.
        notes_doc: Notes document.

    Returns:
        str: The email text as Markdown.
    """
    # Get lesson info from scripture name
    lesson_info = get_lesson_info(scripture)

    return compose_homework_email(
        lesson_number=lesson_info["lesson_number"],
        scripture=scripture,
        questions_doc=questions_doc,
        notes_doc=notes_doc,
        reading_assignments=lesson_info["reading_assignments"],
        additional_exercises=lesson_info["additional_exercises"],
        greeting=lesson_info["greeting"],
    )


def compose_book_reflection_email():
    text = """
感謝你們參加小組查經帶領訓練主日學。如你們所知，我們有一項嚴格的出席政策，以此來認定訓練是否完成。
通常情況下，需要參加5次會議中的4次。據我的記錄，諸位只出席3次。
本季我和林意正在試驗一個備選方案：如果出席三次的話，就請對以下兩本書中的任一本進行書籍反思：

- 《你們給他們吃吧！》
    - [Apple Books](https://books.apple.com/us/book/%E4%BD%A0%E5%80%91%E7%B5%A6%E4%BB%96%E5%80%91%E5%90%83%E5%90%A7/id772422884)
    - [AFC書店](https://afcresources.org/contents/en-us/p3719_Feed_Them.html)
- Laurie Polich，《Help! I'm a Small-Group Leader!: 50 Ways to Lead Teenagers into Animated and Purposeful Discussions》，Zondervan，1998
    - [亞馬遜](https://www.amazon.com/Help-Small-Group-Leader-Laurie-Polich/dp/0310224632/)
    - [Apple Books](https://books.apple.com/cl/book/help-im-a-small-group-leader/id398995929)

為了減輕購買書籍的財務負擔，如果你們需要的話，請將你的收據發給我，我很樂意負責coordinate報銷書籍費用。

鑑於這是一次實驗，並且認識到我們各自的生活都挺忙的，我們原本考慮的deadline是2023年11月5日，
但我認為更合適的deadline應該是課後一個月，即2023年12月3日。期待這樣會給你們更多時間去思考書裡的內容。

如果你們覺得完成這項任務過於繁重，或者如果你們錯過了截止日期，歡迎你們春季學期再次加入我們。
（你們的出席次數將在新的一季重置。）我也會向大家發送一個日曆邀請，並附上適時的提醒。

如果有任何問題，請隨時發給我！
"""
    return text


def compose_reinvitation_email():
    text = """
感謝你參加小組查經帶領訓練主日學。如你所知，我們有較嚴格的出席政策
（[出席政策](https://cbcgb-com.github.io/sgbs-training/completion-policy/)）
來確認是否完成訓練。
我們的基本要求是5次課中至少要出席四次。

根據我們的記錄，你們應該是已經缺席了5次中的3次。
因此，我們無法認定你完成了本次課程。（如果有誤，請務必跟我們說！）

這完全沒問題，我們能理解生活中會有各種事情發生。

如果你想參加下一季的主日學課程，我們非常歡迎你回來。
（每季的出席次數會重置，所以下一季仍需滿足出席標準才算完成。）
"""
    return text


def compose_homework_reminder_email():
    text = """
溫馨提醒！請大家把功課做好喔！鏈接在下面。

也請大家準時。3點開始，晚開始就晚結束！
    """
    return text
