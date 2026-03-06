import { useState } from 'react'
import { clearGithubToken, getStoredGithubToken } from './api/client'
import { Dashboard } from './components/Dashboard'
import { TokenGate } from './components/TokenGate'
import './index.css'

function App() {
  const [hasToken, setHasToken] = useState(() => Boolean(getStoredGithubToken()))

  function handleReady() {
    setHasToken(true)
  }

  function handleResetToken() {
    clearGithubToken()
    setHasToken(false)
  }

  return hasToken ? <Dashboard onResetToken={handleResetToken} /> : <TokenGate onReady={handleReady} />
}

export default App
