const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const mysql = require("mysql2/promise");
const { prependListener } = require("process");
const fs = require("fs");
const ExcelJS = require("exceljs");
const { shell } = require('electron');	
require("dotenv").config();

let connection;
let win;
function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, "Backend/preload.js"),
        },
    });

    win.loadFile("public/index.html");
    win.maximize();
}
if (require('electron-squirrel-startup')) app.quit();

// app.setAccessibilitySupportEnabled(enabled);
app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

async function connectToDB() {
    // Corrected function name and async keyword
    try {
        connection = await mysql.createConnection({
        // Assign connection to the global variable
            host: "localhost",
            user: "test",
            password: "sanjayP@37",
            database: "invoice",
        });
    } catch (error) {
        console.error("Error connecting to database:", error); // Corrected log message and added error parameter
    }
}

// Call connectToDB function when app is ready
app.whenReady().then(connectToDB);

ipcMain.on("insertMilestone", async (event, data) => {
    const { rowDataArray, projectData } = data;
    var c_name = projectData.customerName;

    try {
        const [result] = await connection.execute(
            `SELECT cin FROM customers where company_name = '${c_name}'`
        );
        const cin = result[0].cin;

        rowDataArray.forEach((rowData) => {
            const { milestone, claimPercentage, amount } = rowData;
            const query = `INSERT INTO milestones (cin, pono, milestone_name, claim_percent, amount) VALUES (?, ?, ?, ?, ?)`;
            connection.query(
                query,
                [cin, projectData.poNo, milestone, claimPercentage, amount],
                (error, results, fields) => {
                    if (error) throw error;
                }
            );
        });
        win.reload()
    } catch (error) {
        console.error("Error inserting project data:", error);
    }
});

ipcMain.on("createProject", async (event, data) => {
    const { projectData } = data;
    var c_name = projectData.customerName;

    try {
        const [result] = await connection.execute(
            `SELECT cin FROM customers where company_name = '${c_name}'`
        );
        const cin = result[0].cin;

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
        console.log("Data inserted successfully");
    } catch (error) {
        console.error("Error inserting project data:", error);
    }
});

ipcMain.on("createCustomer", async (event, data) => {
    const { customerData } = data;
    try {
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
        win.reload()
        console.log("Data inserted successfully");
    } catch (error) {
        console.error("Error inserting data:", error);
    }
});

ipcMain.on("createInvoice", async (event, data) => {
    const invoiceData = data.invoiceData; // Accessing the 'invoiceData' property

    // Extract formData and milestones from invoiceData
    const { formData, milestones } = invoiceData; 
    // Inserting data into Invoices table
    milestones.forEach(async (milestone) => {
        try {
            await connection.query(`
                INSERT INTO Invoices (cin, pono, company_name, project_name, invoice_number, invoice_date, due_date, taxes_excluded, total_prices, milestone_name, remaining_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                milestone.cin,
                milestone.pono,
                formData.customer,
                formData.project,
                formData.invoiceNumber,
                formData.invoiceDate,
                formData.dueDate,
                milestone.amount,  // Taxes excluded (set to null for now)
                milestone.amount,  // Total prices (set to null for now)
                milestone.milestone_name,
                calculateRemainingAmount(milestone)
            ]); 
            win.reload()
            console.log("Data inserted successfully");
        } catch (error) {
            console.error("Error inserting data:", error);
        }

    })

    function calculateRemainingAmount(milestone) {
        // Extract the total amount and total paid amount directly from the milestone object
        const totalAmount = parseFloat(milestone.total_prices);
        const totalPaidAmount = parseFloat(milestone.amount);

        // Calculate the remaining amount
        const remainingAmount = totalAmount - totalPaidAmount;

        return remainingAmount;
    }
});

ipcMain.on("createForm", async (event, data) => {
    //sending data to excel
    const invoiceData = data.invoiceData;
    const { formData, milestones } = invoiceData;
    const [rowforcin] = await connection.execute('select cin from invoices where invoice_number = ?', [formData.invoiceNumber]);
    const cin = rowforcin[0].cin;
    const [customerDetails] = await connection.execute('select company_name, address, phone, gstin, pan from customers where cin = ?', [cin]);
    const address = customerDetails[0].address;
    const phone = customerDetails[0].phone;
    const gstin = customerDetails[0].gstin;
    const pan = customerDetails[0].pan;
    const company_name = customerDetails[0].company_name;

    const pono = milestones[0].pono;
    const total_price = milestones[0].total_prices;
    
    // console.log(typeof (Number(milestones[0].amount)));

    const workbook = new ExcelJS.Workbook();
    var fileName;
    workbook.xlsx
        .readFile("IEC_Invoice_template.xlsx")
        .then(() => {
            const worksheet = workbook.getWorksheet("Invoice 2");
            if (worksheet) {
            // Update cell values with invoice data
                worksheet.getCell("A13").value = '  ' + company_name;
                worksheet.getCell("A14").value = '  ' + address;
                worksheet.getCell("A15").value = '  ' + phone;
                worksheet.getCell("A16").value = '  GST No.-' + gstin;
                worksheet.getCell("A17").value = '  PAN No.-' + pan;
                worksheet.getCell("C17").value = 'CIN No.- ' + cin;
                worksheet.getCell("A20").value = formData.description;
                worksheet.getCell("A22").value = ' PONo, : ' + pono;
                worksheet.getCell("C22").value = Number(total_price);
                worksheet.getCell("F4").value = formData.invoiceNumber;
                worksheet.getCell("F3").value = Date(formData.invoiceDate);
                worksheet.getCell("F5").value = Date(formData.dueDate);

                let row = 24;
                milestones.forEach((milestone) => {
                    worksheet.getCell(`A${row}`).value = '  ' + Number(milestone.milestone_name);
                    worksheet.getCell(`D${row}`).value = '  ' + Number(milestone.claim_percent);
                    worksheet.getCell(`F${row}`).value = '  ' + Number(milestone.amount);
                    row++; // Move to the next row for the next milestone
                });

                fileName = 'INV' + formData.invoiceNumber + '.xlsx';
                return workbook.xlsx.writeFile(`C:\\Users\\callo\\OneDrive\\Desktop\\${fileName}`);
            } else {
                throw new Error("Worksheet not found in the Excel file.");
            }
        })
        .then(() => {
            console.log("Invoice generated successfully!");
            shell.openPath(`C:\\Users\\callo\\OneDrive\\Desktop\\${fileName}`);
        })
        .catch((error) => {
            console.error(error);
        });
});


ipcMain.handle("fetchData", async (event) => {
    try {
        const [customer_rows] = await connection.execute("SELECT * FROM customers");
        const [milestone_rows] = await connection.execute(
            "SELECT * FROM milestones"
        );
        const [project_rows] = await connection.execute(
            "SELECT * FROM projects"
        );
        const [invoice_rows] = await connection.execute(
            "SELECT * FROM invoices"
        );
        return { customers: customer_rows, milestones: milestone_rows, projects: project_rows, invoices: invoice_rows };
    } catch (error) {
        console.error("Error fetching data from database:", error);
    }
});

ipcMain.handle("fetchCustomer", async (event) => {
    try {
        const [company_name] = await connection.execute(
            "SELECT company_name FROM customers"
        );
        return { company_name };
    } catch (error) {
        console.error("Error fetching data from database:", error);
    }
});
ipcMain.handle("fetchProject", async (event, companyName) => {
    try {
        const [projects] = await connection.execute(
            "SELECT projects.project_name FROM projects INNER JOIN customers ON projects.cin = customers.cin WHERE customers.company_name = ?",
            [companyName]
        );
        return { projects };
    } catch (error) {
        console.error("Error fetching data from database:", error);
    }
});
ipcMain.handle("fetchMilestones", async (event, projectName) => {
    try {
        const [milestones] = await connection.execute(
            "SELECT * FROM milestones INNER JOIN projects ON milestones.cin = projects.cin AND milestones.pono = projects.pono WHERE projects.project_name = ?",
            [projectName]
        );
        return { milestones };
    } catch (error) {
        console.error("Error fetching data from database:", error);
    }
});

ipcMain.on("paidstatus", async (event, data) => {
    try {
        const milestone = data.milestone;

        // Select query to find the milestone
        const selectQuery = 'SELECT * FROM milestones WHERE cin = ? AND pono = ? AND milestone_name = ?';
        const [milestones] = await connection.execute(selectQuery, [milestone.cin, milestone.pono, milestone.milestone_name]);

        // If milestone is found, update its status to 'paid'
        if (milestones.length > 0) {
            // Update query to set status to 'paid'
            const updateQuery = 'UPDATE milestones SET status = ? WHERE cin = ? AND pono = ? AND milestone_name = ?';
            await connection.execute(updateQuery, ['paid', milestone.cin, milestone.pono, milestone.milestone_name]);
            console.log('Milestone status updated to paid');
        } else {
            console.log('Milestone not found');
        }
    } catch (err) {
        console.error('Error:', err);
    }
});

// Close database connection when app is quit
app.on("quit", () => {
    if (connection) {
    // Check if connection exists before trying to end it
        connection.end();
    }
});
