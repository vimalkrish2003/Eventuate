const LocalStrategy = require('passport-local').Strategy;
const passport = require('passport');
const bcrypt = require('bcrypt');
const dbpool = require('../database/mariadbconnection');
const { get } = require('./admin');

function initializePassport(passport, getUserByEmail) {
  passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    const user = await getUserByEmail(email);
    if (user == null) {
      return done(null, false, { message: 'No user with that email' });
    }
    try {
      if (await bcrypt.compare(password, user.comppassword)) {
        return done(null, user);
      }
      else {
        return done(null, false, { message: 'Password Incorrect' });

      }
    }
    catch (e) {
      return done(e);
    }

  }))

  passport.serializeUser((user, done) => {
    return done(null, user.compregno);
  })
  passport.deserializeUser(async (compregno, done) => {
    let conn;
    try {
      conn = await dbpool.getConnection();
      const rows = await conn.query("SELECT * FROM COMPANY WHERE compregno = ?", [compregno]);
      return done(null, rows[0]); // return the first row
    } catch (err) {
      return done(err);
    } finally {
      if (conn) conn.release(); //release to pool
    }
  })
}


module.exports = initializePassport;