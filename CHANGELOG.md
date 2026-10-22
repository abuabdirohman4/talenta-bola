# Changelog

## [1.1.0] — 2026-10-22

### Improved
- **New look matching the club mockups**: every page now follows the approved TalentaBola design — slate and emerald colours, a dark "next session" card, summary cards with clear labels, and a sidebar grouped by menu with the active age group always visible.
- **Richer dashboard**: next session at a glance, four key numbers (players, attendance rate, report progress, complete data), the children who were excused/sick/absent last session, the upcoming schedule, and quick shortcuts.
- **Attendance sheet**: attendance summary with a progress bar and coloured status tiles, search and filters (All / Not yet / Present), and the WhatsApp recap shown side by side on larger screens.
- **Player roster**: cards with shirt number, position, parent, attendance and report status, plus position filters and a team composition summary.
- **Report card form and shared report**: roster panel beside the form, skill groups with averages, and an official-looking report with coloured skill bars and the coach's signature.

### Added
- **Dark mode**: follows the phone's setting automatically, with a sun/moon button to switch. Printed and PDF reports always stay light.

## [1.0.0] — 2026-10-22

First working app for the SSB Galuh Putra demo (replaces the static HTML mockups, now in `mockups/`).

### Added
- **Coach sign-in**: shared access code; the phone stays signed in for 30 days.
- **Players**: searchable list with position and "missing data" filters, add/edit form with photo, and sanity checks on height/weight (e.g. 144 cm / 12 kg is rejected) so bad data never reaches parents.
- **Import from WhatsApp**: paste the numbered attendance list from the parents' group; emoji, "ijin" notes and instruction lines are stripped, existing names are skipped.
- **One-tap attendance**: big Present / Excused / Sick / Absent buttons per child, live counters, "mark the rest present", and a tidy recap ready to paste into the WhatsApp group.
- **Works without signal**: taps are kept on the phone and sent automatically when the connection returns; the attendance page can be reopened offline.
- **Training schedule**: one-tap session for today, single future sessions, recurring weekly schedule, and "cancelled (rain)" sessions.
- **Parent link (no login)**: per-child private link to see attendance, request leave/sick for a scheduled session, and read published report cards. Leave sent after the coach already marked the child becomes a request the coach accepts or ignores — the coach's input is never overwritten.
- **Report cards**: 22 coach-approved skills rated 1–5 stars (default 3, touch only what stands out), ready-made sentences for the four written sections, autosave, and next/previous child without going back to the list.
- **Published report page**: an official-looking club document with photo, attendance rate, skill bars and the coach's notes; share to WhatsApp or save as PDF.
- **Club settings**: club name, head coach (signs the report), home ground, logo, club colour, and age groups.
- **Installable app**: add to home screen; icons and offline shell included.
