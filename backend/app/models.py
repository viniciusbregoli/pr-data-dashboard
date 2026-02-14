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
    human_review: str  # "waiting", "approved", "none"
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


class RepoListResponse(BaseModel):
    repos: list[str]


class AuthorListResponse(BaseModel):
    authors: list[str]
