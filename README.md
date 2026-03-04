# PR Review Tracker

Dashboard for tracking AI code review compliance and approval goals across GitHub repositories.

![Dashboard](dashboard.png)

## Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 18+
- npm

## Setup

### 1. Get a GitHub Personal Access Token

1. Go to **GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name (e.g. `pr-review-tracker`)
4. Select the **`repo`** scope (required for accessing PR data on repos you have access to)
5. Click **Generate token** and copy it

> If the repos you're tracking are public, you can create a token with no scopes — this still gives you 5,000 requests/hour instead of 60.

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and paste your token:

```
GITHUB_TOKEN=ghp_your_token_here
```

### 3. Configure repositories

Edit `config.json` in the project root with the repos you want to track:

```json
{
  "repos": [
    "your-org/repo-one",
    "your-org/repo-two"
  ]
}
```

## Running

### Docker Compose (Frontend + Backend)

Make sure `backend/.env` has your GitHub token:

```
GITHUB_TOKEN=ghp_your_token_here
```

Then run everything with one command from the project root:

```bash
docker compose up --build
```

App URLs:

- Frontend: `http://localhost:5173`

The backend API is available internally to the frontend at `http://backend:8000`.

## How it works

- **AI Review detection**: A PR is marked as "Reviewed" if `github-actions[bot]` left a comment containing "Code Review"
- **Human Review detection**: Based on PR labels — `wait-review` shows "Waiting Review", `approved` shows "Approved"
- **Approval tracking**: Fetches PR reviews from GitHub API. Only counts a reviewer as an approver if their most recent review state is `APPROVED` (a later "changes requested" revokes it)
- **Reviewers**: Shows GitHub usernames of anyone who submitted a PR review (excluding bots), color-coded by approval status
- **Dependabot PRs** are automatically excluded
- **Ignore marker**: Add a comment containing `#ignore-tracker` to any PR to exclude it from the dashboard entirely
