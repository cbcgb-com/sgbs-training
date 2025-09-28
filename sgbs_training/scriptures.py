class Scripture:
    @classmethod
    def resources(self):
        raise NotImplementedError()

    @classmethod
    def class_notes(self):
        raise NotImplementedError()

    @classmethod
    def reference(self):
        raise NotImplementedError()

    @classmethod
    def instructions(self):
        raise NotImplementedError()

    @classmethod
    def english_analysis(self):
        raise NotImplementedError()

    @classmethod
    def study_questions_title(self):
        return "查經題目"

    @classmethod
    def study_notes_title(self):
        return "查經筆記"

    @classmethod
    def extra_content(self):
        return ""


class Luke(Scripture):
    @classmethod
    def resources(self):
        return """
- The Bible Project:
    - Luke 1-9/路加福音1-9章
        - English: [Overview: Luke 1-9](https://youtu.be/XIb_dCIxzr0)
        - 中文: [《读圣经》系列：路加福音 上集 Luke 1-9](https://youtu.be/ZJuoMEko3Ps)
    - Luke 10-24/路加福音10-24章
        - English: [Overview: Luke 10-24](https://youtu.be/26z_KhwNdD8)
        - 中文: [《读圣经》系列：路加福音 下集 Luke 10-24](https://youtu.be/wejDO8LuhTw)
- New Bible Commentary (Chinese)/証主21世紀聖經新釋: [路加福音](https://ericmjl.github.io/nbc-zh/42-luke.html)
    - 個人鏈接，請勿傳播

"""

    @classmethod
    def class_notes(self):
        return "[『如何理解敘述文的筆記』](https://cbcgb-com.github.io/sgbs-training/tools/ibs-narrative-notes/)以及《你們給他們吃吧！》第一章和第四章。"

    @classmethod
    def reference(self):
        return "耶穌在西門家（路加福音7章36-50節）"

    @classmethod
    def english_analysis(self):
        return ""

    @classmethod
    def book(self):
        return "路加福音"

    @classmethod
    def extra_content(self):
        return """
補充資源：書卷概論。如果大家希望更深入了解整本數卷的結構和背景，通常可以參閱新約/舊約概論書。這次給大家提供新約概論書籍Constantine R. Campbell, Reading the New Testament as Christian Scripture的[路加福音(Chapter 8)章節](https://drive.google.com/file/d/13REHx9RUdUHOKCrOzBimHe3uijtGirsJ/view?usp=sharing)，供有興趣的弟兄姊妹參考。
"""


class John(Scripture):
    @classmethod
    def resources(self):
        return """
- The Bible Project:
    - John 1-12/約翰福音1-12章
        - English: [Overview: John 1-12](https://youtu.be/G-2e9mMf7E8)
        - 中文: [《读圣经》系列：约翰福音 上集 John 1-12](https://youtu.be/p2MVilLGm7M)
    - John 13-21/路加福音13-21章
        - English: [Overview: John 13-21](https://youtu.be/RUfh_wOsauk)
        - 中文: [《读圣经》系列：约翰福音 下集 John 13-21](https://youtu.be/VfJLO5O8390)
- New Bible Commentary (Chinese)/証主21世紀聖經新釋: [约翰福音](https://ericmjl.github.io/nbc-zh/43-john.html)
    - 個人鏈接，請勿傳播

"""

    @classmethod
    def class_notes(self):
        return "[『如何理解敘述文的筆記』](https://cbcgb-com.github.io/sgbs-training/tools/ibs-narrative-notes/)"

    @classmethod
    def reference(self):
        return "迦拿的婚宴（約翰福音2章1-12節。）"

    @classmethod
    def english_analysis(self):
        return ""

    @classmethod
    def book(self):
        return "約翰福音"


class James(Scripture):
    @classmethod
    def resources(self):
        return """
- The Bible Project:
    - James/雅各書
        - English: [Overview: James](https://youtu.be/qn-hLHWwRYY)
        - 中文: [《读圣经》系列：雅各书 James](https://youtu.be/vC_4a0MtpCY)

- New Bible Commentary (Chinese)/証主21世紀聖經新釋: [雅各布书](https://ericmjl.github.io/nbc-zh/59-james.html)
    - 個人鏈接，請勿傳播

"""

    @classmethod
    def class_notes(self):
        return "[『如何理解論說文的筆記』](https://cbcgb-com.github.io/sgbs-training/tools/ibs-argumentation-notes/)"

    @classmethod
    def reference(self):
        return "舌头（雅各書3章1-12節。）"

    @classmethod
    def english_analysis(self):
        return "- 假如你想要的話，可以在查經筆記上練習[英文文法分析](https://cbcgb-com.github.io/sgbs-training/class-notes/lesson-4-argumentation/#_5)。"

    @classmethod
    def book(self):
        return "雅各書"


class Ephesians(Scripture):
    @classmethod
    def resources(self):
        return """
- The Bible Project:
    - Ephesians/以弗所書
        - English: [Overview: Ephesians](https://youtu.be/Y71r-T98E2Q)
        - 中文: [《读圣经》系列：以弗所书 Ephesians](https://youtu.be/0RU9aZZDqmk)

- New Bible Commentary (Chinese)/証主21世紀聖經新釋: [以弗所书](https://ericmjl.github.io/nbc-zh/49-ephesians.html)
    - 個人鏈接，請勿傳播

"""

    @classmethod
    def class_notes(self):
        return "[『如何理解論說文的筆記』](https://cbcgb-com.github.io/sgbs-training/tools/ibs-argumentation-notes/)"

    @classmethod
    def reference(self):
        return "得救是本乎恩，也因着信（以弗所書2章1-10節。）"

    @classmethod
    def english_analysis(self):
        return "- 假如你想要的話，可以在查經筆記上練習[英文文法分析](https://cbcgb-com.github.io/sgbs-training/class-notes/lesson-4-argumentation/#_5)。"

    @classmethod
    def book(self):
        return "以弗所書"


scripture_mapping = {
    "John": John,
    "john": John,
    "Luke": Luke,
    "luke": Luke,
    "James": James,
    "james": James,
    "Ephesians": Ephesians,
    "ephesians": Ephesians,
}
