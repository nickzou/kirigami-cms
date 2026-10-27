# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the tag strings used in the issue tracker (ClickUp tags in the Kirigami CMS space).

| Label in mattpocock/skills | Label in our tracker | Meaning                                                      |
| -------------------------- | -------------------- | ------------------------------------------------------------ |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue                      |
| `needs-info`               | `needs-info`         | Blocked on a question for the maintainer (no outside reporters) |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent                      |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation                                |
| `wontfix`                  | `wontfix`            | Will not be actioned                                         |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Status pairing is in `issue-tracker.md`: triage tags sit on `backlog` tasks; `wontfix` pairs with `cancelled`.
