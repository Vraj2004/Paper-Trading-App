const express = require('express');
const router = express.Router();
const db = require('../db/db');
const session = require('express-session');

router.use(
    session({
        secret: 'testing_key',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    })
);

// Register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;


    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    try {
        // Query for inserting into DB
        const result = await db.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING userID',
            [username, password]
        );
        const newUserID = result.rows[0].userid;

        req.session.userID = newUserID;

        await db.query(
            'INSERT INTO portfolio (ownerID, cashAmount) VALUES ($1, $2)',
            [newUserID, 0.00]
        );

        res.status(201).send({
            message: 'User registered successfully',
            userID: result.rows[0].userid
        });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).send('Error registering user. Make sure username is unique.');
    }
});


// Login 
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(username, password);
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).send('Invalid username or password');
        }

        const user = result.rows[0];

        if (password !== user.password) {
            return res.status(401).send('Invalid username or password');
        }
        req.session.userID = user.userid;
        res.send({
            message: 'Login successful',
            userID: user.userid
        });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).send('Error logging in');
    }
});


router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error logging out:', err);
            return res.status(500).send('Error logging out');
        }
        res.send('User logged out successfully');
    });
});

router.get('/session', (req, res) => {
    if (req.session.userID) {
        res.send({
            loggedIn: true,
            userID: req.session.userID
        });
    } else {
        res.send({ loggedIn: false });
    }
});

module.exports = router;