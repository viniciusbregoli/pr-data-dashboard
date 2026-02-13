from fastapi import APIRouter, Request

from app.models import RepoListResponse

router = APIRouter()


@router.get("/repos", response_model=RepoListResponse)
async def list_repos(request: Request):
    return RepoListResponse(repos=request.app.state.repos)
