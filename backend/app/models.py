from datetime import datetime

from pydantic import BaseModel


class PRInfo(BaseModel):
    number: int
    title: str
    author: str
    repo: str
    created_at: datetime
    url: str
    status: str  # "open", "merged", "closed"
    reviewed: bool
    human_review: str  # "changes_requested", "waiting", "approved", "none"
    reviewers: list[str]
    approved_by: list[str]
    changes_requested_by: list[str]
    approval_count: int


class PRStats(BaseModel):
    total: int
    reviewed: int
    not_reviewed: int
    reviewed_percent: float
    with_2_approvals: int
    with_2_approvals_percent: float


class PRListResponse(BaseModel):
    prs: list[PRInfo]
    stats: PRStats


class PRLoadProgressResponse(BaseModel):
    status: str  # "idle", "running", "complete", "error"
    message: str
    progress_percent: float
    total_repos: int
    completed_repos: int
    total_prs: int
    completed_prs: int
    current_repo: str | None = None


class RepoListResponse(BaseModel):
    repos: list[str]


class AuthorListResponse(BaseModel):
    authors: list[str]
