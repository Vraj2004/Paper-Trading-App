const express = require('express');
const router = express.Router();
const db = require('../db/db');

const timeout = 5 * 60 * 1000; // 5 minute
async function removeFromSharedStocklist(userID1, userID2) {
    console.log(userID1, userID2);
    if (!userID1 || !userID2) {
        return false;
    }
    // //get all owned by userID1
    // const ownedByUser1 = await getUserStockLists(userID1);
    // const ownedByUser2 = await getUserStockLists(userID2);

    try {

        const test = await db.query(
            `DELETE FROM sharedStocklist WHERE (friendID = $1 AND stocklistID IN (SELECT stocklistID FROM stocklist WHERE ownerID = $2))
            OR (friendID = $2 AND stocklistID IN (SELECT stocklistID FROM stocklist WHERE ownerID = $1)) returning *`,
            [userID1, userID2]
        );
        console.log("deleted rows:", test.rows);
        return test.rows;


    } catch (err) {
        console.error(err);
        throw new Error('Failed to remove from shared stocklist');
    }

}
async function requestExists(userID1, userID2) {
    console.log(userID1, userID2);
    if (!userID1 || !userID2) {
        return false;
    }
    try {
        const result = await db.query(
            `SELECT * FROM friendReq WHERE (senderID = $1 AND receiverID = $2) 
            OR (senderID = $2 AND receiverID = $1)`,
            [userID1, userID2]
        );
        if (result.rows.length === 0) {
            return false;
        }
        console.log("timecheck1", new Date(result.rows[0].last_updated).getTime() + timeout, Date.now())

        //handle the case where the request was rejected
        if (result.rows[0].status === 'rejected' && new Date(result.rows[0].last_updated).getTime() + timeout < Date.now()) {
            console.log("timecheck", result.rows[0].last_updated, Date.now() - timeout);
            console.log("timeout completed")
            const updateResult = await db.query(
                `DELETE FROM friendReq WHERE (senderID = $1 AND receiverID = $2)
                OR (senderID = $2 AND receiverID = $1)`,
                [userID1, userID2]
            );
            console.log(updateResult);
            return false;
        }
        if (result.rows[0].status === 'rejected') {
            return "friend request rejected, please wait for 5 minutes to send a new request";
        }
        console.log(result.rows, result.rows.length > 0);
        return result.rows.length > 0;
    } catch (err) {
        console.error(err);
        throw new Error('Failed to check if request exists');
    }
}
//get all friends of the user
router.get('/:userID', async (req, res) => {
    const { userID } = req.params;
    console.log(userID);
    if (!userID || userID === undefined || userID === null) {
        return res.status(401).json({ error: "Invalid input, missing userID" });
    }
    try {
        const response = await db.query(
            `SELECT 
            CASE 
                WHEN senderID = $1 THEN receiverID 
                ELSE senderID 
            END AS friendID,
            CASE 
                WHEN senderID = $1 THEN receiver.username 
                ELSE sender.username 
            END AS username, status
            FROM friendReq
            LEFT JOIN users sender ON friendReq.senderID = sender.userID
            LEFT JOIN users receiver ON friendReq.receiverID = receiver.userID
            WHERE (senderID = $1 OR receiverID = $1) 
            AND status = 'accepted'`,
            [userID]
        );

        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }

});

//make a friend request
router.post('/reqs/create', async (req, res) => {
    const userID = req.session.userID;
    const { recieverID } = req.body;
    console.log(userID, recieverID);
    if (!userID || !recieverID) {
        return res.status(400).json({ error: "Invalid input" });
    }
    if (userID == recieverID) {
        return res.status(400).json({ error: "Cannot send friend request to yourself" });
    }
    //check if the user exists
    const checkUser = await db.query(
        `SELECT * FROM users WHERE userID = $1`,
        [recieverID]
    );
    if (checkUser.rows.length === 0) {
        return res.status(400).json({ error: "User does not exist" });
    }
    const checkReq = await requestExists(userID, recieverID);
    //check if the request already exists
    if (checkReq === true) {
        return res.status(400).json({ error: "Friend request already exists" });
    }
    else if (checkReq !== false) {
        return res.status(400).json({ error: checkReq });
    }
    try {
        const response = await db.query(
            `INSERT INTO friendReq (senderID, receiverID, status) VALUES ($1, $2, 'pending') RETURNING *`,
            [userID, recieverID]
        );
        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send friend request' });
    }


});

//reject a friend request
router.post('/reqs/reject', async (req, res) => {
    const userID = req.session.userID;
    const { senderID } = req.body;
    console.log(userID, senderID);
    if (!userID || !senderID) {
        return res.status(400).json({ error: "Invalid input" });
    }
    if (userID === senderID) {
        return res.status(400).json({ error: "Cannot reject friend request from yourself" });
    }
    const checkReq = await requestExists(userID, senderID);
    if (checkReq === false) {
        return res.status(400).json({ error: "Friend request already exists" });
    }
    else if (checkReq !== true) {
        return res.status(400).json({ error: checkReq });
    }
    try {
        let response = await db.query(
            `UPDATE friendReq SET status = 'rejected' WHERE senderID = $1 AND receiverID = $2 AND status!='rejected' RETURNING *`,
            [senderID, userID]
        );
        if (response.rows.length === 0) {
            response = await db.query(
                `UPDATE friendReq SET status = 'rejected' WHERE senderID = $1 AND receiverID = $2 AND status!='rejected' RETURNING *`,
                [userID, senderID]
            );
            if (response.rows === 0) return res.status(400).json({ error: "sender does not exist" });
        }
        removeFromSharedStocklist(senderID, userID);
        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reject friend request' });
    }

});

//accept a friend request
router.post('/reqs/accept', async (req, res) => {
    const userID = req.session.userID;
    const { senderID } = req.body;
    console.log(userID, req.body);
    if (!userID || !senderID) {
        return res.status(400).json({ error: "Invalid input" });
    }
    if (userID === senderID) {
        return res.status(400).json({ error: "Cannot accept friend request from yourself" });
    }
    const checkReq = await requestExists(userID, senderID);
    //check if the request already exists
    if (checkReq === false) {
        return res.status(400).json({ error: "Friend request does not exists" });
    }
    else if (checkReq !== true) {
        return res.status(400).json({ error: checkReq });
    }

    try {
        const response = await db.query(
            `UPDATE friendReq SET status = 'accepted' WHERE senderID = $1 AND receiverID = $2 AND status='pending' RETURNING *`,
            [senderID, userID]
        );
        if (response.rows.length === 0) {
            return res.status(400).json({ error: "sender does not exist" });
        }
        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to accept friend request' });
    }
});


//get all pending friend requests sent by the user
router.get('/reqs/sent/:userID', async (req, res) => {
    const { userID } = req.params;
    console.log(userID);
    try {
        const response = await db.query(
            `SELECT friendreq.receiverid AS receiverid, username,status
            FROM friendreq JOIN users ON friendreq.receiverid = users.userid
            WHERE senderid = $1 AND status='pending'`,
            [userID]
        );
        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});
//get all pending friend requests sent to the user
router.get('/reqs/recieved/:userID', async (req, res) => {
    const { userID } = req.params;
    console.log(userID);
    try {
        const response = await db.query(
            `SELECT 
            friendreq.senderid AS senderid, 
            sender.username AS username,
            status
            FROM friendreq 
            JOIN users sender ON friendreq.senderid = sender.userid
            WHERE receiverid = $1 AND status='pending'`,
            [userID]
        );
        console.log(response.rows);
        return res.status(200).json(response.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});


module.exports = router;