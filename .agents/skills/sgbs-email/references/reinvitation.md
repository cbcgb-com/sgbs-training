# Attendance / reinvitation notice

`compose_reinvitation_email(name, missed_dates, remaining_dates)` —
individual notice when a student has missed two of the five classes,
so even the remaining sessions cannot meet
[docs/completion-policy.md](../../../../docs/completion-policy.md)
(at least 4 of 5). "Get Reinvitation Email" →
`GET /reinvitation-email` (query params `name`, `missed_dates`,
`remaining_dates`; placeholders if omitted).

Do not invent attendance counts or dates. Fill `{name}`,
`{missed_dates}`, and `{remaining_dates}` from the record Eric
confirms. Usually one recipient. Do not write student names or
addresses into this repo.

Draft only, from Eric's HEY account. See
[../SKILL.md](../SKILL.md), [tone.md](tone.md), and
[common-mistakes.md](common-mistakes.md).

If this file and the code disagree, the code wins.

## Subject

`小組查經帶領訓練：出席記錄`

## Body (must match the function)

```text
{name}，你好！

感謝你參加小組查經帶領訓練主日學。如你所知，我們有較嚴格的出席政策（[出席政策](https://cbcgb-com.github.io/sgbs-training/completion-policy/)）：五堂課中需要出席至少四次，才算完成本季課程。

根據我們的出席記錄，你缺席了{missed_dates}這兩堂課（如果有誤，請務必告訴我！）。這樣的話，即使剩下的課堂（{remaining_dates}）都出席，也達不到完成課程所需的出席次數了。

這完全沒問題，我們能理解生活中會有各種事情發生。誠摯邀請你下一季再來一起學習——每季的出席次數會重新計算。當然，這一季剩下的課堂，你也隨時歡迎照常來旁聽、一起查經，我們都很樂意見到你。

謝謝你的擺上！如果有任何問題，請隨時跟我聯繫。

主內，

Eric
```
