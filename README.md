# Vessify Finance - Internship Assignment

**A production-realistic personal finance transaction extractor with secure multi-tenancy.**

This project is a secure, full-stack application that extracts financial transaction data from unstructured text. It features strict data isolation (multi-tenancy), type-safe architecture, and robust authentication using **Better Auth** and **Next.js**.

---

## 📹 Project Walkthrough

**[▶️ Watch the Demo Video (Google Drive)](https://drive.google.com/file/d/1U-NqSgDL2hp5pfeiSpXnpL36nNu7GvSr/view?usp=drive_link)**

> *Note: Recorded on Ubuntu using native screen capture as Loom desktop support is limited on Linux.*

---

## 🛠️ Tech Stack

| Layer        | Technology                                                  |
| :----------- | :---------------------------------------------------------- |
| **Frontend** | Next.js 15 (App Router), Auth.js (v5), Shadcn/UI, Tailwind CSS |
| **Backend**  | Hono (Node.js), Better Auth, Prisma ORM                     |
| **Database** | PostgreSQL 15 (Dockerized)                                  |
| **Testing**  | Jest (Backend & Integration Tests)                          |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone git@github.com:imsidharthj/Vessify_finance.git
cd Vessify_finance
```

### 2. Infrastructure Setup (Database)

We use Docker to ensure a reproducible database environment.

```bash
# From the root directory (where docker-compose.yml is located)
docker-compose up -d
```

> This starts PostgreSQL on port 5433 (mapped to internal 5432) to avoid conflicts with local instances.

### 3. Backend Setup

Navigate to the backend directory (ensure you are in the folder containing `index.ts` and `schema.prisma`).

**Install Dependencies:**

```bash
cd backend
npm install
```

**Configure Environment:**

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/vessify"
BETTER_AUTH_SECRET="vessify-secret-key-change-in-production"
```

**Run Migrations:**

```bash
npx prisma migrate dev --name init
```

**Start Server:**

```bash
npm run dev
```

> Backend will run on `http://localhost:3001`.

### 4. Frontend Setup

Open a new terminal and navigate to the frontend directory (ensure you are in the folder containing `app/`).

**Install Dependencies:**

```bash
cd frontend
npm install
```

**Configure Environment:**

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
AUTH_SECRET="supersecretvalue1234567890"
```

**Start Client:**

```bash
npm run dev
```

> Frontend will run on `http://localhost:3000`.

---

## 🧪 Running Tests

The backend includes a suite of 7 Jest tests covering Authentication, Extraction Logic, and Data Isolation.

```bash
cd backend
npm test
```

---

## ✅ Evaluation Highlights

This submission specifically addresses the following criteria:

- **Multi-Tenancy & Isolation:** Uses a "Member" model to link Users to Organizations. Every API query filters by `organizationId` AND `userId` to prevent cross-tenant data leaks.

- **Authentication:** Implements a Hybrid flow. The backend (Better Auth) manages the identity and Organization creation, while the frontend (Auth.js) syncs the session token for secure API access.

- **Parsing Logic:** Contains regex-based parsing for 3 specific formats (Standard, Plaintext, and Messy/Amazon style) with dynamic confidence scoring.