export interface PRInfo {
  number: number
  title: string
  author: string
  repo: string
  created_at: string
  url: string
  status: 'open' | 'merged' | 'closed'
  reviewed: boolean
  human_review: 'changes_requested' | 'waiting' | 'approved' | 'none'
  reviewers: string[]
  approved_by: string[]
  changes_requested_by: string[]
  approval_count: number
}

export interface PRStats {
  total: number
  reviewed: number
  not_reviewed: number
  reviewed_percent: number
  with_2_approvals: number
  with_2_approvals_percent: number
}

export interface PRListResponse {
  prs: PRInfo[]
  stats: PRStats
}

export interface PRLoadProgressResponse {
  status: 'idle' | 'running' | 'complete' | 'error'
  message: string
  progress_percent: number
  total_repos: number
  completed_repos: number
  total_prs: number
  completed_prs: number
  current_repo: string | null
}

export interface RepoListResponse {
  repos: string[]
}

export interface AuthorListResponse {
  authors: string[]
}
