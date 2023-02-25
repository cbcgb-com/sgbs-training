"""Email-related code and templates."""
from .scriptures import Scripture

def compose_homework_email(scripture: Scripture, questions_doc: dict, notes_doc: dict) -> str:
    """Compose a homework email.

    Args:

        scripture: The scripture reference.
        questions_doc: Questions document. Should be returned from `sgbs_training.docs.create_exercises`.
        notes_doc: Notes document. Should be returned from `sgbs_training.docs.create_exercises`.

    Returns:

        str: The email text as Markdown.
    """
    text = f"""各位主內同工們好！

感恩今天有機會跟大家一起探討查經！

本週的功課如下：

功課（一）：請大家閱讀{scripture.class_notes()}

功課（二）：本週經文：{scripture.reference()}

**a) 帶領者和觀察員**<br>
請你們把預備的題目放在[「查經題目」]({questions_doc['alternateLink']})上，每個小組一頁。第一頁有相關的提示和預備資源。

**b) 其他組員**<br>
請你們把查經筆記寫在[「查經筆記」]({notes_doc['alternateLink']})上，每個人一頁。第一頁同樣有提示和資源可供參考。

如果有任何問題，請隨時跟我聯繫！

主內，<br>
林意 和 Eric
    """
    return text
