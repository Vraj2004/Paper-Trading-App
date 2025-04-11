const express = require('express');
const router = express.Router();
const db = require('../db/db');
const path = require('path'); // ✅ ADDED: for serving HTML page

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

// ✅ ADDED: Serve the stockChart.html page
router.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/stockChart.html'));
});

router.get("/chart-data", async (req, res) => {
  const { symbol } = req.query;

  try {
    const historical = await db.query(
      `SELECT timestamp, close_price FROM historical_stock WHERE symbol = $1
       UNION
       SELECT timestamp, close_price FROM dailystock WHERE symbol = $1
       ORDER BY timestamp ASC`,
      [symbol]
    );

    res.json(historical.rows);
  } catch (err) {
    console.error("Error fetching chart data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Fetch latest price for a symbol
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

// Post request to add the data into the db
router.post("/add-data", async (req, res) => {
  console.log("🛬 Received:", req.body);

  const {
    timestamp,
    symbol,
    open_price,
    high_price,
    low_price,
    close_price,
    volume,
  } = req.body;

  try {
    const parsedClose = parseFloat(close_price);
    await db.query(
      `INSERT INTO stock (symbol, curr_value)
       VALUES ($1, $2)
       ON CONFLICT (symbol) DO UPDATE SET curr_value = EXCLUDED.curr_value`,
      [symbol, parsedClose]
    );

    await db.query(
      `INSERT INTO dailystock (timestamp, symbol, open_price, high_price, low_price, close_price, volume)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        timestamp,
        symbol,
        parseFloat(open_price),
        parseFloat(high_price),
        parseFloat(low_price),
        parseFloat(close_price),
        parseInt(volume),
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error inserting stock data:", err.message);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
