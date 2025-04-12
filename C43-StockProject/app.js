require('dotenv').config();
const db = require('./db/db');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');

//var indexRouter = require('./routes/index');
//var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var friendsRouter = require('./routes/friends');
var portfolioRouter = require('./routes/portfolio');
var stockRouter = require('./routes/stocks');
var stocklistRouter = require('./routes/stocklist');
var reviewsRouter = require('./routes/reviews');

var app = express();



app.use(
  session({
    secret: 'testing_key', // use a strong secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true if using HTTPS
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  })
);


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
//app.use(express.json());
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    express.json()(req, res, next);
  } else {
    next();
  }
});
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', usersRouter);
app.use('/portfolio', portfolioRouter);
app.use('/stocks', stockRouter);
app.use('/friends', friendsRouter);
app.use('/stocklist', stocklistRouter);
app.use('/reviews', reviewsRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
