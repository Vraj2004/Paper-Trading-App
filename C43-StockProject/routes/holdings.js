router.get('/:portfolioID/:symbol', async (req, res) => {
    const { portfolioID, symbol } = req.params;
  
    try {
      const result = await db.query(
        'SELECT volume FROM holding WHERE portfolioID = $1 AND symbol = $2',
        [portfolioID, symbol]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ volume: 0 });
      }
  
      res.json({ volume: result.rows[0].volume });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch holdings' });
    }
  });
  