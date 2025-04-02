const express = require('express');
const router = express.Router();
const db = require('../db/db');

router.post('/create', async (req, res) => {
    const { userID, initialCash } = req.body;
    
    if (!userID || isNaN(initialCash) || Number(initialCash) < 0) {
        res.status(400).json({error: "Invalid Input"});
    }

    try {
        const user = await db.query('SELECT * FROM users WHERE userID = $1', [userID]);
        if (user.rows.length === 0) {
          return res.status(400).json({ error: 'User does not exist' });
        }
    
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


module.exports = router;