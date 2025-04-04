var express = require('express');
var router = express.Router();
const db = require('../db/db');

router.get('/', async function(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM users');
    res.render('index', { title: 'User List', users: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Error fetching data');
  }
});

module.exports = router;