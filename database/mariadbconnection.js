const mariadb = require('mariadb');

// Create a pool of database connections
const mariadbpool = mariadb.createPool({
  host: 'localhost',
  user: 'vimal',
  password: 'admin@123',
  database: 'eventuate',
  connectionLimit: 5, // Adjust the number of connections as needed
});

module.exports = mariadbpool;