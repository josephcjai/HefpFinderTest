# HelpFinder QA Suite

Standalone testing solution for [HelpFinder](https://github.com/josephcjai/HelpFinder.git).

## Overview
This project contains Black Box tests for the HelpFinder application.
- **API Tests**: `api/` (Jest + Supertest)
- **E2E Tests**: `e2e/` (Playwright)

## Setup
1. `npm install`
2. Ensure HelpFinder is running locally (API: 4000, Web: 3000).

## Running Tests
- API: `npm test`
- E2E: `npx playwright test`

## Future Maintenance
To update tests based on changes in the main application:
1. Clone the dev repo for analysis (it is git-ignored):
   ```bash
   git clone https://github.com/josephcjai/HelpFinder.git helpfinder
   ```
2. Analyze code changes in `helpfinder/`.
3. Update tests in `helpfinder-qa/`.
4. Delete `helpfinder/` after analysis if desired.
