# /// script
# dependencies = ["pexpect"]
# ///
"""Answer Vercel's 'which Git branch?' prompt (empty = all preview branches)."""

import sys

import pexpect

child = pexpect.spawn(
    "vercel",
    [
        "env", "add", "VITE_CONVEX_URL", "preview",
        "--value", "https://rugged-oriole-958.convex.cloud",
        "--yes",
    ],
    cwd=sys.argv[1],
    encoding="utf-8",
    timeout=120,
)
child.logfile_read = sys.stdout

idx = child.expect(
    ["which Git branch", pexpect.EOF, "already exists", "Added"],
)
if idx == 0:
    child.sendline("")  # empty = apply to all Preview branches
    child.expect([pexpect.EOF, "Added"])
child.expect(pexpect.EOF)
print("exitstatus:", child.exitstatus)
