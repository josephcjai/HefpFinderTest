# HelpFinder Testing Project Walkthrough

This document outlines the architecture, tools, and strategy for implementing a comprehensive testing solution for the HelpFinder monorepo.

## 1. Testing Architecture & Tech Stack

We will follow the **Testing Pyramid** approach:
1.  **E2E Tests (Top)**: Full user flows using **Playwright**.
2.  **Integration Tests (Middle)**: API endpoint tests using **Jest + Supertest** (NestJS Testing Module).
3.  **Unit Tests (Bottom)**: Individual functions/components using **Jest** (Backend) and **Jest + React Testing Library** (Frontend).

### Technology Stack
-   **Framework**: Jest (Unit/Integration), Playwright (E2E)
-   **Backend**: `@nestjs/testing`, `supertest`
-   **Frontend**: `@testing-library/react`, `@testing-library/jest-dom`
-   **CI/CD**: GitHub Actions (optional but recommended)

---

## 2. Project Structure

We will leverage the existing monorepo structure.

```text
helpfinder/
├── apps/
│   ├── web/
│   │   ├── __tests__/          # Frontend Component/Unit Tests
│   │   └── ...
│   └── e2e/                    # NEW: Dedicated E2E Testing App
│       ├── tests/
│       │   ├── auth.spec.ts
│       │   ├── tasks.spec.ts
│       │   └── ...
│       ├── playwright.config.ts
│       └── package.json
├── services/
│   ├── api/
│   │   ├── test/               # Backend Integration Tests (e2e for API)
│   │   │   ├── app.e2e-spec.ts
│   │   │   └── ...
│   │   ├── src/
│   │   │   └── .../*.spec.ts   # Backend Unit Tests (co-located)
```

---

## 3. Implementation Steps

### Phase 1: Backend Testing (API)

**Goal**: Ensure business logic and API endpoints work correctly.

1.  **Unit Tests (`*.spec.ts`)**:
    *   Focus on `Services` (e.g., `TasksService`, `BidsService`).
    *   Mock dependencies (Repositories, other Services).
    *   Test edge cases (e.g., "cannot edit task if status is accepted").

2.  **Integration Tests (`test/*.e2e-spec.ts`)**:
    *   Spin up the NestJS application context.
    *   Use an in-memory database (sqlite) or a test container (Postgres) for isolation.
    *   Test HTTP endpoints (GET, POST, PUT, DELETE) using `supertest`.
    *   Verify database state changes.

### Phase 2: Frontend Testing (Web)

**Goal**: Ensure UI components render correctly and handle user interactions.

1.  **Component Tests (`__tests__`)**:
    *   Focus on complex components: `TaskCard`, `BidList`, `CreateTaskForm`.
    *   Test rendering states (loading, error, data).
    *   Test user interactions (clicks, form submissions).
    *   Mock API calls using `jest.mock`.

### Phase 3: End-to-End Testing (E2E)

**Goal**: Verify full user journeys across the entire stack.

1.  **Setup**:
    *   Create a new workspace `apps/e2e`.
    *   Install Playwright: `npm init playwright@latest`.

2.  **Scenarios**:
    *   **Auth Flow**: Register -> Login -> Logout.
    *   **Task Lifecycle**:
        1.  User A (Requester) posts a task.
        2.  User B (Helper) views task and places a bid.
        3.  User A accepts the bid.
        4.  User B starts the task.
        5.  User B completes the task.
        6.  User A approves the task.
    *   **Validation**: Verify "Edit" button is hidden when task is in progress.

---

## 4. Configuration Details

### Backend (`services/api/jest.config.js`)
Ensure mapping for `@helpfinder/shared` is configured if used in tests.

### Frontend (`apps/web/jest.config.js`)
Ensure `testEnvironment` is `jsdom` and setup files include `@testing-library/jest-dom`.

### E2E (`apps/e2e/playwright.config.ts`)
Configure `baseURL` to point to the running web app (e.g., `http://localhost:3000`).
Configure `webServer` to start the app and api if needed, or assume they are running.

---

## 5. Running Tests

-   **Unit/Integration**: `npm run test` (in respective workspaces).
-   **E2E**: `npm run test:e2e` (from root or `apps/e2e`).
