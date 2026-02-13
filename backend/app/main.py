from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import prs, repos
from app.services.github import GitHubService


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.github = GitHubService(
        token=settings.github_token,
        base_url=settings.github_api_base,
    )
    app.state.repos = settings.get_repos()
    yield
    await app.state.github.close()


app = FastAPI(title="PR Review Tracker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prs.router, prefix="/api")
app.include_router(repos.router, prefix="/api")
