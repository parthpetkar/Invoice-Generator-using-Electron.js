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
            preload: path.join(__dirname, 'Backend/preload.js')
        }
    });

    win.loadFile('public/index.html');
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
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE
        });
    } catch (error) { // Added error parameter
        console.error('Error connecting to database:', error); // Corrected log message and added error parameter
    }
}

// Call connectToDB function when app is ready
app.whenReady().then(connectToDB);

ipcMain.on('createCustomer', (event, data) => {
    const { company_name, address, phone, gstin, pan, cin, poNo, total_price } = data;
    connection.query('INSERT INTO customers (company_name, address, phone, gstin, pan, cin, pono, total_price) VALUES (?, ?, ?, ?, ?, ?, ?,?)', [company_name, address, phone, gstin, pan, cin, poNo, total_price], function (error) {
        if (error) {
            console.error(error);
            event.reply('saveToDatabaseResult', { success: false, error: error.message });
        } else {
            console.log('Data saved successfully');
            event.reply('saveToDatabaseResult', { success: true });
        }
    })
});

ipcMain.handle('fetchData', async (event) => {
    try {
        const [customer_rows] = await connection.execute('SELECT * FROM customers');
        const [milestone_rows] = await connection.execute('SELECT * FROM milestones');
        return { customers: customer_rows, milestones: milestone_rows };
    } catch (error) {
        console.error('Error fetching data from database:', error);
    }
});

ipcMain.on('insertmilestone', (event, data) => {
    const { rowDataArray, poNo } = data;

    // Use a counter to track the number of successful inserts
    let successfulInserts = 0;

    rowDataArray.forEach(function (rowData) {
        console.log(rowData.milestone, rowData.claimPercentage, rowData.amount);
        connection.query('INSERT INTO milestones (pono, milestonename, claim_percent, amount) VALUES (?, ?, ?, ?)', [poNo, rowData.milestone, rowData.claimPercentage, rowData.amount], function (error) {
            if (error) {
                console.error(error);
                event.reply('saveToDatabaseResult', { success: false, error: error.message });
            } else {
                console.log('Data saved successfully');
                successfulInserts++;
                if (successfulInserts === rowDataArray.length) {
                    // Reply with success message once all inserts are done
                    event.reply('saveToDatabaseResult', { success: true });
                }
            }
        });
    });
});

// Close database connection when app is quit
app.on('quit', () => {
    if (connection) { // Check if connection exists before trying to end it
        connection.end();
    }
});
