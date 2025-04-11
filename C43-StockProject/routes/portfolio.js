const express = require('express');
const router = express.Router();
const db = require('../db/db');

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

// Buy stock
router.post('/buy', async (req, res) => {
  const { portfolioID, symbol, shares } = req.body;
  if (!portfolioID || !symbol || isNaN(shares) || shares <= 0)
    return res.status(400).json({ error: 'Invalid input' });

  try {
    const priceRes = await db.query('SELECT curr_value FROM stock WHERE symbol = $1', [symbol]);
    if (priceRes.rows.length === 0) return res.status(404).json({ error: 'Stock not found' });

    const price = parseFloat(priceRes.rows[0].curr_value);
    const totalCost = price * shares;

    const cashRes = await db.query('SELECT cashAmount FROM portfolio WHERE portfolioID = $1', [portfolioID]);
    if (cashRes.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found' });

    if (cashRes.rows[0].cashamount < totalCost)
      return res.status(400).json({ error: 'Not enough cash in portfolio' });

    await db.query('BEGIN');
    await db.query('UPDATE portfolio SET cashAmount = cashAmount - $1 WHERE portfolioID = $2', [totalCost, portfolioID]);
    await db.query(`
      INSERT INTO holding (portfolioid, symbol, volume)
      VALUES ($1, $2, $3)
      ON CONFLICT (portfolioid, symbol)
      DO UPDATE SET volume = holding.volume + $3
    `, [portfolioID, symbol, shares]);
    await db.query('COMMIT');

    res.json({ message: 'Stock purchased' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Buy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/sell', async (req, res) => {
  const { portfolioID, symbol, shares } = req.body;
  if (!portfolioID || !symbol || isNaN(shares) || shares <= 0)
    return res.status(400).json({ error: 'Invalid input' });

  try {
    const holdingRes = await db.query(
      'SELECT volume FROM holding WHERE portfolioid = $1 AND symbol = $2',
      [portfolioID, symbol]
    );
    if (holdingRes.rows.length === 0 || holdingRes.rows[0].volume < shares)
      return res.status(400).json({ error: 'Not enough shares to sell' });

    const priceRes = await db.query('SELECT curr_value FROM stock WHERE symbol = $1', [symbol]);
    const price = parseFloat(priceRes.rows[0].curr_value);
    const totalGain = price * shares;

    await db.query('BEGIN');
    await db.query('UPDATE portfolio SET cashAmount = cashAmount + $1 WHERE portfolioID = $2', [totalGain, portfolioID]);
    await db.query('UPDATE holding SET volume = volume - $1 WHERE portfolioid = $2 AND symbol = $3',
      [shares, portfolioID, symbol]);
    await db.query('COMMIT');

    res.json({ message: 'Stock sold' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Sell error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


router.get('/holdings', async (req, res) => {
  const { portfolioID } = req.query;

  if (!portfolioID) {
    return res.status(400).json({ error: 'Missing portfolio ID' });
  }

  try {
    const result = await db.query(
      `
      SELECT h.symbol, h.volume, s.curr_value,
             ROUND(h.volume * s.curr_value, 2) AS total_value
      FROM holding h
      JOIN stock s ON h.symbol = s.symbol
      WHERE h.portfolioID = $1
      `,
      [portfolioID]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching holdings:", err);
    res.status(500).json({ error: 'Failed to fetch holdings' });
  }
});
module.exports = router;
