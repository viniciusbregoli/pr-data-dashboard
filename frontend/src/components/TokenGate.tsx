import { useState, type FormEvent } from 'react'
import { getRepos, saveGithubToken } from '../api/client'

interface Props {
  onReady: () => void
}

export function TokenGate({ onReady }: Props) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextToken = token.trim()
    if (!nextToken) {
      setError('Enter your GitHub token.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await getRepos(nextToken)
      saveGithubToken(nextToken)
      onReady()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify GitHub token.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="auth-eyebrow">PR Review Tracker</p>
        <h1>Enter your GitHub token</h1>
        <p className="auth-copy">
          Your token is stored only in this browser and is used to load only the repositories
          your GitHub account can access.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="github-token">GitHub personal access token</label>
          <input
            id="github-token"
            className="auth-input"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="github_pat_..."
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>

        {error && <div className="error-banner auth-error">{error}</div>}

        <p className="token-help">
          Use a token that can read the private repositories configured for this dashboard.
        </p>
      </section>
    </main>
  )
}
