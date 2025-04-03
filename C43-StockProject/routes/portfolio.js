const express = require('express');
const router = express.Router();
const db = require('../db/db');

// ✅ Create Portfolio
router.post('/create', async (req, res) => {
  const userID = req.session.userID;
  const { initialCash } = req.body;

  if (!userID || isNaN(initialCash) || Number(initialCash) < 0) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const result = await db.query(
      'INSERT INTO portfolio (ownerID, cashAmount) VALUES ($1, $2) RETURNING *',
      [userID, initialCash]
    );

    res.json({ message: 'Portfolio created', portfolio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create portfolio' });
  }
});

// ✅ Get portfolios for logged-in user
router.get('/my', async (req, res) => {
  const userID = req.session.userID;

  if (!userID) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const result = await db.query('SELECT * FROM portfolio WHERE ownerID = $1', [userID]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch portfolios' });
  }
});

// ✅ Deposit cash
router.post('/deposit', async (req, res) => {
  const { portfolioID, amount } = req.body;

  if (!portfolioID || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const result = await db.query(
      'UPDATE portfolio SET cashAmount = cashAmount + $1 WHERE portfolioID = $2 RETURNING *',
      [amount, portfolioID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json({ message: 'Cash deposited', portfolio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to deposit cash' });
  }
});

// ✅ Withdraw cash
router.post('/withdraw', async (req, res) => {
  const { portfolioID, amount } = req.body;

  if (!portfolioID || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const check = await db.query(
      'SELECT cashAmount FROM portfolio WHERE portfolioID = $1',
      [portfolioID]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (Number(check.rows[0].cashamount) < Number(amount)) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    const result = await db.query(
      'UPDATE portfolio SET cashAmount = cashAmount - $1 WHERE portfolioID = $2 RETURNING *',
      [amount, portfolioID]
    );

    res.json({ message: 'Cash withdrawn', portfolio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to withdraw cash' });
  }
});

module.exports = router;
