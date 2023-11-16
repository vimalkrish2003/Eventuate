const LocalStrategy=require('passport-local').Strategy;
const passport=require('passport');
const bcrypt=require('bcrypt');
const { get } = require('./admin');

function initializePassport(passport,getUserByEmail,getUserById)
{
  passport.use(new LocalStrategy({usernameField:'email'},async (email,password,done)=>
  {
    const user=getUserByEmail(email);
    if(user==null)
    {
      return done(null,false,{message:'No user with that email'});
    }
    try
    {
      if(await bcrypt.compare(password,user.password))
      {
        return done(null,user);
      }
      else
      {
        return done(null,false,{message:'Password Incorrect'});

      }
    }
    catch(e)
    {
      return done(e);
    }
  
  }))

  passport.serializeUser((user,done)=>
  {
    return done(null,user.id);
  })
  passport.deserializeUser((id,done)=>
  {
    return done(null,getUserById(id));
  })
}


module.exports=initializePassport;