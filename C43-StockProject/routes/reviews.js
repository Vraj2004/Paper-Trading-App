const express = require('express');
const router = express.Router();
const db = require('../db/db');

async function IfUserCanView(stocklistID, userID) {
    console.log("stocklistID, userID", stocklistID, userID)
    if (!stocklistID) {
        return false;
    }
    try {
        console.log(stocklistID, userID)
        const result = await db.query(
            `SELECT stocklistID, ownerid, priv_status, username FROM stocklist JOIN users ON stocklist.ownerID=users.userid WHERE stocklistID = $1 AND 
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
        else return result;

    }
    catch (err) {
        console.error(err);
        throw new Error('Failed to check stocklist visibility');
    }
}

async function IfUserCanDelete(stocklistID, userID) {
    console.log("stocklistID, userID", stocklistID, userID)
    if (!stocklistID) {
        return false;
    }
    try {
        console.log(stocklistID, userID)
        const result = await db.query(
            `SELECT * FROM stocklist 
             JOIN review ON stocklist.stocklistid = review.stocklistid 
             WHERE stocklist.stocklistid = $1 AND
             (stocklist.ownerID = $2 OR review.reviewerID = $2)`,
            [stocklistID, userID]
        );
        console.log(result.rows);
        if (result.rows.length === 0) {
            return false;
        }
        else return result;

    }
    catch (err) {
        console.error(err);
        throw new Error('Failed to check stocklist visibility');
    }
}

async function IfUserCanEdit(stocklistID, userID) {
    console.log("stocklistID, userID", stocklistID, userID)
    if (!stocklistID) {
        return false;
    }
    try {
        console.log(stocklistID, userID)
        const result = await db.query(
            `SELECT * FROM review WHERE stocklistID = $1 AND reviewerID = $2`,
            [stocklistID, userID]
        );
        console.log(result.rows);
        if (result.rows.length === 0) {
            return false;
        }
        else return result;

    }
    catch (err) {
        console.error(err);
        throw new Error('Failed to check stocklist visibility');
    }
}
//create reviews TODO
router.post('/create/:stocklistID', async (req, res) => {
    const { stocklistID } = req.params;
    const { content } = req.body;
    const userID = req.session.userID;
    if (!userID) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    if (!stocklistID || !content) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const result = await IfUserCanView(stocklistID, userID);
        if (!result) {
            return res.status(401).json({ error: 'You cannot view this stocklist' });
        }
        const review = await db.query(
            'INSERT INTO review (stocklistID, reviewerid, content) VALUES ($1, $2, $3) RETURNING *',
            [stocklistID, userID, content]
        );
        res.status(201).json(review.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create review' });
    }

}
);
//get reviews TODO
router.get('/:stocklistID', async (req, res) => {
    const { stocklistID } = req.params;
    const userID = req.session.userID;
    var status = 'public';
    if (!userID) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    if (!stocklistID) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const result = await IfUserCanView(stocklistID, userID);
        if (!result) {
            return res.status(401).json({ error: 'You cannot view this stocklist' });
        }
        if (result.rows[0].priv_status === 'private') {
            var status = 'private';
        }
        const reviews = await db.query(
            'SELECT reviewid, stocklistid, reviewerid, content, username FROM review JOIN users ON reviewerid=userid WHERE stocklistID = $1',
            [stocklistID]
        );
        if (status === 'private') {
            return res.status(200).json(reviews.rows.filter(review => review.reviewerid === userID || result.rows[0].ownerid === userID));
        }
        return res.status(200).json(reviews.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

//delete reviews TODO
router.delete('/:stocklistID/:reviewID', async (req, res) => {
    const { stocklistID, reviewID } = req.params;
    const userID = req.session.userID;
    if (!userID) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    if (!stocklistID || !reviewID) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const result = await IfUserCanDelete(stocklistID, userID);
        if (!result) {
            return res.status(401).json({ error: 'You cannot delete this stocklist' });
        }
        const review = await db.query(
            'DELETE FROM review WHERE stocklistID = $1 AND reviewid = $2 RETURNING *',
            [stocklistID, reviewID]
        );
        res.status(200).json(review.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

//edit reviews TODO
router.put('/:stocklistID/:reviewID', async (req, res) => {
    const { stocklistID, reviewID } = req.params;
    const { content } = req.body;
    const userID = req.session.userID;
    if (!userID) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    if (!stocklistID || !reviewID || !content) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const result = await IfUserCanEdit(stocklistID, userID);
        if (!result) {
            return res.status(401).json({ error: 'You cannot edit this stocklist' });
        }
        const review = await db.query(
            'UPDATE review SET content = $1 WHERE stocklistID = $2 AND reviewid = $3 RETURNING *',
            [content, stocklistID, reviewID]
        );
        res.status(200).json(review.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to edit review' });
    }
});

module.exports = router;