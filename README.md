# RadarBot

A Discord bot for tracking **CS2** (via HLTV) and **Football** (via API-Sports) match results and upcoming fixtures. Each user follows the teams they care about and receives automatic notifications in the channel where they ran the command — one alert when a match is approaching and another with the final score.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Commands](#commands)
- [How notifications work](#how-notifications-work)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Available scripts](#available-scripts)
- [Known limitations](#known-limitations)

---

## Features

| Feature | Detail |
|---------|--------|
| CS2 support | Data via the `hltv` npm scraper |
| Football support | Data via [API-Sports v3](https://www.api-football.com/) |
| Autocomplete | Typing `/follow` shows live team suggestions |
| Upcoming match alert | Sent when a match starts within the next **1 hour** |
| Final score alert | Sent with results from the last **24 hours** |
| Per-channel delivery | Each `/follow` binds to a specific channel; alerts are posted there |
| Idempotent delivery | The same notification is never sent twice for the same subscription |
| Automatic deactivation | If a channel or server is gone, the subscription is disabled automatically |

---

## Requirements

| Tool | Minimum version |
|------|----------------|
| Node.js | 20 |
| npm | 10 |
| Discord Developer account | [discord.com/developers](https://discord.com/developers/applications) |
| API-Sports account *(optional)* | [api-football.com](https://www.api-football.com/) — only required for Football |

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/radarbot.git
cd radarbot

# 2. Install dependencies
npm install

# 3. Copy the environment file
cp .env.example .env

# 4. Fill in .env (see Configuration section below)

# 5. Create the database
npm run db:migrate

# 6. Start in development mode
npm run dev
```

---

## Configuration

Edit the `.env` file at the project root:

```env
# ─── Discord ────────────────────────────────────────────────────────────────
# Bot token — from the "Bot" tab in the Discord Developer Portal
DISCORD_TOKEN=

# Application ID of the bot (shown under "General Information")
DISCORD_CLIENT_ID=

# Guild ID for command registration during development (optional).
# When set, commands are registered instantly in this server.
# Leave empty to register as global commands (may take up to 1 hour to propagate).
DISCORD_DEV_GUILD_ID=

# ─── Database ────────────────────────────────────────────────────────────────
DATABASE_URL="file:./prisma/dev.db"

# ─── Providers ───────────────────────────────────────────────────────────────
# API-Sports key — required for the Football provider.
# Without this key the bot starts normally but FOOTBALL is disabled.
API_SPORTS_KEY=

# ─── Runtime ─────────────────────────────────────────────────────────────────
NODE_ENV=development
LOG_LEVEL=info   # debug | info | warn | error
```

### Getting Discord credentials

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create an application
2. Go to **Bot** → click **Reset Token** → copy the token → paste into `DISCORD_TOKEN`
3. Copy the **Application ID** from the **General Information** tab → paste into `DISCORD_CLIENT_ID`
4. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot` + `applications.commands`
   - Permissions: `Send Messages`, `Embed Links`, `View Channels`, `Read Message History`
5. Open the generated URL, choose your server and authorise the bot

---

## Commands

All commands are slash commands (`/`) and return **ephemeral** responses (visible only to the user who ran them).

### `/add-sport <sport>`

Enables a sport for your user account. Required before following any team.

| Parameter | Values |
|-----------|--------|
| `sport` | `CS2` or `FOOTBALL` |

> You need to enable a sport **once** per user. After that you can follow as many teams as you like.

---

### `/follow <subcommand> <team>`

Follows a team and registers the current channel for notifications.

| Subcommand | Sport |
|-----------|-------|
| `/follow cs2 <team>` | CS2 (HLTV) |
| `/follow football <team>` | Football (API-Sports) |

The `team` field has **autocomplete**: as you type, suggestions appear. Just select one and confirm.

When a team is followed successfully, the bot records:
- The **team** (stored in the database with the provider's external ID)
- The **subscription**: the link between you, the team, and the current channel

All future notifications for that team will be delivered to that channel.

---

### `/my-teams`

Lists all the teams you are following in the current server, along with the sport and bound channel.

---

## How notifications work

The bot runs a **background scheduler** that checks for matches every **10 minutes**:

```
Every 10 min:
  ┌─ CheckUpcomingMatches ──────────────────────────────────────────────────┐
  │  For each active subscription:                                          │
  │    → Query the provider for matches starting within the next 1 hour     │
  │    → If found and not yet notified → send "Upcoming match" embed        │
  └─────────────────────────────────────────────────────────────────────────┘

  ┌─ CheckFinishedMatches ──────────────────────────────────────────────────┐
  │  For each active subscription:                                          │
  │    → Query the provider for results from the last 24 hours              │
  │    → If found and not yet notified → send "Match result" embed          │
  └─────────────────────────────────────────────────────────────────────────┘
```

### Idempotency guarantee

Every delivered notification is recorded in the `NotificationSent` table with the unique key:

```
(subscriptionId, externalMatchId, kind)
```

where `kind` is `upcoming` or `finished`. This guarantees that even if the scheduler runs multiple times while a match is within the horizon, **the notification is sent exactly once**.

### Delivery errors

| Situation | Behaviour |
|-----------|-----------|
| Channel deleted / missing permissions | Subscription is automatically deactivated |
| Network failure / Discord unavailable | Warning logged; retried on the next tick |
| Provider returns an error | Error logged; scheduler continues with other subscriptions |

---

## Architecture

The project follows **Clean Architecture** (Hexagonal / Ports & Adapters):

```
src/
├── domain/          → Pure business rules (entities, value-objects, errors)
├── application/     → Use cases + port interfaces (no external dependencies)
├── infrastructure/  → Concrete adapters (database, external APIs, Discord)
└── shared/          → Cross-cutting utilities (logger, embeds)
```

```
┌──────────────────────────────────────────────────────┐
│                       Discord                        │
│   Slash commands ──► InteractionDispatcher           │
│                              │                       │
│                         Use Cases                    │
│                              │                       │
│          ┌───────────────────┼──────────────────┐    │
│          ▼                   ▼                  ▼    │
│     Repositories        Providers          Logger    │
│      (Prisma)        (HLTV / Football)               │
│          │                   │                       │
│        SQLite           External APIs                │
└──────────────────────────────────────────────────────┘
```

### Data providers

| Sport | Provider | Source | Team search |
|-------|----------|--------|-------------|
| CS2 | `HltvProvider` | HLTV (scraper) | World ranking top 30 + direct name-lookup fallback |
| Football | `FootballApiProvider` | API-Sports v3 | `/teams?search=` endpoint (min. 3 characters) |

Both providers are wrapped by `CachedSportsProvider`, which keeps `searchTeams` results in memory for **30 seconds** — preventing excessive requests during autocomplete.

### Database (SQLite + Prisma)

```
User ──── UserSport          (which sports the user has enabled)
  │
  └─ Subscription ──── Team          (which team, in which server/channel)
          │
          └─ NotificationSent        (history of delivered notifications)
```

---

## Folder structure

```
radarbot/
├── prisma/
│   ├── schema.prisma           # Database models
│   └── migrations/             # Migration history
├── src/
│   ├── domain/
│   │   ├── entities/           # User, Team, Subscription, NotificationSent
│   │   ├── value-objects/      # Sport (CS2 | FOOTBALL)
│   │   └── errors/             # DomainError, ProviderError, …
│   ├── application/
│   │   ├── ports/              # Interfaces: repositories and providers
│   │   └── use-cases/          # AddSport, FollowTeam, ListMyTeams,
│   │                           # CheckUpcomingMatches, CheckFinishedMatches
│   ├── infrastructure/
│   │   ├── config/             # .env loading and validation
│   │   ├── discord/
│   │   │   ├── commands/       # /add-sport, /follow, /my-teams
│   │   │   ├── events/         # InteractionDispatcher
│   │   │   ├── discord-bot.ts  # discord.js Client wrapper
│   │   │   ├── notification-dispatcher.ts
│   │   │   └── register-commands.ts
│   │   ├── persistence/
│   │   │   └── prisma/         # Prisma repositories + mappers
│   │   ├── providers/
│   │   │   ├── cache/          # InMemoryTtlCache + CachedSportsProvider
│   │   │   ├── football-api/   # FootballApiProvider
│   │   │   ├── hltv/           # HltvProvider
│   │   │   ├── http/           # httpGetJson (fetch + timeout + error mapping)
│   │   │   └── sports-provider-registry.ts
│   │   ├── workers/
│   │   │   └── match-scheduler.ts   # setInterval with anti-overlap lock
│   │   └── composition-root.ts      # Manual dependency injection
│   ├── shared/
│   │   ├── embeds/             # Discord embed design system
│   │   └── logger/             # Structured JSON logger
│   └── main.ts                 # Bootstrap + graceful shutdown
├── .env.example
├── nodemon.json
├── tsconfig.json
└── package.json
```

---

## Available scripts

```bash
npm run dev          # Start with hot-reload (nodemon + tsx)
npm run build        # Compile TypeScript to dist/
npm run start        # Run the compiled build
npm run typecheck    # Type-check without emitting files
npm run lint         # ESLint across src/
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier across the whole project

npm run db:migrate   # Apply pending migrations (creates the database if it doesn't exist)
npm run db:generate  # Regenerate the Prisma Client after schema changes
npm run db:studio    # Open Prisma Studio (visual database UI)
npm run db:reset     # Drop and recreate the database from scratch (⚠️ destructive)
```

---

## Known limitations

### CS2 — team search

The HLTV scraper does not expose a search endpoint. The solution is:

1. **World ranking cache** (top ~30 teams) refreshed every 1 hour — covers the most relevant teams
2. **Direct name lookup fallback** (`getTeamByName`) for teams outside the top 30 — requires typing the team name exactly as it appears on HLTV (e.g. `"Imperial"`, `"FURIA"`, `"paiN"`)

Very small or ambiguously named teams may not appear in autocomplete.

### Football — match volume

API-Sports returns the next 20 and the last 20 fixtures per query. In rare cases of teams with extremely dense schedules, matches beyond that limit may be missed.

### Live matches

In-progress matches (`live`) are ignored by the scheduler. Only `scheduled` (upcoming) and `finished` matches trigger notifications.

### Rate limits

- **HLTV**: no API key required, but excessive requests can trigger blocks. The 1-hour ranking cache minimises this.
- **API-Sports**: the free plan allows 100 requests/day. With many active subscriptions this limit can be reached quickly — consider a paid plan for production use.
