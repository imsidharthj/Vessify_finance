# Vessify Transaction Extractor - Backend

This is the backend service for the Vessify Internship Assignment. It provides a secure, multi-tenant API for extracting financial transaction data from unstructured text.

**Built with:** Hono, PostgreSQL, Prisma, and Better Auth.

---

## 🚀 Why This Stack? (Architectural Decisions)

| Technology | Reason |
|------------|--------|
| **Hono (TypeScript)** | Chosen over Fastify for its lightweight footprint and web-standard compatibility. It allows for ultra-fast response times and easy type-sharing with the frontend. |
| **Docker + PostgreSQL** | We use Docker to ensure a reproducible environment. Unlike a local Postgres install, Docker guarantees that the database version (v15) and configuration are identical for every developer, preventing "it works on my machine" issues. |
| **Prisma ORM** | Selected for type safety. It prevents SQL injection and ensures our TypeScript code stays in sync with our database schema automatically. |
| **Better Auth** | Used to handle complex security requirements (sessions, password hashing, JWTs) and Multi-tenancy (Teams/Organizations) out of the box, ensuring strict data isolation. |

---

## 📂 Project Structure & File Roles

Here is a breakdown of the key files in the `src/` directory:

| File | Responsibility |
|------|----------------|
| `index.ts` | **The Entry Point.** Sets up the Hono server, CORS, and defines the API routes (`POST /extract`, `GET /transactions`). Contains the core logic for saving data with isolation. |
| `auth.ts` | **Security Config.** Initializes Better Auth with the Prisma adapter. Configures the 7-day session expiry and enables the `organization` and `bearer` (JWT) plugins. |
| `parsing.ts` | **The Brain.** Contains the regex logic to parse the 3 specific transaction text formats. Returns structured JSON + confidence scores. Pure logic, no side effects. |
| `middleware/auth.ts` | **The Gatekeeper.** Intercepts requests, validates the Bearer token using Better Auth, and attaches the user and session to the request context. Returns 401 if invalid. |
| `prisma/schema.prisma` | **The Blueprint.** Defines the database models (User, Transaction, Organization) and their relationships. |

---

## 🗄️ Database Schema & Isolation Strategy

We use **Logical Isolation (Row-Level Multi-tenancy)** to ensure security.

### Key Tables

| Table | Description |
|-------|-------------|
| `User` | Identity (Name, Email). |
| `Organization` | The "Tenant". A workspace that owns data (e.g., "Personal Workspace"). |
| `Member` | Links a User to an Organization (Roles: Owner, Member). |
| `Transaction` | The core data. **CRITICAL:** Every row has both `userId` and `organizationId`. |

### How Data Isolation is Enforced

We do not rely solely on the database structure. Isolation is enforced at the **Application Layer** in `index.ts`:

```typescript
// Example from index.ts
const transactions = await prisma.transaction.findMany({
    where: {
        userId: user.id,          // 1. Must match the logged-in user
        organizationId: orgId     // 2. Must match the target organization
    }
});
```

This ensures **User A can never accidentally (or maliciously) access User B's transactions.**

---

## 🛠️ Setup & Running

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose

### 1. Environment Setup

Create a `.env` file in the `backend/` directory:

```env
# Database Connection (Mapped to port 5433 on host to avoid conflicts)
DATABASE_URL="postgresql://postgres:password@localhost:5433/vessify"

# Security Secret (Used to sign JWTs/Tokens)
BETTER_AUTH_SECRET="vessify-secret-key-change-in-production"
```

### 2. Start the Database

Spin up the PostgreSQL container:

```bash
docker-compose up -d
```

Wait 5-10 seconds for the database to initialize.

### 3. Run Migrations

Push the schema to the database:

```bash
npx prisma migrate dev --name init
```

### 4. Start the Server

Run the backend in development mode:

```bash
npm run dev
```

The server will start at `http://localhost:3001`.

---

## ✅ Testing (Evaluation Criteria)

We have implemented **6 Jest tests** covering the three critical pillars required by the assignment:

| Category | Description |
|----------|-------------|
| **Auth** | Verifies unauthorized access is blocked. |
| **Extraction** | Verifies all 3 sample text formats are parsed correctly. |
| **Isolation** | Verifies that API endpoints correctly filter data by `userId` and `organizationId`. |

To run the tests:

```bash
npm test
```

---

## 📝 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Creates a User + Default Organization. | No |
| `POST` | `/api/auth/login` | Returns Session Token (7-day expiry). | No |
| `POST` | `/api/transactions/extract` | Parses text & saves to DB (Org-scoped). | Yes |
| `GET` | `/api/transactions` | Fetches user's transactions (Cursor pagination). | Yes |