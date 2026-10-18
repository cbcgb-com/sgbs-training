# Completion email

Send after class 5 (end of term). New thread. Subject and body come
from `completion_email_subject()` and `compose_completion_email()`.
Do not paraphrase.

Draft only, from Eric's HEY account. See
[../SKILL.md](../SKILL.md), [tone.md](tone.md), and
[common-mistakes.md](common-mistakes.md).

If this file and the code disagree, the code wins.

## Subject

`恭喜完成小組查經帶領訓練！` — `completion_email_subject()`.

## Recipients

**To:** students in the current quarter who met
[docs/completion-policy.md](../../../../docs/completion-policy.md)
(attended at least 4 of 5 lessons and not withdrawn). Confirm this
list with Eric before drafting. Do not invent names. Do not write
the recipient list into this repo.

**Cc:** Duane Chang, Juan Chen, and Christy Lin. Take their addresses
from the Cc line of last week's homework thread in HEY — never from
this repo. Do not invent addresses.

`homework:classEmailList` is the weekly-homework To list, not a
substitute for the completion list. Do not run Convex mutations for
this step.

## Body (must match the function)

The feedback paragraph is **required**. It points at
`FEEDBACK_FORM_URL` in `sgbs_training/email.py`
([in-app `/feedback`](https://sgbs-training.citylight.life/feedback)).
Never use a Google Form; responses live in Convex. If the in-app
route changes, update that constant only.

The perfect-attendance shout-out is **optional**. Pass
`full_attendance_names` only when Eric confirms the 全程參與 names;
join them with `、`. Omit the argument (or pass nothing) when there
is no shout-out.

```text
各位主內同工們好！

恭喜大家完成了這一季五堂的小組查經帶領訓練！很感恩這段時間大家的擺上：每週準時來上課、認真完成功課，在課堂上彼此學習、互相鼓勵。謝謝你們！

還記得第一堂課我們一起看的「大使命」嗎？這個訓練正是大使命的一部分。盼望大家以後帶查經的時候，也常常把這個使命放在心上。

也想邀請大家花幾分鐘填寫這份心得回饋表，分享一下這一季參與的感想（用報名時的郵箱登入即可填寫）：https://sgbs-training.citylight.life/feedback

也要特別謝謝這一季全程參與、一堂課都沒缺席的同工們：{names}，謝謝你們忠心的擺上！

願你們將這段時間所學帶回各自的小組和團契，與弟兄姊妹一同在神的話語中紮根成長。

如果有任何問題，請隨時跟我們聯繫！

主內，
林意 和 Eric
```

## Procedure

1. Confirm the completer To list with Eric (policy: at least 4 of 5,
   not withdrawn). Confirm any 全程參與 names separately.
2. `compose_completion_email(full_attendance_names=…)` for the body.
   Leave `full_attendance_names` off when there is no shout-out.
3. Subject from `completion_email_subject()`.
4. **Cc** Duane Chang, Juan Chen, and Christy Lin as above.
5. Draft only, from Eric's HEY account, then tell Eric it is ready.
