# Eric's voice (every SGBS email)

Traditional Chinese. Warm, grateful that people joined and put in time
and effort (感恩、謝謝你們踴躍參與、謝謝你的擺上). Encouraging. Never
scold, even in an attendance notice — keep
「這完全沒問題，我們能理解生活中會有各種事情發生」.

If a composer in `sgbs_training/email.py` already has the body, use
that text. This file is the voice those composers (and any extra
sentence an agent adds) should match.

## Greeting

- Group emails: `各位主內同工們好！`
- Individual emails: `{name}，你好！` or `{name} 姐妹/弟兄你好！`

## Closing

- Contact line: `如果有任何問題，請隨時跟我聯繫！` Group emails that
  both of us sign may say `跟我們聯繫` instead of `跟我聯繫` — follow
  the composer.
- Then a blank line, `主內，`, another blank line, then the names.
- Group sign-off: `林意 和 Eric`
- Individual sign-off: `Eric`

## Weekly homework opening

Weekly homework emails thank people for what was learned in class and
recognize specific groups' homework effort **before** listing the
homework. The generated greeting from `get_lesson_info()` is the
starting thanks; when drafting, you may add a short, specific note
about groups who put in the work. Do not rewrite the homework list
itself.

## Do not

- Invent a harsher attendance tone than the composer.
- Switch a group email to an individual greeting, or the reverse.
- Put student names or personal addresses into this repo. Use
  `{name}`, `{dates}` in committed examples.
