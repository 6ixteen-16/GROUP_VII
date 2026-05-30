import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Spinner, Badge, Modal, Alert, EmptyState, ScoreBar } from '../components/UI'

const EMPTY_CRITERION = { name: '', description: '', weight: '', max_score: 100, evaluator_type: 'workplace', is_active: true }

export default function Evaluations() {
  const { user } = useAuth()
  const [evaluations, setEvaluations] = useState([])
  const [criteria, setCriteria] = useState([])
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showScore, setShowScore] = useState(null)
  const [scores, setScores] = useState({})
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState({ placement: '', student: '' })
  const [createError, setCreateError] = useState('')
  const [students, setStudents] = useState([])

  // Criteria management state (admin only)
  const [showCriteriaPanel, setShowCriteriaPanel] = useState(false)
  const [criterionForm, setCriterionForm] = useState(EMPTY_CRITERION)
  const [editingCriterion, setEditingCriterion] = useState(null) // null = new, id = editing
  const [criteriaError, setCriteriaError] = useState('')
  const [criteriaSuccess, setCriteriaSuccess] = useState('')
  const [savingCriterion, setSavingCriterion] = useState(false)
  const [showCriterionModal, setShowCriterionModal] = useState(false)

  const isStudent = user?.role === 'student'
  const isSupervisor = user?.role === 'workplace_supervisor' || user?.role === 'academic_supervisor'
  const isAdmin = user?.role === 'admin'
  const myType = user?.role === 'workplace_supervisor' ? 'workplace' : 'academic'

  const load = async () => {
    setLoading(true)
    try {
      const [evRes, criRes] = await Promise.all([
        api.get('/evaluations/'),
        api.get('/evaluations/criteria/'),
      ])
      setEvaluations(evRes.data.results || evRes.data)
      setCriteria(criRes.data.results || criRes.data)
    } catch { setError('Failed to load evaluations.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (isSupervisor) {
      api.get('/placements/').then(r => setPlacements(r.data.results || r.data)).catch(() => {})
    }
    if (isAdmin) {
      api.get('/auth/students/').then(r => setStudents(r.data)).catch(() => {})
      api.get('/placements/').then(r => setPlacements(r.data.results || r.data)).catch(() => {})
    }
  }, [isSupervisor, isAdmin])

  const openScoreModal = (ev) => {
    setShowScore(ev)
    const init = {}
    ev.criteria_scores?.forEach(cs => { init[cs.criteria] = cs.score })
    setScores(init)
    setComments(ev.comments || '')
  }

  const submitScores = async () => {
    setSaving(true)
    try {
      const scoreList = Object.entries(scores).map(([criteria, score]) => ({
        criteria: parseInt(criteria),
        score: parseFloat(score),
      }))
      const { data } = await api.post(`/evaluations/${showScore.id}/submit/`, {
        scores: scoreList,
        comments,
      })
      setEvaluations(prev => prev.map(e => e.id === data.id ? data : e))
      setShowScore(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit scores.')
    } finally { setSaving(false) }
  }

  const createEvaluation = async (e) => {
    e.preventDefault()
    setCreateError('')
    setSaving(true)
    try {
      const placement = placements.find(p => String(p.id) === String(createForm.placement))
      const { data } = await api.post('/evaluations/', {
        placement: createForm.placement,
        student: placement?.student || createForm.student,
      })
      setEvaluations(prev => [data, ...prev])
      setShowCreate(false)
    } catch (err) {
      setCreateError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed.')
    } finally { setSaving(false) }
  }

  // ── Criteria Management (Admin) ──────────────────────────────────────────

  const openNewCriterion = () => {
    setEditingCriterion(null)
    setCriterionForm(EMPTY_CRITERION)
    setCriteriaError('')
    setCriteriaSuccess('')
    setShowCriterionModal(true)
  }

  const openEditCriterion = (c) => {
    setEditingCriterion(c.id)
    setCriterionForm({
      name: c.name,
      description: c.description || '',
      weight: c.weight,
      max_score: c.max_score,
      evaluator_type: c.evaluator_type,
      is_active: c.is_active,
    })
    setCriteriaError('')
    setCriteriaSuccess('')
    setShowCriterionModal(true)
  }

  const saveCriterion = async (e) => {
    e.preventDefault()
    setCriteriaError('')
    setSavingCriterion(true)
    try {
      const payload = {
        name: criterionForm.name,
        description: criterionForm.description,
        weight: parseFloat(criterionForm.weight),
        max_score: parseFloat(criterionForm.max_score),
        evaluator_type: criterionForm.evaluator_type,
        is_active: criterionForm.is_active,
      }
      if (editingCriterion) {
        const { data } = await api.put(`/evaluations/criteria/${editingCriterion}/`, payload)
        setCriteria(prev => prev.map(c => c.id === editingCriterion ? data : c))
      } else {
        const { data } = await api.post('/evaluations/criteria/', payload)
        setCriteria(prev => [...prev, data])
      }
      setShowCriterionModal(false)
      setCriteriaSuccess(editingCriterion ? 'Criterion updated successfully.' : 'Criterion added successfully.')
      setTimeout(() => setCriteriaSuccess(''), 4000)
    } catch (err) {
      setCriteriaError(
        err.response?.data?.detail ||
        Object.values(err.response?.data || {}).flat().join(' ') ||
        'Failed to save criterion.'
      )
    } finally { setSavingCriterion(false) }
  }

  const toggleCriterionActive = async (c) => {
    try {
      const { data } = await api.patch(`/evaluations/criteria/${c.id}/`, { is_active: !c.is_active })
      setCriteria(prev => prev.map(x => x.id === c.id ? data : x))
    } catch {
      alert('Failed to update criterion status.')
    }
  }

  const deleteCriterion = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/evaluations/criteria/${c.id}/`)
      setCriteria(prev => prev.filter(x => x.id !== c.id))
    } catch {
      alert('Failed to delete criterion.')
    }
  }

  const myCriteria = criteria.filter(c => c.is_active && (isAdmin || c.evaluator_type === myType))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Evaluations</h1>
          <p className="text-secondary">Performance scores and grades</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowCriteriaPanel(v => !v)}
            >
              ⚙ {showCriteriaPanel ? 'Hide' : 'Manage'} Criteria
            </button>
          )}
          {isSupervisor && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Evaluation</button>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* ── Admin: Evaluation Criteria Panel ── */}
      {isAdmin && showCriteriaPanel && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Evaluation Criteria</h3>
            <button className="btn btn-primary btn-sm" onClick={openNewCriterion}>+ Add Criterion</button>
          </div>

          {criteriaSuccess && (
            <div style={{ padding: '0 20px' }}>
              <Alert type="success">{criteriaSuccess}</Alert>
            </div>
          )}

          {criteria.length === 0 ? (
            <div className="card-body">
              <p className="text-secondary text-sm">No evaluation criteria defined yet. Add some so supervisors can score students.</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Evaluator Type</th>
                    <th>Weight (%)</th>
                    <th>Max Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map(c => (
                    <tr key={c.id} style={{ opacity: c.is_active ? 1 : 0.55 }}>
                      <td>
                        <strong>{c.name}</strong>
                        {c.description && <p className="text-muted text-sm" style={{ margin: 0 }}>{c.description}</p>}
                      </td>
                      <td>
                        <span className={`badge ${c.evaluator_type === 'workplace' ? 'badge-active' : 'badge-submitted'}`}>
                          {c.evaluator_type_display}
                        </span>
                      </td>
                      <td>{c.weight}%</td>
                      <td>{c.max_score}</td>
                      <td>
                        <button
                          className={`badge ${c.is_active ? 'badge-approved' : 'badge-draft'}`}
                          style={{ cursor: 'pointer', border: 'none', background: 'none' }}
                          title={c.is_active ? 'Click to deactivate' : 'Click to activate'}
                          onClick={() => toggleCriterionActive(c)}
                        >
                          {c.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditCriterion(c)}>Edit</button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'var(--danger, #ef4444)', color: '#fff' }}
                          onClick={() => deleteCriterion(c)}
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {loading ? <Spinner /> : evaluations.length === 0 ? (
        <EmptyState
          title="No evaluations yet"
          description={isStudent ? "Your evaluations will appear here once supervisors submit them." : "Start a new evaluation for one of your assigned students."}
          action={isSupervisor ? <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Evaluation</button> : null}
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {!isStudent && <th>Student</th>}
                <th>Organization</th>
                <th>Evaluator</th>
                <th>Type</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map(ev => (
                <tr key={ev.id}>
                  {!isStudent && <td><strong>{ev.student_detail?.full_name || '—'}</strong></td>}
                  <td className="text-sm text-secondary">{ev.placement}</td>
                  <td className="text-sm">{ev.evaluator_detail?.full_name}</td>
                  <td><span className="badge badge-draft">{ev.evaluator_type_display}</span></td>
                  <td style={{ minWidth: 160 }}>
                    <ScoreBar score={ev.total_score} />
                  </td>
                  <td>{ev.grade ? <Badge status={ev.grade} /> : <span className="text-muted">—</span>}</td>
                  <td><Badge status={ev.is_submitted ? 'approved' : 'draft'} /></td>
                  <td>
                    {!ev.is_submitted && ev.evaluator === user.id && (
                      <button className="btn btn-primary btn-sm" onClick={() => openScoreModal(ev)}>Score</button>
                    )}
                    {ev.is_submitted && (
                      <button className="btn btn-secondary btn-sm" onClick={() => openScoreModal(ev)}>View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Evaluation Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Evaluation">
        <form onSubmit={createEvaluation}>
          <div className="modal-body">
            {createError && <Alert type="error">{createError}</Alert>}
            <div className="form-group">
              <label>Placement *</label>
              <select value={createForm.placement} onChange={e => setCreateForm({ ...createForm, placement: e.target.value })} required>
                <option value="">— Select Placement —</option>
                {placements.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.student_detail?.full_name} @ {p.organization}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Evaluation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Score Modal */}
      <Modal open={!!showScore} onClose={() => setShowScore(null)} title="Evaluation Scores" size="modal-lg">
        {showScore && (
          <>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p><strong>Student:</strong> {showScore.student_detail?.full_name}</p>
                <p><strong>Evaluator:</strong> {showScore.evaluator_detail?.full_name}</p>
                {showScore.total_score != null && (
                  <div style={{ marginTop: 12 }}>
                    <strong>Total Score: </strong>
                    <ScoreBar score={showScore.total_score} />
                    {showScore.grade && <span style={{ marginTop: 6, display: 'block' }}>Grade: <Badge status={showScore.grade} /></span>}
                  </div>
                )}
              </div>

              <hr className="divider" />

              {myCriteria.length === 0 && !showScore.is_submitted && (
                <Alert type="warning">No evaluation criteria configured. Use the "Manage Criteria" button above to set up criteria.</Alert>
              )}

              {(showScore.is_submitted ? showScore.criteria_scores : myCriteria).map(item => {
                const cr = showScore.is_submitted ? item.criteria_detail : item
                const sc = showScore.is_submitted ? item.score : (scores[cr?.id] ?? '')
                return (
                  <div key={cr?.id} style={{ marginBottom: 18 }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <div>
                        <span className="font-semibold text-sm">{cr?.name}</span>
                        <span className="text-muted text-sm" style={{ marginLeft: 8 }}>({cr?.weight}% weight)</span>
                      </div>
                      <span className="text-sm text-secondary">Max: {cr?.max_score}</span>
                    </div>
                    {cr?.description && <p className="text-muted text-sm" style={{ marginBottom: 6 }}>{cr.description}</p>}
                    {showScore.is_submitted ? (
                      <ScoreBar score={(sc / cr?.max_score) * 100} />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max={cr?.max_score}
                        step="0.5"
                        value={scores[cr?.id] ?? ''}
                        onChange={e => setScores({ ...scores, [cr?.id]: e.target.value })}
                        placeholder={`Score out of ${cr?.max_score}`}
                        style={{ maxWidth: 200 }}
                      />
                    )}
                  </div>
                )
              })}

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Overall Comments</label>
                {showScore.is_submitted ? (
                  <p style={{ fontSize: '0.9rem' }}>{showScore.comments || '—'}</p>
                ) : (
                  <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} placeholder="General comments about the student's performance..." />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowScore(null)}>Close</button>
              {!showScore.is_submitted && showScore.evaluator === user.id && (
                <button className="btn btn-success" onClick={submitScores} disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit Final Score'}
                </button>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Add / Edit Criterion Modal */}
      <Modal
        open={showCriterionModal}
        onClose={() => setShowCriterionModal(false)}
        title={editingCriterion ? 'Edit Criterion' : 'Add Evaluation Criterion'}
      >
        <form onSubmit={saveCriterion}>
          <div className="modal-body">
            {criteriaError && <Alert type="error">{criteriaError}</Alert>}

            <div className="form-group">
              <label>Criterion Name *</label>
              <input
                type="text"
                value={criterionForm.name}
                onChange={e => setCriterionForm({ ...criterionForm, name: e.target.value })}
                placeholder="e.g. Punctuality, Technical Skills"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={criterionForm.description}
                onChange={e => setCriterionForm({ ...criterionForm, description: e.target.value })}
                rows={2}
                placeholder="Brief description of what this criterion measures…"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Weight (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={criterionForm.weight}
                  onChange={e => setCriterionForm({ ...criterionForm, weight: e.target.value })}
                  placeholder="e.g. 40"
                  required
                />
              </div>
              <div className="form-group">
                <label>Max Score *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={criterionForm.max_score}
                  onChange={e => setCriterionForm({ ...criterionForm, max_score: e.target.value })}
                  placeholder="e.g. 100"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Evaluator Type *</label>
              <select
                value={criterionForm.evaluator_type}
                onChange={e => setCriterionForm({ ...criterionForm, evaluator_type: e.target.value })}
                required
              >
                <option value="workplace">Workplace Supervisor</option>
                <option value="academic">Academic Supervisor</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="criterion-active"
                checked={criterionForm.is_active}
                onChange={e => setCriterionForm({ ...criterionForm, is_active: e.target.checked })}
                style={{ width: 'auto', margin: 0 }}
              />
              <label htmlFor="criterion-active" style={{ marginBottom: 0, cursor: 'pointer' }}>
                Active (visible to evaluators)
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCriterionModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingCriterion}>
              {savingCriterion ? 'Saving…' : editingCriterion ? 'Save Changes' : 'Add Criterion'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
