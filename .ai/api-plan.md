# REST API Plan

## 1. Resources

| Resource              | Database Table                 | Description                                                    |
| --------------------- | ------------------------------ | -------------------------------------------------------------- |
| Auth                  | `auth.users` (Supabase)        | User accounts handled by Supabase Auth.                        |
| Categories            | `public.categories`            | User-defined groupings for flashcards.                         |
| Flashcards            | `public.flashcards`            | Question-answer cards, created manually or via AI.             |
| Generations           | `public.generations`           | AI generation tasks for producing flashcards from source text. |
| Generation Error Logs | `public.generation_error_logs` | Internal logs for failed generation tasks (admin/debug only).  |

> API base path: `/api/v1` (all endpoints below are relative to this base)

---

## 2. Endpoints

### 2.1 Authentication (Supabase-backed)

Although Supabase provides client SDKs, a thin REST wrapper is exposed for non-browser clients.

| Method | Path                           | Description                                     |
| ------ | ------------------------------ | ----------------------------------------------- |
| POST   | `/auth/signup`                 | Register a new user.                            |
| POST   | `/auth/login`                  | Sign in and receive JWT.                        |
| POST   | `/auth/logout`                 | Invalidate current session (cookie-based flow). |
| POST   | `/auth/reset-password`         | Request password-reset email.                   |
| POST   | `/auth/reset-password/confirm` | Set a new password using reset token.           |

All other endpoints require `Authorization: Bearer <JWT>` issued by Supabase.

---

### 2.2 Categories

| Method | Path                       | Description                                  |
| ------ | -------------------------- | -------------------------------------------- |
| GET    | `/categories`              | List categories (paginated).                 |
| POST   | `/categories`              | Create a category.                           |
| GET    | `/categories/{categoryId}` | Retrieve single category.                    |
| PATCH  | `/categories/{categoryId}` | Update category (name).                      |
| DELETE | `/categories/{categoryId}` | Delete category and unassign its flashcards. |

#### 2.2.1 Query parameters (LIST)

- `page` (int, default = 1)
- `limit` (int, 1-100, default = 20)
- `search` (string) – case-insensitive `LIKE` match on `name`.

#### 2.2.2 Request / Response Schemas

• Create / Update Category request

```json
{
  "name": "Programming"
}
```

• Category response object

```json
{
  "id": "uuid",
  "name": "Programming",
  "createdAt": "2025-05-14T09:23:11Z",
  "updatedAt": "2025-05-14T09:23:11Z"
}
```

Success codes: 200, 201, 204 (delete)
Error codes: 400 Validation, 401 Unauthorized, 404 Not Found, 409 Conflict (duplicate name)

---

### 2.3 Flashcards

| Method | Path                        | Description                                          |
| ------ | --------------------------- | ---------------------------------------------------- |
| GET    | `/flashcards`               | List flashcards (paginated, filterable, searchable). |
| POST   | `/flashcards`               | Create flashcard manually.                           |
| GET    | `/flashcards/{flashcardId}` | Retrieve single flashcard.                           |
| PATCH  | `/flashcards/{flashcardId}` | Update flashcard question / answer / category.       |
| DELETE | `/flashcards/{flashcardId}` | Delete flashcard.                                    |

#### 2.3.1 Query parameters (LIST)

- `page`, `limit` – pagination.
- `categoryId` – filter by category.
- `search` – full-text search across `question` & `answer`.
- `source` – `manual` or `ai`.
- `sortBy` – `createdAt`, `updatedAt`, `question`.
- `sortOrder` – `asc` or `desc` (default `desc`).

#### 2.3.2 Create Flashcard request

```json
{
  "question": "What is a closure in JavaScript?",
  "answer": "A closure is...",
  "categoryId": "uuid" // optional
}
```

Validation rules

- `question`: required, 1-200 chars
- `answer`: required, 1-500 chars

Response body mirrors object plus `source = "manual"`.

Success codes: 200, 201, 204
Error codes: 400, 401, 403 (no ownership), 404

---

### 2.4 Generations (AI)

| Method | Path                                     | Description                                                |
| ------ | ---------------------------------------- | ---------------------------------------------------------- |
| POST   | `/generations`                           | Submit text to generate flashcards.                        |
| GET    | `/generations`                           | List generation tasks.                                     |
| GET    | `/generations/{generationId}`            | Check status & preview raw flashcards.                     |
| POST   | `/generations/{generationId}/accept`     | Accept subset/all generated flashcards and persist them.   |
| POST   | `/generations/{generationId}/cancel`     | Cancel pending task.                                       |
| GET    | `/generations/{generationId}/flashcards` | List flashcards created from this task (after acceptance). |

#### 2.4.1 Submit Generation

```json
{
  "sourceText": "<article snippet>",
  "model": "openrouter/opus-mixtral-8x22b",
  "categoryId": "uuid"
}
```

Response `202 Accepted`

```json
{
  "id": "uuid",
  "status": "processing"
}
```

Processing is handled asynchronously via background function; webhook or polling.

#### 2.4.2 Accept Generated Cards

```json
{
  "flashcards": [
    { "question": "Q?", "answer": "A." },
    { "question": "Q2?", "answer": "A2." }
  ]
}
```

If `flashcards` omitted, server will accept all suggestions.

Success codes: 200 (returns created flashcards), 202 (queued), 404, 409 (already accepted/cancelled)

---

### 2.5 Generation Error Logs (Admin-only)

| Method | Path                                       | Description                                                  |
| ------ | ------------------------------------------ | ------------------------------------------------------------ |
| GET    | `/admin/generations/{generationId}/errors` | Retrieve error log entries. Requires admin JWT & RLS bypass. |

---

## 3. Authentication & Authorization

- Auth is JWT-based using Supabase's `Auth` service.
- Endpoints must validate `Authorization` header and ensure the `sub` (user ID) matches `user_id` on accessed rows.
- Row Level Security (RLS) policies in database enforce data isolation. API additionally checks ownership before mutations for early failure.
- Role-based access:
  - `user` – default; may manage own categories, flashcards, generations.
  - `admin` – service role key; may access error logs & impersonate users.
- Rate limiting: 60 requests/min/user via middleware (e.g., `@supabase/throttle` or Redis).
- HTTPS enforced; tokens must be transmitted only over TLS.

---

## 4. Validation & Business Logic

### 4.1 Validation Rules

| Field                   | Rules                                                   |
| ----------------------- | ------------------------------------------------------- |
| Category `name`         | required, string, 1-100 chars, unique per user          |
| Flashcard `question`    | required, 1-200 chars                                   |
| Flashcard `answer`      | required, 1-500 chars                                   |
| Flashcard `categoryId`  | optional, must refer to existing category owned by user |
| Generation `sourceText` | required, 1 000–10 000 chars                            |
| Generation `model`      | optional, allowed value list configured server-side     |

Validation occurs at request level (Zod schema) and relies on DB constraints (VARCHAR length, FK integrity).

### 4.2 Business Logic Mapping

| PRD Feature                            | API Interaction                                                  |
| -------------------------------------- | ---------------------------------------------------------------- |
| Generate flashcards from text (US-001) | `POST /generations` → async AI → `POST /generations/{id}/accept` |
| Manual flashcard entry (US-002)        | `POST /flashcards`                                               |
| Edit flashcards (US-003)               | `PATCH /flashcards/{id}`                                         |
| Organize into categories (US-004)      | `POST /categories`, `PATCH /flashcards/{id}`                     |
| Search flashcards (US-005)             | `GET /flashcards?search=term` + filters                          |
| Sign-up (US-006)                       | `POST /auth/signup`                                              |
| Login (US-007)                         | `POST /auth/login`                                               |
| Password reset (US-008)                | `/auth/reset-password*`                                          |

Additional logic:

- Deleting a category sets `categoryId` of its flashcards to `null` (`ON DELETE SET NULL`).
- Accepting generated cards copies them into `flashcards` with `source = "ai"` and links `generationId`.
- Cancellation marks task `failed` and no cards are persisted.

---

## 5. Pagination, Filtering & Sorting Conventions

- Pagination: `page` & `limit` (offset), with headers `X-Total-Count`, `X-Total-Pages`.
- Filtering: dedicated query params (`categoryId`, `source`, etc.). Multiple comma-separated values allowed.
- Sorting: `sortBy`, `sortOrder`. Multiple fields comma-separated.

---

## 6. Error Handling Format

All error responses are JSON:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Question must not exceed 200 characters.",
    "details": {
      "field": "question",
      "max": 200
    }
  }
}
```

Standard codes:

- 400 – ValidationError
- 401 – Unauthorized / Token missing
- 403 – Forbidden (not owner)
- 404 – ResourceNotFound
- 409 – Conflict (duplicate, invalid state)
- 422 – UnprocessableEntity (business rule)
- 429 – TooManyRequests (rate limit)
- 500 – InternalServerError

---

## 7. Versioning & Deprecation

- Path-based versioning (`/api/v1`).
- Breaking changes deployed under `/v2` with 6-month deprecation notice on older version via `Deprecation` header.

---

## 8. Security Best Practices

1. All endpoints require HTTPS.
2. JWTs verified with JWKS sign-in key rotation.
3. CSRF protection for cookie sessions (double submit). Stateless tokens recommended.
4. Rate limiting & slow-down to mitigate brute-force.
5. Input sanitation & escaping; output encoding to prevent XSS when data reflected.
6. Audit logging (server side) for all mutating requests.
7. Content-Security-Policy & Helmet headers set by Astro middleware.

---

## 9. OpenAPI & SDK Generation

- An OpenAPI 3.1 spec will be generated from the above definitions (e.g., using `zod-to-openapi`) and served at `/api/v1/openapi.json`.
- Client SDKs (TypeScript) auto-generated via `openapi-typescript` for front-end consumption.

---

## 10. Assumptions & Notes

- Supabase edge functions (or background workers) perform AI calls and write results.
- The REST layer is implemented as Astro API routes (`/src/pages/api/v1/**.ts`).
- WebSockets or Server-Sent Events could be added later for live generation status but are out of MVP scope.
- Full-text search may migrate to Postgres FTS; current search uses `ILIKE` + B-tree indices.
- All timestamps are ISO-8601 UTC.
