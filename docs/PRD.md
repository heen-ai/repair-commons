# Repair Commons - Product Requirements Document

## Overview
Repair Commons is a web application for managing community repair cafe events. It handles event promotion, attendee registration, item intake, fixer coordination, day-of operations (check-in, queue management, QR scanning), and post-event impact reporting.

**Live URL:** https://revive.clawyard.dev
**Repo:** https://github.com/heen-ai/repair-commons

## Users & Roles

| Role | Description |
|------|-------------|
| **Attendee** | Community member bringing items to be repaired. Registers online, describes items, gets QR code. |
| **Fixer** | Skilled volunteer who repairs items. Claims items from queue, logs repairs, tracks outcomes. |
| **Admin** | Event organizer (Heenal + team). Creates events, manages registrations, views reports. |
| **Public** | Anyone browsing the site. Can view events, register without login. |

## Core Flows

### 1. Event Discovery & Registration (Public/Attendee)
- View upcoming events with date, time, venue, spots remaining
- Register for an event: name, email, items to bring (name + problem description)
- Receive confirmation email with event details
- Receive QR code for check-in
- Optional: sign in via magic link to manage registrations

### 2. Admin Event Management
- Create/edit/cancel events with venue, date, time, capacity
- View registration list per event with item counts
- Export registrations (CSV)
- Send bulk emails to registered attendees
- Dashboard with stats (registrations, items, capacity)

### 3. Day-of Operations
- **Check-in:** Scan attendee QR code at door, mark as checked in
- **Item intake:** Confirm items brought, add any walk-in items
- **Fixer queue:** Ordered list of items needing repair, filterable by type/skill
- **Item claiming:** Fixer selects item from queue, marks as "in progress"
- **Repair logging:** Fixer records outcome (fixed, partial fix, not fixable, needs parts), notes, time spent
- **Checkout:** Attendee retrieves items, optional satisfaction rating

### 4. Fixer Management
- Fixer registration with skills/specialties
- Assign fixers to events
- Fixer dashboard: items claimed, repair history, stats
- Skill matching: suggest items based on fixer skills

### 5. Post-Event Reporting
- Items repaired vs total, success rate
- Weight diverted from landfill (estimated)
- Material breakdown (electronics, textiles, etc.)
- Volunteer hours
- Exportable for grant reporting

### 6. Community Features (Phase 2)
- Forum for repair tips, discussion
- Messaging between fixers and attendees
- Repair guides/knowledge base
- Volunteer hour tracking

### 7. Web3 Features (Phase 3)
- Repair attestations on-chain (EAS)
- Token rewards for volunteers
- Wallet-based login (Privy)

## Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, PostgreSQL
- **Auth:** Custom magic link (nodemailer + Gmail SMTP)
- **Hosting:** Hetzner VPS, Caddy reverse proxy, PM2
- **Domain:** revive.clawyard.dev (temp), repair-commons.org (future)

## Database Schema (16 tables)
- users, sessions, auth_tokens
- events, venues, registrations
- items, fixer_interest, event_fixers
- skills, user_skills
- messages, notifications
- community_categories, community_posts, community_replies

## Current State (Feb 22, 2026)
- Homepage, events listing, event detail, registration flow: **LIVE**
- Magic link auth: **LIVE** (Gmail SMTP via reimagineco.ca)
- 3 real events seeded (Mar 28, Apr 15, May 6)
- Admin dashboard: **STUB** (placeholder page)
- Fixer flows: **NOT BUILT**
- Check-in/QR: **NOT BUILT**
- Reporting: **NOT BUILT**
- Community: **NOT BUILT**

## Milestones

### M1: Promotable (Target: Feb 22) ✅
- [x] Events page with real events
- [x] Registration flow (name, email, items)
- [x] Basic homepage

### M2: Pre-Event Ready (Target: Mar 21)
- [ ] Confirmation email on registration
- [ ] Admin registration view
- [ ] Edit/cancel registration
- [ ] Reminder email (1 week + 1 day before)
- [ ] Proper domain + branding

### M3: Day-of Ready (Target: Mar 28)
- [ ] QR check-in at door
- [ ] Fixer queue with item list
- [ ] Item claiming by fixers
- [ ] Repair outcome logging
- [ ] Basic admin dashboard with live stats

### M4: Post-Event & Polish (Target: Apr 15)
- [ ] Impact report generation
- [ ] Fixer profiles + skill matching
- [ ] Attendee "my items" view with status
- [ ] Email notifications (status updates)
- [ ] Mobile-optimized fixer view

### M5: Community + Web3 (Target: Q3 2026)
- [ ] Forum / discussion board
- [ ] On-chain repair attestations
- [ ] Token rewards
- [ ] Wallet login
