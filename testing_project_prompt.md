# Role
You are a Lead QA Automation Engineer and Full Stack Developer.

# Objective
Create a comprehensive testing solution for the **HelpFinder** monorepo application.

# Project Overview & Context
**HelpFinder** is a hyperlocal task marketplace connecting neighbors for help with everyday tasks.

## Tech Stack
-   **Monorepo**: npm workspaces
-   **Frontend**: `apps/web` (Next.js 14, React, Tailwind CSS, Leaflet Maps)
-   **Backend**: `services/api` (NestJS, TypeORM, PostgreSQL, Redis, JWT Auth)
-   **Shared**: `packages/shared` (TypeScript interfaces/types shared between FE and BE)

## Key Features & Business Logic
1.  **User Roles**:
    *   **Requester**: Posts tasks, accepts bids, approves completion.
    *   **Helper**: Browses tasks, places bids, performs work.
    *   **Admin**: Manages categories and users.
2.  **Task Lifecycle**:
    *   `Open`: Task posted, accepting bids.
    *   `Accepted`: Requester accepts a bid. Contract created. (Requester cannot edit task details).
    *   `In Progress`: Helper clicks "Start Task". (Helper cannot withdraw/edit bid).
    *   `Review Pending`: Helper marks task as done.
    *   `Completed`: Requester approves work.
3.  **Bidding System**:
    *   Helpers place bids with price and comment.
    *   Requesters accept a bid to form a contract.
    *   Helpers can withdraw/edit bids *only* if the task is still `Open` or `Accepted` (before work starts). *Correction: Recent update restricts withdrawing/editing once Accepted.*
4.  **Geolocation**: Tasks have lat/long. Frontend uses a map view.

# Input Documents
Please refer to the `testing_architecture_walkthrough.md` file for the architectural blueprint and strategy.

# Instructions

## Step 1: Framework Setup
1.  **Backend**: Verify `jest` configuration in `services/api`. Ensure it supports both unit (`.spec.ts`) and integration (`test/*.e2e-spec.ts`) tests.
2.  **Frontend**: Verify `jest` and `@testing-library/react` configuration in `apps/web`. Create a `jest.setup.js` if missing.
3.  **E2E**: Initialize a new workspace `apps/e2e` using Playwright. Configure it to test the running application.

## Step 2: Backend Testing (Priority: High)
1.  **Unit Tests**: Write unit tests for `TasksService`.
    *   Test `createTask`.
    *   Test `startTask` (verify status transition and contract creation).
    *   Test `updateTask` (verify "cannot edit if accepted" logic).
2.  **Integration Tests**: Write an integration test for the Task Lifecycle.
    *   POST `/tasks` (Create)
    *   POST `/bids` (Bid)
    *   POST `/bids/:id/accept` (Accept)
    *   POST `/tasks/:id/start` (Start)

## Step 3: Frontend Testing (Priority: Medium)
1.  **Component Tests**: Write tests for `TaskCard.tsx`.
    *   Verify it renders task details.
    *   Verify "Edit" button is **hidden** when status is `in_progress`.
    *   Verify "Start Task" button is **visible** for the assigned helper.

## Step 4: E2E Testing (Priority: High)
1.  **Critical Path**: Automate the "Happy Path" flow.
    *   Register User A (Requester).
    *   Register User B (Helper).
    *   User A posts a task.
    *   User B bids on the task.
    *   User A accepts the bid.
    *   User B starts the task.
    *   User B completes the task.
    *   User A approves the task.

# Deliverables
-   Updated `package.json` files with test scripts.
-   Test files (`.spec.ts`, `.test.tsx`, `.spec.ts` for Playwright).
-   A report of test execution results.

# Constraints
-   Use **TypeScript** for all tests.
-   Ensure tests are independent and idempotent where possible.
-   Mock external services (like Geocoding API) in Unit/Integration tests.
