# PromptOps AI

**Version control for AI prompts — track, compare, optimize, and deploy your LLM prompts like code.**

PromptOps AI is a full-stack platform that brings Git-style version control to prompt engineering. Every prompt is tracked across versions, with semantic diffing, AI-powered quality scoring, auto-generated changelogs, and client-side semantic similarity search — all built on a production-grade Node.js/PostgreSQL backend and a React/TypeScript frontend.

🔗 **Live demo:** [prompt-version-control.netlify.app](https://prompt-version-control.netlify.app)

---

## Why this project

Most AI projects call an LLM API and call it done. PromptOps AI goes further — it treats prompt engineering as a discipline that deserves the same rigor as software development:

- **Version control** for prompts, the same way Git tracks code
- **Semantic diffing** to see exactly what changed between versions
- **AI-powered evaluation** that scores prompt quality on clarity, specificity, structure, and safety
- **AI-generated changelogs** that summarize what changed and why it matters
- **Client-side semantic similarity** using real ML inference in the browser — no API calls, no server cost

---

## Features

### Core
- 🔐 JWT-based authentication (register, login, protected routes)
- 📝 Full CRUD for prompts with tags, descriptions, and public/private visibility
- 🔄 Git-style version history for every prompt, with atomic version numbering
- 🔗 Prompt sharing with view/edit permissions between users
- 🔍 Search and filter prompts by name, description, or tag

### AI-Powered
- ▶️ **Execute** prompt versions live against Gemini, with variable interpolation
- 📊 **Evaluate** prompt quality automatically — scored 0–100 across clarity, specificity, structure, and safety, with strengths/improvements feedback
- 📜 **AI-generated changelogs** — a Gemini-powered summary of what changed between any two versions, plus an "expected impact" assessment
- 🧬 **Semantic similarity search** — finds related prompts using sentence embeddings computed entirely in the browser via Transformers.js (Xenova/all-MiniLM-L6-v2), with zero server cost

### Analytics & UX
- 📈 Dashboard with workspace-wide stats (prompt count, version count, public/private split)
- ⚖️ Side-by-side Playground to compare two prompt versions' outputs in real time
- 🎨 Distinctive dark UI with a Git-inspired visual language

---

## Tech stack

**Frontend**
- React 19 + TypeScript + Vite
- React Router v7
- TanStack Query (React Query) for server state
- Zustand for auth state (persisted)
- Transformers.js for in-browser ML inference
- Inline SVG icons, no external icon library

**Backend**
- Node.js + Express
- PostgreSQL (hosted on Neon — serverless, branchable)
- JWT authentication with bcrypt password hashing
- express-validator for input validation
- Google Gemini API (`gemini-3.1-flash-lite`) for execution, evaluation, and changelog generation

**Infrastructure**
- Backend deployed on **Render**
- Frontend deployed on **Netlify**
- Database on **Neon** (serverless Postgres)

---

## Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│   React Frontend      │  HTTPS  │   Express Backend     │
│   (Netlify)            │ ◄─────► │   (Render)             │
│                        │         │                        │
│  • Transformers.js     │         │  • JWT auth             │
│    (runs in-browser)   │         │  • Gemini API calls     │
└──────────────────────┘         │  • Business logic       │
                                    └──────────┬───────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │   PostgreSQL (Neon)    │
                                    │   • users               │
                                    │   • prompts              │
                                    │   • prompt_versions      │
                                    │   • prompt_outputs       │
                                    │   • prompt_shares        │
                                    └──────────────────────┘
```

---

## Database schema

| Table | Purpose |
|---|---|
| `users` | Account credentials, profile info |
| `prompts` | Prompt metadata — name, description, tags, visibility |
| `prompt_versions` | Each version's system/user prompt, model config, variables, evaluation score |
| `prompt_outputs` | Saved execution results — output text, token usage, latency |
| `prompt_shares` | View/edit permissions shared between users |

All foreign keys cascade on delete, with check constraints enforcing data integrity (valid emails, non-negative token counts, temperature bounds, etc.).

---

## API overview

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
GET    /api/auth/shared-with-me

GET    /api/prompts
POST   /api/prompts
GET    /api/prompts/:id
PATCH  /api/prompts/:id
DELETE /api/prompts/:id

GET    /api/prompts/:promptId/versions
POST   /api/prompts/:promptId/versions
GET    /api/prompts/:promptId/versions/:versionNumber
DELETE /api/prompts/:promptId/versions/:versionNumber
GET    /api/prompts/:promptId/versions/diff?v1=&v2=
GET    /api/prompts/:promptId/versions/changelog?v1=&v2=

POST   /api/prompts/:promptId/versions/:versionNumber/execute
GET    /api/prompts/:promptId/versions/:versionNumber/outputs
POST   /api/prompts/:promptId/versions/:versionNumber/evaluate
GET    /api/prompts/:promptId/versions/:versionNumber/evaluation

POST   /api/prompts/:promptId/shares
GET    /api/prompts/:promptId/shares
PATCH  /api/prompts/:promptId/shares/:shareId
DELETE /api/prompts/:promptId/shares/:shareId
```

---

## Running locally

### Prerequisites
- Node.js 18+
- A free [Neon](https://neon.tech) PostgreSQL database
- A free [Gemini API key](https://aistudio.google.com)

### Backend

```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=your_neon_connection_string
JWT_SECRET=your_random_secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
```

Run the schema migration (via psql or any Postgres client) using `server/db/migrations/001_initial_schema.sql`, then:

```bash
npm run dev
```

### Frontend

```bash
cd client
npm install
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Visit `http://localhost:5173`.

---

## Deployment notes

- **Backend (Render):** set Root Directory to `server`, build command `npm install`, start command `node server.js`. Add all env vars from `.env` above, plus set `CLIENT_URL` to your deployed frontend URL.
- **Frontend (Netlify):** set Base Directory to `client`, build command `npm run build`, publish directory `client/dist`. Add `VITE_API_URL` pointing to your deployed backend + `/api`.
- Add a `client/public/_redirects` file containing `/*    /index.html   200` so client-side routes don't 404 on refresh.

---

## Project structure

```
prompt-version-control/
├── server/
│   ├── config/db.js              # Postgres connection pool
│   ├── controllers/              # Business logic per resource
│   ├── middleware/                # JWT auth, validation
│   ├── routes/                    # Express route definitions
│   ├── db/migrations/             # SQL schema migrations
│   └── server.js                  # Entry point
└── client/
    ├── src/
    │   ├── pages/                 # Login, Register, Dashboard, Prompts, etc.
    │   ├── components/             # Layout/sidebar
    │   ├── store/                  # Zustand auth store
    │   └── lib/                    # API client, embeddings utility
    └── vite.config.ts
```

---

## Author

Built by **Aniket Jha** — final-year B.Tech CSE (AI specialization) student.

- GitHub: [@aniket-dev30](https://github.com/aniket-dev30)
- LinkedIn: [aniketjha](https://linkedin.com/in/aniketjha-732a77258)