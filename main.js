const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

let connection; // Declare connection variable outside the function scope

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

async function connectToDB() { // Corrected function name and async keyword
    try {
        connection = await mysql.createConnection({ // Assign connection to the global variable
            host: 'localhost',
            user: 'root',
            password: 'parthYM8',
            database: 'invoicedb'
        });

        console.log('Connected to database successfully.'); // Corrected log message
    } catch (error) { // Added error parameter
        console.error('Error connecting to database:', error); // Corrected log message and added error parameter
    }
}

// Call connectToDB function when app is ready
app.whenReady().then(connectToDB);

ipcMain.on('createCustomer', (event, data) => {
    const { name, address, phone, gstin, pan } = data;
    connection.query('INSERT INTO customers (company_name, address, phone, gstin, pan) VALUES (?, ?, ?, ?, ?)', [name, address, phone, gstin, pan], function (error, results, fields) {
        if (error) {
            console.error(error);
            event.reply('saveToDatabaseResult', { success: false, error: error.message });
        } else {
            console.log('Data saved successfully');
            event.reply('saveToDatabaseResult', { success: true });
        }
    })
});

ipcMain.handle('fetchData', async () => {
    try {
        const [rows] = await connection.execute('SELECT * FROM customers');
        return rows;
    } catch (error) {
        console.error('Error fetching data from database:', error);
    }
});

// Close database connection when app is quit
app.on('quit', () => {
    if (connection) { // Check if connection exists before trying to end it
        connection.end();
    }
});
