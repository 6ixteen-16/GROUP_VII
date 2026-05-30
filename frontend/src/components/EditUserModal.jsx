import { useState, useEffect } from 'react'
import api from '../api/axios'
import { Alert } from './UI'

export default function EditUserModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    role: '', phone: '', student_id: '', organization: '', department: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'student',
        phone: user.phone || '',
        student_id: user.student_id || '',
        organization: user.organization || '',
        department: user.department || ''
      })
    }
  }, [user])

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await api.put(`/auth/users/${user.id}/`, form)
      onSuccess()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        if (data.detail && typeof data.detail === 'string') {
          setErrors({ non_field_errors: [data.detail] })
        } else {
          setErrors(data)
        }
      } else {
        setErrors({ non_field_errors: ['Failed to update user.'] })
      }
    } finally {
      setLoading(false)
    }
  }

  const err = (field) => errors[field]?.[0] || errors[field]

  if (!user) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>Edit User</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>×</button>
        </div>

        {err('non_field_errors') && <Alert type="error">{err('non_field_errors')}</Alert>}

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input name="first_name" required value={form.first_name} onChange={handle} />
              {err('first_name') && <span className="form-error">{err('first_name')}</span>}
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input name="last_name" required value={form.last_name} onChange={handle} />
              {err('last_name') && <span className="form-error">{err('last_name')}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input name="username" required value={form.username} onChange={handle} />
              {err('username') && <span className="form-error">{err('username')}</span>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" required value={form.email} onChange={handle} />
              {err('email') && <span className="form-error">{err('email')}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={form.role} onChange={handle}>
              <option value="academic_supervisor">Academic Supervisor</option>
              <option value="admin">Administrator</option>
              <option value="workplace_supervisor">Workplace Supervisor</option>
              <option value="student">Student Intern</option>
            </select>
            {err('role') && <span className="form-error">{err('role')}</span>}
          </div>

          {form.role === 'academic_supervisor' && (
            <div className="form-group">
              <label>Department</label>
              <input name="department" value={form.department} onChange={handle} placeholder="e.g. Computer Science" />
              {err('department') && <span className="form-error">{err('department')}</span>}
            </div>
          )}

          {form.role === 'workplace_supervisor' && (
            <div className="form-group">
              <label>Organization</label>
              <input name="organization" value={form.organization} onChange={handle} placeholder="e.g. Google" />
              {err('organization') && <span className="form-error">{err('organization')}</span>}
            </div>
          )}

          {form.role === 'student' && (
            <div className="form-group">
              <label>Student ID</label>
              <input name="student_id" value={form.student_id} onChange={handle} placeholder="e.g. 21/U/..." />
              {err('student_id') && <span className="form-error">{err('student_id')}</span>}
            </div>
          )}

          <div className="form-group">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handle} />
            {err('phone') && <span className="form-error">{err('phone')}</span>}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
