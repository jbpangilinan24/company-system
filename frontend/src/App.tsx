import { useEffect, useState } from 'react'
import { API_URL } from './config/api'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import type { User } from './types/user'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuthentication() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        })

        if (!response.ok) {
          setUser(null)
          return
        }

        const data = await response.json()

        setUser(data.user)
      } catch (error) {
        console.error('AUTH CHECK ERROR:', error)

        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuthentication()
  }, [])

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('LOGOUT ERROR:', error)
    } finally {
      setUser(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">
          Loading...
        </p>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
    />
  )
}

export default App