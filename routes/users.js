var express = require('express');
var router = express.Router();
const db = require('../database/connection');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const secretKey = 'key-key';
const tokengenerator = require('token-generator')({
  salt: 'secret-key',
  timestampMap: 'abcdefghij',
});

/* Listed All the GET methods here */

// Routing to intro page
router.get('/', function (req, res) {
  if (req.session.user) {
    res.redirect('/home');
  } else {
    res.render('users/intro');
  }
})

// Routing to home page
router.get('/home', async function (req, res) {
  const user = await req.session.user;
  if (!user) {
    return res.redirect('/login'); // Redirect to login if the user is not logged in
  }
  console.log(req.session.id)
  console.log(user);
  res.render('users/home', { user }); // Pass user data to the template
});

// Routing to login page
router.get('/login', function (req, res) {
  if (req.session.user) {
    // If the user is already logged in, redirect them to the home page
    return res.redirect('/home');
  }
  // If there is no active session, render the login page and disable caching
  res.header('Cache-Control', 'no-store');
  res.render('users/login');
});


// Routing to password update form
router.get('/pwupdate', function (req, res) {
  res.render('users/pwupdate');
});

// Routing to set a new password when clicking the confirmation link in the mail
router.get('/confirmpwupdate/:token', async function (req, res) {
  const token = req.params.token;
  const currentTime = Date.now();

  try {
    // Check if the token exists and is still valid (e.g., within a certain time limit)
    const [tokenData] = await db.execute('SELECT * FROM TOKENS WHERE token = ? AND timestamp >= ?', [token, currentTime - 3600000]);

    if (tokenData.length === 0) {
      // Token not found or expired
      return res.render('users/pwupdate', { error: 'Invalid or expired token' });
    }

    res.render('users/confirmpwupdate', { token });
  } catch (error) {
    console.error('Error redirecting to set a new password', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Adding user details to the database
router.get('/signupsuccess/:token', async function (req, res) {
  const token = req.params.token;

  try {
    // Find the email associated with the token
    const [tokenData] = await db.execute('SELECT email FROM TOKENS WHERE token = ?', [token]);

    if (tokenData.length === 0) {
      // Token not found
      const errorMessage = 'Signup failed';
      return res.render('users/login', { errorMessage });
    }

    const email = tokenData[0].email;

    // Verify and decode the token using your secret key
    jwt.verify(token, secretKey, async (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      // Now you can access user details from the decoded token
      const userDetails = decoded;

      // Insert user details into the USERDETAILS table
      const { name, phone, address, Password } = userDetails;
      console.log(phone);
      const hashedPassword = await bcrypt.hash(Password, 10);

      db.execute('INSERT INTO USERDETAILS (name, phone, address, email,password) VALUES (?, ?, ?, ?,?)',
        [name, phone, address, email, hashedPassword])
        .then(() => {
          // Delete the used token from the database
          return db.execute('DELETE FROM TOKENS WHERE token = ?', [token]);
        })
        .then(() => {
          // Redirect to a success page or perform any other desired action
          const success = 'Signup success';
          res.render('users/login', { success });
        })
        .catch((error) => {
          console.error('Error adding user details:', error);
          res.status(500).json({ error: 'Server error' });
        });
    });
  } catch (error) {
    console.error('Error in signup success route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Listed All the POST methods here */

// Posting signup form
router.post('/signup', async function (req, res) {
  try {
    const Name = req.body.Name;
    const Phone = req.body.Phone;
    const Address = req.body.Address;
    const Email = req.body.Email;
    const Password = req.body.Password;

    // Check if any of the fields are empty
    if (!Name || !Phone || !Address || !Email || !Password) {
      // Redirect to the signup page with an error message
      const errorMessage = 'Please fill in all fields!!'; // Define the error message
      return res.render('users/login', { errorMessage }); // Render the login page with the error message
    }

    // Check if the email already exists in the database
    const [existingUser] = await db.execute('SELECT * FROM USERDETAILS WHERE email = ?', [Email]);

    if (existingUser.length > 0) {
      // Email already exists, show a user exist status
      const errorMessage = 'User with this email already exists!!'; // Define the error message
      return res.render('users/login', { errorMessage }); // Render the login page with the error message
    }

    const userPayload = {
      name: Name,
      phone: Phone,
      address: Address,
      Password: Password, // You can omit this if you don't need it in the token
    };

    // Generate a unique token
    const token = jwt.sign(userPayload, secretKey, { expiresIn: '1h' });

    // Store the token in the database along with the user's email and a timestamp
    await db.execute('INSERT INTO TOKENS(email, token, timestamp) VALUES (?, ?, ?)', [Email, token, Date.now()]);
    // Send an email to the user with a link to confirm the email
    confirmationEmail(Email, token);
    const success = 'Please check your email for confirmation';
    res.render('users/login', { success }); // Render a success message

  } catch (error) {
    console.error('Error inserting data', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Posting signin form
router.post('/signin', async function (req, res) {
  try {
    const loginEmail = req.body.Email;
    const loginPassword = req.body.Password;

    // Check if any of the fields are empty
    if (!loginEmail || !loginPassword) {
      const errorMessage = 'Please fill in all fields!!';
      return res.render('users/login', { errorMessage });
    }

    const [userdata] = await db.execute('SELECT name, email, password FROM USERDETAILS WHERE email=?', [loginEmail]);

    if (userdata.length === 0) {
      // User not found, handle this case as needed
      const errorMessage = 'User not found or incorrect password!!';
      return res.render('users/login', { errorMessage });
    }
    
    const user = {
      name: userdata[0].name,
      email: userdata[0].email,
    };

    const status = await bcrypt.compare(loginPassword, userdata[0].password);
    
    if (!status) {
      const errorMessage = 'Incorrect Password';
      return res.render('users/login', { errorMessage });
    }

    if (status) {
      console.log('User logged in successfully');
      req.session.loggedIn = true;
      req.session.user = user;
      res.redirect('/home');
    } else {
      console.log('Sign in failed');
      res.redirect('/login?error=Incorrect password');
    }
  } catch (error) {
    console.error('Error inserting data', error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/pwupdate', async function (req, res) {
  try {
    const email = req.body.Email;
    const [userdata] = await db.execute('SELECT * FROM USERDETAILS WHERE email=?', [email]);
    
    if (userdata.length === 0) {
      const errorMessage = 'User not found';
      return res.render('users/pwupdate', { errorMessage });
    }

    // Generate a unique token
    const token = tokengenerator.generate();
    
    // Store the token in the database along with the user's email and a timestamp
    await db.execute('INSERT INTO TOKENS(email, token, timestamp) VALUES (?, ?, ?)', [email, token, Date.now]);
    
    // Send an email to the user with a link to reset the password
    sendPasswordResetEmail(email, token);
    
    // Render a success message or redirect to a confirmation page
    const success = 'Confirmation mail sent to your email';
    res.render('users/pwupdate', { success });

  } catch (error) {
    console.error('Error resetting password', error);
    res.status(500).json({ error: 'server error' });
  }
});

// Posting new password
router.post('/confirmpwupdate/:token', async (req, res) => {
  const token = req.params.token;
  const Password = req.body.Password;

  try {
    if (!Password) {
      const errorMessage = 'Password should not be null';
      return res.render('users/confirmpwupdate', { errorMessage, token });
    }
    // Find the email associated with the token
    const [tokenData] = await db.execute('SELECT email FROM TOKENS WHERE token = ?', [token]);

    if (tokenData.length === 0) {
      // Token not found
      return res.render('users/pwupdate', { error: 'Invalid token' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(Password, 10);
    
    // Update the user's password in the database
    await db.execute('UPDATE USERDETAILS SET password = ? WHERE email = ?', [hashedPassword, tokenData[0].email]);
    // Delete the used token from the database
    await db.execute('DELETE FROM TOKENS WHERE token = ?', [token]);
    // Render a success message or redirect to a login page
    const success = 'Password reset successfully';
    res.render('users/login', { success });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/logout', function (req, res) {
  // Destroy the session to log the user out
  req.session.destroy(function(err) {
    if (err) {
      console.error('Error destroying session:', err);
    }
    // Redirect the user to the login page or any other desired page after logout
    res.redirect('/login');
  });
});

module.exports = router;

// Function to confirm email during signup
async function confirmationEmail(email, token) {
  const transporter = await nodemailer.createTransport({
    host: 'smtp.elasticemail.com',
    port: 2525,
    auth: {
      user: 'eventuate80@gmail.com',
      pass: 'AEF77F1296E2077DD72336D86CF749D17BB6',
    },
  });

  const mailOptions = {
    from: 'eventuate80@gmail.com',
    to: email,
    subject: 'EVENTUATE Email Verification',
    text: `Hey user,\nTo confirm your email and complete signup, please click on the following link:\nhttp://localhost:4000/signupsuccess/${token}`,
  };

  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Confirmation email sent:', info.response);
    }
  });
}

// Function to send a password reset email

async function sendPasswordResetEmail(email, token) {
  const transporter = await nodemailer.createTransport({
    host: 'smtp.elasticemail.com',
    port: 2525,
    auth: {
      user: 'eventuate80@gmail.com',
      pass: 'AEF77F1296E2077DD72336D86CF749D17BB6',
    },
  });

  const mailOptions = {
    from: 'eventuate80@gmail.com',
    to: email,
    subject: 'EVENTUATE Password Reset',
    text: `Hey user,\nTo reset your password, click on the following link:\nhttp://localhost:4000/confirmpwupdate/${token}`,
  };

  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Password reset email sent:', info.response);
    }
  });
}

module.exports = router;
