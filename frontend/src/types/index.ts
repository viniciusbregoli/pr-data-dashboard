export interface PRInfo {
  number: number
  title: string
  author: string
  repo: string
  created_at: string
  url: string
  status: 'open' | 'merged' | 'closed'
  reviewed: boolean
  human_review: 'waiting' | 'approved' | 'none'
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

export interface RepoListResponse {
  repos: string[]
}

export interface AuthorListResponse {
  authors: string[]
}
