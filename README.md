# CivicSync: Municipal Civic Issue Reporting Platform (Syllabus Edition)

A clean, syllabus-aligned civic-tech web application for reporting, tracking, and resolving municipal complaints in Sonipat, Haryana (road potholes, broken streetlights, garbage overflow, water leakages, drainage issues).

Built strictly with standard college-syllabus technologies: **Node.js, Express (MVC), Prisma ORM with SQLite, JWT Authentication, and Leaflet GIS Maps**.

---

## 1. Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- npm

### Setup & Run Commands
```bash
# 1. Install dependencies
npm install

# 2. Run Prisma migration (creates SQLite dev.db)
npx prisma migrate dev --name init

# 3. Seed database with Admin, Citizen, and 12 Sonipat issues
npx prisma db seed

# 4. Start the application
npm start
```

Visit the app in your browser at: **`http://localhost:3000`**

---

## 2. Default Test Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Municipal Administrator** | `admin@civicsync.local` | `Admin#Secure2026!` | Manage all complaints, change repair status (`REPORTED` → `IN_PROGRESS` → `RESOLVED`), view municipal KPI counters. |
| **Citizen** | `citizen@civicsync.local` | `Citizen#Secure2026!` | Report civic issues with GPS pin & photo (max 2 MB), upvote complaints, view "My Reports", duplicate warnings. |

*(Quick autofill buttons are available on the login page for viva demonstration).*

---

## 3. Project Architecture & Syllabus Mapping

Strict MVC architecture with Express Router, Prisma ORM, and Node core modules:

```text
CivicSyncDemo/
├── server.js                          # Express app initialization, static files, route mounting (41 lines)
├── prisma/
│   ├── schema.prisma                  # Prisma data models: User, Issue, Upvote, relations (60 lines)
│   ├── seed.js                        # Database seeding script with realistic Sonipat data (98 lines)
│   └── dev.db                         # SQLite database file managed by Prisma ORM
├── src/
│   ├── prisma.js                      # Shared PrismaClient singleton instance (6 lines)
│   ├── events/
│   │   └── statusEvents.js            # Node EventEmitter logging status updates to status.log (23 lines)
│   ├── middleware/
│   │   ├── auth.js                    # JWT Bearer verification middleware (23 lines)
│   │   ├── role.js                    # Role-based authorization middleware (13 lines)
│   │   ├── upload.js                  # Multer photo upload config with 2 MB limit (30 lines)
│   │   └── errorHandler.js            # Centralized Express error handler (13 lines)
│   ├── routes/
│   │   ├── auth.routes.js             # Express.Router for /api/auth endpoints (12 lines)
│   │   ├── issue.routes.js            # Express.Router for /api/issues endpoints (17 lines)
│   │   └── admin.routes.js            # Express.Router for /api/admin endpoints (16 lines)
│   ├── controllers/
│   │   ├── auth.controller.js         # HTTP request/response handling for authentication (44 lines)
│   │   ├── issue.controller.js        # Controller for issue CRUD, upvoting, duplicates (102 lines)
│   │   └── admin.controller.js        # Controller for admin stats and status lifecycle (77 lines)
│   └── services/
│       ├── auth.service.js            # User registration & bcrypt/JWT login logic (73 lines)
│       ├── issue.service.js           # Prisma CRUD, pagination (skip/take), relations (165 lines)
│       ├── duplicate.service.js       # Haversine distance spatial collision check (46 lines)
│       └── priority.service.js        # Dynamic 0-100 priority scoring formula (22 lines)
├── logs/
│   └── status.log                     # Audit log file written via EventEmitter & fs.appendFile
├── public/                            # Vanilla JS single-page application (No heavy frontend frameworks)
│   ├── index.html                     # HTML shell loading Leaflet CSS/JS
│   ├── css/style.css                  # Unified responsive stylesheet
│   └── js/
│       ├── api.js                     # HTTP fetch client and localStorage JWT session manager
│       ├── app.js                     # Hash-based client router
│       ├── components/
│       │   ├── IssueCard.js           # Reusable issue card with upvote button
│       │   ├── IssueMap.js            # Leaflet GIS map with colored severity markers
│       │   ├── Navbar.js              # Role-aware navigation header
│       │   └── StatusBadge.js         # Color badges for status and severity
│       └── views/
│           ├── HomeView.js            # Landing page with Sonipat civic highlights
│           ├── ExploreView.js         # Paginated complaints list with category/severity filters
│           ├── MapView.js             # Fullscreen interactive municipal map
│           ├── CitizenReportView.js   # Intake form with map picker & 500m duplicate warning
│           ├── CitizenMyReportsView.js# Citizen's personal complaint tracking
│           ├── IssueDetailView.js     # Single issue view with status lifecycle update
│           ├── AdminDashboardView.js  # Municipal overview cards and status triage table
│           └── AuthViews.js           # Registration and login forms
├── uploads/                           # Multer destination for uploaded complaint images
└── package.json                       # Minimal syllabus-approved dependencies
```

---

## 4. Syllabus Topic Mapping for Viva

| Syllabus Topic | File(s) Where Implemented | Practical Function in CivicSync |
| :--- | :--- | :--- |
| **Node.js Core Modules** | `server.js`, `src/events/statusEvents.js`, `src/middleware/upload.js` | `path.join` for safe directory paths; `events` (`EventEmitter`) to emit `statusChanged`; `fs.appendFile` to log status transitions to `logs/status.log`. |
| **Express Middleware** | `server.js`, `src/middleware/*` | Built-in `express.json()`, `express.static()`, Multer file upload middleware, JWT authentication, and centralized error handler. |
| **Express Router & MVC** | `src/routes/*`, `src/controllers/*`, `src/services/*` | Clean separation: routes define paths; controllers unpack `req` and send HTTP responses; services execute business logic and database queries. |
| **Prisma ORM & CRUD** | `prisma/schema.prisma`, `src/prisma.js`, `src/services/issue.service.js` | Schema defines `User`, `Issue`, `Upvote`, `StatusHistory`, `Comment` models; Prisma Client methods `create`, `findMany`, `findUnique`, `update`, `delete`, and `count`. |
| **Prisma Relations & Features** | `src/services/issue.service.js`, `prisma/seed.js` | `include: { user: true, statusHistory: true, comments: true }`, `_count: { select: { upvotes: true } }`, `skip`/`take` pagination, `orderBy` priority and relation sorting, and `where` search filtering. |
| **Authentication (JWT & Bcrypt)** | `src/services/auth.service.js`, `src/middleware/auth.js` | `bcrypt.hash` and `bcrypt.compare` for passwords; `jwt.sign` issues token with 1-day expiry; `requireAuth` validates `Authorization: Bearer <token>`. |
| **Role-Based Authorization** | `src/middleware/role.js`, `src/routes/admin.routes.js` | `requireRole("ADMIN")` intercepts requests and enforces 403 Forbidden for non-administrators. |
| **Municipal SLA Engine** | `src/services/sla.service.js`, `src/controllers/admin.controller.js` | Dynamic calculation of category resolution deadlines (24h–72h) and SLA breach tracking. |
| **CSV Streaming & Exports** | `src/controllers/admin.controller.js`, `src/routes/admin.routes.js` | RFC 4180 streaming CSV export of municipal complaint registers for field maintenance crews. |
| **Leaflet GIS Integration** | `public/js/components/IssueMap.js` | Interactive map powered by OpenStreetMap tiles; color-coded pins based on severity and status. |

---

## 5. Viva Examiner Cheat Sheet (3-4 Sentences Each)

### 1. How does User Login & Authentication work?
When a citizen or administrator logs in via `POST /api/auth/login`, `auth.service.js` searches for the email in SQLite using `prisma.user.findUnique()`. The entered password is verified against the stored hash using `bcrypt.compare()`. Upon success, `jsonwebtoken` signs a JWT containing the user's ID and role (`CITIZEN` or `ADMIN`), valid for 24 hours. The frontend stores this token in `localStorage` and `api.js` attaches it to all subsequent requests in the `Authorization: Bearer <token>` header, where `requireAuth` verifies it.

### 2. How is the Priority Score calculated?
The priority score is calculated dynamically in `priority.service.js` as an integer between 0 and 100 combining three factors. First, base severity contributes up to 40 points (Critical = 40, High = 30, Medium = 20, Low = 10). Second, community upvotes add 3 points each, capped at 30 points. Third, urgency increases by 2 points for every day the complaint remains unresolved, capped at 30 points. This mathematical formula ensures that acute hazards and lingering community grievances automatically rise to the top of the municipal repair queue.

### 3. How does Duplicate Detection work?
When a citizen enters a category and selects a map pin in `CitizenReportView.js`, the browser calls `POST /api/issues/check-duplicate`. In `duplicate.service.js`, Prisma fetches active, unresolved complaints in that same category. The service runs the **Haversine formula** to calculate the real-world great-circle distance between the user's pin and each existing issue. If any issue is located within **500 meters**, the frontend displays an alert with a link prompting the citizen to upvote the existing issue instead of filing a duplicate.

### 4. How are Leaflet Map Markers drawn?
The frontend initializes an interactive Leaflet map in `IssueMap.js` using free, keyless **OpenStreetMap** tile layers (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`). For each complaint returned by the backend, the script inspects the issue's severity and status to assign a CSS marker class: Red for Critical, Orange for High, Yellow for Medium, Blue for Low, and Green for Resolved. Custom HTML `L.divIcon` markers are positioned at the exact latitude and longitude coordinates. Clicking any marker reveals an interactive popup with tracking number, severity badge, and a link to view full complaint details.

### 5. How does Municipal SLA Compliance & Breach Tracking work?
Every complaint category is bound to a defined municipal Service Level Agreement (24h for streetlights and water leakages, 48h for road potholes and drainage, 72h for public infrastructure). In `sla.service.js`, target resolution deadlines are computed as `createdAt + slaHours`. If an issue remains unresolved past its deadline, the system automatically marks it as `BREACHED`, computes elapsed overdue hours, and alerts administrators via dashboard KPI counters and red warning badges on issue cards.

### 6. How is the Immutable Status History maintained?
Whenever a municipal administrator updates an issue's lifecycle status in `PATCH /api/admin/issues/:id/status`, Prisma executes an atomic transaction that updates the `Issue` model and persists a new `StatusHistory` record capturing `previousStatus`, `newStatus`, `changedById`, and administrative `remarks`. In addition, Node's built-in `EventEmitter` emits an asynchronous `statusChanged` event that appends the change to `logs/status.log`, ensuring complete auditability for municipal oversight.
