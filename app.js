const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const Handlebars = require('handlebars');
const app=express();

// Admin require
const passport = require('passport');
const flash = require('express-flash');
// End Admin Require

Handlebars.registerHelper('json', function (context) {
  return JSON.stringify(context);
});

const app = express(); // Initialize Express
const adminRouter = require('./routes/admin');
const usersRouter = require('./routes/users');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/database/images', express.static('/home/razalak/eventuate/database/images'));
// session configuration

// session configuration
app.use(
  session({
    secret: 'vimal_punda',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2628002880 },
  })
);

// Admin Middleware Setup
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
// End Admin Middleware Setup

app.use('/admin', adminRouter);
app.use('/', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
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
