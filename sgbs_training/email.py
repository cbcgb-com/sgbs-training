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


def homework_email_subject(lesson_number: int) -> str:
    """Return the weekly homework-email subject.

    Args:
        lesson_number: The class number whose homework this email assigns.

    Returns:
        str: Subject in the form 小組查經帶領訓練課堂「N」功課.
    """
    return f"小組查經帶領訓練課堂「{lesson_number}」功課"


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

    # Additional exercises are authored as one title line plus indented
    # continuation lines. Only unindented lines get a new top-level number.
    if additional_exercises:
        item_number = bible_study_num + 1
        for exercise in additional_exercises:
            if exercise[:1] in {" ", "\t"}:
                homework_items.append(exercise)
            else:
                homework_items.append(f"{item_number}. {exercise}")
                item_number += 1

    homework_content = "\n".join(homework_items)
    extra = scripture.extra_content().strip()
    extra_block = f"\n{extra}\n" if extra else ""

    return (
        f"## {homework_email_subject(lesson_number)}\n"
        "\n"
        "各位主內同工們好！\n"
        "\n"
        f"{greeting}以下是第{lesson_number}堂課的功課：\n"
        "\n"
        f"{homework_content}\n"
        f"{extra_block}"
        "\n"
        "如果有任何問題，請隨時跟我聯繫！\n"
        "\n"
        "主內，\n"
        "\n"
        "林意 和 Eric"
    )


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


def compose_reinvitation_email(
    name: str, missed_dates: str, remaining_dates: str
) -> str:
    """Compose an individual attendance / reinvitation notice.

    Args:
        name: The student's name (use a placeholder such as ``{name}``
            in tests and committed examples).
        missed_dates: Pre-formatted missed class dates, as they should
            appear after 「你缺席了」.
        remaining_dates: Pre-formatted remaining class dates, as they
            should appear inside the parentheses after 「剩下的課堂」.

    Returns:
        str: The canonical email body.
    """
    return (
        f"{name}，你好！\n"
        "\n"
        "感謝你參加小組查經帶領訓練主日學。如你所知，我們有較嚴格的出席政策"
        "（[出席政策](https://cbcgb-com.github.io/sgbs-training/completion-policy/)）："
        "五堂課中需要出席至少四次，才算完成本季課程。\n"
        "\n"
        f"根據我們的出席記錄，你缺席了{missed_dates}這兩堂課"
        "（如果有誤，請務必告訴我！）。這樣的話，即使剩下的課堂"
        f"（{remaining_dates}）都出席，也達不到完成課程所需的出席次數了。\n"
        "\n"
        "這完全沒問題，我們能理解生活中會有各種事情發生。"
        "誠摯邀請你下一季再來一起學習——每季的出席次數會重新計算。"
        "當然，這一季剩下的課堂，你也隨時歡迎照常來旁聽、一起查經，"
        "我們都很樂意見到你。\n"
        "\n"
        "謝謝你的擺上！如果有任何問題，請隨時跟我聯繫。\n"
        "\n"
        "主內，\n"
        "\n"
        "Eric"
    )


def homework_reminder_subject(upcoming_class_number: int) -> str:
    """Return the Saturday homework-reminder subject.

    Args:
        upcoming_class_number: The class number being reminded for
            (e.g. 5 for the class after lesson 4's homework email).

    Returns:
        str: Subject in the form 小組查經帶領訓練課堂「N」功課提醒.
    """
    return f"小組查經帶領訓練課堂「{upcoming_class_number}」功課提醒"


def compose_homework_reminder_email() -> str:
    """Compose the Saturday homework-reminder email body.

    The body is exactly two lines with one blank line between them.
    Homework lists, links, and a sign-off are omitted on purpose: this
    reminder is a reply on the previous week's homework thread.

    Returns:
        str: The canonical reminder text.
    """
    return (
        "溫馨提醒！請大家把功課做好喔！鏈接在之前的郵件裡。\n"
        "\n"
        "也請大家準時。3點開始！"
    )


# Completion-email copy: keep these literals together so wording
# revisions only touch this block.
FEEDBACK_FORM_URL = "https://sgbs-training.citylight.life/feedback"

_COMPLETION_SUBJECT = "恭喜完成小組查經帶領訓練！"
_COMPLETION_GREETING = "各位主內同工們好！"
_COMPLETION_CONGRATS = (
    "恭喜大家完成了這一季五堂的小組查經帶領訓練！"
    "很感恩這段時間大家的擺上：每週準時來上課、認真完成功課，"
    "在課堂上彼此學習、互相鼓勵。謝謝你們！"
)
_COMPLETION_MISSION = (
    "帶領查經是大使命的一部分，我們也因著主耶穌而得以參與其中。"
    "盼望大家以後帶查經的時候，也常常把這個使命放在心上。"
)
_COMPLETION_FEEDBACK = (
    "也想邀請大家花幾分鐘填寫這份心得回饋表，"
    "分享一下這一季參與的感想（用報名時的郵箱登入即可填寫）："
    "{url}"
)
_COMPLETION_FULL_ATTENDANCE = (
    "也要特別謝謝這一季全程參與、一堂課都沒缺席的同工們："
    "{names}，謝謝你們忠心的擺上！"
)
_COMPLETION_BLESSING = (
    "願你們將這段時間所學帶回各自的小組和團契，"
    "與弟兄姊妹一同在神的話語中紮根成長。"
)
_COMPLETION_CONTACT = "如果有任何問題，請隨時跟我們聯繫！"
_COMPLETION_SIGNOFF = "主內，\n林意 和 Eric"


def completion_email_subject() -> str:
    """Return the end-of-term completion-email subject.

    Returns:
        str: 恭喜完成小組查經帶領訓練！
    """
    return _COMPLETION_SUBJECT


def compose_completion_email(
    full_attendance_names: list[str] | None = None,
) -> str:
    """Compose the end-of-term completion email.

    The feedback-form paragraph is always included and points at
    :data:`FEEDBACK_FORM_URL` (the in-app page, never a Google Form).
    The perfect-attendance shout-out is included only when names are
    given.

    Args:
        full_attendance_names: Names of students who attended every
            class. Joined with ``、``. Omit or pass an empty list to
            leave the shout-out out. Use placeholders in tests.

    Returns:
        str: The canonical email body.
    """
    parts = [
        _COMPLETION_GREETING,
        _COMPLETION_CONGRATS,
        _COMPLETION_MISSION,
        _COMPLETION_FEEDBACK.format(url=FEEDBACK_FORM_URL),
    ]
    if full_attendance_names:
        parts.append(
            _COMPLETION_FULL_ATTENDANCE.format(
                names="、".join(full_attendance_names)
            )
        )
    parts.extend(
        [
            _COMPLETION_BLESSING,
            _COMPLETION_CONTACT,
            _COMPLETION_SIGNOFF,
        ]
    )
    return "\n\n".join(parts)
