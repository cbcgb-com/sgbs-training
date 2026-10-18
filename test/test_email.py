"""Tests for homework email templates and the email ops skill."""

from pathlib import Path

from sgbs_training import email as email_mod

REPO_ROOT = Path(__file__).resolve().parents[1]
EMAIL_SKILL_DIR = REPO_ROOT / ".agents" / "skills" / "sgbs-email"
EMAIL_SKILL = EMAIL_SKILL_DIR / "SKILL.md"
SATURDAY_REMINDER_REF = EMAIL_SKILL_DIR / "references" / "saturday-reminder.md"
WEEKLY_HOMEWORK_REF = EMAIL_SKILL_DIR / "references" / "weekly-homework.md"
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
    "Eric's HEY account",
    "Never send",
    "references/weekly-homework.md",
    "references/saturday-reminder.md",
    "references/reinvitation.md",
)


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
    body = email_mod.compose_homework_reminder_email()
    for line in body.splitlines():
        if line:
            assert line not in skill
    assert not OLD_REMINDER_SKILL.exists()
    assert not (EMAIL_SKILL_DIR / "references" / "book-reflection.md").exists()
    assert not hasattr(email_mod, "compose_book_reflection_email")


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
