const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET all stocks with latest price
router.get('/all', async (req, res) => {
    try {
      const result = await db.query(`
        SELECT symbol, curr_value AS latestprice
        FROM stock
      `);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch stocks' });
    }
  });
  

router.get('/:symbol', async (req, res) => {
  const { symbol } = req.params;

  try {
    const result = await db.query(`
      SELECT curr_value AS latestPrice
      FROM stock
      WHERE symbol = $1
    `, [symbol]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});
module.exports = router;
