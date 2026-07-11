---
name: Admission ↔ Enquiry dual-write
description: createAdmission also upserts an Enquiry record so the admin Enquiries tab shows website submissions. This is intentional.
---

# Admission / Enquiry Dual-Write Design

The public "Book Enquiry" form on `index.html` submits to `POST /admissions`, creating a full `Admission` record (with `studentName`, `parentName`, `age`, `program`, etc.).

`admissionController.createAdmission` also fires a **fire-and-forget** `Enquiry.findOneAndUpdate` (upsert on `phone`) to mirror a simplified enquiry record into the `Enquiry` collection.

**Why:** The admin panel has a separate "Enquiries" tab that reads from the `Enquiry` model. Without the dual-write, that tab was always empty even after successful form submissions.

**How to apply:**
- Never remove the `Enquiry` upsert from `createAdmission` without also updating the admin Enquiries tab to read from Admissions instead.
- The upsert is intentionally wrapped in `.catch(() => {})` so a failure never blocks the admission response.
- Admin can also create enquiries manually (the `noCreate` flag was removed from the enquiries RESOURCES config).
