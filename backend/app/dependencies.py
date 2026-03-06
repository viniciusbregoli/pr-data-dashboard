from collections.abc import AsyncIterator
import hashlib

from fastapi import Depends, Header, HTTPException

from app.config import settings
from app.services.github import GitHubService


def token_cache_key(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _normalize_token(token: str | None) -> str:
    value = (token or "").strip()
    if value.lower().startswith("token "):
        return value.split(" ", 1)[1].strip()
    if value.lower().startswith("bearer "):
        return value.split(" ", 1)[1].strip()
    return value


async def require_github_token(
    x_github_token: str | None = Header(default=None, alias="X-GitHub-Token"),
) -> str:
    token = _normalize_token(x_github_token)
    if not token:
        raise HTTPException(status_code=401, detail="GitHub token required.")
    return token


async def get_token_key(token: str = Depends(require_github_token)) -> str:
    return token_cache_key(token)


async def get_github_service(
    token: str = Depends(require_github_token),
) -> AsyncIterator[GitHubService]:
    github = GitHubService(token=token, base_url=settings.github_api_base)
    try:
        yield github
    finally:
        await github.close()
