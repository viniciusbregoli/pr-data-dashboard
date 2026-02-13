from datetime import datetime, timedelta

from cachetools import TTLCache
from fastapi import APIRouter, Query, Request

from app.models import AuthorListResponse, PRInfo, PRListResponse, PRStats

router = APIRouter()

# Cache responses for 5 minutes, keyed by query params
_prs_cache: TTLCache = TTLCache(maxsize=256, ttl=300)
_authors_cache: TTLCache = TTLCache(maxsize=64, ttl=300)


@router.post("/cache/clear")
async def clear_cache(request: Request):
    from app.services.github import _review_cache, _reviewers_cache
    _prs_cache.clear()
    _authors_cache.clear()
    _review_cache.clear()
    _reviewers_cache.clear()
    return {"status": "ok"}


def _get_human_review(pr: dict) -> str:
    labels = [l["name"].lower() for l in pr.get("labels", [])]
    if "approved" in labels:
        return "approved"
    if "wait-review" in labels:
        return "waiting"
    return "none"


def _get_pr_status(pr: dict) -> str:
    if pr.get("merged_at"):
        return "merged"
    if pr["state"] == "closed":
        return "closed"
    return "open"


def _default_since() -> str:
    return (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")


def _default_until() -> str:
    return datetime.now().strftime("%Y-%m-%d")


@router.get("/prs", response_model=PRListResponse)
async def list_prs(
    request: Request,
    since: str = Query(default_factory=_default_since),
    until: str = Query(default_factory=_default_until),
    repo: str | None = Query(default=None),
    author: str | None = Query(default=None),
    status: str | None = Query(default=None),
    show_ignored: bool = Query(default=False),
):
    cache_key = (since, until, repo, author, status, show_ignored)
    if cache_key in _prs_cache:
        return _prs_cache[cache_key]

    github = request.app.state.github
    repos = request.app.state.repos

    since_dt = datetime.strptime(since, "%Y-%m-%d")
    until_dt = datetime.strptime(until, "%Y-%m-%d").replace(hour=23, minute=59, second=59)

    target_repos = [repo] if repo and repo in repos else repos

    all_prs: list[PRInfo] = []
    for r in target_repos:
        raw_prs = await github.get_prs(r, since_dt, until_dt, author=author)
        enriched = await github.enrich_prs(r, raw_prs)
        for pr in enriched:
            if pr.get("_ignored") and not show_ignored:
                continue
            pr_status = _get_pr_status(pr)
            if status and pr_status != status:
                continue
            all_prs.append(
                PRInfo(
                    number=pr["number"],
                    title=pr["title"],
                    author=pr["user"]["login"],
                    repo=r,
                    created_at=pr["created_at"],
                    url=pr["html_url"],
                    status=pr_status,
                    reviewed=pr["_reviewed"],
                    human_review=_get_human_review(pr),
                    reviewers=pr["_reviewers"],
                    approved_by=pr["_approved_by"],
                    approval_count=len(pr["_approved_by"]),
                )
            )

    all_prs.sort(key=lambda p: p.created_at, reverse=True)

    total = len(all_prs)
    reviewed = sum(1 for p in all_prs if p.reviewed)
    not_reviewed = total - reviewed
    with_2_approvals = sum(1 for p in all_prs if p.approval_count >= 2)

    stats = PRStats(
        total=total,
        reviewed=reviewed,
        not_reviewed=not_reviewed,
        reviewed_percent=round((reviewed / total * 100) if total > 0 else 0, 1),
        with_2_approvals=with_2_approvals,
        with_2_approvals_percent=round((with_2_approvals / total * 100) if total > 0 else 0, 1),
    )

    result = PRListResponse(prs=all_prs, stats=stats)
    _prs_cache[cache_key] = result
    return result


@router.get("/authors", response_model=AuthorListResponse)
async def list_authors(
    request: Request,
    since: str = Query(default_factory=_default_since),
    until: str = Query(default_factory=_default_until),
):
    github = request.app.state.github
    repos = request.app.state.repos

    since_dt = datetime.strptime(since, "%Y-%m-%d")
    until_dt = datetime.strptime(until, "%Y-%m-%d").replace(hour=23, minute=59, second=59)

    cache_key = (since, until)
    if cache_key in _authors_cache:
        return _authors_cache[cache_key]

    authors = await github.get_authors(repos, since_dt, until_dt)
    result = AuthorListResponse(authors=authors)
    _authors_cache[cache_key] = result
    return result
