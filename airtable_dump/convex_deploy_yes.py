# /// script
# dependencies = ["pexpect"]
# ///
"""Run `npx convex deploy` and answer the interactive Y/n push confirmation."""

import sys

import pexpect

child = pexpect.spawn(
    "npx", ["convex", "deploy"], cwd=sys.argv[1], encoding="utf-8",
    timeout=300,
)
child.logfile_read = sys.stdout

# Answer the "Do you want to push your code ... now? (Y/n)" prompt.
child.expect(r"\(Y/n\)")
child.sendline("y")

# Wait for completion.
child.expect(pexpect.EOF)
if child.isalive():
    child.wait()
print("exitstatus:", child.exitstatus)
