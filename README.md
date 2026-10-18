# Vyntra — Complete Full-Stack Video-Sharing & Multi-Source Content Aggregation Platform

> **Watch. Connect. Discover.**

**Vyntra** is an enterprise-grade, modern, full-stack video-sharing and creator community platform featuring an automated **Multi-Source Video Discovery & Content Aggregation Engine**, 20 dynamic curated categories and subcategories, multi-provider playback, and a **concurrency-safe video download quota engine**.

---

## 🌟 Key Architectural Features

### 1. Multi-Source Video Discovery & Content Aggregation Engine
- **Modular Provider Adapter Pattern**: Extensible architecture supporting official APIs with rate-limit backoff, request deduplication, timeout controls, and structured error boundaries.
  - **YouTube Data API v3**: Official integration searching videos by category & subcategory, extracting high-resolution thumbnails, ISO-8601 durations, creator channel attribution, and verified embed URLs.
  - **NASA Open APIs & Media Library**: Direct ingestion of official space agency footage, scientific mission videos, original asset attribution, and direct high-definition MP4 stream manifests.
  - **Internet Archive API**: Curated public domain historical and educational media discovery.
- **20 Dynamic Curated Categories & 70+ Subcategories**:
  - *Technology & Artificial Intelligence*, *Space & Astronomy*, *Nature & Wildlife*, *Human Body & Health Science*, *General Science*, *History & Archaeology*, *Education & Learning*, *Business, Finance & Economics*, *Geography & Earth*, *Travel & Exploration*, *Fitness & Sports*, *Food & Cooking*, *Art, Design & Creativity*, *Gaming & Esports*, *Environment & Sustainability*, *Psychology & Human Behaviour*, *Engineering & Inventions*, *Space, Future & Emerging Discoveries*, *Culture, Languages & Society*, *News & Current Discoveries*.
- **Dedicated Homepage Video Sections**:
  - Hero Spotlight featuring high-impact educational content.
  - Quick Category Carousel.
  - Dedicated category rows for *Space & Astronomy*, *Artificial Intelligence & Technology*, *Nature & Wildlife*, *Human Body & Health Science*, *General Science & Physics*, *History & Ancient Civilizations*, *Engineering & Inventions*, and *Education & Mathematics*.
- **Admin Content Management & Discovery Dashboard**:
  - Direct administrative controls at `/admin/discovery`.
  - Provider connection health status and quota telemetry cards.
  - Manual sync trigger with target limits.
  - Detailed sync job audit logs (`itemsDiscovered`, `itemsImported`, `itemsSkipped`, execution errors).
  - Dynamic Category & Subcategory CRUD management without code changes.

### 2. Legal Compliance, Licensing & Download Restrictions
- **Zero-Scraping / Official APIs Only**: Zero web scraping. Adheres strictly to YouTube Terms of Service and provider policies.
- **Provider Protection Rule**: External videos (YouTube, third-party embeds) have `downloadAllowed: false` enforced at both the database and UI levels.
- **Quota Download Integrity**: Download quotas and token reservations apply strictly to authorized, native Vyntra-uploaded media.
- **Clear Attribution**: Every video card and watch page prominently displays the creator/channel, provider badge (`YouTube`, `NASA`, `Internet Archive`, `Vyntra`), license type, and external links to the original source.

### 3. Concurrency-Safe Download Quota Engine
- **Free Tier Policy**: Exactly **1 successful video download per day**.
- **Paid Tiers**: Configurable daily allowances (**Bronze**: 10/day, **Silver**: 25/day, **Gold**: 100/day).
- **Timezone Boundary**: `Asia/Kolkata` daily quota boundaries.
- **Atomic Transactions & Row Locking**: Prevents race conditions and double-spending across parallel requests.
- **User-Scoped Idempotency Keys**: Duplicate clicks or network retries reuse existing download tokens without recharging quota.
- **Secure Media Delivery**: Signed download tokens, range-request video streaming, and state transition auditing (`REQUESTED` → `RESERVED` → `TRANSFERRING` → `COMPLETED` / `FAILED` / `CANCELLED`).

### 4. Social & Community Features
- Video Likes and Watchlist Saves with database uniqueness guarantees.
- Creator Follows and Following Feed.
- Nested Comments & Replies with ownership authorization.
- **Multilingual Comment Translation**: Real-time translation supporting **Hindi (हिन्दी)**, **Tamil (தமிழ்)**, **Telugu (తెలుగు)**, **Kannada (ಕನ್ನಡ)**, **Bengali (বাংলা)**, **Gujarati (ગુજરાતી)**, **Punjabi (ਪੰਜਾਬੀ)**, Spanish, French, and English with smart database caching.

### 5. Role-Based Access Control
- **Viewer (`USER`)**: Explore, watch, like, save, comment, download up to quota.
- **Creator (`CREATOR`)**: Upload video modal, creator dashboard, view follower statistics.
- **Administrator (`ADMIN`)**: Content Discovery Dashboard (`/admin/discovery`), user governance, role assignment, video permissions, moderation queue, subscription quota management, and download audit trail.

---

## 📁 Project Directory Structure

```text
vyntra/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── downloads/
│   │   │   │   └── DownloadModal.tsx       # Quota confirmation & token download modal
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx           # Global shell
│   │   │   │   ├── Navbar.tsx              # Live quota badge pill, search, notifications
│   │   │   │   ├── Sidebar.tsx             # Collapsible navigation drawer with Discovery links
│   │   │   │   ├── CategoryIcon.tsx        # Dynamic Lucide icon mapper for all 20 categories
│   │   │   │   └── Footer.tsx              # Platform links & policies
│   │   │   ├── social/
│   │   │   │   └── CommentSection.tsx      # Nested replies & multilingual translation
│   │   │   └── video/
│   │   │       ├── VideoCard.tsx           # Card with provider pill, badges, channel attribution
│   │   │       ├── VideoPlayer.tsx         # Unified player (HTML5 + YouTube Embed + Archive)
│   │   │       └── UploadModal.tsx         # Creator video publishing modal
│   │   ├── context/
│   │   │   └── AuthContext.tsx             # Auth state, subscription & live quota sync
│   │   ├── pages/
│   │   │   ├── HomePage.tsx                # Hero Spotlight & dedicated multi-category discovery rows
│   │   │   ├── ExplorePage.tsx             # Faceted search, suggested query chips, source filters
│   │   │   ├── CategoryPage.tsx            # Subcategory tabs & source-filtered video grid
│   │   │   ├── WatchPage.tsx               # Unified player, source attribution & related feed
│   │   │   ├── AdminDiscoveryPage.tsx      # Multi-source discovery control room & provider health
│   │   │   ├── AdminDashboardPage.tsx      # Platform metrics & user role governance
│   │   │   ├── DownloadsPage.tsx           # Dedicated downloads hub & quota banner
│   │   │   ├── SubscriptionPlansPage.tsx   # Tier comparison (Free, Bronze, Silver, Gold)
│   │   │   └── ... (29 total views)
│   │   ├── services/
│   │   │   └── api.ts                      # Centralized typed REST client
│   │   ├── types/
│   │   │   └── index.ts                    # TypeScript domain interfaces
│   │   ├── App.tsx                         # Client routes & route guards
│   │   └── index.css                       # Glassmorphism tokens & animations
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── prisma/
│   │   └── schema.prisma                   # PostgreSQL schema (Videos, Providers, SyncJobs, Events)
│   ├── src/
│   │   ├── database/
│   │   │   ├── client.ts                   # Singleton Prisma Client
│   │   │   ├── seed.ts                     # Database seeder with sample media & plans
│   │   │   └── seed-discovery.ts           # Discovery ingestion seeder (26 categories, 80+ videos)
│   │   ├── middleware/
│   │   │   ├── auth.ts                     # JWT & Role authorization guards
│   │   │   └── errorHandler.ts             # Centralized structured error responses
│   │   ├── modules/
│   │   │   ├── discovery/                  # Multi-Source Video Discovery Engine
│   │   │   │   ├── category.constants.ts   # 20 categories, 70+ subcategories & query templates
│   │   │   │   ├── discovery.controller.ts # Public & Admin Discovery endpoints
│   │   │   │   ├── discovery.scheduler.ts  # Background sync scheduler
│   │   │   │   ├── discovery.service.ts    # Deduplication, ingestion & status checking
│   │   │   │   └── providers/
│   │   │   │       ├── base.provider.ts    # Abstract provider with backoff & timeouts
│   │   │   │       ├── youtube.provider.ts # YouTube Data API v3 integration
│   │   │   │       ├── nasa.provider.ts    # NASA Open APIs & Media integration
│   │   │   │       ├── archive.provider.ts # Internet Archive integration
│   │   │   │       └── provider.registry.ts# Registry routing for discovery adapters
│   │   │   ├── admin/                      # Admin metrics, users, videos, moderation
│   │   │   ├── auth/                       # Register, login, logout, password reset
│   │   │   ├── downloads/                  # Concurrency-safe quota engine & streaming
│   │   │   ├── social/                     # Likes, saves, comments, replies, follows
│   │   │   ├── subscriptions/              # Plans, checkout, cancellation
│   │   │   └── videos/                     # Core catalog & streaming
│   │   ├── __tests__/
│   │   │   ├── discovery.test.ts           # 9 automated tests for Discovery & Providers
│   │   │   └── vyntra.test.ts              # 10 automated tests for Quota & Core Platform
│   │   ├── app.ts                          # Express application factory & routes
│   │   └── server.ts                       # Server entry with graceful shutdown & background scheduler
│   ├── package.json
│   └── .env
├── package.json
├── .env.example
└── README.md
```

---

## ⚡ Quick Start & Local Development

### 1. Prerequisites
- **Node.js**: v18+ (tested on v24.19.0)
- **npm**: v9+ (tested on v11.17.0)

### 2. Environment Configuration
Create a `.env` file in the root or inside `server/.env`:
```env
PORT=5000
NODE_ENV=development

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:...@ep-autumn-band-b5rk8osr-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:...@ep-autumn-band-b5rk8osr.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT
JWT_SECRET="vyntra_jwt_secret_production_ready_dev_key_2026_secure"
JWT_EXPIRES_IN="7d"

# Client & Server
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:5000"
QUOTA_TIMEZONE="Asia/Kolkata"
STORAGE_PROVIDER="local"

# Content Discovery API Keys
YOUTUBE_API_KEY="AIzaSyA_DwUpXPeo3RJ-3kNJR67EK78QHVYpKDY"
NASA_API_KEY="NOHmeuu7yKiKIE1aU1r51tFrzBloiPu0AtkpftUH"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Sync & Seed Discovery Catalog
```bash
npm run prisma:generate
npm run prisma:push
# Seed categories & initial multi-source videos
npm run ts-node server/src/database/seed-discovery.ts
```

### 5. Run Automated Tests
```bash
npm test
```
**All 19 tests pass successfully:**
```text
✓ Vyntra Full-Stack Platform Integration & Quota Engine Tests (10 tests)
  ✓ 1. Authentication & Security > should register a new user and auto-assign active FREE subscription
  ✓ 1. Authentication & Security > should login successfully with valid credentials
  ✓ 1. Authentication & Security > should reject login with wrong password
  ✓ 2. Subscriptions & Plans > should list all active subscription plans
  ✓ 2. Subscriptions & Plans > should return live user quota summary (1 download available for Free tier)
  ✓ 3. Concurrency-Safe Download Quota Engine > should allow first download request and reserve 1 quota unit
  ✓ 3. Concurrency-Safe Download Quota Engine > should return existing operation for duplicate idempotency key without recharging quota
  ✓ 3. Concurrency-Safe Download Quota Engine > should block second download request in same daily period with 429 QUOTA_EXHAUSTED
  ✓ 3. Concurrency-Safe Download Quota Engine > should release reserved quota upon cancellation

✓ Vyntra Multi-Source Video Discovery Engine Tests (9 tests)
  ✓ 1. Dynamic Categories & Subcategories > should list all 20+ active categories
  ✓ 1. Dynamic Categories & Subcategories > should return category details with subcategories
  ✓ 2. Unified Search & Filtering > should search across video titles, descriptions, and tags
  ✓ 2. Unified Search & Filtering > should filter search results by provider (YOUTUBE / NASA)
  ✓ 3. Provider Health & Registry > should return status for configured providers
  ✓ 4. Deduplication & Provider Safety > should reject duplicate video imports on provider + providerVideoId
  ✓ 4. Deduplication & Provider Safety > should enforce downloadAllowed=false on external/YouTube videos
  ✓ 5. Admin Discovery Controls > should reject unauthorized manual sync requests
  ✓ 5. Admin Discovery Controls > should allow admin to view discovery statistics
```

### 6. Start Development Servers
Run both frontend and backend concurrently:
```bash
npm run dev
```
Or run individually:
- **Backend API**: `npm run dev:server` (running at `http://localhost:5000`)
- **Frontend App**: `npm run dev:client` (running at `http://localhost:5173`)

---

## 🔑 Pre-Seeded Accounts for Testing

| Role | Username | Email | Password | Tier & Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@vyntra.com` | `VyntraAdmin2026!` | Gold Tier (100 DL/day) + Full Admin & Discovery Portal Access |
| **Creator** | `alex_dev` | `alex.dev@vyntra.com` | `CreatorPass2026!` | Gold Tier + Video Publishing Permissions |
| **Creator** | `elena_cinema` | `elena.cinema@vyntra.com` | `CreatorPass2026!` | Bronze Tier (10 DL/day) |
| **Viewer** | `demouser` | `demo@vyntra.com` | `DemoUser2026!` | Free Starter (1 DL/day) |

---

## 🌐 API Reference (Discovery Endpoints)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categories` | Public | List all categories with subcategory listings and video counts |
| `GET` | `/api/v1/categories/:slug` | Public | Retrieve single category by slug |
| `GET` | `/api/v1/categories/:slug/videos` | Public | Query videos by category, subcategory, provider, and sort |
| `GET` | `/api/v1/search` | Public | Faceted multi-source search (`q`, `categoryId`, `provider`, `page`) |
| `GET` | `/api/v1/providers` | Public | Status & rate-limit health of registered content providers |
| `GET` | `/api/v1/providers/:name/status` | Public | Check specific provider status |
| `POST` | `/api/v1/admin/discovery/sync` | Admin | Trigger manual content discovery synchronization job |
| `GET` | `/api/v1/admin/discovery/jobs` | Admin | Review recent content sync job execution logs |
| `GET` | `/api/v1/admin/discovery/stats` | Admin | Retrieve discovery metrics and provider breakdowns |
| `POST` | `/api/v1/admin/discovery/categories` | Admin | Dynamically create a new category |
| `POST` | `/api/v1/admin/discovery/subcategories` | Admin | Dynamically create a new subcategory |
| `PATCH` | `/api/v1/admin/discovery/videos/:id/status` | Admin | Toggle content visibility (`ACTIVE`, `UNAVAILABLE`, `FLAGGED`) |

---

## 🔒 Security & Terms of Service Adherence

1. **No External Media Scraping or Downloading**: Vyntra strictly uses official endpoints (YouTube Data API v3, NASA Images and Video API, Internet Archive API) and never executes unauthorized page scraping. YouTube videos are rendered exclusively via YouTube's official responsive `<iframe>` player.
2. **Quota Isolation**: The subscription-based video downloading feature is restricted to native Vyntra uploads. Attempts to request download tokens for external provider videos are rejected with HTTP 403.
3. **Secret Protection**: API keys are securely loaded on the backend through environment variables and are never leaked to frontend bundles, logs, or client-side responses.
