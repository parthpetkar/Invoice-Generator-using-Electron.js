const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

let connection;

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
    const { customerData, projectsData } = data;

    // Extract customer data
    const { companyName, address, phone, gstin, pan, cin } = customerData;

    // Insert customer data into 'customers' table
    connection.query('INSERT INTO customers (company_name, address, phone, gstin, pan, cin) VALUES (?, ?, ?, ?, ?, ?)',
        [companyName, address, phone, gstin, pan, cin], (error) => {
            if (error) {
                console.error('Error saving customer data:', error);
                event.reply('saveToDatabaseResult', { success: false, error: error.message });
            } else {
                console.log('Customer data saved successfully');

                // If projects data is provided, insert projects and milestones
                if (projectsData && projectsData.length > 0) {
                    const projectInsertQuery = 'INSERT INTO projects (cin, pono, total_prices, taxes, project_name) VALUES (?, ?, ?, ?, ?)';
                    const milestoneInsertQuery = 'INSERT INTO milestones (cin, pono, milestone_name, claim_percent, amount) VALUES (?, ?, ?, ?, ?)';

                    // Use a transaction to ensure all queries are executed or none
                    connection.beginTransaction((err) => {
                        if (err) {
                            console.error('Error starting transaction:', err);
                            event.reply('saveToDatabaseResult', { success: false, error: err.message });
                            return;
                        }

                        // Insert each project and its milestones
                        projectsData.forEach((project) => {
                            const { projectName, poNo, totalPrice, taxes, milestones } = projectsData;

                            connection.query(projectInsertQuery, [cin, poNo, totalPrice, taxes, projectName], (error, result) => {
                                if (error) {
                                    connection.rollback(() => {
                                        console.error('Error saving project data:', error);
                                        event.reply('saveToDatabaseResult', { success: false, error: error.message });
                                    });
                                    return;
                                }

                                console.log('Project data saved successfully');

                                // If milestones data is provided, insert milestones
                                if (milestones && milestones.length > 0) {
                                    milestones.forEach((milestone) => {
                                        const { milestoneName, claimPercent, amount } = milestone;
                                        connection.query(milestoneInsertQuery, [cin, poNo, milestoneName, claimPercent, amount], (error) => {
                                            if (error) {
                                                connection.rollback(() => {
                                                    console.error('Error saving milestone data:', error);
                                                    event.reply('saveToDatabaseResult', { success: false, error: error.message });
                                                });
                                                return;
                                            }
                                            console.log('Milestone data saved successfully');
                                        });
                                    });
                                }
                            });
                        });

                        // Commit the transaction if all queries succeed
                        connection.commit((err) => {
                            if (err) {
                                connection.rollback(() => {
                                    console.error('Error committing transaction:', err);
                                    event.reply('saveToDatabaseResult', { success: false, error: err.message });
                                });
                            } else {
                                console.log('Transaction committed');
                                event.reply('saveToDatabaseResult', { success: true });
                            }
                        });
                    });
            } else {
                    // Send success message back to renderer process if no projects data is provided
                    event.reply('saveToDatabaseResult', { success: true });
                }
            }
    });
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

ipcMain.handle('fetchCustomer', async (event) => {
    try {
        const [company_name, cin] = await connection.execute('SELECT company_name, cin FROM customers');
        return { company_name, cin };
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
