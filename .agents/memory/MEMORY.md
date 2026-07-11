# Memory Index

- [Mongo Atlas URI hand-entry issues](mongo-atlas-uri-hygiene.md) — retyped Atlas connection strings often break the driver via stray query params or unencoded special chars in the password.
- [Vedantam Play School architecture](vedantam-play-school-arch.md) — Express backend serves static frontend in Replit; Render/GitHub Pages split hosting preserved via hostname check.
- [Holiday model field names](holiday-model-field-names.md) — Holiday model uses `title`/`date`; never `name`/`startDate`. Sort param is `sort=date`.
- [Admin UI enum alignment rules](admin-ui-enum-alignment.md) — Notice.priority = Low/Normal/High; TeacherAttendance.status includes 'Half Day'. Mongoose rejects mismatched values silently.
- [Admission ↔ Enquiry dual-write](admission-enquiry-dual-write.md) — createAdmission upserts an Enquiry record (fire-and-forget) so admin Enquiries tab shows public form submissions.
