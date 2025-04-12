const express = require('express');
const router = express.Router();
const db = require('../db/db');

async function checkFriendship(userID1, userID2) {
    console.log("checkFRIENDSHIP", userID1, userID2);
    if (!userID1 || !userID2) {
        return false;
    }
    try {
        const result = await db.query(
            `SELECT * FROM friendReq WHERE (senderID = $1 AND receiverID = $2) 
            OR (senderID = $2 AND receiverID = $1 AND status='accepted')`,
            [userID1, userID2]
        );
        console.log(result.rows);
        return result.rows.length > 0;
    } catch (err) {
        console.error(err);
        throw new Error('Failed to check friendship');
    }

}

async function getStocklistsWithStocks(stocklists) {

    let stocklistWithStocks = [];
    for (const stocklist of stocklists.rows) {
        const stocks = await db.query(
            `SELECT * FROM stocklistStock WHERE stocklistID = $1`,
            [stocklist.stocklistid]
        );

        stocklistWithStocks.push({
            priv_status: stocklist.priv_status,
            stocklistID: stocklist.stocklistid,
            ownerID: stocklist.ownerid,
            username: stocklist.username,
            stocks: stocks.rows
        });
    }
    console.log("stocklistWithStocks", stocklistWithStocks);

    return stocklistWithStocks;


}

async function ifOwner(stocklistID, userID) {
    console.log(stocklistID, userID);
    if (!stocklistID || !userID) {
        return false;
    }
    try {
        const response = await db.query(
            `SELECT ownerID FROM stocklist WHERE stocklistID = $1 AND ownerID = $2`,
            [stocklistID, userID])
        if (response.rows.length === 0) {
            return false;
        }
        return true;
    } catch (err) {
        console.error(err);
        throw new Error('Failed to check stocklist ownership');
    }
}
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

async function getAllUserCanView(userID) {
    if (!userID) { return; }
    const stocklists = await db.query(
        `SELECT stocklistID, ownerid, priv_status, username
         FROM (SELECT * FROM stocklist JOIN users ON stocklist.ownerID=users.userid) AS outer_stocklist
        WHERE 
        ownerID = $1 OR priv_status = 'public' OR 
        (priv_status='private' AND $1 IN 
        (SELECT friendID FROM sharedStocklist AS inner_shared WHERE inner_shared.stocklistID = outer_stocklist.stocklistID))`,
        [userID]
    );
    return stocklists;
}

//get all public stocklists DONE
router.get('/public', async (req, res) => {
    try {
        const stocklists = await db.query(
            `SELECT stocklistID, ownerid, priv_status, username FROM stocklist JOIN users ON stocklist.ownerID=users.userid
            WHERE priv_status = 'public'`
        );
        if (stocklists.rows.length === 0) {
            return res.status(202).json([]);
        }
        const stocklistWithStocks = await getStocklistsWithStocks(stocklists);
        return res.status(200).json(stocklistWithStocks);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stocklists' });
    }
});

//get friend's visible stocklist DONE
router.get('/user/:friendID', async (req, res) => {
    const userID = req.session.userID;
    const { friendID } = req.params;
    console.log(friendID);
    if (!userID) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (!friendID) {
        return res.status(400).json({ error: "Invalid input, missing friendID" });
    }
    try {
        const stocklists = await getAllUserCanView(userID);
        console.log("stocklists GETALLUSER CAN VIEW", stocklists);
        const filteredStocklists = stocklists.rows.filter(row => {
            return row.ownerid == friendID;
        });
        const stocklistWithStocks = await getStocklistsWithStocks({ rows: filteredStocklists });
        console.log(stocklistWithStocks);
        return res.status(200).json(stocklistWithStocks);

    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stocklists' });
    }
});

//get specific stocklist DONE
router.get('/:stocklistID', async (req, res) => {
    const userID = req.session.userID;

    const { stocklistID } = req.params;
    console.log(stocklistID);
    if (!stocklistID) {
        return res.status(400).json({ error: "Invalid input, missing stocklistID" });
    }
    try {
        const stocklist = await IfUserCanView(stocklistID, userID);
        if (!stocklist) {
            return res.status(401).json({ error: 'Stocklist not found or no permission' });
        }
        const stocks = await getStocklistsWithStocks(stocklist);

        return res.status(200).json(stocks[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stocklist' });
    }
});

//share stocklist DONE
router.post('/:stocklistID/share', async (req, res) => {
    const userID = req.session.userID;
    const { stocklistID } = req.params;
    const { friendID } = req.body;
    const canView = await IfUserCanView(stocklistID, friendID);

    console.log(stocklistID, userID, friendID);
    if (!stocklistID || !userID || !friendID) {
        return res.status(400).json({ error: "Invalid input" });
    }
    if (!await ifOwner(stocklistID, userID)) {
        return res.status(401).json({ error: "Not the owner of the stocklist" });
    }
    if (canView) {
        return res.status(401).json({ error: "Stocklist already visible to friend" });
    }

    if (!await checkFriendship(userID, friendID)) {
        return res.status(401).json({ error: "cannot share with non-friends" });
    }
    try {
        const response = await db.query(
            `INSERT INTO sharedStocklist (stocklistID, friendID) VALUES ($1, $2) RETURNING *`,
            [stocklistID, friendID]
        );
        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.log(err);
        res.status(400).json({ error: 'Failed to share stocklist:' + err.message });
    }
});

//update stocklistID DONE
router.put('/:stocklistID', async (req, res) => {
    const userID = req.session.userID;
    const { stocklistID } = req.params;
    const { priv_status = 'public', symbols = [] } = req.body;
    console.log(stocklistID, userID, priv_status, symbols);
    if (!stocklistID || !userID) {
        return res.status(400).json({ error: "Invalid input" });
    }
    try {
        if (!await ifOwner(stocklistID, userID)) {
            return res.status(401).json({ error: "Not the owner of the stocklist" });
        }
        const response = await db.query(
            `DELETE FROM stocklistStock WHERE stocklistID = $1 RETURNING *`,
            [stocklistID]
        );
        console.log("DELETED STOCKS", response.rows);
        for (const sym of symbols) {
            const stockToStocklist = await db.query(
                `INSERT INTO stocklistStock (stocklistid, symbol) VALUES ($1, $2)
                ON CONFLICT (stocklistid, symbol) DO NOTHING
                RETURNING *`,
                [stocklistID, sym]
            );
            console.log("ADDED STOCKS", stockToStocklist.rows);
        }

        const StockList = await db.query(
            `SELECT stocklistID, ownerid, priv_status, username FROM stocklist JOIN users ON stocklist.ownerID=users.userid WHERE stocklistID = $1`,
            [stocklistID]
        );

        const updatedstocks = await getStocklistsWithStocks(StockList);
        if (!updatedstocks) {
            return res.status(404).json({ error: 'Stocklist not found' });
        }
        console.log("UPDATED STOCKS", updatedstocks);
        return res.status(200).json(updatedstocks);
    }
    catch (err) {
        console.log(err);
        res.status(400).json({ error: 'Failed to update stocklist:' + err.message });
    }



})

//create new stocklist DONE
router.post('/create', async (req, res) => {
    const userID = req.session.userID;
    const { priv_status = public, symbols = [] } = req.body;
    console.log(userID, priv_status, symbols);

    if (!userID || !priv_status) {
        return res.status(400).json({ error: "Invalid input" });
    }
    try {
        const response = await db.query(
            `INSERT INTO stocklist (ownerID, priv_status) VALUES ($1, $2) RETURNING *`,
            [userID, priv_status]
        );
        const stocklistID = response.rows[0].stocklistid;
        for (const sym of symbols) {
            const stockToStocklist = await db.query(
                `INSERT INTO stocklistStock (stocklistID, symbol) VALUES ($1, $2) RETURNING *`,
                [stocklistID, sym]
            );
            if (stockToStocklist.rowCount === 0) {
                return res.status(400).json({ error: 'Failed to add stock to stocklist' });
            }
        }

        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.log(err);
        res.status(400).json({ error: 'Failed to create stocklist:' + err.message });
    }

});

//delete stocklist TODO
router.delete('/:stocklistID', async (req, res) => {
    const userID = req.session.userID;
    const { stocklistID } = req.params;
    console.log(stocklistID, userID);
    if (!stocklistID || !userID) {
        return res.status(400).json({ error: "Invalid input" });
    }
    try {
        if (!await ifOwner(stocklistID, userID)) {
            return res.status(401).json({ error: "Not the owner of the stocklist" });
        }
        const response = await db.query(
            `DELETE FROM stocklist WHERE stocklistID = $1 RETURNING *`,
            [stocklistID]
        );
        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.log(err);
        res.status(400).json({ error: 'Failed to delete stocklist:' + err.message });
    }

});

module.exports = router;
