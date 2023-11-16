var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser=require('body-parser');
var session=require('express-session');

//Admin require
const passport=require('passport');
const flash=require('express-flash');
//End Admin Require

var adminRouter = require('./routes/admin');
var usersRouter = require('./routes/users');



var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use('/login', express.static(path.join(__dirname, 'css/login')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/css', express.static(path.join(__dirname, 'css')));
//session configuration

app.use(session({
  secret: 'vimal_punda',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge:2628002880},
}));
//Admin Middleware Setup
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
//End Admin Middleware Setup

app.use('/admin', adminRouter);
app.use('/', usersRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


module.exports = app;