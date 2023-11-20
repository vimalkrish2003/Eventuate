var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const initializePassport = require('./adminPassportConfig');
const methodOverride = require('method-override');
const dbpool = require('../database/mariadbconnection');
const multer = require('multer');
const upload = multer({ dest: 'adminuploads/' }); // This will save files to a directory named 'uploads'


//SIGNUP &LOGIN
initializePassport(passport,
  async (compemail) => {
    let conn;
    try {
      conn = await dbpool.getConnection();
      const rows = await conn.query("SELECT * FROM COMPANY WHERE compemail=?", [compemail]);
      return rows[0];

    }
    catch (err) {
      throw err;
    }
    finally {
      if (conn)
        conn.release();
    }
  }

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
router.get('/signin',checkNotAuthenticated, function (req, res, next) {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  res.render('admin/AdminLogin&Signup.hbs', { messages: req.flash() });
});
router.get('/AddDetails',checkAuthenticated, function (req, res, next) {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  res.render('admin/CompanyDetails');
});
router.get('/',checkAuthenticated, function (req, res, next) {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  res.render('admin/AdminHomepage.hbs');
});
//Post Functions
router.post('/signin',checkNotAuthenticated,(req,res,next)=>
{
  passport.authenticate('local',(err,user,info)=>
  {
    if(err)
    {
      return next(err);
    }
    if(!user)
    {
      req.flash('error',info.message);
      return res.redirect('/admin/signin');
    }
    req.logIn(user,(err)=>
    {
      if(err)
      {
        return next(err);
      }
      if(user.compstate==null||user.compaddress==null||user.complocation==null||user.compcategory==null)
      {
        return res.redirect('/admin/AddDetails');
      }
      else
      {
        return res.redirect('/admin');
      }
    })

  })(req,res,next);
});

router.post('/signup',checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    let conn;
    try {
      conn = await dbpool.getConnection();
      const query = "INSERT INTO COMPANY (compregno, compname, compphone, compemail, comppassword) VALUES (?, ?, ?, ?, ?)";
      await conn.query(query, [Date.now().toString(), req.body.CompanyName, req.body.Phone, req.body.email, hashedPassword]);
      req.flash('success', 'Signup successful. Please Signin to continue');
      res.redirect('/admin/signin');
    } catch (err) {
        throw err;
    } finally {
        if (conn) conn.release(); //release to pool
    }
  }
  catch(e)
  {
    console.log(e);
    req.flash('error', 'Signup failed');
    res.redirect('/admin/signin');
  }

})

router.post('/AddDetails',checkAuthenticated,async (req,res)=>
{
  if(req.body['Birthday']==null && req.body['Wedding']==null && req.body['Baptism']==null && req.body['Funeral']==null && req.body['Holy Communion']==null && req.body['Festive Events']==null && req.body['Anniversary']==null)
  {
    req.flash('error', 'Please select atleast one category');
     return res.redirect('/admin/AddDetails');
  }
  let conn;
  try {
    conn = await dbpool.getConnection();
    const categories =['Birthday','Wedding','Baptism','Funeral','Holy Communion','Festive Events','Anniversary'];
    const checkedCategories= categories.filter(category => req.body[category]==='on');
    const strCategories=checkedCategories.join(', ');
    const query = "UPDATE COMPANY SET compstate=?, compaddress=?, complocation=?, compcategory=? WHERE compregno=?";
    console.log(req.body.state);
    await conn.query(query, [req.body.state, req.body.address, req.body.location,strCategories, req.user.compregno]);
    req.flash('success', 'Details added successfully');
    res.redirect('/admin');
  } catch (err) {
      throw err;
  } finally {
    if (conn) conn.release(); //release to pool
  }
})

router.post('/addImage',upload.single('image'),async (req,res)=>
{
  let conn;
  try
  {
    conn =await dbpool.getConnection();
    const qry="UPDATE COMPANY SET compimage=? WHERE compregno=?"
    const imagePath=req.file.path; //save the file path
    await conn.query(qry,[imagePath,req.user.compregno]);
    res.redirect('/admin');
  }
  catch(err){
    throw err;
  }
  finally
  {
    if(conn)
      conn.release;
  }
})

router.delete('/logout', (req, res) => {
  if (req.isAuthenticated()) {
    req.logout(function (err) {
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
