var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const initializePassport = require('./adminPassportConfig');
const methodOverride= require('method-override');

const users = [];
//SIGNUP &LOGIN
initializePassport(passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
)
//Middlewares
//using method override to implement logout with delete method
router.use(methodOverride('_method'));

function checkAuthenticated(req, res, next)  //used for site which should be accessed after login
{
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/admin/signin');
}
function checkNotAuthenticated(req, res, next)  //used for site which should not be accessed after login
{
  if (req.isAuthenticated()) {
    return res.redirect('/admin');
  }
  next();  
}



//Get Functions
router.get('/signin', function (req, res, next) {
  res.render('admin/AdminLogin&Signup.hbs',{ messages: req.flash() });
});
router.get('/AddDetails', function (req, res, next) {
  res.render('admin/CompanyDetails'); 
});
router.get('/', function (req, res, next) {
  res.render('admin/AdminHomepage.hbs');
});
//Post Functions
router.post('/signin', passport.authenticate('local',
  {
    successRedirect: '/admin/',
    failureRedirect: '/admin/signin',
    failureFlash: true
  }

))

router.post('/signup', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    users.push(
      {
        id: Date.now().toString(),
        CompanyName: req.body.CompanyName,
        Phone: req.body.Phone,
        email: req.body.email,
        password: hashedPassword
      })

    req.flash('success', 'Signup successful');
    res.redirect('/admin/signin');
  }
  catch
  {
    req.flash('error', 'Signup failed');
    res.redirect('/admin/signin');
  }
  console.log(users);
})

router.delete('/logout', (req, res) => {
  if (req.isAuthenticated()) {
    req.logout(function(err) {
      if (err) {
          return next(err);
      }
      // Redirect or respond after successful logout
      res.redirect('/admin/signin');
  });
  } else {
    res.status(400).send('Not logged in');
  }
});




module.exports = router;
