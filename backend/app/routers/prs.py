import asyncio
from datetime import datetime, timedelta

from cachetools import TTLCache
from fastapi import APIRouter, Depends, Query, Request

from app.dependencies import get_github_service, get_token_key
from app.models import (
    AuthorListResponse,
    PRInfo,
    PRListResponse,
    PRLoadProgressResponse,
    PRStats,
)
from app.services.github import GitHubService, clear_github_caches

router = APIRouter()

# Cache responses for 5 minutes, keyed by query params
_prs_cache: TTLCache = TTLCache(maxsize=256, ttl=300)
_authors_cache: TTLCache = TTLCache(maxsize=64, ttl=300)
_progress_cache: TTLCache = TTLCache(maxsize=256, ttl=300)


def _clear_token_cache(cache: TTLCache, token_key: str):
    for key in list(cache.keys()):
        if isinstance(key, tuple) and key and key[0] == token_key:
            cache.pop(key, None)


def _prs_cache_key(
    token_key: str,
    since: str,
    until: str,
    repo: str | None,
    author: str | None,
    status: str | None,
    show_ignored: bool,
) -> tuple:
    return (token_key, since, until, repo, author, status, show_ignored)


def _progress_message(exception: Exception) -> str:
    detail = getattr(exception, "detail", None)
    if isinstance(detail, str) and detail:
        return detail
    return "Failed to load pull requests."


def _progress_state(
    status: str,
    message: str,
    total_repos: int = 0,
    completed_repos: int = 0,
    total_prs: int = 0,
    completed_prs: int = 0,
    current_repo: str | None = None,
) -> PRLoadProgressResponse:
    if status == "complete":
        progress_percent = 100.0
    elif total_prs > 0:
        progress_percent = round((completed_prs / total_prs) * 100, 1)
    elif total_repos > 0:
        progress_percent = round((completed_repos / total_repos) * 100, 1)
    else:
        progress_percent = 0.0

    return PRLoadProgressResponse(
        status=status,
        message=message,
        progress_percent=progress_percent,
        total_repos=total_repos,
        completed_repos=completed_repos,
        total_prs=total_prs,
        completed_prs=completed_prs,
        current_repo=current_repo,
    )


def _set_progress(
    cache_key: tuple,
    status: str,
    message: str,
    total_repos: int = 0,
    completed_repos: int = 0,
    total_prs: int = 0,
    completed_prs: int = 0,
    current_repo: str | None = None,
):
    _progress_cache[cache_key] = _progress_state(
        status=status,
        message=message,
        total_repos=total_repos,
        completed_repos=completed_repos,
        total_prs=total_prs,
        completed_prs=completed_prs,
        current_repo=current_repo,
    )


def _empty_result() -> PRListResponse:
    return PRListResponse(
        prs=[],
        stats=PRStats(
            total=0,
            reviewed=0,
            not_reviewed=0,
            reviewed_percent=0,
            with_2_approvals=0,
            with_2_approvals_percent=0,
        ),
    )


@router.post("/cache/clear")
async def clear_cache(token_key: str = Depends(get_token_key)):
    _clear_token_cache(_prs_cache, token_key)
    _clear_token_cache(_authors_cache, token_key)
    _clear_token_cache(_progress_cache, token_key)
    clear_github_caches(token_key)
    return {"status": "ok"}


def _get_human_review(pr: dict) -> str:
    if pr.get("_changes_requested_by"):
        return "changes_requested"
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


@router.get("/prs/progress", response_model=PRLoadProgressResponse)
async def get_pr_progress(
    token_key: str = Depends(get_token_key),
    since: str = Query(default_factory=_default_since),
    until: str = Query(default_factory=_default_until),
    repo: str | None = Query(default=None),
    author: str | None = Query(default=None),
    status: str | None = Query(default=None),
    show_ignored: bool = Query(default=False),
):
    cache_key = _prs_cache_key(token_key, since, until, repo, author, status, show_ignored)
    if cache_key in _progress_cache:
        return _progress_cache[cache_key]
    if cache_key in _prs_cache:
        return _progress_state(status="complete", message="Loaded from cache.")
    return _progress_state(status="idle", message="Waiting to start loading...")


@router.get("/prs", response_model=PRListResponse)
async def list_prs(
    request: Request,
    github: GitHubService = Depends(get_github_service),
    token_key: str = Depends(get_token_key),
    since: str = Query(default_factory=_default_since),
    until: str = Query(default_factory=_default_until),
    repo: str | None = Query(default=None),
    author: str | None = Query(default=None),
    status: str | None = Query(default=None),
    show_ignored: bool = Query(default=False),
):
    cache_key = _prs_cache_key(token_key, since, until, repo, author, status, show_ignored)
    if cache_key in _prs_cache:
        _set_progress(cache_key, status="complete", message="Loaded from cache.")
        return _prs_cache[cache_key]

    _set_progress(cache_key, status="running", message="Checking repository access...")
    total_repos = 0
    completed_repos = 0
    total_prs = 0
    completed_prs = 0

    try:
        repos = await github.get_accessible_repos(request.app.state.repos)

        since_dt = datetime.strptime(since, "%Y-%m-%d")
        until_dt = datetime.strptime(until, "%Y-%m-%d").replace(hour=23, minute=59, second=59)

        target_repos = [repo] if repo and repo in repos else ([] if repo else repos)
        total_repos = len(target_repos)

        if total_repos == 0:
            result = _empty_result()
            _prs_cache[cache_key] = result
            _set_progress(
                cache_key,
                status="complete",
                message="No accessible repositories matched the current filters.",
                total_prs=0,
                completed_prs=0,
            )
            return result

        _set_progress(
            cache_key,
            status="running",
            message=f"Scanning {total_repos} repositories for PRs...",
            total_repos=total_repos,
        )

        repo_prs: list[tuple[str, list[dict]]] = []
        for index, r in enumerate(target_repos, start=1):
            _set_progress(
                cache_key,
                status="running",
                message=f"Collecting PRs from {r} ({index}/{total_repos})...",
                total_repos=total_repos,
                completed_repos=index - 1,
                total_prs=total_prs,
                completed_prs=completed_prs,
                current_repo=r,
            )
            raw_prs = await github.get_prs(r, since_dt, until_dt, author=author)
            total_prs += len(raw_prs)
            repo_prs.append((r, raw_prs))
            _set_progress(
                cache_key,
                status="running",
                message=f"Found {total_prs} PRs so far across {index} of {total_repos} repositories.",
                total_repos=total_repos,
                completed_repos=index,
                total_prs=total_prs,
                completed_prs=completed_prs,
                current_repo=r,
            )

        if total_prs == 0:
            result = _empty_result()
            _prs_cache[cache_key] = result
            _set_progress(
                cache_key,
                status="complete",
                message="No pull requests matched the current filters.",
                total_repos=total_repos,
                completed_repos=total_repos,
                total_prs=0,
                completed_prs=0,
            )
            return result

        _set_progress(
            cache_key,
            status="running",
            message=f"Processing 0 of {total_prs} PRs...",
            total_repos=total_repos,
            total_prs=total_prs,
            completed_prs=0,
        )

        all_prs: list[PRInfo] = []
        completed_repos = 0
        for index, (r, raw_prs) in enumerate(repo_prs, start=1):
            progress_lock = asyncio.Lock()

            async def on_pr_processed(pr: dict):
                nonlocal completed_prs
                async with progress_lock:
                    completed_prs += 1
                    _set_progress(
                        cache_key,
                        status="running",
                        message=f"Processing {completed_prs} of {total_prs} PRs...",
                        total_repos=total_repos,
                        completed_repos=completed_repos,
                        total_prs=total_prs,
                        completed_prs=completed_prs,
                        current_repo=r,
                    )

            _set_progress(
                cache_key,
                status="running",
                message=f"Processing {completed_prs} of {total_prs} PRs in {r}...",
                total_repos=total_repos,
                completed_repos=completed_repos,
                total_prs=total_prs,
                completed_prs=completed_prs,
                current_repo=r,
            )
            enriched = await github.enrich_prs(r, raw_prs, on_pr_processed=on_pr_processed)
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
                        changes_requested_by=pr.get("_changes_requested_by", []),
                        approval_count=len(pr["_approved_by"]),
                    )
                )
            completed_repos = index
            _set_progress(
                cache_key,
                status="running",
                message=f"Processed {completed_prs} of {total_prs} PRs.",
                total_repos=total_repos,
                completed_repos=completed_repos,
                total_prs=total_prs,
                completed_prs=completed_prs,
                current_repo=r,
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
        _set_progress(
            cache_key,
            status="complete",
            message=f"Loaded {total} PRs from {total_repos} repositories.",
            total_repos=total_repos,
            completed_repos=total_repos,
            total_prs=total_prs,
            completed_prs=completed_prs,
        )
        return result
    except Exception as exc:
        _set_progress(
            cache_key,
            status="error",
            message=_progress_message(exc),
            total_repos=total_repos,
            completed_repos=completed_repos,
            total_prs=total_prs,
            completed_prs=completed_prs,
        )
        raise


@router.get("/authors", response_model=AuthorListResponse)
async def list_authors(
    request: Request,
    github: GitHubService = Depends(get_github_service),
    token_key: str = Depends(get_token_key),
    since: str = Query(default_factory=_default_since),
    until: str = Query(default_factory=_default_until),
):
    cache_key = (token_key, since, until)
    if cache_key in _authors_cache:
        return _authors_cache[cache_key]

    repos = await github.get_accessible_repos(request.app.state.repos)

    since_dt = datetime.strptime(since, "%Y-%m-%d")
    until_dt = datetime.strptime(until, "%Y-%m-%d").replace(hour=23, minute=59, second=59)

    authors = await github.get_authors(repos, since_dt, until_dt)
    result = AuthorListResponse(authors=authors)
    _authors_cache[cache_key] = result
    return result
