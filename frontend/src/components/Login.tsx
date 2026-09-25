import { useState, type FormEvent } from 'react'
import { API_URL } from '../config/api'
import type { User } from '../types/user'

type LoginProps = {
  onLogin: (user: User) => void
}

function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        credentials: 'include',

        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Login failed')
        return
      }

      onLogin(data.user)

    } catch (error) {
      console.error('LOGIN ERROR:', error)

      setMessage('Unable to connect to the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Company System
        </h1>

        <p className="mb-8 text-gray-600">
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-500"
            />
          </div>

          {message && (
            <p className="text-sm text-gray-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login