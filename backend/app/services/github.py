import asyncio
import logging
import time
from datetime import datetime

import httpx
from cachetools import TTLCache

logger = logging.getLogger(__name__)

# Cache review status: (repo, pr_number) -> bool, 5 min TTL
_review_cache: TTLCache = TTLCache(maxsize=4096, ttl=300)
_reviewers_cache: TTLCache = TTLCache(maxsize=4096, ttl=300)


class GitHubService:
    def __init__(self, token: str, base_url: str = "https://api.github.com"):
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=30.0,
        )

    async def close(self):
        await self.client.aclose()

    async def get_prs(
        self,
        repo: str,
        since: datetime,
        until: datetime,
        author: str | None = None,
    ) -> list[dict]:
        """Fetch closed + open PRs for a repo within a date range."""
        all_prs = []
        for state in ("open", "closed"):
            prs = await self._fetch_prs(repo, state, since, until)
            all_prs.extend(prs)

        if author:
            all_prs = [
                pr for pr in all_prs if pr["user"]["login"].lower() == author.lower()
            ]

        return all_prs

    async def _fetch_prs(
        self, repo: str, state: str, since: datetime, until: datetime
    ) -> list[dict]:
        """Paginate through PRs, stopping early when past the date window."""
        url = f"/repos/{repo}/pulls"
        params = {
            "state": state,
            "sort": "created",
            "direction": "desc",
            "per_page": 100,
        }
        results = []
        page = 1

        while True:
            params["page"] = page
            resp = await self.client.get(url, params=params)
            await self._check_rate_limit(resp)
            resp.raise_for_status()
            data = resp.json()

            if not data:
                break

            for pr in data:
                created = datetime.fromisoformat(pr["created_at"].replace("Z", "+00:00"))
                created_naive = created.replace(tzinfo=None)
                if created_naive > until:
                    continue
                if created_naive < since:
                    return results
                if pr["user"]["login"] == "dependabot[bot]":
                    continue
                results.append(pr)

            if len(data) < 100:
                break
            page += 1

        return results

    async def check_pr_comments(self, repo: str, pr_number: int) -> dict:
        """Scan PR comments for AI review and ignore marker.

        Returns {"ai_reviewed": bool, "ignored": bool}.
        """
        cache_key = (repo, pr_number)
        if cache_key in _review_cache:
            return _review_cache[cache_key]

        url = f"/repos/{repo}/issues/{pr_number}/comments"
        params = {"per_page": 100}
        page = 1
        ai_reviewed = False
        ignored = False

        while True:
            params["page"] = page
            resp = await self.client.get(url, params=params)
            await self._check_rate_limit(resp)
            resp.raise_for_status()
            comments = resp.json()

            if not comments:
                break

            for comment in comments:
                user = comment.get("user", {}).get("login", "")
                body = comment.get("body", "")
                if user == "github-actions[bot]" and "Code Review" in body:
                    ai_reviewed = True
                if "#ignore-tracker" in body:
                    ignored = True

            if len(comments) < 100:
                break
            page += 1

        result = {"ai_reviewed": ai_reviewed, "ignored": ignored}
        _review_cache[cache_key] = result
        return result

    async def get_review_details(self, repo: str, pr_number: int) -> dict:
        """Get reviewers and approvers for a PR.

        Returns {"reviewers": [...], "approved_by": [...]}.
        A reviewer's latest review state determines if they count as an approver.
        """
        cache_key = (repo, pr_number)
        if cache_key in _reviewers_cache:
            return _reviewers_cache[cache_key]

        url = f"/repos/{repo}/pulls/{pr_number}/reviews"
        params = {"per_page": 100}
        reviewers: dict[str, None] = {}  # ordered unique
        # Track latest state per reviewer (last review wins)
        latest_state: dict[str, str] = {}
        page = 1

        while True:
            params["page"] = page
            resp = await self.client.get(url, params=params)
            await self._check_rate_limit(resp)
            resp.raise_for_status()
            reviews = resp.json()

            if not reviews:
                break

            for review in reviews:
                login = review.get("user", {}).get("login", "")
                state = review.get("state", "")
                if login and not login.endswith("[bot]"):
                    reviewers[login] = None
                    if state in ("APPROVED", "CHANGES_REQUESTED", "DISMISSED"):
                        latest_state[login] = state

            if len(reviews) < 100:
                break
            page += 1

        approved_by = [u for u, s in latest_state.items() if s == "APPROVED"]
        result = {
            "reviewers": list(reviewers.keys()),
            "approved_by": approved_by,
        }
        _reviewers_cache[cache_key] = result
        return result

    async def enrich_prs(self, repo: str, prs: list[dict]) -> list[dict]:
        """Check AI review status and fetch reviewers for all PRs concurrently."""
        sem = asyncio.Semaphore(10)

        async def check(pr: dict) -> dict:
            async with sem:
                comment_info = await self.check_pr_comments(repo, pr["number"])
                pr["_reviewed"] = comment_info["ai_reviewed"]
                pr["_ignored"] = comment_info["ignored"]
                details = await self.get_review_details(repo, pr["number"])
                # Merge requested reviewers (pending) with those who already reviewed
                requested = [
                    u["login"]
                    for u in pr.get("requested_reviewers", [])
                    if u.get("login")
                ]
                all_reviewers = list(
                    dict.fromkeys(details["reviewers"] + requested)
                )
                pr["_reviewers"] = all_reviewers
                pr["_approved_by"] = details["approved_by"]
                return pr

        return await asyncio.gather(*[check(pr) for pr in prs])

    async def get_authors(self, repos: list[str], since: datetime, until: datetime) -> list[str]:
        """Get distinct PR authors across repos."""
        authors: set[str] = set()
        for repo in repos:
            prs = await self.get_prs(repo, since, until)
            for pr in prs:
                authors.add(pr["user"]["login"])
        return sorted(authors)

    async def _check_rate_limit(self, response: httpx.Response):
        remaining = int(response.headers.get("X-RateLimit-Remaining", "100"))
        if remaining < 10:
            reset_at = int(response.headers.get("X-RateLimit-Reset", "0"))
            wait = max(reset_at - time.time(), 0) + 1
            logger.warning(f"Rate limit low ({remaining}). Sleeping {wait:.0f}s.")
            await asyncio.sleep(wait)
