"""Email-related code and templates."""
from .scriptures import scripture_mapping


def compose_homework_email(scripture: str, questions_doc: dict, notes_doc: dict) -> str:
    """Compose a homework email.

    Args:

        scripture: The scripture reference.
        questions_doc: Questions document.
            Should be returned from `sgbs_training.docs.create_exercises`.
        notes_doc: Notes document.
            Should be returned from `sgbs_training.docs.create_exercises`.

    Returns:

        str: The email text as Markdown.
    """
    scripture = scripture_mapping[scripture]
    text = f"""各位主內同工們好！

感恩今天有機會跟大家一起探討查經！以下是這一週的學習內容。

功課（一）：請大家閱讀{scripture.class_notes()}

功課（二）：本週經文：{scripture.reference()}

**a) 帶領者和觀察員**<br>
請你們把預備的題目放在[「查經題目」]({questions_doc['alternateLink']})上，每個小組一頁。第一頁有相關的提示和預備資源。

**b) 其他組員**<br>
請你們把查經筆記寫在[「查經筆記」]({notes_doc['alternateLink']})上，每個人一頁。第一頁同樣有提示和資源可供參考。

{scripture.extra_content()}

如果有任何問題，請隨時跟我聯繫！

主內，<br>
林意 和 Eric
    """
    return text


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
溫馨提醒！

請大家把功課做好喔！鏈接在下面。

請大家準時！3點開始，晚開始就晚結束！
    """
    return text
