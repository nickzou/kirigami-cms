# Issue tracker: ClickUp

Issues live in ClickUp, accessed through the ClickUp MCP server (`mcp__clickup__*` tools). There is no CLI.

This is the only file that should contain ClickUp-specific details. Keep it that way so a later move to another tracker means rewriting this file alone.

## Location

- Workspace: `9017615925`
- Space: Kirigami CMS (`90178048506`)
- List: Issues (`901718027107`)

## Conventions

- **Spec or PRD** = a parent task. Its tickets are sub-tasks of it (set `parent` on create). Long-form specs live in the repo (e.g. `docs/specs/`); the parent task links to them.
- **Tickets are self-contained**: description, acceptance criteria, and parent link all go in the task body. Don't rely on custom fields or task dependencies, so tickets export cleanly.
- **Triage roles** are ClickUp tags with the canonical names. See `triage-labels.md`.
- **Reporters**: only the maintainer and agents file issues. There is no external reporter flow, and no PR-as-request surface. Revisit both when the project goes open source.

## Statuses

Use only these four of the list's statuses:

| Meaning | Status |
| --- | --- |
| New, triaged, or ready to pick up (the tag says which) | `backlog` |
| In progress | `in development` |
| Done | `shipped` |
| Won't fix | `cancelled` (+ `wontfix` tag) |

The other statuses (`scoping`, `in design`, `in review`, `testing`, `ready for development`) exist but aren't part of the workflow. `scoping` and `in design` suit a spec parent task as it takes shape.

## Operations

- Create: `clickup_create_task` (list `901718027107`)
- Read: `clickup_get_task`, `clickup_filter_tasks`
- Comment: `clickup_create_task_comment`
- Label: `clickup_add_tag_to_task`, `clickup_remove_tag_from_task`
- Change status or close: `clickup_update_task`
- Bulk changes: `clickup_execute_operator` (`task.update_many`) instead of one call per task
- Relative dates ("today", "this week"): call `clickup_get_user` first and compute from its `current_time`.
- When mentioning a task, write an inline markdown link with the task name as the anchor text. Never a bare URL.
