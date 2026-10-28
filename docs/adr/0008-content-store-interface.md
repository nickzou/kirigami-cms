# 0008: Content store interface

Status: accepted

## Decision

`core` never touches the file system. It takes strings and talks to storage through a content store interface: list, read, write with an expected-version token, rename, delete, and (later) watch. A local folder is the first implementation.

## Why

Content may later come from other backends, such as Google Drive, S3, or Git. Keeping `core` on strings and an interface makes that possible and keeps `core` testable with in-memory stores. See [0002](0002-single-package-with-enforced-boundaries.md) for how the boundary is enforced.

## Open

Where page history and edit tracking are stored is undecided (SQLite is the leaning). It is tracked in the issue tracker. Whatever is chosen must live on the server, never inside a synced content folder.
