# Changelog

## [1.7.0] — 2026-10-23

### Changed
- **Attendance sheet is a calm table** (pattern from Generus Mandiri): Nama | H | I | S | A, every child starts as Alpa (shown faint) and one tap fills the circle. Session details stay on top behind the settings button; a summary card shows "x hadir, y alpa, z izin, w sakit" with the attendance percentage. The first children are visible on the first phone screen.
- **Unmarked children count as Alpa** in the WhatsApp recap (was "Belum konfirmasi"). The parent page still says "Belum dicatat" for sessions where the child was not marked.
- **Floating bar** holds only Salin rekap and the WhatsApp button; a warning appears on its left only when taps are still on the phone or sending failed.

### Added
- **Reason for Izin**: after tapping I, an optional reason field with suggestions (Sekolah, Acara keluarga, …). Saved through the same offline queue, shown in the recap ("Izin (Acara keluarga)") and in the parent's attendance history. Accepting a parent's leave request keeps the parent's reason.
- **Sort by column**: tap Nama (A–Z, Z–A) or H/I/S/A to bring that status to the top. The order is frozen at the tap, so rows never jump while marking.
- Jersey number and position shown under each name.

## [1.6.0] — 2026-10-23

### Added
- **Install on the phone**: the coach home page offers "Pasang TalentaBola di HP" — an Install button on Android/Chrome, Share → Add to Home Screen steps on iPhone. Hidden once installed or dismissed.

### Improved
- **Phone layout pass (360–390 px, light and dark)**: no more iOS zoom when typing in the WA import box or the report search; selected status buttons readable in dark mode; buttons that wrapped onto two lines on small phones fit on one; tap targets raised to at least 44 px (filters, chips, close buttons); long names in the report form no longer cut off.

## [1.5.0] — 2026-10-22

### Added
- **Access code per club**: each club has its own coach code stored in the database; the club changes it from Pengaturan, which signs out every other phone.
- **Super-admin page (`/admin`)**: list clubs (counts only, no children's data), add a club with its first age group and code, reset a club's code, remove a club. Protected by a separate admin code.

### Changed
- **Coaches sign in once more** after this release (same code); the login page shows TalentaBola branding until the club is known.

## [1.4.1] — 2026-10-22

### Improved
- **Landing page comes alive**: the hero enters in sequence with a gently floating phone, and each section rises into view while scrolling (turned off when the phone asks for reduced motion).

## [1.4.0] — 2026-10-22

### Added
- **Training schedule page (Jadwal & Agenda)**: weekly routine slots generate the next 4 weeks of sessions automatically; add one-off sessions; cancel with a reason and reactivate.
- **Landing page**: visitors who are not signed in see what TalentaBola does, how it differs from a WhatsApp list, and a WhatsApp contact button; coaches still get their dashboard.

### Improved
- **Cancelled sessions explain themselves**: parents see the reason and that no leave is needed.

## [1.3.0] — 2026-10-22

### Added
- **Child profile for parents**: a "Profil" tab on the parent page shows name, nickname, age group, shirt number, position, dominant foot, birth date and age, height, weight and guardian — with a note to tell the coach if something is missing.

### Improved
- **Parent page tabs**: Schedule & leave · Attendance · Report · Profile as large tabs joined to the content box (remembered in the link, e.g. `#rapor`).
- **Parent page header in club colours**: the child card now uses the club's green with a white avatar, matching the logo and the light page.
- **Clickable things look clickable**: every button, tab, toggle and choice shows the hand cursor on desktop.

## [1.2.0] — 2026-10-22

### Added
- **Parent page: training schedule and quick menu**: parents now see the next training sessions (date, time, place, "cancelled" or "leave sent"), plus shortcuts to Schedule, Leave, Attendance history and Report.

### Improved
- **Attendance history for parents**: a clear dated list instead of small chips, and a training the coach has not recorded yet no longer counts against the child (no more "0%" right after a session is scheduled).
- **Report card link for parents**: shows the period, publication date and an "Open" action.
- **Tagline**: "Latihan tercatat, perkembangan terlihat, orang tua tenang." — covers reports and the parent link, not only attendance.

## [1.1.3] — 2026-10-22

### Improved
- **Clearer wording**: "Presensi 40 anak, beres sebelum pemanasan." on the sign-in page, and "player" instead of mixed "student / roster / database" labels throughout.
- **Sign-in panel in dark mode**: becomes a night pitch with a green glow instead of staying bright green.

## [1.1.2] — 2026-10-22

### Improved
- **Back button on every inner page**: profile, add/import player, attendance session, report period and report form now show a back arrow next to the page title (phone header and desktop top bar) instead of a small link inside the page.
- **Attendance rows look the same for every child**: on phones the H/I/S/A buttons always sit on their own full-width row under the name, so long and short names line up and the buttons are bigger.
- **"Hubungi pengurus klub" on the parent page**: the club WhatsApp number from Settings now appears as a contact button for parents.
- **Login panel**: a 7-a-side line-up of shirts on the pitch.
- **Brand gradient**: brighter, no longer washed out in dark mode.

## [1.1.1] — 2026-10-22

### Improved
- **Long names on the attendance sheet**: a long full name no longer squeezes under the H/I/S/A buttons — the buttons move to their own full-width row for that child.
- **Pick a child while writing reports on a phone**: tap "Anak N dari M" to open a searchable list and jump straight to any child.
- **Brand gradient**: main buttons, logo and progress bars use a soft green gradient, with a subtle glow on the next-session card.

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
