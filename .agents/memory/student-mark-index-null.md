---
name: Unlinked marks index behavior
description: MongoDB index constraint for imported marks that do not yet link to a Student document
---

Use a partial unique index filtered to `student` values of BSON type `objectId` for the legacy StudentMark uniqueness constraint. A sparse index is not sufficient when Mongoose writes an explicit `student: null`, because MongoDB still indexes that null value.

**Why:** Imported handwritten rows may be stored before an administrator resolves their student match, and multiple unlinked rows can share the same exam/session/subject combination.

**How to apply:** Keep unlinked rows keyed by exam, snapshot name, and subject; enforce the legacy uniqueness rule only for records with an actual Student ObjectId.