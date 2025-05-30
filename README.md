# 10X Cards

A powerful flashcard creation application that uses AI to generate question-answer pairs from text content, while also allowing manual creation and management of flashcards.

## Table of Contents

- [Description](#description)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)
- [API Reference](#api-reference)

## Description

10X Cards allows users to quickly and intuitively create flashcards in a question-answer format using an automatic generator (AI) or manual entry. This helps users effectively retain knowledge and organize information without the time-consuming process of traditional flashcard creation.

### Key Features:

- **AI-Generated Flashcards**: Paste text (articles, textbooks) and automatically generate flashcards
- **Manual Creation**: Create flashcards by manually entering questions and answers
- **Organization**: Save flashcards in coherent sets or categories
- **Search & Browse**: Quickly find and review saved flashcards
- **User Accounts**: Create accounts to securely store and access private flashcards

## Tech Stack

### Frontend

- **Astro 5**: For building fast, efficient pages with minimal JavaScript
- **React 19**: For interactive components
- **TypeScript 5**: For static typing and better IDE support
- **Tailwind 4**: For styling
- **Shadcn/ui**: For accessible React UI components

### Backend

- **Supabase**: Comprehensive backend solution providing:
  - PostgreSQL database
  - SDK for Backend-as-a-Service
  - Built-in user authentication

### AI Integration

- **Openrouter.ai**: For communication with various AI models (OpenAI, Anthropic, Google, etc.)

### CI/CD & Hosting

- **GitHub Actions**: For CI/CD pipelines
- **DigitalOcean**: For application hosting via Docker

## Getting Started

### Prerequisites

- Node.js v22.14.0 (use nvm to manage Node versions)
- npm or yarn

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/10x-cards.git
   cd 10x-cards
   ```

2. Install Node.js v22.14.0 if you use nvm

   ```bash
   nvm install
   ```

3. Install dependencies

   ```bash
   npm install
   ```

4. Set up environment variables

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration values

5. Start the development server
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally
- `npm run astro` - Run Astro CLI commands
- `npm run lint` - Run ESLint to check for code issues
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier

## Project Scope

This application focuses primarily on flashcard creation and basic management. The project serves as a learning platform for new technologies and is not immediately intended for scaling to a large number of users.

### User Stories

The application implements the following key user stories:

- Generate flashcards from pasted text
- Manually create flashcards by entering questions and answers
- Edit and save flashcards
- Organize flashcards into categories
- Search through flashcards
- Register a new account
- Login and authentication
- Password reset functionality

### Boundaries

- The application focuses on creating and managing flashcards without advanced analytics or recommendation systems (these may be implemented in future phases)
- The project is primarily for learning new technologies
- Full security mechanisms required for organizations with sensitive data are not yet implemented

## Project Status

The project is currently in development phase.

### Success Metrics

- Number of flashcards generated or manually created
- Frequency of logins and application usage
- Learning effectiveness based on user feedback
- Average time needed to generate and save new flashcard sets
- Security level and prevention of unauthorized access to private flashcards

## License

This project is [MIT licensed](https://opensource.org/licenses/MIT).

## API Reference

### POST /api/v1/flashcards

Creates a new manual flashcard.

**Headers**

```
Content-Type: application/json
Authorization: Bearer <JWT>
```

**Request Body**

```json
{
  "question": "What is a closure in JavaScript?",
  "answer": "A closure is...",
  "categoryId": "<optional uuid>"
}
```

| Field      | Type   | Required | Constraints                  |
| ---------- | ------ | -------- | ---------------------------- |
| question   | string | yes      | 1–200 characters             |
| answer     | string | yes      | 1–500 characters             |
| categoryId | UUID   | no       | Must reference user category |

**Success Response**

`201 Created`

```
Location: /api/v1/flashcards/{id}
Content-Type: application/json
```

```json
{
  "id": "uuid",
  "question": "What is a closure in JavaScript?",
  "answer": "A closure is...",
  "categoryId": "uuid",
  "generationId": null,
  "source": "manual",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**Error Responses**

| Status | code                  | When                                  |
| ------ | --------------------- | ------------------------------------- |
| 400    | VALIDATION_ERROR      | Invalid `question` or `answer`        |
| 401    | UNAUTHORIZED          | Missing / invalid JWT                 |
| 404    | CATEGORY_NOT_FOUND    | `categoryId` not found / not owned    |
| 500    | INTERNAL_SERVER_ERROR | Unexpected database or server failure |

### PATCH /api/v1/flashcards/{id}

Updates an existing flashcard.

**Headers**

```
Content-Type: application/json
Authorization: Bearer <JWT>
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Flashcard identifier |

**Request Body**

```json
{
  "question": "Updated question?",
  "answer": "Updated answer...",
  "categoryId": "<optional uuid>"
}
```

| Field      | Type   | Required | Constraints                  |
| ---------- | ------ | -------- | ---------------------------- |
| question   | string | no       | 1–200 characters             |
| answer     | string | no       | 1–500 characters             |
| categoryId | UUID   | no       | Must reference user category |

At least one field must be provided.

**Success Response**

`200 OK`

```json
{
  "id": "uuid",
  "question": "Updated question?",
  "answer": "Updated answer...",
  "categoryId": "uuid",
  "generationId": null,
  "source": "manual",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**Error Responses**

| Status | code                  | When                                  |
| ------ | --------------------- | ------------------------------------- |
| 400    | VALIDATION_ERROR      | No fields provided or invalid data    |
| 401    | UNAUTHORIZED          | Missing / invalid JWT                 |
| 403    | FORBIDDEN             | Flashcard belongs to another user     |
| 404    | NOT_FOUND             | Flashcard or category not found       |
| 500    | INTERNAL_SERVER_ERROR | Unexpected database or server failure |
