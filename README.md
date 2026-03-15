# London Repair Café - Revive Commons

Community-powered repair cafe event management for the Institute for Community Sustainability (ICS), London Ontario.

## Live Site

**URL:** https://londonrepaircafe.ca
**Admin:** https://londonrepaircafe.ca/admin

## Infrastructure

| Component | Details |
|-----------|---------|
| Server | tej (89.167.26.87) - Hetzner |
| App dir | `/mnt/storage/workspace/code/revive-commons` |
| Process manager | PM2 (ids 0 + 1, name: `revive-commons`) |
| Database | PostgreSQL local — `revive_commons` db, user `revive` |
| Email | **Brevo** HTTP API (NOT SMTP, NOT Resend) |
| Domain | londonrepaircafe.ca → Caddy reverse proxy |
| Repo | https://github.com/heen-ai/repair-commons |

## Key Commands

```bash
# App management
pm2 list
pm2 restart revive-commons
pm2 logs revive-commons --lines 100

# Database
psql postgresql://revive:revive_commons_2026@localhost/revive_commons

# Logs (30-day retention, 50MB max, compressed)
ls -lh /root/.pm2/logs/revive-commons*.log
```

## Environment Variables

Stored in `/mnt/storage/workspace/code/revive-commons/.env`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | https://londonrepaircafe.ca |
| `BREVO_API_KEY` | Email sending (primary) |
| `SMTP_FROM` | From address for emails |
| `RESEND_API_KEY` | Available but not currently used |

## Email System

Emails are sent via **Brevo API** (`lib/email.ts`). All transactional emails go through `sendEmail()`:
- Registration confirmations (on signup)
- Item status updates (in-progress, completed)
- Event reminders (via `scripts/send-reminders.ts` cron — 7 days + 1 day before)
- Comment notifications

If `BREVO_API_KEY` is missing or set to `"test"`, emails only log to console.

## Database Schema

Key tables: `users`, `events`, `venues`, `registrations`, `items`, `fixers`, `fixer_event_rsvps`, `skills`, `user_skills`, `sessions`, `notification_preferences`

## Admin Access

Admin emails defined in `lib/auth.ts`:
- `1heenal@gmail.com`
- `heenal@reimagineco.ca`

## Development

```bash
npm install
cp .env.example .env  # fill in values
npm run dev           # runs on port 3000
```
