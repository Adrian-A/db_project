import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:5000'

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeReportTab, setActiveReportTab] = useState(REPORT_TABS[0].key)

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

  useEffect(() => {
    if (loggedInUser) {
      refreshReports()
    }
  }, [loggedInUser])

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
    setError('')
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
        {loading && <p>Loading reports...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && activePage === 'home' && (
          <section>
            <h2>Welcome, {loggedInUser}</h2>
            <p>
              Use <strong>Overall Reports</strong> to review the five SQL query outputs for your
              life insurance database.
            </p>
          </section>
        )}

        {!loading && !error && activePage === 'reports' && (
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
