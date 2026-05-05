const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT username
      FROM users
      WHERE username = ? AND password = ?
      LIMIT 1
      `,
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    return res.json({ success: true, username: rows[0].username });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/beneficiaries', async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        beneficiary_id,
        policy_id,
        first_name,
        last_name,
        relationship,
        percentage_share
      FROM Beneficiary
      ORDER BY beneficiary_id ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/beneficiaries', async (req, res) => {
  const { beneficiary_id, policy_id, first_name, last_name, relationship, percentage_share } = req.body;

  try {
    await db.query(
      `
      INSERT INTO Beneficiary
      (beneficiary_id, policy_id, first_name, last_name, relationship, percentage_share)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [beneficiary_id, policy_id, first_name, last_name, relationship, percentage_share]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/beneficiaries/:id', async (req, res) => {
  const { id } = req.params;
  const { policy_id, first_name, last_name, relationship, percentage_share } = req.body;

  try {
    const [result] = await db.query(
      `
      UPDATE Beneficiary
      SET policy_id = ?, first_name = ?, last_name = ?, relationship = ?, percentage_share = ?
      WHERE beneficiary_id = ?
      `,
      [policy_id, first_name, last_name, relationship, percentage_share, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Beneficiary not found.' });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/beneficiaries/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM Beneficiary WHERE beneficiary_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Beneficiary not found.' });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/policyholders', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT policyholder_id, first_name, last_name, date_of_birth, sex
      FROM Policyholder
      ORDER BY policyholder_id ASC
      `
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/policyholders', async (req, res) => {
  const { policyholder_id, first_name, last_name, date_of_birth, sex } = req.body;

  try {
    await db.query(
      `
      INSERT INTO Policyholder (policyholder_id, first_name, last_name, date_of_birth, sex)
      VALUES (?, ?, ?, ?, ?)
      `,
      [policyholder_id, first_name, last_name, date_of_birth, sex]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/policyholders/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, date_of_birth, sex } = req.body;

  try {
    const [result] = await db.query(
      `
      UPDATE Policyholder
      SET first_name = ?, last_name = ?, date_of_birth = ?, sex = ?
      WHERE policyholder_id = ?
      `,
      [first_name, last_name, date_of_birth, sex, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Policyholder not found.' });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/policyholders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM Policyholder WHERE policyholder_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Policyholder not found.' });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/reports/query1', async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
          p.policy_id,
          CONCAT(ph.first_name, ' ', ph.last_name) AS policyholder_name,
          ph.sex,
          p.issue_date,
          p.issue_age,
          p.face_amount,
          uc.class_name,
          ps.status_name,
          mb.basis_name
      FROM Policy p
      JOIN Policyholder ph ON p.policyholder_id = ph.policyholder_id
      JOIN UnderwritingClass uc ON p.class_id = uc.class_id
      JOIN PolicyStatus ps ON p.status_id = ps.status_id
      JOIN MortalityBasis mb ON p.basis_id = mb.basis_id
      WHERE ps.status_name = 'Active'
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/query2', async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
          ps.status_name,
          COUNT(p.policy_id) AS number_of_policies,
          SUM(p.face_amount) AS total_face_amount
      FROM Policy p
      JOIN PolicyStatus ps ON p.status_id = ps.status_id
      GROUP BY ps.status_name
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/query3', async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
          p.policy_id,
          CONCAT(ph.first_name, ' ', ph.last_name) AS policyholder_name,
          SUM(b.percentage_share) AS total_beneficiary_percentage
      FROM Policy p
      JOIN Policyholder ph ON p.policyholder_id = ph.policyholder_id
      JOIN Beneficiary b ON p.policy_id = b.policy_id
      GROUP BY p.policy_id, policyholder_name
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/query4', async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
          policy_id,
          face_amount,
          issue_age
      FROM Policy
      WHERE face_amount > (
        SELECT AVG(face_amount)
        FROM Policy
      )
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/query5', async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
          policy_id,
          beneficiary_name,
          relationship,
          percentage_share,
          estimated_payout
      FROM view_beneficiary_payouts
      WHERE estimated_payout >= 100000
      ORDER BY estimated_payout DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});