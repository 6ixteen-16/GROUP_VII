import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Alert } from '../components/UI'

export default function ResetPassword() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ new_password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.new_password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.new_password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/password-reset-confirm/', {
        uid,
        token,
        new_password: form.new_password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'This reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8, marginTop: 16 }}>Password Reset!</h2>
          <p className="text-secondary" style={{ marginBottom: 24 }}>
            Your password has been changed successfully. Redirecting you to the
            sign in page...
          </p>
          <Link to="/login" className="btn btn-primary btn-block">
            Sign In Now
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
          <p>Set a new password</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>New Password</label>
            <input
              name="new_password"
              type="password"
              value={form.new_password}
              onChange={handle}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={handle}
              placeholder="Repeat new password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Saving...' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
