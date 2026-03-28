# London Repair Cafe - User Guide

## Overview

The Repair Cafe app manages the full event lifecycle: registration, check-in, triage (assigning items to fixers), repair tracking, and checkout. There are three user roles: **Attendees**, **Fixers**, and **Helpers**.

Live site: https://londonrepaircafe.ca

---

## For Attendees

### Before the Event

1. **Register**: Visit londonrepaircafe.ca/events, pick an event, enter your name, email, and item details
2. **Confirmation email**: You'll receive an email with event details and a "View My Registration" link
3. **Waiver**: Sign the waiver (link in the email or QR code at check-in desk)

### Day of Event

1. **Check in**: Scan the QR code at the door OR visit londonrepaircafe.ca/checkin and type your name
2. **Your status page** shows your queue position (e.g., #3 of 12) and auto-refreshes every 30 seconds
3. **Wait**: Hang out in the waiting area. Your status page updates when a fixer is assigned
4. **Get called**: A helper will call your name when a fixer is ready. Go sit with the fixer
5. **Checkout**: After the repair, visit the checkout page (fixer or helper can start it). You'll answer:
   - Was it fixed? (Fixed / Partial / Not Fixed)
   - What did you learn today?
   - Repair notes (optional)
   - Weight of item (if fixed - weighed at desk)
   - Material composition % (electronic/metal/plastic/textile/other)
   - Snap a photo! (selfie with fixer encouraged)
6. **If fixed**: Ring the bell!

### My Registration Page

URL: londonrepaircafe.ca/my-registration/[id]?token=[token]

Shows: event details, check-in button (event day only), queue position, item status, repair outcome.

---

## For Fixers

### Before the Event

1. **Register as volunteer**: londonrepaircafe.ca/volunteer/register (enter skills)
2. **RSVP**: Admin sets your RSVP from the volunteer management dashboard
3. **Browse items**: You may receive an email before the event listing registered items

### Day of Event

1. **Check in**: Scan the QR code → type your name → magic link sent to your email → click link → taken directly to your items page (on event day)
2. **Name card**: Tap "Show Name Card" in the header → full-screen display of your name for your table. Shows:
   - When available: green "Available for repairs"
   - When fixing: "Fixing [item name] since 14:32" + big green "Done" button
3. **View items**: Browse registered items, filter by type/status, express interest in items you can fix
4. **Fix items**: When a helper assigns you an item, the attendee comes to your table
5. **Done**: Tap "Done" on your name card → goes to checkout form. Or the helper/attendee can do checkout.

### Login

Fixers log in via magic link (email). On event day, you're redirected straight to the items page.

---

## For Helpers

Helpers run the check-in desk, triage, and checkout. They're the glue.

### Day of Event

1. **Check in**: Same QR code flow → magic link → on event day, taken directly to the triage board
2. **Triage board** (londonrepaircafe.ca/volunteer/triage/[eventId]):
   - Left side: Fixers present (with availability status) + items in progress
   - Right side: Repair queue (ordered by check-in)
   - Stats bar: fixers present, waiting, in progress, done
3. **Assign items**: Pick a queued item → select a fixer from dropdown → click "Assign". Call the attendee from the waiting room.
4. **Walk-ins**: Click "+ Walk-in" button → fill in name, item, problem. Check "No phone" for analog guests.
5. **Checkout**: Click "Check out →" on any in-progress item → fill out the checkout form with/for the attendee
6. **No-phone guests**: Amber badges on triage board. Helpers manage their entire flow (check-in, status updates, checkout) on the desk laptop.

### Triage Tips

- Match item types to fixer skills (visible in the fixer dropdown)
- Prioritize guests who need to leave early (accessibility, paratransit)
- Keep an eye on "No phone" items - those guests can't see their status page
- When a fixer finishes, check if they're "Available" in the fixers panel and assign the next matching item

---

## For Admins

### Dashboard

londonrepaircafe.ca/admin/dashboard

- Event management (create, edit, view registrations)
- Volunteer management (approve/reject, RSVP matrix, skills)
- Item management (bulk operations, status updates)
- Check-in screen (name lookup, QR scan)
- Walk-in registration
- Event reports (stats, waste diversion data)

### Key Admin URLs

- Admin dashboard: /admin/dashboard
- Volunteers: /admin/volunteers
- Items: /admin/items
- Event check-in: /admin/events/[id]/checkin
- Event triage: /admin/events/[id]/triage
- Event report: /admin/events/[id]/report
- Walk-in: /admin/events/[id]/walkin

---

## QR Code

A single QR code serves everyone. It points to londonrepaircafe.ca/checkin.

- Print the QR from londonrepaircafe.ca/qr-checkin.png
- Place at the entrance and check-in desk
- Attendees: type name → go to status page
- Fixers/Helpers: type name → get magic link email → auto-redirect to their role-specific page

---

## Checkout Flow

URL: londonrepaircafe.ca/checkout/[itemId]

Anyone can fill it out (no login required). Questions come from the official RC procedure doc:

1. Was the item repaired? (big tappable buttons)
2. What did you learn today?
3. Repair notes (optional, for the fixer)
4. Weight in kg (fixed/partial items only - use scale at desk)
5. Material composition % (electronic, metal, plastic, textile, other)
6. Photos (selfie with fixer encouraged!)

Back button at top in case of accidental tap.

---

## Email Notifications

Sent via Brevo from heenal@reimagineco.ca:

- Registration confirmation (with manage link)
- Waitlist notification
- Waitlist promotion (when spot opens)
- "Almost your turn" (when 2 items ahead - in progress)
- Fixer reminder with item list (pre-event)

---

## Technical Notes

- Hosted on Hetzner VPS (89.167.26.87), PM2 managed, Caddy reverse proxy
- Next.js 14, PostgreSQL, Tailwind CSS
- Emails via Brevo SMTP API
- No external auth provider - magic link + session cookies
- Auto-refresh on status pages (30s) and triage board (15s)
