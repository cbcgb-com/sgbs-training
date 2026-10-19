"""Tests for homework email templates and the email ops skill."""

import inspect
import re
from pathlib import Path

from sgbs_training import email as email_mod

REPO_ROOT = Path(__file__).resolve().parents[1]
EMAIL_SKILL_DIR = REPO_ROOT / ".agents" / "skills" / "sgbs-email"
EMAIL_SKILL = EMAIL_SKILL_DIR / "SKILL.md"
SATURDAY_REMINDER_REF = EMAIL_SKILL_DIR / "references" / "saturday-reminder.md"
WEEKLY_HOMEWORK_REF = EMAIL_SKILL_DIR / "references" / "weekly-homework.md"
REINVITATION_REF = EMAIL_SKILL_DIR / "references" / "reinvitation.md"
COMPLETION_REF = EMAIL_SKILL_DIR / "references" / "completion.md"
TONE_REF = EMAIL_SKILL_DIR / "references" / "tone.md"
COMMON_MISTAKES_REF = EMAIL_SKILL_DIR / "references" / "common-mistakes.md"
OLD_REMINDER_SKILL = (
    REPO_ROOT / ".agents" / "skills" / "sgbs-homework-reminder" / "SKILL.md"
)

CANONICAL_REMINDER_BODY = (
    "溫馨提醒！請大家把功課做好喔！鏈接在之前的郵件裡。\n"
    "\n"
    "也請大家準時。3點開始！"
)

RETIRED_REMINDER_PHRASES = (
    "鏈接在下面。",
    "晚開始就晚結束",
)

SKILL_MAP_MUST_MENTION = (
    "compose_homework_email()",
    "get_lesson_info()",
    "compose_homework_email_legacy()",
    "create_exercises",
    "compose_reinvitation_email()",
    "compose_homework_reminder_email()",
    "homework_reminder_subject",
    "homework_email_subject",
    "compose_completion_email()",
    "completion_email_subject",
    "Eric's Gmail identity in HEY",
    "HEY's default sender",
    "@hey.com",
    "Never send",
    "out of scope",
    "報名驗證碼",
    "歡迎報名",
    "小組人數不足通知",
    "references/weekly-homework.md",
    "references/saturday-reminder.md",
    "references/reinvitation.md",
    "references/tone.md",
    "references/completion.md",
)

RETIRED_REINVITATION_PHRASES = (
    "5次中的3次",
    "你們應該是已經缺席了兩次",
)

CANONICAL_REINVITATION_BODY = (
    "{name}，你好！\n"
    "\n"
    "感謝你參加小組查經帶領訓練主日學。如你所知，我們有較嚴格的出席政策"
    "（[出席政策](https://cbcgb-com.github.io/sgbs-training/completion-policy/)）："
    "五堂課中需要出席至少四次，才算完成本季課程。\n"
    "\n"
    "根據我們的出席記錄，你缺席了{missed_dates}這兩堂課"
    "（如果有誤，請務必告訴我！）。這樣的話，即使剩下的課堂"
    "（{remaining_dates}）都出席，也達不到完成課程所需的出席次數了。\n"
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

CANONICAL_COMPLETION_SHOUTOUT = (
    "特別謝謝這一季全程參與、一堂課都沒缺席的同工們："
    "{name_a}、{name_b}，謝謝你們忠心的擺上！"
)
RETIRED_COMPLETION_SHOUTOUT_PREFIX = "也要特別謝謝"


def _canonical_completion_body(shoutout: str | None = None) -> str:
    parts = [
        "各位主內同工們好！",
        (
            "恭喜大家完成了這一季五堂的小組查經帶領訓練！"
            "很感恩這段時間大家的擺上：每週準時來上課、認真完成功課，"
            "在課堂上彼此學習、互相鼓勵。謝謝你們！"
        ),
        (
            "帶領查經是大使命的一部分，我們也因著主耶穌而得以參與其中。"
            "盼望大家以後帶查經的時候，也常常把這個使命放在心上。"
        ),
        (
            "也想邀請大家花幾分鐘填寫這份心得回饋表，"
            "分享一下這一季參與的感想（用報名時的郵箱登入即可填寫）："
            f"{email_mod.FEEDBACK_FORM_URL}"
        ),
    ]
    if shoutout:
        parts.append(shoutout)
    parts.extend(
        [
            (
                "願你們將這段時間所學帶回各自的小組和團契，"
                "與弟兄姊妹一同在神的話語中紮根成長。"
            ),
            "如果有任何問題，請隨時跟我們聯繫！",
            "主內，\n林意 和 Eric",
        ]
    )
    return "\n\n".join(parts)


def _skill_tree_text() -> str:
    parts = [path.read_text(encoding="utf-8") for path in EMAIL_SKILL_DIR.rglob("*") if path.is_file()]
    return "\n".join(parts)


def test_homework_reminder_body_is_exactly_the_canonical_two_lines():
    assert email_mod.compose_homework_reminder_email() == CANONICAL_REMINDER_BODY


def test_homework_reminder_body_omits_retired_wording():
    body = email_mod.compose_homework_reminder_email()
    for phrase in RETIRED_REMINDER_PHRASES:
        assert phrase not in body


def test_homework_reminder_subject_uses_upcoming_class_number():
    assert email_mod.homework_reminder_subject(5) == (
        "小組查經帶領訓練課堂「5」功課提醒"
    )
    assert email_mod.homework_reminder_subject(1) == (
        "小組查經帶領訓練課堂「1」功課提醒"
    )


def test_homework_email_subject_uses_class_number():
    assert email_mod.homework_email_subject(4) == "小組查經帶領訓練課堂「4」功課"
    assert email_mod.homework_email_subject(1) == "小組查經帶領訓練課堂「1」功課"


def _docs() -> tuple[dict, dict]:
    return (
        {"alternateLink": "https://example.com/q"},
        {"alternateLink": "https://example.com/n"},
    )


def test_homework_email_body_starts_with_subject_heading():
    questions_doc, notes_doc = _docs()
    text = email_mod.compose_homework_email(
        lesson_number=4,
        scripture="James",
        questions_doc=questions_doc,
        notes_doc=notes_doc,
    )
    assert text.lstrip().startswith("## 小組查經帶領訓練課堂「4」功課")


def test_homework_email_nests_additional_exercise_subitems():
    info = email_mod.get_lesson_info("John")
    questions_doc, notes_doc = _docs()
    body = email_mod.compose_homework_email(
        lesson_number=info["lesson_number"],
        scripture="John",
        questions_doc=questions_doc,
        notes_doc=notes_doc,
        reading_assignments=info["reading_assignments"],
        additional_exercises=info["additional_exercises"],
        greeting=info["greeting"],
    )
    assert "3. 問題評估練習：" in body
    assert "4.     1." not in body
    assert "    1. **主領和觀察員**" in body
    assert "    2. **其他人**" in body


def test_homework_email_omits_empty_extra_content_and_html_break():
    info = email_mod.get_lesson_info("John")
    questions_doc, notes_doc = _docs()
    body = email_mod.compose_homework_email(
        lesson_number=info["lesson_number"],
        scripture="John",
        questions_doc=questions_doc,
        notes_doc=notes_doc,
        reading_assignments=info["reading_assignments"],
        additional_exercises=info["additional_exercises"],
        greeting=info["greeting"],
    )
    assert "<br>" not in body
    assert "\n\n\n" not in body
    assert body.endswith("主內，\n\n林意 和 Eric")


def test_homework_email_keeps_nonempty_extra_content():
    info = email_mod.get_lesson_info("Luke")
    questions_doc, notes_doc = _docs()
    body = email_mod.compose_homework_email(
        lesson_number=info["lesson_number"],
        scripture="Luke",
        questions_doc=questions_doc,
        notes_doc=notes_doc,
        reading_assignments=info["reading_assignments"],
        additional_exercises=info["additional_exercises"],
        greeting=info["greeting"],
    )
    assert "補充資源：書卷概論" in body


def test_saturday_reminder_reference_quotes_the_code_template():
    reminder = SATURDAY_REMINDER_REF.read_text(encoding="utf-8")
    body = email_mod.compose_homework_reminder_email()
    for line in body.splitlines():
        if line:
            assert line in reminder
    assert email_mod.homework_reminder_subject(5) in reminder
    for phrase in RETIRED_REMINDER_PHRASES:
        assert phrase not in reminder


def test_email_skill_map_points_at_references_and_code():
    skill = EMAIL_SKILL.read_text(encoding="utf-8")
    for phrase in SKILL_MAP_MUST_MENTION:
        assert phrase in skill
    assert skill.count("references/tone.md") >= 5
    body = email_mod.compose_homework_reminder_email()
    for line in body.splitlines():
        if line:
            assert line not in skill
    assert not OLD_REMINDER_SKILL.exists()
    assert not (EMAIL_SKILL_DIR / "references" / "book-reflection.md").exists()
    assert not (EMAIL_SKILL_DIR / "references" / "registration-received.md").exists()
    assert not hasattr(email_mod, "compose_book_reflection_email")
    assert not hasattr(email_mod, "compose_registration_received_email")


def test_weekly_homework_reference_covers_docs_and_subject():
    weekly = WEEKLY_HOMEWORK_REF.read_text(encoding="utf-8")
    assert "查經題目" in weekly
    assert "查經筆記" in weekly
    assert email_mod.homework_email_subject(4) in weekly
    assert email_mod.homework_email_subject(2) in weekly
    assert "John" in weekly
    assert "約翰福音" in weekly
    assert "homework:classEmailList" in weekly
    assert "compose_homework_email_legacy()" in weekly
    assert "disposable" in weekly
    assert "Duane Chang" in weekly
    assert "Juan Chen" in weekly
    assert "Christy Lin" in weekly
    assert "Do not invent" in weekly
    assert "last week's homework thread" in weekly


def test_retired_reminder_wording_absent_from_skill_tree():
    tree = _skill_tree_text()
    for phrase in RETIRED_REMINDER_PHRASES:
        assert phrase not in tree
    for phrase in RETIRED_REINVITATION_PHRASES:
        assert phrase not in email_mod.compose_reinvitation_email(
            name="{name}",
            missed_dates="{missed_dates}",
            remaining_dates="{remaining_dates}",
        )
        assert phrase not in REINVITATION_REF.read_text(encoding="utf-8")
        assert phrase not in (REPO_ROOT / "sgbs_training" / "email.py").read_text(
            encoding="utf-8"
        )


def test_reinvitation_email_matches_canonical_text():
    body = email_mod.compose_reinvitation_email(
        name="{name}",
        missed_dates="{missed_dates}",
        remaining_dates="{remaining_dates}",
    )
    assert body == CANONICAL_REINVITATION_BODY
    for phrase in RETIRED_REINVITATION_PHRASES:
        assert phrase not in body


def test_reinvitation_email_substitutes_parameters():
    body = email_mod.compose_reinvitation_email(
        name="{name}",
        missed_dates="{dates}",
        remaining_dates="{remaining}",
    )
    assert body.startswith("{name}，你好！")
    assert "你缺席了{dates}這兩堂課" in body
    assert "即使剩下的課堂（{remaining}）都出席" in body
    assert "五堂課中需要出席至少四次" in body


def test_reinvitation_reference_quotes_the_code_template():
    ref = REINVITATION_REF.read_text(encoding="utf-8")
    body = email_mod.compose_reinvitation_email(
        name="{name}",
        missed_dates="{missed_dates}",
        remaining_dates="{remaining_dates}",
    )
    for line in body.splitlines():
        if line:
            assert line in ref
    assert "小組查經帶領訓練：出席記錄" in ref
    assert "compose_reinvitation_email(name, missed_dates, remaining_dates)" in ref


def test_completion_email_subject():
    assert email_mod.completion_email_subject() == "恭喜完成小組查經帶領訓練！"


def test_completion_email_body_without_shoutout():
    body = email_mod.compose_completion_email()
    assert body == _canonical_completion_body()
    assert email_mod.FEEDBACK_FORM_URL in body
    assert CANONICAL_COMPLETION_SHOUTOUT.split("：")[0] not in body
    mission = (
        "帶領查經是大使命的一部分，我們也因著主耶穌而得以參與其中。"
        "盼望大家以後帶查經的時候，也常常把這個使命放在心上。"
    )
    feedback = (
        "也想邀請大家花幾分鐘填寫這份心得回饋表，"
        "分享一下這一季參與的感想（用報名時的郵箱登入即可填寫）："
        f"{email_mod.FEEDBACK_FORM_URL}"
    )
    assert mission in body
    assert body.index(mission) < body.index(feedback)
    assert "還記得第一堂課我們一起看的「大使命」嗎？" not in body
    assert "這個訓練是我們在第一堂課一起學習的「大使命」的一部分。" not in body
    assert (
        "願你們將這段時間所學帶回各自的小組和團契，"
        "與弟兄姊妹一同在神的話語中紮根成長。"
    ) in body
    assert "扎根" not in body
    assert "帶著弟兄姊妹一起好好讀神的話" not in body
    assert body.endswith("主內，\n林意 和 Eric")
    assert "主內，\n\n林意 和 Eric" not in body
    assert RETIRED_COMPLETION_SHOUTOUT_PREFIX not in body


def test_completion_email_omits_shoutout_for_empty_names():
    expected = _canonical_completion_body()
    assert email_mod.compose_completion_email(full_attendance_names=[]) == expected
    assert email_mod.compose_completion_email(full_attendance_names=None) == expected


def test_completion_email_optional_full_attendance_shoutout():
    body = email_mod.compose_completion_email(
        full_attendance_names=["{name_a}", "{name_b}"]
    )
    assert body == _canonical_completion_body(CANONICAL_COMPLETION_SHOUTOUT)
    assert CANONICAL_COMPLETION_SHOUTOUT in body
    assert RETIRED_COMPLETION_SHOUTOUT_PREFIX not in body
    assert email_mod.FEEDBACK_FORM_URL in body


def test_completion_email_has_no_reflection_form_url_parameter():
    params = inspect.signature(email_mod.compose_completion_email).parameters
    assert "reflection_form_url" not in params
    assert "full_attendance_names" in params


def test_completion_email_never_uses_google_forms():
    body = email_mod.compose_completion_email()
    assert "docs.google.com" not in body
    assert "forms.gle" not in body
    assert "Google Form" not in body
    assert email_mod.FEEDBACK_FORM_URL == (
        "https://sgbs-training.citylight.life/feedback"
    )


def test_completion_reference_quotes_template_and_policy():
    ref = COMPLETION_REF.read_text(encoding="utf-8")
    body = email_mod.compose_completion_email()
    for line in body.splitlines():
        if line:
            assert line in ref
    assert email_mod.completion_email_subject() in ref
    assert "FEEDBACK_FORM_URL" in ref
    assert "Google Form" in ref
    assert "Convex" in ref
    assert "Confirm" in ref or "confirm" in ref
    assert "full_attendance_names" in ref
    assert RETIRED_COMPLETION_SHOUTOUT_PREFIX not in ref
    assert "特別謝謝這一季全程參與、一堂課都沒缺席的同工們：" in ref


def test_tone_reference_covers_greeting_and_signoff():
    tone = TONE_REF.read_text(encoding="utf-8")
    assert "各位主內同工們好！" in tone
    assert "{name}，你好！" in tone
    assert "林意 和 Eric" in tone
    assert "謝謝你的擺上" in tone
    assert "這完全沒問題，我們能理解生活中會有各種事情發生" in tone
    assert "如果有任何問題，請隨時跟我聯繫！" in tone


def test_skill_names_gmail_identity_in_hey_not_hey_dot_com():
    tree = _skill_tree_text()
    assert "Eric's Gmail identity in HEY" in tree
    assert "HEY's default sender" in tree
    assert "the @hey.com address" in tree
    assert "Eric's HEY account" not in tree
    assert "Eric's HEY mailbox" not in tree
    assert RETIRED_COMPLETION_SHOUTOUT_PREFIX not in tree
    assert not re.search(r"\b[\w.+-]+@[\w.-]+\.\w+\b", tree)
    agents = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
    assert "Eric's Gmail identity in HEY" in agents
    assert "Eric's HEY account" not in agents
    assert RETIRED_COMPLETION_SHOUTOUT_PREFIX not in (
        REPO_ROOT / "sgbs_training" / "email.py"
    ).read_text(encoding="utf-8")
    for path in (
        EMAIL_SKILL,
        WEEKLY_HOMEWORK_REF,
        SATURDAY_REMINDER_REF,
        REINVITATION_REF,
        COMPLETION_REF,
        COMMON_MISTAKES_REF,
    ):
        text = path.read_text(encoding="utf-8")
        assert "Eric's Gmail identity in HEY" in text
        assert "HEY's default sender" in text
        assert "@hey.com" in text


def test_common_mistakes_cover_privacy_and_completion_list():
    mistakes = COMMON_MISTAKES_REF.read_text(encoding="utf-8")
    assert "student names" in mistakes
    assert "{name}" in mistakes
    assert "policy completers" in mistakes
    assert "Confirm that list with Eric" in mistakes
    assert "FEEDBACK_FORM_URL" in mistakes
    assert "Google Form" in mistakes
    assert "3-of-5" in mistakes
    assert "Convex mutations" in mistakes
    assert "Eric's Gmail identity in HEY" in mistakes
    assert "HEY's default sender" in mistakes
    assert "@hey.com" in mistakes
