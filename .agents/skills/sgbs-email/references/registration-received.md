# Registration-received email

`compose_registration_received_email(name, login_email)` — individual
reply when someone registers. Thank them, confirm the record is in
the system (no need to register again), and point them to
[sgbs-training.citylight.life](https://sgbs-training.citylight.life/)
with the email they used to register. No password; after logging in
they can see 小組、課堂安排和聯絡表 and update 我的資料 plus a photo.

Roster auth / login-code emails sent by the app
(`apps/roster/convex/authEmail.ts`) remain out of scope — do not
draft those from this skill.

Draft only, from Eric's HEY account. See
[../SKILL.md](../SKILL.md), [tone.md](tone.md), and
[common-mistakes.md](common-mistakes.md).

If this file and the code disagree, the code wins.

## Subject

`小組查經訓練：報名已收到`

## Recipients

**To:** the person who just registered (one address). No Cc unless
Eric asks. Do not write their name or address into this repo; use
`{name}` and `{login_email}` in committed examples.

## Body (must match the function)

```text
{name} 你好！

謝謝你報名這一季的小組查經帶領訓練！你的資料我們都收到了，也已經登記在系統裡，所以不需要重新報名。

請用報名時使用的電郵（{login_email}）登入 https://sgbs-training.citylight.life/ 。系統不需要密碼；登入後就可以看到小組、課堂安排和聯絡表，也可以更新「我的資料」並加上照片。

如果有任何問題，請隨時跟我聯繫！

主內，

Eric
```
