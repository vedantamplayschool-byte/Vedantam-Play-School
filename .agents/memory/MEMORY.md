# Memory Index

- [Mongo Atlas URI hand-entry issues](mongo-atlas-uri-hygiene.md) — retyped Atlas connection strings often break the driver via stray query params or unencoded special chars in the password.
- [Vedantam Play School architecture](vedantam-play-school-arch.md) — Express backend serves static frontend in Replit; Render/GitHub Pages split hosting preserved via hostname check.
- [Holiday model field names](holiday-model-field-names.md) — Holiday model uses `title`/`date`; never `name`/`startDate`. Sort param is `sort=date`.
- [Admin UI enum alignment rules](admin-ui-enum-alignment.md) — Notice.priority = Low/Normal/High; TeacherAttendance.status includes 'Half Day'. Mongoose rejects mismatched values silently.
- [Admission ↔ Enquiry dual-write](admission-enquiry-dual-write.md) — createAdmission upserts an Enquiry record (fire-and-forget) so admin Enquiries tab shows public form submissions.
- [v2.5 auth & print-URL decisions](v25-decisions.md) — Teacher JWT type field, fetch+blob for print routes, PDF upload field names, check-in photo policy, AuditLog/LoginHistory field names.
- [ID card / print-route CSP scoping](id-card-print-route-csp.md) — helmet CSP silently blocks Cloudinary images + inline print scripts on server-rendered print pages; fix per-route, not globally.
- [Static mockup vs live code](static-mockup-vs-live-code.md) — a polished static HTML file in the repo isn't proof a redesign shipped; check what the live route actually renders.
