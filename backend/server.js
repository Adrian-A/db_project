const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});