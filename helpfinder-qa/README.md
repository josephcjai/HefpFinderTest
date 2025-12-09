# HelpFinder QA Suite

Standalone testing solution for [HelpFinder](https://github.com/josephcjai/HelpFinder.git).

## Overview
This project contains Black Box tests for the HelpFinder application.
- **API Tests**: `api/` (Jest + Supertest)
- **E2E Tests**: `e2e/` (Playwright)

## Prerequisites: Isolated Test Environment
Before running tests, you must set up the isolated environment to protect development data.

### 1. Database Setup (First Time Only)
Create a dedicated `helpfinder_test` database inside your Docker container. **You only need to run this once.**
```bash
docker exec helpfinder-postgres createdb -U postgres helpfinder_test
```
*(If it says "database already exists", you can skip this)*
*(The application will automatically sync the schema when connected)*

### 2. Start Backend API (Port 4001)
Run the API service connected to the test database:

**Windows (PowerShell):**
```powershell
# In temp_analysis/services/api
$env:PORT='4001'; $env:DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/helpfinder_test'; npm run dev
```

**Mac/Linux (Bash):**
```bash
export PORT=4001
export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/helpfinder_test
npm run dev
```

### 3. Start Frontend (Port 3001)
Run the Web app connected to the Test API:

**Windows (PowerShell):**
```powershell
# In temp_analysis/apps/web
$env:NEXT_PUBLIC_API_BASE='http://localhost:4001'; npm run dev -- -p 3001
```

**Mac/Linux (Bash):**
```bash
export NEXT_PUBLIC_API_BASE=http://localhost:4001
npm run dev -- -p 3001
```

## Setup (QA Project)
1. `npm install` (Only required once)
2. Ensure the Test Environment is running as above.

## Syncing Code Changes
To update the test environment with the latest code from the remote repository:
```bash
npm run sync-env
```
*This will:*
1. *Stash distinct local changes.*
2. *Pull the latest code from GitHub.*
3. *Install any new dependencies.*
*(Then restart the test servers)*

## Running Tests
- API: `npm test`
- E2E: `npx playwright test`

## Stopping the Environment
To stop the test servers:
1.  **Terminal Method**: Go to the terminal windows running the servers and press `Ctrl + C` (multiple times if needed).
2.  **Force Kill (PowerShell)**: If they won't stop, run:
    ```powershell
    Stop-Process -Id (Get-NetTCPConnection -LocalPort 4001,3001).OwningProcess -Force
    ```

## Future Maintenance
To update tests based on changes in the main application:
1. Run `npm run sync-env` to pull the latest code into `temp_analysis`.
2. Analyze code changes in the updated `temp_analysis` folder.
3. Update tests in `helpfinder-qa/` to match.
