var express = require('express');
var router = express.Router();
const db = require('../database/connection');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const noCache = require('nocache');
const secretKey = 'key-key';
const tokengenerator = require('token-generator')({
  salt: 'secret-key',
  timestampMap: 'abcdefghij',
});
const multer= require('multer');
const path = require('path');
const fs = require('fs').promises;
const moment = require('moment');
const fsa = require('fs');
const mime = require('mime-types');





//multer setup
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadFolder = path.join(__dirname, '..', 'database', 'images'); // Path to the images folder in the database directory

       // Log the uploadFolder value for debugging
    console.log('uploadFolder:', uploadFolder);
    
    // Create the 'images' folder if it doesn't exist
    try {
      await fs.mkdir(uploadFolder, { recursive: true });
    } catch (err) {
      console.error('Error creating images folder:', err);
    }

    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage: storage });








/* Listed All the GET methods here */

// Routing to intro page
router.get('/', function (req, res) {
  if (req.session.user) {
    res.redirect('/home');
  } else {
    res.render('users/intro');
  }
})

const noCacheMiddleware = noCache();

// Routing to home page
router.get('/home', noCacheMiddleware, async function (req, res) {
  const user = req.session.user;

  if (!user) {
    // If the user is not logged in, redirect to the login page
    return res.redirect('/login');
  }

  // Check if the user exists in the USERDETAILS table
  try {
    const [userData] = await db.execute('SELECT email FROM USERDETAILS WHERE email = ?', [user.email]);

    if (userData.length === 0) {
      // User doesn't exist in the database, redirect to login
      return res.redirect('/login');
    }
    
// Fetch data from the COMPANY table
const [companyData] = await db.execute('SELECT * FROM COMPANY');
let companiesWithImages = [];

for (const company of companyData) {
  const imagePath = company.compimage;
  let base64Image = null;

  if (imagePath != null) {
    try {
      const imageFile = fsa.readFileSync(imagePath);
      const mimeType = mime.lookup(imagePath);
      base64Image = `data:${mimeType};base64,` + Buffer.from(imageFile).toString('base64');
    } catch (error) {
      console.error('Error reading or processing image:', error);
    }
  }

  companiesWithImages.push({ ...company, image: base64Image });
}

res.render('users/home', { user, company: companiesWithImages });

  } catch (error) {
    console.error('Error checking user existence:', error);
    res.status(500).json({ error: 'Server error' });
  }
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
  
if(req.session.user){
  res.redirect('/home')
}else{
  
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
  }}
});

// Adding user details to the database
router.get('/signupsuccess/:token', async function (req, res) {
  if (req.session.user) {
    res.redirect('/home');
  } else {
    const token = req.params.token;

    try {
      // Find the email associated with the token
      const [tokenData] = await db.execute('SELECT email FROM TOKENS WHERE token = ?', [token]);

      if (tokenData.length === 0) {
        // Token not found
        return res.redirect('/login'); // Redirect to the login page
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
        const hashedPassword = await bcrypt.hash(Password, 10);

        db.execute('INSERT INTO USERDETAILS (name, phone, address, email, password) VALUES (?, ?, ?, ?, ?)',
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
  }
});

//get method for logout
router.get('/logout', function (req, res) {
  // Destroy the session to log the user out
  req.session.destroy(function(err) {
    if (err) {
      console.error('Error destroying session:', err);
    }else{
    // Redirect the user to the login page or any other desired page after logout
    console.log('session destroyed successfully')
    res.redirect('/login');
    }
  });
});

//sample router to upload images(should be deleted after admin side setup)
router.get('/upload',function(req,res){
  res.render('users/sampleimage.hbs')
});
router.get('/bookinghistory', async function (req, res) {
  const user = req.session.user;

  if (!req.session.user) {
    // If the user is not logged in, redirect to the login page
    return res.redirect('/login');
  } else {
    try {
      // Fetch user details
      const [userData] = await db.execute('SELECT * FROM USERDETAILS WHERE email = ?', [user.email]);

      // Fetch all bookings for the user with inner join to get company details
      const [allBookings] = await db.execute(`
        SELECT BOOKINGS.*, COMPANY.*
        FROM BOOKINGS
        INNER JOIN COMPANY ON BOOKINGS.compregno = COMPANY.compregno
        WHERE BOOKINGS.email = ?
      `, [user.email]);

      if (userData.length === 0 || allBookings.length === 0) {
        // Handle the case where no data is found
        return res.status(404).json({ error: 'Data not found' });
      }

      // Process the bookings data
      const processedBookings = allBookings.map((booking) => {
        const bookingStatusText = getBookingStatusText(booking.bookingstatus);
        const bookingStatusImage = getBookingStatusImage(booking.bookingstatus);

        const formattedStartDate = moment(booking.startdate).format('YYYY-MM-DD');
    const formattedEndDate = moment(booking.enddate).format('YYYY-MM-DD');
        return { ...booking, bookingStatusText, bookingStatusImage, formattedStartDate,
          formattedEndDate };
      });

      res.render('users/bookinghistory', { bookings: processedBookings, user: userData[0] });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Helper function to get booking status text
function getBookingStatusText(status) {
  switch (status) {
    case 1:
      return 'Booking Approved';
    case -1:
      return 'Booking Rejected';
    default:
      return 'Booking Pending';
  }
}

// Helper function to get booking status image URL
function getBookingStatusImage(status) {
  switch (status) {
    case 1:
      return '/css/login/check.png';
    case -1:
      return '/css/login/cancel.png';
    default:
      return '/css/login/clock.png';
  }
}
























































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
    await db.execute('INSERT INTO TOKENS(email, token, timestamp) VALUES (?, ?, ?)', [email, token, Date.now()]);
    
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
   
    res.render('users/login', {success});
    

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//sample post method for image upload(should be deleted)
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const imageUrl = `/database/images/${req.file.filename}`;

    // Assuming you have a companyId in the request body, change it accordingly
    const compname = req.body.compname;

    // Update the COMPIMAGE column in the COMPANY table
    const updateQuery = 'UPDATE COMPANY SET compimage = ? WHERE compname = ?';
    await db.query(updateQuery, [imageUrl, compname]);

    res.json({ message: 'Image uploaded successfully!', imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



//post method for booking
router.post('/booking', async function (req, res) {
  const user = req.session.user;
  console.log(user)

  if (!req.session.user) {
    // If the user is not logged in, redirect to the login page
    return res.redirect('/login');
  }else{

  try {
    const compregno = req.body.compregno;
    console.log(compregno)

    // Fetch user details
    const [userData] = await db.execute('SELECT * FROM USERDETAILS WHERE email = ?', [user.email]);

    // Fetch company details
    const [companyData] = await db.execute('SELECT * FROM COMPANY WHERE compregno = ?', [compregno]);

    if (userData.length === 0 || companyData.length === 0) {
      // Handle the case where no data is found
      return res.status(404).json({ error: 'Data not found' });
    }

    const imagePath=companyData[0].compimage;
      let base64Image=null;
      if (imagePath != null) {
        try {
          const imageFile=fsa.readFileSync(imagePath);
      const fileType = await import('file-type');
      const mime = await fileType.fileTypeFromBuffer(imageFile);
      base64Image = `data:${mime.mime};base64,` + Buffer.from(imageFile).toString('base64');
        } catch (error) {
          console.error('Error reading or processing image:', error);
        }
      }
      

    // Pass the retrieved data to the booking view
    res.render('users/booking', { user: userData[0], company: companyData[0],image:base64Image });

  } catch (error) {
    console.error('Error fetching booking page:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
});

//Retrieve the booking details and insert them into the database table
router.post('/bookingform',async function(req,res){
  const user=req.session.user;
  if(req.session.user){
    try{
      const fname=req.body.fname;
      const lname=req.body.lname;
      const category=req.body.category;
      const startingdate=req.body.startingdate;
      const endingdate=req.body.endingdate;
      const startingtime=req.body.startingtime;
      const endingtime=req.body.endingtime;
      const address=req.body.address;
      const compregno=req.body.compregno;
      

      if (!fname|| !lname || !category|| !startingdate || !endingdate || !startingtime|| !endingtime || !address || !compregno ) {

      
        // Render the booking page with an error message
        const [userData] = await db.execute('SELECT * FROM USERDETAILS WHERE email = ?', [user.email]);
      
    // Fetch company details
    const [companyData] = await db.execute('SELECT * FROM COMPANY WHERE compregno = ?', [compregno]);

    if (userData.length === 0 || companyData.length === 0) {
      // Handle the case where no data is found
      return res.status(404).json({ error: 'Data not found' });
    }
        const errorMessage = 'Please fill in all fields!!';
        return res.render('users/booking', { errorMessage,user: userData[0], company: companyData[0] });
      }else{

      await db.execute('INSERT INTO BOOKINGS(compregno, email, bookingcategory, startdate, enddate, starttime, endtime, firstname, lastname, bookingaddress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [compregno, user.email, category, startingdate, endingdate, startingtime, endingtime, fname, lname, address]);
    
      const [bookingData] = await db.execute('SELECT * FROM BOOKINGS WHERE email = ?', [user.email]);
    
      // Fetch user details
    const [userData] = await db.execute('SELECT * FROM USERDETAILS WHERE email = ?', [user.email]);

    // Fetch company details
    const [companyData] = await db.execute('SELECT * FROM COMPANY WHERE compregno = ?', [compregno]);

    if (userData.length === 0 || companyData.length === 0 || bookingData.length===0 ) {
      // Handle the case where no data is found
      return res.status(404).json({ error: 'Data not found' });
    }

     // Format date strings
     const formattedStartDate = bookingData[0].startdate.toLocaleDateString();
     const formattedEndDate = bookingData[0].enddate.toLocaleDateString();

       // Create a new object with formatted dates
    const formattedBookingData = {
      ...bookingData[0],
      startdate: formattedStartDate,
      enddate: formattedEndDate,
    };


     res.render('users/bookingstatus', {
      user: userData[0],
      company: companyData[0],
      booking: formattedBookingData,
    });
    
  }
    } catch (error) {
    console.error('Error fetching booking data:', error);
    res.status(500).json({ error: 'Server error' });
  }
}else{
  res.redirect('/login');
}
})




module.exports = router;













































































































































// Function to confirm email during signup
async function confirmationEmail(email, token) {
  const transporter = await nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'eventuate80@gmail.com',
      pass: 'vpkf udcs rdpr zzvj',
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
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'eventuate80@gmail.com',
      pass: 'vpkf udcs rdpr zzvj',
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
};

//routes code after reaching the home page


module.exports = router;
