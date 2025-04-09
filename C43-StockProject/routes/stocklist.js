const express = require('express');
const router = express.Router();
const db = require('../db/db');

async function getStocklist(stocklistID, userID) {
    console.log(stocklistID, userID)
    if (!stocklistID) {
        return false;
    }
    try {
        console.log(stocklistID, userID)
        const result = await db.query(
            `SELECT * FROM stocklist WHERE stocklistID = $1 AND 
            (ownerID = $2
            OR priv_status = 'public'
            OR (priv_status='private' 
            AND $2 IN (SELECT friendID FROM sharedStocklist WHERE stocklistID=$1)))`,
            [stocklistID, userID]
        );
        console.log(result.rows);
        if (result.rows.length === 0) {
            return false;
        }
        else {
            const stocks = await db.query(
                `SELECT * FROM stocklistStock WHERE stocklistID = $1`,
                [stocklistID]
            );
            return stocks.rows;
        }
    } catch (err) {
        console.error(err);
        throw new Error('Failed to get stocklist ID');
    }
}

router.get('/:stocklistID', async (req, res) => {
    const userID = req.session.userID;

    const { stocklistID } = req.params;
    console.log(stocklistID);
    if (!stocklistID) {
        return res.status(400).json({ error: "Invalid input, missing stocklistID" });
    }
    try {
        const stocks = await getStocklist(stocklistID, userID);
        if (!stocks) {
            return res.status(404).json({ error: 'Stocklist not found' });
        }
        return res.status(200).json(stocks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stocklist' });
    }
});

router.post('/create', async (req, res) => {
    const userID = req.session.userID;
    const { priv_status = public, symbol = [] } = req.body;
    console.log(userID, priv_status, symbol);

    if (!userID || !priv_status) {
        return res.status(400).json({ error: "Invalid input" });
    }
    try {
        const response = await db.query(
            `INSERT INTO stocklist (ownerID, priv_status) VALUES ($1, $2) RETURNING *`,
            [userID, priv_status]
        );
        const stocklistID = response.rows[0].stocklistid;
        for (const sym of symbol) {
            const stockToStocklist = await db.query(
                `INSERT INTO stocklistStock (stocklistID, symbol) VALUES ($1, $2) RETURNING *`,
                [stocklistID, sym]
            );
        }

        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.log(err);
        res.status(400).json({ error: 'Failed to create stocklist:' + err.message });
    }

});

module.exports = router;
