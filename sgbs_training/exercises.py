from .scriptures import Scripture


def study_questions(scripture: Scripture, num_groups: int):
    text = f"""

# 查經題目

## 說明

- 請閱讀{scripture.class_notes()}來學習如何使用歸納法查經來理解敘述文。
- 閱讀完之後，請寫下你的查經筆記。假如這是你的第一次使用歸納法來研讀聖經的話，可以參考『查經筆記』中的示範。
- 最後，請設計好你的查經程序，包括破冰題目，臨場要大家討論的問題，以及預先想好的總結點。可以參考本文件中的框架。
- 觀察員請過目一下自己小組的查經主領同工所預備的題目單張，並找出你們在其中有疑問的地方，並且加一個comment。

## 提示

如果你想看這個Doc整體的outline，請點擊：View → Show document outline。這樣就可以快速跳到屬於自己小組的頁面。

## 經文

{scripture.reference()}

## 資源

{scripture.resources()}

<hr class="pb">

# 小組名字：示範組合（不要在本頁上寫）

## 經文

（这里可以粘贴经文，方便自己reference）

## 破冰題目

（这里放破冰题目）

## 討論題目

### 段落（一）

- 問題（1）:
- 問題（2）:
- 問題（3）:
- ...

### 段落（二）

- 問題（1）:
- 問題（2）:
- 問題（3）:
- ...

### 進一步思考題目

- 思考題（1）:
- 思考題（2）:

### 總結點

- 第一點:
- 第二點:
- 第三點:

"""

    for _ in range(num_groups):
        text += """<hr class="pb">

# 小組名字

"""

    return text


def study_notes(scripture: Scripture, num_students: int):
    text = f"""

# 查經題目

## 說明

- 請閱讀{scripture.class_notes()}來學習如何使用歸納法查經來理解敘述文。
- 閱讀完之後，請將你的查經筆記寫在這個Google Doc上。每一位同工有屬於自己的一頁。
{scripture.english_analysis()}

## 提示

如果你想看這個Doc整體的outline，請點擊：View → Show document outline。這樣就可以快速跳到屬於自己小組的頁面。

## 經文

{scripture.reference()}

## 資源

{scripture.resources()}

<hr class="pb">

# 示範：請不要在這頁填字

（為初學者預備，僅供參考，如果你有自己的形式，請自由發揮！）

## 經文

（请将经文复制到这里）


- 本書作者：
- 寫作年代：
- 寫作對象：
- 原語文：

## 觀察

- 裡頭提到的人：
- 被提出來的事：
- 作者所提出的評價：

## 定义

不懂的字、詞、句：

## 架构

- 整個書信/文體的脈絡是什麼？

（请将你對經文的主要脈絡的理解放在这里）

- 本段經文的英文文法分析

（请将你的英文文法分析放在这里）

- 上下文的context提供什麼樣的信息？

（请将你的答案放在这里）


## 深入思考

- 作者寫這段的用意可能有哪些？我這麼回答的原因有哪些？
- 這段經文用了哪些比喻？作者想要闡述的道理可能是什麼？比喻和作者的論點之間的聯繫可能有哪些？
- 读完之后有什么样的感动和感受？在哪里可能可以应用到？
- 有没有其他想记下来的研读后感想？

"""

    for _ in range(num_students):
        text += """<hr class="pb">

# 同工名字

"""
    return text
