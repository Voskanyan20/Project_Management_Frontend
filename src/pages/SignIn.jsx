import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignIn() {
  const { signIn, loading, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Ошибка входа')
    }
  }

  return (
    <div className="signin-page">
      <div className="signin-card">
        <div className="signin-brand">
          <div className="logo-icon">P</div>
          <div>
            <h1>Product Management</h1>
            <p>Войдите, чтобы управлять товарами и заказами</p>
          </div>
        </div>

        <form className="signin-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <label>
            Электронная почта
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivan@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
