import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:5000'

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'policyholders', label: 'Policyholders' },
  { key: 'beneficiaries', label: 'Beneficiaries' },
  { key: 'claims', label: 'Claims' },
  { key: 'reports', label: 'Overall Reports' }
]

const EMPTY_REPORTS = {
  query1: [],
  query2: [],
  query3: [],
  query4: [],
  query5: []
}

const REPORT_TABS = [
  { key: 'q1', label: 'Active Policies', dataKey: 'query1' },
  { key: 'q2', label: 'Face Amount by Status', dataKey: 'query2' },
  { key: 'q3', label: 'Beneficiary Share', dataKey: 'query3' },
  { key: 'q4', label: 'Above Average Face Amount', dataKey: 'query4' },
  { key: 'q5', label: 'Large Payouts', dataKey: 'query5' }
]

/** Short blurbs shown above each report table; keyed by REPORT_TABS[].key */
const REPORT_TAB_DESCRIPTIONS = {
  q1:
    'Lists policies currently marked Active with holder demographics, issue terms, face amount, underwriting class, policy status, and mortality basis.',
  q2:
    'Aggregates policies by status—counts and summed face amounts.',
  q3:
    'Shows total beneficiary percentage allocation per policy (sum of shares against policies).',
  q4:
    'Policies whose face amount exceeds the overall portfolio average.',
  q5:
    'Estimated payouts from the beneficiary payout view where payout meets or exceeds $100,000, sorted largest first.'
}

const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Partner',
  'Other'
]

const SEX_OPTIONS = ['M', 'F']

/** Human-readable headers for known DB column names; fallback formats snake_case → title case. */
const COLUMN_LABEL_OVERRIDES = {
  policy_id: 'Policy ID',
  policyholder_id: 'Policyholder ID',
  beneficiary_id: 'Beneficiary ID',
  claim_id: 'Claim ID',
  status_id: 'Status ID',
  class_id: 'Class ID',
  basis_id: 'Basis ID',
  policyholder_name: 'Policyholder Name',
  beneficiary_name: 'Beneficiary Name',
  status_name: 'Policy Status',
  class_name: 'Underwriting Class',
  basis_name: 'Mortality Basis',
  face_amount: 'Face Amount',
  issue_date: 'Issue Date',
  issue_age: 'Issue Age',
  date_of_birth: 'Date of Birth',
  date_of_death: 'Date of Death',
  sex: 'Sex',
  first_name: 'First Name',
  last_name: 'Last Name',
  relationship: 'Relationship',
  percentage_share: 'Share (%)',
  total_beneficiary_percentage: 'Total Beneficiary Share (%)',
  number_of_policies: 'Number of Policies',
  total_face_amount: 'Total Face Amount',
  estimated_payout: 'Estimated Payout',
  claim_amount: 'Claim Amount',
  claim_status: 'Claim Status',
  qx: 'Mortality Rate (qx)',
  attained_age: 'Attained Age'
}

function formatColumnLabel(key) {
  if (COLUMN_LABEL_OVERRIDES[key]) {
    return COLUMN_LABEL_OVERRIDES[key]
  }
  return key
    .split('_')
    .map((segment) => {
      const lower = segment.toLowerCase()
      if (lower === 'id') return 'ID'
      if (lower === 'dob') return 'DOB'
      if (segment.length <= 2 && segment === segment.toUpperCase()) return segment
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
    })
    .join(' ')
}

/** Stacked header lines so long labels never clip in narrow fixed-layout columns */
function renderColumnHeader(columnKey) {
  if (columnKey === 'policyholder_name') {
    return (
      <span className="th-stack">
        <span className="th-stack-line">Policyholder</span>
        <span className="th-stack-line">Name</span>
      </span>
    )
  }
  if (columnKey === 'beneficiary_name') {
    return (
      <span className="th-stack">
        <span className="th-stack-line">Beneficiary</span>
        <span className="th-stack-line">Name</span>
      </span>
    )
  }
  return formatColumnLabel(columnKey)
}

function formatCellValue(columnKey, value) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  const key = columnKey.toLowerCase()
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== '' && /^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(value.trim())
        ? Number(value)
        : null

  if (numeric !== null && !Number.isNaN(numeric)) {
    const isMoney =
      key.includes('amount') || key.includes('payout') || key.includes('face')
    const isShare = key.includes('percentage') || key.includes('share')
    if (isMoney) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }).format(numeric)
    }
    if (isShare) {
      return `${numeric}%`
    }
    return String(numeric)
  }
  const str = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    try {
      const d = new Date(str)
      if (!Number.isNaN(d.getTime())) {
        return new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(d)
      }
    } catch {
      // fall through
    }
  }
  return str
}

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loggedInUser, setLoggedInUser] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [activePage, setActivePage] = useState('home')

  const [reports, setReports] = useState(EMPTY_REPORTS)
  const [policySummaryRows, setPolicySummaryRows] = useState([])
  const [policyholders, setPolicyholders] = useState([])
  const [beneficiaries, setBeneficiaries] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeReportTab, setActiveReportTab] = useState(REPORT_TABS[0].key)
  const [editingPolicyholderId, setEditingPolicyholderId] = useState(null)
  const [policyholderDrafts, setPolicyholderDrafts] = useState({})
  const [policyholderForm, setPolicyholderForm] = useState({
    policyholder_id: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    sex: 'M'
  })
  const [editingBeneficiaryId, setEditingBeneficiaryId] = useState(null)
  const [beneficiaryDrafts, setBeneficiaryDrafts] = useState({})
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    beneficiary_id: '',
    policy_id: '',
    first_name: '',
    last_name: '',
    relationship: 'Spouse',
    percentage_share: ''
  })
  const [editingClaimId, setEditingClaimId] = useState(null)
  const [claimDrafts, setClaimDrafts] = useState({})
  const [claimForm, setClaimForm] = useState({
    claim_id: '',
    policy_id: '',
    date_of_death: '',
    claim_amount: '',
    claim_status: 'Pending'
  })

  const loadReports = async () => {
    const keys = ['query1', 'query2', 'query3', 'query4', 'query5']
    const responses = await Promise.all(keys.map((key) => fetch(`${API_BASE}/api/reports/${key}`)))

    responses.forEach((response, idx) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch report ${keys[idx]}`)
      }
    })

    const data = await Promise.all(responses.map((response) => response.json()))
    return {
      query1: data[0],
      query2: data[1],
      query3: data[2],
      query4: data[3],
      query5: data[4]
    }
  }

  const loadPolicySummaryView = async () => {
    const response = await fetch(`${API_BASE}/api/views/policy-summary`)
    if (!response.ok) {
      throw new Error('Failed to fetch view_policy_summary')
    }
    return response.json()
  }

  const refreshReports = async () => {
    setLoading(true)
    setError('')
    try {
      const reportData = await loadReports()
      setReports(reportData)
    } catch (err) {
      setError(err.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const refreshPolicySummaryView = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await loadPolicySummaryView()
      setPolicySummaryRows(rows)
    } catch (err) {
      setError(err.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const loadClaims = async () => {
    const response = await fetch(`${API_BASE}/api/claims`)
    if (!response.ok) {
      throw new Error('Failed to fetch claims')
    }
    return response.json()
  }

  const loadBeneficiaries = async () => {
    const response = await fetch(`${API_BASE}/api/beneficiaries`)
    if (!response.ok) {
      throw new Error('Failed to fetch beneficiaries')
    }
    return response.json()
  }

  const loadPolicyholders = async () => {
    const response = await fetch(`${API_BASE}/api/policyholders`)
    if (!response.ok) {
      throw new Error('Failed to fetch policyholders')
    }
    return response.json()
  }

  const refreshPolicyholders = async () => {
    setLoading(true)
    setError('')
    try {
      const policyholderData = await loadPolicyholders()
      setPolicyholders(policyholderData)
      setPolicyholderDrafts({})
      setEditingPolicyholderId(null)
    } catch (err) {
      setError(err.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const refreshBeneficiaries = async () => {
    setLoading(true)
    setError('')
    try {
      const beneficiaryData = await loadBeneficiaries()
      setBeneficiaries(beneficiaryData)
      setBeneficiaryDrafts({})
      setEditingBeneficiaryId(null)
    } catch (err) {
      setError(err.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const refreshClaims = async () => {
    setLoading(true)
    setError('')
    try {
      const claimData = await loadClaims()
      setClaims(claimData)
      setClaimDrafts({})
      setEditingClaimId(null)
    } catch (err) {
      setError(err.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loggedInUser) {
      refreshReports()
    }
  }, [loggedInUser])

  useEffect(() => {
    if (loggedInUser && activePage === 'claims') {
      refreshClaims()
    }
  }, [loggedInUser, activePage])

  useEffect(() => {
    if (loggedInUser && activePage === 'beneficiaries') {
      refreshBeneficiaries()
    }
  }, [loggedInUser, activePage])

  useEffect(() => {
    if (loggedInUser && activePage === 'home') {
      refreshPolicySummaryView()
    }
  }, [loggedInUser, activePage])

  useEffect(() => {
    if (loggedInUser && activePage === 'policyholders') {
      refreshPolicyholders()
    }
  }, [loggedInUser, activePage])

  const handleLogin = async (event) => {
    event.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      setLoggedInUser(data.username)
      setActivePage('home')
      setPassword('')
    } catch (err) {
      setLoginError(err.message || 'Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    setLoggedInUser('')
    setReports(EMPTY_REPORTS)
    setPolicySummaryRows([])
    setPolicyholders([])
    setBeneficiaries([])
    setClaims([])
    setEditingPolicyholderId(null)
    setPolicyholderDrafts({})
    setEditingBeneficiaryId(null)
    setBeneficiaryDrafts({})
    setEditingClaimId(null)
    setClaimDrafts({})
    setError('')
  }

  const normalizeDateInput = (value) => {
    const asString = String(value ?? '')
    if (/^\d{4}-\d{2}-\d{2}/.test(asString)) {
      return asString.slice(0, 10)
    }
    return asString
  }

  const handleCreateClaim = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_id: Number(claimForm.claim_id),
          policy_id: Number(claimForm.policy_id),
          date_of_death: claimForm.date_of_death,
          claim_amount: Number(claimForm.claim_amount),
          claim_status: claimForm.claim_status
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create claim')
      }
      setClaimForm({
        claim_id: '',
        policy_id: '',
        date_of_death: '',
        claim_amount: '',
        claim_status: 'Pending'
      })
      await refreshClaims()
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  const handleCreateBeneficiary = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/beneficiaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiary_id: Number(beneficiaryForm.beneficiary_id),
          policy_id: Number(beneficiaryForm.policy_id),
          first_name: beneficiaryForm.first_name,
          last_name: beneficiaryForm.last_name,
          relationship: beneficiaryForm.relationship,
          percentage_share: Number(beneficiaryForm.percentage_share)
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create beneficiary')
      }
      setBeneficiaryForm({
        beneficiary_id: '',
        policy_id: '',
        first_name: '',
        last_name: '',
        relationship: 'Spouse',
        percentage_share: ''
      })
      await refreshBeneficiaries()
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  const handleCreatePolicyholder = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/policyholders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyholder_id: Number(policyholderForm.policyholder_id),
          first_name: policyholderForm.first_name,
          last_name: policyholderForm.last_name,
          date_of_birth: policyholderForm.date_of_birth,
          sex: policyholderForm.sex
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create policyholder')
      }
      setPolicyholderForm({
        policyholder_id: '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        sex: 'M'
      })
      await refreshPolicyholders()
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  const startEditingPolicyholder = (policyholder) => {
    setEditingPolicyholderId(policyholder.policyholder_id)
    setPolicyholderDrafts((prev) => ({
      ...prev,
      [policyholder.policyholder_id]: {
        policyholder_id: policyholder.policyholder_id,
        first_name: policyholder.first_name,
        last_name: policyholder.last_name,
        date_of_birth: normalizeDateInput(policyholder.date_of_birth),
        sex: policyholder.sex
      }
    }))
  }

  const updatePolicyholderDraftField = (policyholderId, field, value) => {
    setPolicyholderDrafts((prev) => ({
      ...prev,
      [policyholderId]: {
        ...prev[policyholderId],
        [field]: value
      }
    }))
  }

  const handleUpdatePolicyholder = async (policyholderId) => {
    setError('')
    try {
      const draft = policyholderDrafts[policyholderId]
      if (!draft) {
        throw new Error('No edits found for this policyholder.')
      }

      const response = await fetch(`${API_BASE}/api/policyholders/${policyholderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: draft.first_name,
          last_name: draft.last_name,
          date_of_birth: normalizeDateInput(draft.date_of_birth),
          sex: draft.sex
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update policyholder')
      }
      await refreshPolicyholders()
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  const handleDeletePolicyholder = async (policyholderId) => {
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/policyholders/${policyholderId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete policyholder')
      }
      await refreshPolicyholders()
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  const startEditingBeneficiary = (beneficiary) => {
    setEditingBeneficiaryId(beneficiary.beneficiary_id)
    setBeneficiaryDrafts((prev) => ({
      ...prev,
      [beneficiary.beneficiary_id]: {
        beneficiary_id: beneficiary.beneficiary_id,
        policy_id: String(beneficiary.policy_id),
        first_name: beneficiary.first_name,
        last_name: beneficiary.last_name,
        relationship: beneficiary.relationship,
        percentage_share: String(beneficiary.percentage_share)
      }
    }))
  }

  const updateBeneficiaryDraftField = (beneficiaryId, field, value) => {
    setBeneficiaryDrafts((prev) => ({
      ...prev,
      [beneficiaryId]: {
        ...prev[beneficiaryId],
        [field]: value
      }
    }))
  }

  const handleUpdateBeneficiary = async (beneficiaryId) => {
    setError('')
    try {
      const draft = beneficiaryDrafts[beneficiaryId]
      if (!draft) {
        throw new Error('No edits found for this beneficiary.')
      }

      const response = await fetch(`${API_BASE}/api/beneficiaries/${beneficiaryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: Number(draft.policy_id),
          first_name: draft.first_name,
          last_name: draft.last_name,
          relationship: draft.relationship,
          percentage_share: Number(draft.percentage_share)
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update beneficiary')
      }
      await refreshBeneficiaries()
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  const handleDeleteBeneficiary = async (beneficiaryId) => {
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/beneficiaries/${beneficiaryId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete beneficiary')
      }
      await refreshBeneficiaries()
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  const startEditingClaim = (claim) => {
    setEditingClaimId(claim.claim_id)
    setClaimDrafts((prev) => ({
      ...prev,
      [claim.claim_id]: {
        claim_id: claim.claim_id,
        policy_id: String(claim.policy_id),
        date_of_death: normalizeDateInput(claim.date_of_death),
        claim_amount: String(claim.claim_amount),
        claim_status: claim.claim_status
      }
    }))
  }

  const updateClaimDraftField = (claimId, field, value) => {
    setClaimDrafts((prev) => ({
      ...prev,
      [claimId]: {
        ...prev[claimId],
        [field]: value
      }
    }))
  }

  const handleUpdateClaim = async (claimId) => {
    setError('')
    try {
      const draft = claimDrafts[claimId]
      if (!draft) {
        throw new Error('No edits found for this claim.')
      }

      const response = await fetch(`${API_BASE}/api/claims/${claimId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: Number(draft.policy_id),
          date_of_death: normalizeDateInput(draft.date_of_death),
          claim_amount: Number(draft.claim_amount),
          claim_status: draft.claim_status
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update claim')
      }
      await refreshClaims()
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  const handleDeleteClaim = async (claimId) => {
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/claims/${claimId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete claim')
      }
      await refreshClaims()
    } catch (err) {
      setError(err.message || 'Unexpected error')
    }
  }

  const renderTable = (rows) => {
    if (!rows.length) {
      return <p className="empty-table-hint">No data for this report.</p>
    }

    const columns = Object.keys(rows[0])
    return (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  data-col={column}
                  aria-label={formatColumnLabel(column)}
                >
                  {renderColumnHeader(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${index}-${columns.map((c) => String(row[c])).join('-')}`}>
                {columns.map((column) => (
                  <td key={`${index}-${column}`} data-col={column}>
                    {formatCellValue(column, row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!loggedInUser) {
    return (
      <main className="page login-page">
        <h1>Admin Login</h1>
        <form className="login-form" onSubmit={handleLogin}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {loginError && <p className="error">{loginError}</p>}
          <button type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <div className="page">
      <header className="top-nav">
        <div className="top-nav-brand">
          <span className="brand-mark" aria-hidden="true" />
          <div className="brand-text">
            <div className="brand">Life Insurance Company</div>
            <div className="brand-sub">Administrator console</div>
          </div>
        </div>
        <nav className="top-nav-links" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activePage === item.key ? 'nav-btn active' : 'nav-btn'}
              onClick={() => {
                setActivePage(item.key)
                if (item.key === 'reports') {
                  setActiveReportTab(REPORT_TABS[0].key)
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button type="button" className="logout-button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="content">
        {loading && <p>Loading data...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && activePage === 'home' && (
          <section>
            <h2>Welcome, {loggedInUser}</h2>
            <p className="section-note">
              Below is a summary of all policies in the database.
            </p>
            {renderTable(policySummaryRows)}
          </section>
        )}

        {!loading && activePage === 'policyholders' && (
          <section className="claims-section">
            <h2>Policyholders</h2>
            <p className="section-note">Manage policyholder records used by policies and reports.</p>

            <form className="claims-form" onSubmit={handleCreatePolicyholder}>
              <input
                type="number"
                placeholder="Policyholder ID"
                value={policyholderForm.policyholder_id}
                onChange={(event) =>
                  setPolicyholderForm((prev) => ({
                    ...prev,
                    policyholder_id: event.target.value
                  }))
                }
                required
              />
              <input
                type="text"
                placeholder="First Name"
                value={policyholderForm.first_name}
                onChange={(event) =>
                  setPolicyholderForm((prev) => ({ ...prev, first_name: event.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={policyholderForm.last_name}
                onChange={(event) =>
                  setPolicyholderForm((prev) => ({ ...prev, last_name: event.target.value }))
                }
                required
              />
              <input
                type="date"
                value={policyholderForm.date_of_birth}
                onChange={(event) =>
                  setPolicyholderForm((prev) => ({ ...prev, date_of_birth: event.target.value }))
                }
                required
              />
              <select
                value={policyholderForm.sex}
                onChange={(event) =>
                  setPolicyholderForm((prev) => ({ ...prev, sex: event.target.value }))
                }
                required
              >
                {SEX_OPTIONS.map((sex) => (
                  <option key={sex} value={sex}>
                    {sex}
                  </option>
                ))}
              </select>
              <button type="submit">Add Policyholder</button>
            </form>

            <div className="table-wrap">
              <table className="data-table claims-table">
                <thead>
                  <tr>
                    <th>Policyholder ID</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Date of Birth</th>
                    <th>Sex</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policyholders.map((policyholder) => (
                    <tr key={policyholder.policyholder_id}>
                      <td>{policyholder.policyholder_id}</td>
                      <td>
                        {editingPolicyholderId === policyholder.policyholder_id ? (
                          <input
                            type="text"
                            value={
                              policyholderDrafts[policyholder.policyholder_id]?.first_name ?? ''
                            }
                            onChange={(event) =>
                              updatePolicyholderDraftField(
                                policyholder.policyholder_id,
                                'first_name',
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          formatCellValue('first_name', policyholder.first_name)
                        )}
                      </td>
                      <td>
                        {editingPolicyholderId === policyholder.policyholder_id ? (
                          <input
                            type="text"
                            value={policyholderDrafts[policyholder.policyholder_id]?.last_name ?? ''}
                            onChange={(event) =>
                              updatePolicyholderDraftField(
                                policyholder.policyholder_id,
                                'last_name',
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          formatCellValue('last_name', policyholder.last_name)
                        )}
                      </td>
                      <td>
                        {editingPolicyholderId === policyholder.policyholder_id ? (
                          <input
                            type="date"
                            value={
                              policyholderDrafts[policyholder.policyholder_id]?.date_of_birth ?? ''
                            }
                            onChange={(event) =>
                              updatePolicyholderDraftField(
                                policyholder.policyholder_id,
                                'date_of_birth',
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          formatCellValue('date_of_birth', policyholder.date_of_birth)
                        )}
                      </td>
                      <td>
                        {editingPolicyholderId === policyholder.policyholder_id ? (
                          <select
                            value={policyholderDrafts[policyholder.policyholder_id]?.sex ?? 'M'}
                            onChange={(event) =>
                              updatePolicyholderDraftField(
                                policyholder.policyholder_id,
                                'sex',
                                event.target.value
                              )
                            }
                          >
                            {SEX_OPTIONS.map((sex) => (
                              <option key={sex} value={sex}>
                                {sex}
                              </option>
                            ))}
                          </select>
                        ) : (
                          formatCellValue('sex', policyholder.sex)
                        )}
                      </td>
                      <td className="claims-actions">
                        {editingPolicyholderId === policyholder.policyholder_id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdatePolicyholder(policyholder.policyholder_id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="danger-btn"
                              onClick={() => handleDeletePolicyholder(policyholder.policyholder_id)}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditingPolicyholder(policyholder)}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {policyholders.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-table-hint">
                        No policyholders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && activePage === 'beneficiaries' && (
          <section className="claims-section">
            <h2>Beneficiaries</h2>
            <p className="section-note">
              Note: Beneficiary share per policy cannot exceed <strong>100%</strong>.
            </p>

            <form className="claims-form" onSubmit={handleCreateBeneficiary}>
              <input
                type="number"
                placeholder="Beneficiary ID"
                value={beneficiaryForm.beneficiary_id}
                onChange={(event) =>
                  setBeneficiaryForm((prev) => ({ ...prev, beneficiary_id: event.target.value }))
                }
                required
              />
              <input
                type="number"
                placeholder="Policy ID"
                value={beneficiaryForm.policy_id}
                onChange={(event) =>
                  setBeneficiaryForm((prev) => ({ ...prev, policy_id: event.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="First Name"
                value={beneficiaryForm.first_name}
                onChange={(event) =>
                  setBeneficiaryForm((prev) => ({ ...prev, first_name: event.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={beneficiaryForm.last_name}
                onChange={(event) =>
                  setBeneficiaryForm((prev) => ({ ...prev, last_name: event.target.value }))
                }
                required
              />
              <select
                value={beneficiaryForm.relationship}
                onChange={(event) =>
                  setBeneficiaryForm((prev) => ({ ...prev, relationship: event.target.value }))
                }
                required
              >
                {RELATIONSHIP_OPTIONS.map((relationship) => (
                  <option key={relationship} value={relationship}>
                    {relationship}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                placeholder="Share %"
                value={beneficiaryForm.percentage_share}
                onChange={(event) =>
                  setBeneficiaryForm((prev) => ({ ...prev, percentage_share: event.target.value }))
                }
                required
              />
              <button type="submit">Add Beneficiary</button>
            </form>

            <div className="table-wrap">
              <table className="data-table claims-table">
                <thead>
                  <tr>
                    <th>Beneficiary ID</th>
                    <th>Policy ID</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Relationship</th>
                    <th>Share (%)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((beneficiary) => (
                    <tr key={beneficiary.beneficiary_id}>
                      <td>{beneficiary.beneficiary_id}</td>
                      <td>
                        {editingBeneficiaryId === beneficiary.beneficiary_id ? (
                          <input
                            type="number"
                            value={beneficiaryDrafts[beneficiary.beneficiary_id]?.policy_id ?? ''}
                            onChange={(event) =>
                              updateBeneficiaryDraftField(
                                beneficiary.beneficiary_id,
                                'policy_id',
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          formatCellValue('policy_id', beneficiary.policy_id)
                        )}
                      </td>
                      <td>
                        {editingBeneficiaryId === beneficiary.beneficiary_id ? (
                          <input
                            type="text"
                            value={beneficiaryDrafts[beneficiary.beneficiary_id]?.first_name ?? ''}
                            onChange={(event) =>
                              updateBeneficiaryDraftField(
                                beneficiary.beneficiary_id,
                                'first_name',
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          formatCellValue('first_name', beneficiary.first_name)
                        )}
                      </td>
                      <td>
                        {editingBeneficiaryId === beneficiary.beneficiary_id ? (
                          <input
                            type="text"
                            value={beneficiaryDrafts[beneficiary.beneficiary_id]?.last_name ?? ''}
                            onChange={(event) =>
                              updateBeneficiaryDraftField(
                                beneficiary.beneficiary_id,
                                'last_name',
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          formatCellValue('last_name', beneficiary.last_name)
                        )}
                      </td>
                      <td>
                        {editingBeneficiaryId === beneficiary.beneficiary_id ? (
                          <select
                            value={
                              beneficiaryDrafts[beneficiary.beneficiary_id]?.relationship ?? 'Spouse'
                            }
                            onChange={(event) =>
                              updateBeneficiaryDraftField(
                                beneficiary.beneficiary_id,
                                'relationship',
                                event.target.value
                              )
                            }
                          >
                            {RELATIONSHIP_OPTIONS.map((relationship) => (
                              <option key={relationship} value={relationship}>
                                {relationship}
                              </option>
                            ))}
                          </select>
                        ) : (
                          formatCellValue('relationship', beneficiary.relationship)
                        )}
                      </td>
                      <td>
                        {editingBeneficiaryId === beneficiary.beneficiary_id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="100"
                            value={
                              beneficiaryDrafts[beneficiary.beneficiary_id]?.percentage_share ?? ''
                            }
                            onChange={(event) =>
                              updateBeneficiaryDraftField(
                                beneficiary.beneficiary_id,
                                'percentage_share',
                                event.target.value
                              )
                            }
                          />
                        ) : (
                          formatCellValue('percentage_share', beneficiary.percentage_share)
                        )}
                      </td>
                      <td className="claims-actions">
                        {editingBeneficiaryId === beneficiary.beneficiary_id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateBeneficiary(beneficiary.beneficiary_id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="danger-btn"
                              onClick={() => handleDeleteBeneficiary(beneficiary.beneficiary_id)}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => startEditingBeneficiary(beneficiary)}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {beneficiaries.length === 0 && (
                    <tr>
                      <td colSpan="7" className="empty-table-hint">
                        No beneficiaries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && activePage === 'claims' && (
          <section className="claims-section">
            <h2>Claims</h2>
            <p className="section-note">
              Note: Claims inserted as <strong>Paid</strong> will update the policy status to
              "Terminated due to Death".
            </p>

            <form className="claims-form" onSubmit={handleCreateClaim}>
              <input
                type="number"
                placeholder="Claim ID"
                value={claimForm.claim_id}
                onChange={(event) =>
                  setClaimForm((prev) => ({ ...prev, claim_id: event.target.value }))
                }
                required
              />
              <input
                type="number"
                placeholder="Policy ID"
                value={claimForm.policy_id}
                onChange={(event) =>
                  setClaimForm((prev) => ({ ...prev, policy_id: event.target.value }))
                }
                required
              />
              <input
                type="date"
                value={claimForm.date_of_death}
                onChange={(event) =>
                  setClaimForm((prev) => ({ ...prev, date_of_death: event.target.value }))
                }
                required
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Claim Amount"
                value={claimForm.claim_amount}
                onChange={(event) =>
                  setClaimForm((prev) => ({ ...prev, claim_amount: event.target.value }))
                }
                required
              />
              <select
                value={claimForm.claim_status}
                onChange={(event) =>
                  setClaimForm((prev) => ({ ...prev, claim_status: event.target.value }))
                }
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
              </select>
              <button type="submit">Add Claim</button>
            </form>

            <div className="table-wrap">
              <table className="data-table claims-table">
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Policy ID</th>
                    <th>Date of Death</th>
                    <th>Claim Amount</th>
                    <th>Claim Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.claim_id}>
                      <td>{claim.claim_id}</td>
                      <td>
                        {editingClaimId === claim.claim_id ? (
                          <input
                            type="number"
                            value={claimDrafts[claim.claim_id]?.policy_id ?? ''}
                            onChange={(event) =>
                              updateClaimDraftField(claim.claim_id, 'policy_id', event.target.value)
                            }
                          />
                        ) : (
                          formatCellValue('policy_id', claim.policy_id)
                        )}
                      </td>
                      <td>
                        {editingClaimId === claim.claim_id ? (
                          <input
                            type="date"
                            value={claimDrafts[claim.claim_id]?.date_of_death ?? ''}
                            onChange={(event) =>
                              updateClaimDraftField(claim.claim_id, 'date_of_death', event.target.value)
                            }
                          />
                        ) : (
                          formatCellValue('date_of_death', claim.date_of_death)
                        )}
                      </td>
                      <td>
                        {editingClaimId === claim.claim_id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={claimDrafts[claim.claim_id]?.claim_amount ?? ''}
                            onChange={(event) =>
                              updateClaimDraftField(claim.claim_id, 'claim_amount', event.target.value)
                            }
                          />
                        ) : (
                          formatCellValue('claim_amount', claim.claim_amount)
                        )}
                      </td>
                      <td>
                        {editingClaimId === claim.claim_id ? (
                          <select
                            value={claimDrafts[claim.claim_id]?.claim_status ?? 'Pending'}
                            onChange={(event) =>
                              updateClaimDraftField(claim.claim_id, 'claim_status', event.target.value)
                            }
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Paid">Paid</option>
                          </select>
                        ) : (
                          formatCellValue('claim_status', claim.claim_status)
                        )}
                      </td>
                      <td className="claims-actions">
                        {editingClaimId === claim.claim_id ? (
                          <>
                            <button type="button" onClick={() => handleUpdateClaim(claim.claim_id)}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="danger-btn"
                              onClick={() => handleDeleteClaim(claim.claim_id)}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => startEditingClaim(claim)}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {claims.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-table-hint">
                        No claims found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && activePage === 'reports' && (
          <section className="reports-section">
            <h2>Overall Reports</h2>
            <div className="report-tabs" role="tablist" aria-label="Report tables">
              {REPORT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeReportTab === tab.key}
                  className={activeReportTab === tab.key ? 'report-tab active' : 'report-tab'}
                  onClick={() => setActiveReportTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="report-description">
              <p>
                {REPORT_TAB_DESCRIPTIONS[activeReportTab] ??
                  'Select a tab above to view this report.'}
              </p>
            </div>
            <div
              className="report-panel"
              role="tabpanel"
              aria-label={
                REPORT_TABS.find((t) => t.key === activeReportTab)?.label ?? 'Report'
              }
            >
              {(() => {
                const tab = REPORT_TABS.find((t) => t.key === activeReportTab)
                if (!tab) return null
                return renderTable(reports[tab.dataKey])
              })()}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
