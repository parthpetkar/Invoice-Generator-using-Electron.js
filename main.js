const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
const { prependListener } = require('process');
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

ipcMain.on('insertMilestone', async (event, data) => {    
    const { rowDataArray, projectData } = data;
    console.log(rowDataArray, projectData);
    var c_name = projectData.customerName;

    try {
        const [result] = await connection.execute(`SELECT cin FROM customers where company_name = '${c_name}'`);
        const cin = result[0].cin;
        console.log(cin);

        rowDataArray.forEach(rowData => {
            const { milestone, claimPercentage, amount } = rowData;
            const query = `INSERT INTO milestones (cin, pono, milestone_name, claim_percent, amount) VALUES (?, ?, ?, ?, ?)`;
            connection.query(query, [cin, projectData.poNo, milestone, claimPercentage, amount], (error, results, fields) => {
                if (error) throw error;
                console.log('Inserted row:', results.insertId);
            });
        });

    } catch (error) {
        console.error('Error inserting project data:', error);
    }

    // const [cin, pono] = await connection.execute('SELECT cin, pono FROM projects');
    // rowDataArray.forEach(rowData => {
    //     const { milestone, claimPercentage, amount } = rowData;
    //     const query = `INSERT INTO milestones (milestone_name, claim_percentage, amount) VALUES (?, ?, ?)`;
    //     connection.query(query, [milestone, claimPercentage, amount], (error, results, fields) => {
    //         if (error) throw error;
    //         console.log('Inserted row:', results.insertId);
    //     });
    // });
})

ipcMain.on('createProject', async (event, data) => {
    const { projectData } = data;
    console.log(projectData);
    var c_name = projectData.customerName;
    
    try {

        const [result] = await connection.execute(`SELECT cin FROM customers where company_name = '${c_name}'`);
        const cin = result[0].cin;
        console.log(cin);

        const insertProjectQuery = `
          INSERT INTO projects (cin, pono, total_prices, taxes, project_name)
          VALUES (?, ?, ?, ?, ?)
        `;
        await connection.query(insertProjectQuery, [
            cin,
            projectData.poNo,
            projectData.totalPrice,
            projectData.taxTypes[0], // Assuming taxTypes is an array and you want to insert the first element
            projectData.projectName,
        ]);

        console.log('Data inserted successfully');
        
    } catch (error) {
        console.error('Error inserting project data:', error);
    }
})

ipcMain.on('createCustomer', async (event, data) => {
    const { customerData } = data;
    console.log(customerData);
    try {
        // const connection = await mysql.createConnection({
        //     host: process.env.DB_HOST,
        //     user: process.env.DB_USER,
        //     password: process.env.DB_PASSWORD,
        //     database: process.env.DB_DATABASE
        // });

        // Insert into customers table
        const insertCustomerQuery = `
          INSERT INTO customers (company_name, address, phone, gstin, pan, cin)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.query(insertCustomerQuery, [
          customerData.companyName,
          customerData.address,
          customerData.phone,
          customerData.gstin,
          customerData.pan,
          customerData.cin,
        ]);
    
        console.log('Data inserted successfully');
      } catch (error) {
        console.error('Error inserting data:', error);
      }

    //   // Close the connection after inserting data
    //   if (connection) {
    //     connection.end();
    //   }


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
        const [company_name ] = await connection.execute('SELECT company_name FROM customers');
        return { company_name };
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
