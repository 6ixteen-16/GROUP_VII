import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { Alert } from '../components/UI'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/password-reset/', { email })
      setSuccess(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8, marginTop: 16 }}>Check Your Email</h2>
          <p className="text-secondary" style={{ marginBottom: 24 }}>
            If an account with <strong>{email}</strong> exists, we have sent a
            password reset link. Please check your inbox (and your spam folder).
          </p>
          <Link to="/login" className="btn btn-primary btn-block">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 420 }}>
        <div className="auth-logo">
          <h1>ILES</h1>
          <p>Reset your password</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <p className="text-secondary text-sm" style={{ marginBottom: 20 }}>
          Enter the email address linked to your account and we will send you a reset link.
        </p>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-secondary text-sm" style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" className="auth-link">Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
