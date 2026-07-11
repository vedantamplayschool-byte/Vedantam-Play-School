---
name: Holiday model field names
description: The Holiday model uses 'title' and 'date', not 'name' and 'startDate'. Any future form or UI must use the model's field names.
---

# Holiday Model Field Names

The `Holiday` Mongoose model uses:
- `title` (required) — not `name`
- `date` (required) — not `startDate`
- `endDate` (optional)
- `type` — enum: `['National', 'State', 'School', 'Other']`

**Why:** The original admin holiday form sent `name`/`startDate`, causing every holiday creation to fail with Mongoose required-field validation errors. Fixed in the audit pass by aligning `openHolidayForm`, `buildHolidaysTable`, and the `renderHolidays` sort param in `js/admin.js`.

**How to apply:** Any future code that creates or reads Holiday records must use `title`/`date`. The API sort param is `sort=date`.
