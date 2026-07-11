---
name: Admin UI enum alignment rules
description: Several admin form select-option arrays must exactly match their Mongoose model enums or saves silently fail / return 422.
---

# Admin UI ↔ Model Enum Alignment

Mongoose validates enum on write and returns a 422/400 if the value isn't in the model enum. The UI must always use the exact same strings.

| Model field | Correct enum values | Former wrong UI values |
|---|---|---|
| `Notice.priority` | `Low`, `Normal`, `High` | `Normal`, `Important`, `Urgent` |
| `TeacherAttendance.status` | `Present`, `Absent`, `Late`, `Leave`, `Holiday`, **`Half Day`** | `Half Day` was missing from model enum |

**Why:** Mismatches caused notice creation to fail for `Important`/`Urgent` priorities, and teacher attendance saves to fail for `Half Day`. Fixed by aligning both the Notice model options in `admin.js` and adding `Half Day` to the `TeacherAttendance` enum in the model.

**How to apply:** When adding new status/priority options to any admin UI, always grep the corresponding Mongoose model's `enum:` array first and confirm the string matches exactly (case-sensitive).
