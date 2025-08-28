const mysql = require("mysql2/promise");

let connection = null;

async function setupDatabase() {
    // Database will be initialized when user logs in
    return null;
}

async function createConnection(username, password) {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3307,
      user: username,
      password: password,
      database: process.env.DB_DATABASE || "invoice",
    });
    return connection;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw new Error("Invalid Credentials or Database Unreachable");
  }
}


function getConnection() {
    return connection;
}

function closeConnection() {
    if (connection) {
        connection.end();
        connection = null;
    }
}

module.exports = { 
    setupDatabase, 
    createConnection, 
    getConnection, 
    closeConnection 
};