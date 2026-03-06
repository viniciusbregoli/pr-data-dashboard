from fastapi import APIRouter, Depends, Request

from app.dependencies import get_github_service
from app.models import RepoListResponse
from app.services.github import GitHubService

router = APIRouter()


@router.get("/repos", response_model=RepoListResponse)
async def list_repos(
    request: Request,
    github: GitHubService = Depends(get_github_service),
):
    repos = await github.get_accessible_repos(request.app.state.repos)
    return RepoListResponse(repos=repos)
