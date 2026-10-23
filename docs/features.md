# TalentaBola — Features

Step-by-step guide in Indonesian for the club: [`panduan-demo.md`](panduan-demo.md).

## One-tap attendance

> Mark 40 children in under two minutes from a phone at the pitch, then paste a clean recap into the parents' WhatsApp group.

**How to use:**
1. **Presensi → Mulai presensi hari ini** (or open a scheduled session).
2. Every child starts as **A** (Alpa). Tap **H / I / S / A** per child, or **Hadir semua** first and then fix the exceptions (it only changes children not marked yet).
3. For **I**, optionally write the reason (suggestions offered); it appears in the recap.
4. Tap a column title to sort (Nama, or bring H/I/S/A to the top).
5. **Salin rekap** or the WhatsApp button in the floating bar.

**Notes:**
- Without signal, taps stay on the phone ("… di HP, menunggu sinyal") and are sent automatically later. Don't clear browser data before it shows **Tersimpan**.
- One session per age group per date.
- A warning appears in the floating bar only when taps are still on the phone or sending failed; normal saving shows nothing.

## Attendance calendar

> See the month at a glance and open or create any training day.

**How to use:**
1. **Presensi**: circles show each session (green/amber/red by attendance, dashed = scheduled, struck = cancelled).
2. Tap a day to open its sheet; tap an empty day → **Buat sesi** to record another date or an extra session.
3. The list under the calendar shows each session's counts and percentage.

## Training schedule

> Set the weekly routine once; sessions for the next 4 weeks appear by themselves and parents see them on their link.

**How to use:**
1. **Jadwal & Agenda** (desktop sidebar, or **Atur Jadwal** on the home page / the link on Presensi): **Tambah jadwal rutin** — weekday, time, place, focus.
2. One-off dates: **Tambah sesi**. Rain or field repairs: **Tandai libur** and write the reason; **Aktifkan kembali** undoes it.

**Notes:**
- One routine slot per weekday per age group.
- Changing a routine moves future sessions that have no attendance and no parent leave yet; sessions with leave keep their time so the leave is not lost.
- Parents see a cancelled session as "Latihan diliburkan: <reason> — tidak perlu izin."

## Parent link

> Each child has a private link — no account needed — to see attendance, request leave/sick, and open report cards.

**How to use:**
1. **Pemain → child → Kirim ke WA ortu**.
2. Parents see four tabs: **Jadwal & izin**, **Kehadiran**, **Rapor**, and **Profil** (the child's data as the club has it).
3. To send leave: pick a scheduled session, choose Izin or Sakit, write a short reason.

**Notes:**
- Leave only for existing, upcoming, non-cancelled sessions (max 30 days ahead).
- Leave sent after the coach marked that child appears as **Terima / Abaikan**; the coach decides.
- **Buat link baru** invalidates the old link immediately.

## Players & WhatsApp import

> Keep the roster tidy and credible before anything reaches parents.

**How to use:**
1. **Pemain → Impor dari WA**: paste the numbered list from the group, check the preview, import.
2. **Pemain → child** to complete birth date, position, number, height/weight, parent's WhatsApp and photo.

**Notes:**
- Height 90–200 cm, weight 15–120 kg, plausible BMI, shirt number 1–99. Birth year outside the age group is a warning only.

## Report cards

> Rate 22 skills with stars and write the coach's notes quickly; publish a document parents are proud to share.

**How to use:**
1. **Rapor → period → Mulai dari …**.
2. Change only the stars that stand out (all start at 3); tap ready-made sentences and edit.
3. **Terbitkan rapor → Kirim ke WA ortu**. Use ‹ › to move to the next child.

**Notes:**
- Everything autosaves. Edits after publishing are visible to parents immediately; **Tarik kembali** unpublishes.
- The shared report link only shows that report — it cannot be used to send leave.

## Club settings

> Make every page feel like the club's own.

**How to use:** **Pengaturan** → name, head coach, home ground, WhatsApp, colour, logo; add age groups.

## Install on the phone

> TalentaBola can sit on the home screen and open like an app.

**How to use:**
1. Android/Chrome: tap **Pasang** on the card at the top of the home page.
2. iPhone (Safari): tap Share, then **Tambah ke Layar Utama**.

**Notes:**
- **Pengaturan → Pasang aplikasi** is always there, also after the home card was closed.
- The card hides after installing or tapping ✕ (remembered on that phone).
- Links opened inside WhatsApp use WhatsApp's own browser, which cannot install; open the link in Chrome/Safari first.

## Notifications

> Know at once when a parent sends leave.

**How to use:**
1. **Pengaturan → Notifikasi di HP ini → Aktifkan** on each coach's phone (iPhone: install the app first).
2. The bell shows unread notifications; tap one to open that session's sheet. **Tandai semua dibaca** clears the count.

**Notes:**
- Notifications belong to the club: every phone that turned them on receives them.

## Age groups & coaches

> Switch age group once; every page follows.

**How to use:**
1. Tap the KU name under the club name (phone) or in the sidebar (desktop) and pick another KU.
2. **Pengaturan → Kelompok umur**: write each KU's coach; empty uses the head coach.

## Light & dark mode

> The app follows the phone's light/dark setting; coaches can switch with the sun/moon button.

**How to use:** tap the moon/sun button (top bar, phone header, or **Mode Tampilan** in the sidebar). The choice is remembered on that phone.

**Notes:**
- Printed / PDF report cards are always light.

## Landing page

> Visitors who are not signed in see a product page at the root address; signed-in coaches still land on their dashboard.

**Notes:**
- Screenshots come from demo data with fictional names.
- The WhatsApp button uses `NEXT_PUBLIC_CONTACT_WA`; without it only "Masuk pelatih" is shown.
- Only this page is indexed by search engines; app, parent and report pages stay `noindex`.

## Access codes & super-admin

> Every club signs in with its own code; the product owner manages clubs from `/admin`.

**How to use:**
1. Coaches: **Pengaturan → Ganti kode akses**. Every other phone is signed out; this one stays in.
2. Owner: open `/admin/masuk`, enter `SUPER_ADMIN_CODE`, then add a club, reset its code, or remove it.
3. From the command line: `ENV_FILE=.env.production pnpm db:set-code <slug> <code>`.

**Notes:**
- Codes are case-insensitive, at least 4 characters, unique across clubs.
- Changing `AUTH_SECRET` invalidates every stored code — set them again afterwards.
