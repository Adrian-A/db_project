import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [beneficiaries, setBeneficiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadBeneficiaries = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetch('http://localhost:5000/api/beneficiaries')
        if (!response.ok) {
          throw new Error('Failed to fetch beneficiaries')
        }
        const data = await response.json()
        setBeneficiaries(data)
      } catch (err) {
        setError(err.message || 'Unexpected error')
      } finally {
        setLoading(false)
      }
    }

    loadBeneficiaries()
  }, [])

  return (
    <main className="page">
      <h1>Beneficiary Table</h1>

      {loading && <p>Loading beneficiaries...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Beneficiary ID</th>
                <th>Policy ID</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Relationship</th>
                <th>Share (%)</th>
              </tr>
            </thead>
            <tbody>
              {beneficiaries.map((beneficiary) => (
                <tr key={beneficiary.beneficiary_id}>
                  <td>{beneficiary.beneficiary_id}</td>
                  <td>{beneficiary.policy_id}</td>
                  <td>{beneficiary.first_name}</td>
                  <td>{beneficiary.last_name}</td>
                  <td>{beneficiary.relationship}</td>
                  <td>{beneficiary.percentage_share}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export default App
