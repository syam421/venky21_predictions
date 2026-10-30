# VENKY21 — SECURE SUBSCRIPTION PLATFORM

A production-grade, highly secure, full-stack subscription platform built on top of the original **VENKY21** architecture.

---

## 🔒 1. Architecture Overview

```
VENKY/
├── backend/                         # Secure Node.js & Express REST API
│   ├── prisma/
│   │   └── schema.prisma            # Relational database schema (Prisma ORM)
│   ├── src/
│   │   ├── config/env.js            # Environment config & production assertions
│   │   ├── database/
│   │   │   ├── prisma.js            # Prisma client singleton
│   │   │   └── seed.js              # Secure initial Administrator bootstrapping
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # JWT & DB device session validation
│   │   │   ├── errorHandler.js      # Safe generic errors (no stack trace leaks)
│   │   │   └── rateLimiter.js       # Brute force login & API rate limiting
│   │   ├── services/
│   │   │   ├── predictionEngine.js  # 100% PRESERVED original prediction algorithm
│   │   │   ├── lotteryService.js    # Server-side lottery API polling & caching
│   │   │   ├── authService.js       # Bcrypt (12 rounds) & session tokens
│   │   │   ├── deviceService.js     # Transactional 2-device limit enforcement
│   │   │   ├── subscriptionService.js # 30-day ₹1,500 monthly subscription engine
│   │   │   └── auditService.js      # Immutable security & admin audit logging
│   │   ├── controllers/             # Clean separation of business logic
│   │   ├── routes/                  # RESTful API route definitions
│   │   ├── app.js                   # Helmet, CORS, cookies, rate limiter
│   │   └── server.js                # Server entrypoint with graceful shutdown
│   ├── tests/
│   │   ├── predictionEngine.test.js # Verified unit tests for original logic
│   │   └── securityAndBusinessRules.test.js # Auth, device limits, subscriptions
│   ├── .env.example
│   └── package.json
│
├── frontend/                        # Modern React 18 + Vite SPA
│   ├── src/
│   │   ├── api/client.js            # HTTP-only cookie API client
│   │   ├── components/
│   │   │   ├── Login.jsx            # Dark dashboard login (no public signup)
│   │   │   ├── UserDashboard.jsx    # Live period, prediction, opposites & history
│   │   │   ├── AdminDashboard.jsx   # Metrics, subscriber management & audit logs
│   │   │   ├── CreateUserModal.jsx  # Admin-only subscriber account creation
│   │   │   ├── ResetPasswordModal.jsx # Admin password reset
│   │   │   ├── ExtendSubscriptionModal.jsx # ₹1,500 monthly renewal
│   │   │   ├── DevicesModal.jsx     # Device session viewer & revocation
│   │   │   └── ChangePasswordModal.jsx # Forced first-login password update
│   │   ├── index.css                # Polished dark theme (neon green & gold)
│   │   ├── App.jsx                  # Role-based routing & session management
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── VENKY_VIP.html                   # Original file preserved
├── VENKY_VIP.original.backup.html   # Pristine backup copy created
├── .gitignore                       # Prevents committing secrets or databases
└── README.md                        # Documentation & setup guide
```

---

## 🎯 2. Strict Preservation of Original Prediction Logic

The prediction rules from the original `VENKY_VIP.html` source code are preserved with **100% mathematical fidelity** inside [`backend/src/services/predictionEngine.js`](file:///c:/Users/GONUGUNTLA%20SPANDANA/OneDrive/Attachments/Desktop/VENKY/backend/src/services/predictionEngine.js):

| Rule | Original Formula / Implementation | Preserved Function |
| :--- | :--- | :--- |
| **Number Pools** | `B_POOL = [5,6,7,8,9]`, `S_POOL = [0,1,2,3,4]` | `B_POOL` & `S_POOL` frozen arrays |
| **Classification** | `parseInt(x.number) >= 5 ? "BIG" : "SMALL"` | `classifyNumber(num)` |
| **Last 5 Analysis** | `json.data.list.slice(0, 5).map(x => ...)` | `calculateNextPrediction(historyList)` |
| **Majority Prediction** | `last5.filter(x => x === "BIG").length > 2 ? "BIG" : "SMALL"` | `calculateNextPrediction` |
| **Period Number** | `(BigInt(latest.issueNumber) + 1n).toString()` | `calculateNextPeriod(issueNumber)` |
| **Opposite Pool** | `nextPred === "BIG" ? S_POOL : B_POOL` | `selectOppositeNumbers(nextPred)` |
| **Opposite Numbers** | `pool.sort(() => 0.5 - Math.random()).slice(0, 2)` | 2 randomized opposite numbers from opposite pool |
| **Draw Evaluation** | `(lastPred === actualSize) \|\| lastOpps.includes(actualNum)` | `evaluatePrediction(...)` |
| **Jackpot Status** | `lastOpps.includes(actualNum)` | `isJackpot: true` |
| **Poll Interval** | `3000ms` (3 seconds) | Managed server-side with upstream caching |

> ⚠️ **Algorithmic Transparency**: Predictions are based on historical statistical draw patterns. Lottery numbers are fundamentally random events; no prediction algorithm can guarantee 100% financial returns.

---

## 🛡️ 3. Security Implementation Checklist

| Security Feature | Implementation Details |
| :--- | :--- |
| **No Public Signup** | Public registration routes and UI forms are **completely removed**. Only an authenticated administrator can create accounts. |
| **Password Hashing** | Uses `bcryptjs` with 12 salt rounds. Plaintext passwords or password hashes are **never returned** or exposed. |
| **Session Protection** | Session token stored in **HTTP-only, SameSite cookies** (strict in production). LocalStorage token storage is forbidden. |
| **Device Enforcement** | **Strict maximum of 2 active devices** per user enforced transactionally on the backend. Attempting a 3rd device login is rejected. |
| **Subscription Verification** | ₹1,500 / month (30 calendar days). Every protected API request verifies active subscription status on the server. |
| **Brute-Force Defense** | Express rate limiter throttles login attempts (10 per 15 minutes per IP). |
| **HTTP Security Headers** | `helmet` configured with secure defaults. |
| **Restricted CORS** | CORS restricted strictly to approved origins with credentials. |
| **Audit Trail** | All logins, password changes, account creations, suspensions, and device revocations are recorded immutably. |

---

## 🚀 4. Local Quick Start Guide

### Step 1: Initialize Database & Seed Administrator
Open a terminal in `backend/`:
```bash
cd backend

# Install dependencies (already completed)
npm install

# Push schema to SQLite database (dev.db)
npm run prisma:push

# Bootstrap the initial Master Administrator account
npm run seed
```

Default administrator credentials configured in `backend/.env`:
* **Phone Number:** `8074784250`
* **Password:** `Apache160@#`

*(You can customize these in `backend/.env` before running `npm run seed`)*

---

### Step 2: Start the Backend Server
In `backend/`:
```bash
npm run dev
```
Backend will start on `http://localhost:5000` and begin polling the live lottery API every 3 seconds.

---

### Step 3: Start the Frontend Application
In another terminal, navigate to `frontend/`:
```bash
cd frontend

# Install dependencies (already completed)
npm install

# Start Vite dev server
npm run dev
```
Frontend will be available at `http://localhost:5173`.

---

## 👥 5. Administrator Workflow (First User Creation)

1. Navigate to `http://localhost:5173` in your browser.
2. Log in with the Administrator credentials:
   - **Phone Number:** `8074784250`
   - **Password:** `Apache160@#`
3. You will enter the **Admin Console**.
4. Click **"Create Subscriber"**:
   - Enter subscriber's 10-digit mobile number (e.g. `9812345678`)
   - Enter temporary password (e.g. `User@123456`)
   - Specify subscription duration (Default: `30` days)
   - Amount: `₹1,500`
   - Optional notes (e.g. "Paid via UPI ref 123456")
5. Click **"Create & Activate Account"**.
6. When the subscriber logs in for the first time, the platform requires them to update their temporary password before accessing the prediction dashboard.

---

## 📱 6. Two-Device Limit Enforcement

* Each subscriber can have at most **2 active registered device sessions**.
* When a user logs in from a 3rd device:
  1. The login is rejected with code `DEVICE_LIMIT_REACHED`.
  2. The user is shown their existing active device labels and registration timestamps.
  3. The user or administrator can revoke one of the devices from an active session or admin console to free up a slot.

---

## 🧪 7. Automated Test Suite

Run the full automated test suite verifying both the original prediction engine and security rules:
```bash
cd backend
npm test
```

### Test Results:
```
✔ Original Rule 1: B_POOL and S_POOL definitions match original source
✔ Original Rule 2: Classification rules (>= 5 is BIG, < 5 is SMALL)
✔ Original Rule 3: Last 5 results majority rule (> 2 BIGs = BIG, else SMALL)
✔ Original Rule 4: Period number calculation with BigInt + 1n
✔ Original Rule 5: Opposite number pool selection behavior
✔ Original Rule 6: Success and failure evaluation rules
✔ Security Rule 1: Password hashing uses secure salt and verifies correctly
✔ Subscription Rule 1: Correct 30-day calculation and status check
✔ Device Rule 1: Strict enforcement of maximum 2 active devices per user
✔ Account Status Rule 1: Suspended user is blocked from logging in
ℹ tests 10 | pass 10 | fail 0
```

---

## 🌐 8. Production Deployment Guide

### Backend:
1. Set `NODE_ENV=production` in `backend/.env`.
2. Generate a secure random 64-character JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Set `CORS_ORIGIN` to your production frontend domain (e.g. `https://venkyvip.com`).
4. In production with PostgreSQL, simply change `provider = "postgresql"` in `prisma/schema.prisma` and set `DATABASE_URL="postgresql://user:pass@host:5432/dbname"`.
5. Run migrations: `npx prisma migrate deploy`.
6. Start with a process manager: `pm2 start src/server.js --name "venky-backend"`.

### Frontend:
1. Set `VITE_API_BASE_URL="https://api.yourdomain.com/api"` in `frontend/.env.production`.
2. Build static assets:
   ```bash
   cd frontend
   npm run build
   ```
3. Serve `frontend/dist/` through Nginx, Cloudflare Pages, or Vercel with HTTPS enabled.

---

## 💾 9. Backup & Disaster Recovery

* **Database (SQLite)**: Create daily snapshots of `backend/dev.db` using SQLite backup API or automated cron copying `dev.db` to encrypted offsite storage.
* **Database (PostgreSQL)**: Use standard `pg_dump -Fc dbname > backup.dump`.
* **Original Code Backup**: The original file is safely preserved at [`VENKY_VIP.original.backup.html`](file:///c:/Users/GONUGUNTLA%20SPANDANA/OneDrive/Attachments/Desktop/VENKY/VENKY_VIP.original.backup.html).
"# venky21_predictions" 
