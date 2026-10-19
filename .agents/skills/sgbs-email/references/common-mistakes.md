# Common mistakes (every class email)

Gmail `reply` and `send_message` send immediately — do not use them. A
draft tool (`create_draft` with `replyToMessageId` when threading) is
allowed only if it lands in HEY. Compose in HEY, sending FROM Eric's
Gmail identity in HEY (HEY's default sender), not the @hey.com
address. If you cannot draft there, stop and give Eric the exact
subject + body; do not send from another account. Leave signatures
off.

- Rewriting the homework list or adding extra links — use the
  generated body.
- Adding homework lists or a sign-off to the Saturday reminder — the
  first line already points at the previous email.
- Sending because Eric is busy — draft only.
- Sending from the @hey.com address — use Eric's Gmail identity in HEY
  (HEY's default sender).
- Starting a new thread for the reminder, or using Gmail `reply`
  (that sends).
- Drafting app-sent mail (報名驗證碼, 歡迎報名, 小組人數不足通知)
  from this skill — wrong system.
- Inventing a Cc address for Duane Chang, Juan Chen, or Christy Lin —
  copy it from last week's homework thread in HEY, or omit and tell
  Eric. Never take personal addresses from this repo.
- Committing student names or personal email addresses to this
  (public) repo — use `{name}`, `{dates}`. The Cc
  regulars may be named, never their addresses.
- Treating `homework:classEmailList` as the completion To list —
  completion recipients are policy completers (at least 4 of 5, not
  withdrawn). Confirm that list with Eric.
- Linking a Google Form for end-of-term feedback — use
  `FEEDBACK_FORM_URL` (in-app `/feedback`; responses live in Convex).
- Using the old 3-of-5 attendance wording, or a scolding tone on a
  reinvitation. The policy is at least four of five.
- Running Convex mutations while preparing mail — reads only, and
  never dump a roster into git.
