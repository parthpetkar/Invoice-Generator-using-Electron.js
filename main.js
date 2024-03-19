const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mysql = require('mysql2');

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

// Establish MySQL connection
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'sanjayP@37',
    database: 'invoiceDB'
});

connection.connect();

// Listen for saveToDatabase event from renderer process
ipcMain.on('createCustomer', (event, data) => {
    const { name, address, phone, gstin, pan } = data;

    //console.log(name, address);
    //Perform database query
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

// Close database connection when app is quit
app.on('quit', () => {
    connection.end();
});
