const mysql = require('mysql2/promise');

const db= mysql.createPool({
     host: 'localhost',
     user: 'event',
     password: 'event@123',
     database: 'eventuate',
     waitForConnections:true,
     connectionLimit:10,
     queueLimit:0
   });
   
module.exports=db;

