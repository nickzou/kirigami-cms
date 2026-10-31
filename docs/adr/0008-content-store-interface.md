# 0008: Content store interface

Status: accepted

## Decision

`core` never touches the file system. It takes strings and talks to storage through a content store interface: list, read, write with an expected-version token, rename, delete, and (later) watch. A local folder is the first implementation.

## Why

Content may later come from other backends, such as Google Drive, S3, or Git. Keeping `core` on strings and an interface makes that possible and keeps `core` testable with in-memory stores. See [0002](0002-single-package-with-enforced-boundaries.md) for how the boundary is enforced.

## Delete and rename

Both take the version the caller last read, like `write`, and fail with `VersionConflictError` and change nothing if the file has changed since. A missing file is `NotFoundError`.

**Rename never overwrites.** If the destination exists (or is the file itself), it throws `AlreadyExistsError` and moves nothing. The local store copies without overwriting (`COPYFILE_EXCL`) and then removes the original, so a page that appears at the destination meanwhile is never replaced, and the bytes are kept exactly, even if they are not valid UTF-8. Folders a delete or rename leaves empty are removed.

**Pages that would share an address.** The build refuses two pages that would be written to the same output file (`about.md` and `about/index.md`). Creating or renaming a page through the API is refused with the same rule (`pagesCollidingWith` in `core`), so the admin cannot make a site that will not build, and the admin dialogs use the same function to say so while the path is typed.

**Links are not rewritten.** After a rename, links to the page in other pages still point at the old path. The admin says so under the title field while a new path waits to be confirmed; rewriting them is a possible later feature.

## Watching

Watching for changes is not on the interface yet. The dev server watches the local folder itself (`src/server/watch.ts`), because it is the only consumer and the other stores that will need it (Google Drive and similar) would watch very differently, by polling or push notifications. Revisit when the first store that is not a local folder is added.

## Open

Where page history and edit tracking are stored is undecided (SQLite is the leaning). It is tracked in the issue tracker. Whatever is chosen must live on the server, never inside a synced content folder.
