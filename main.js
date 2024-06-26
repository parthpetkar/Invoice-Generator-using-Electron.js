const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const path = require("path");
const mysql = require("mysql2/promise");
const ExcelJS = require("exceljs");
const { dialog, shell } = require('electron');
require("dotenv").config();
const { Menu, MenuItem } = require('electron');
const schedule = require('node-schedule');

let connection;
let win;

function createWindow() {
    win = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, "Backend/preload.js"),
            spellcheck: true,
        },
    });

    win.webContents.on('context-menu', (event, params) => {
        const menu = new Menu();

        for (const suggestion of params.dictionarySuggestions) {
            menu.append(new MenuItem({
                label: suggestion,
                click: () => win.webContents.replaceMisspelling(suggestion)
            }));
        }

        if (params.misspelledWord) {
            menu.append(
                new MenuItem({
                    label: 'Add to dictionary',
                    click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
                })
            );
        }

        menu.popup();
    });

    win.loadFile("public/index.html");
    win.maximize();
}

if (require('electron-squirrel-startup')) app.quit();
app.whenReady().then(() => {
    createWindow();
    connectToDB().catch(error => {
        console.error("Error connecting to database:", error);
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

async function connectToDB() {
    try {
        connection = await mysql.createConnection({
            host: "localhost",
            user: "parth",
            password: "parthYM8",
            database: "invoice",
        });
    } catch (error) {
        console.error("Error connecting to database:", error);
    }
}

ipcMain.on("createCustomer", async (event, data) => {
    const { customerData } = data;
    try {
        const getLastCustomerIdQuery = `
          SELECT customer_id FROM customers 
          WHERE customer_id LIKE 'IEC_%' 
          ORDER BY CAST(SUBSTRING(customer_id, 5) AS UNSIGNED) DESC 
          LIMIT 1
        `;
        const [rows] = await connection.query(getLastCustomerIdQuery);

        let newCustomerId;
        if (rows.length > 0) {
            const latestId = rows[0].customer_id;
            const numericPart = parseInt(latestId.split('_')[1], 10);
            newCustomerId = `IEC_${numericPart + 1}`;
        } else {
            newCustomerId = 'IEC_1';
        }
        const insertCustomerQuery = `
          INSERT INTO customers (customer_id, company_name, address1, address2, address3, gstin, pan, cin)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(insertCustomerQuery, [
            newCustomerId,
            customerData.companyName,
            customerData.address1,
            customerData.address2,
            customerData.address3,
            customerData.gstin,
            customerData.pan,
            customerData.cin,
        ]);

        win.reload();
        event.reply('createCustomerResponse', { success: true, message: "Data inserted successfully", customerId: newCustomerId });
    } catch (error) {
        event.reply('createCustomerResponse', { success: false, message: "Error inserting data", error: error.message });
    }
});

ipcMain.on("insertMilestone", async (event, data) => {
    const { milestones, projectData } = data;
    const customer_name = projectData.customerName;
    try {
        const [result] = await connection.execute(
            `SELECT customer_id FROM customers WHERE company_name = ?`,
            [customer_name]
        );
        const customer_id = result[0].customer_id;

        // Begin transaction
        await connection.beginTransaction();

        const insertProjectQuery = `
          INSERT INTO projects (customer_id, internal_project_id, pono, total_prices, taxes, project_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.query(insertProjectQuery, [
            customer_id,
            projectData.projectNumber,
            projectData.poNo,
            projectData.totalPrice,
            projectData.taxTypes[0],
            projectData.projectName,
        ]);

        // Insert milestones
        for (const [index, milestone] of milestones.entries()) {
            const milestoneNumber = (index + 1).toString().padStart(3, '0');
            const milestone_id = `${projectData.projectNumber}_${milestoneNumber}`;

            const query = `INSERT INTO milestones (customer_id, internal_project_id, milestone_id, milestone_name, claim_percent, amount) 
            VALUES (?, ?, ?, ?, ?, ?)`;
            await connection.query(query, [
                customer_id,
                projectData.projectNumber,
                milestone_id,
                milestone.milestone,
                milestone.claimPercentage,
                milestone.amount
            ]);
        }

        // Commit transaction
        await connection.commit();

        win.reload();
        event.reply('createProjectResponse', { success: true, message: "Project created successfully", internalProjectId: internal_project_id });
    } catch (error) {
        console.error("Error inserting project data:", error);
        // Rollback transaction in case of error
        await connection.rollback();
        event.reply('createProjectResponse', { success: false, message: "Error inserting project data", error: error.message });
    }
});


ipcMain.on("createInvoice", async (event, data) => {
    const selectedMilestones = data.selectedMilestones;

    const currentDate = new Date().toISOString().split('T')[0];

    const invoiceNumber = await generateInvoiceNumber();

    function calculateDueDate(date) {
        const dueDate = new Date(date);
        dueDate.setDate(dueDate.getDate() + 10);
        return dueDate.toISOString().split('T')[0];
    }

    for (const milestone of selectedMilestones) {
        try {
            const invoiceDate = milestone.custom_date ? milestone.custom_date : calculateDueDate(currentDate);
            const dueDate = calculateDueDate(invoiceDate);

            await connection.query(`
                INSERT INTO Invoices (customer_id, internal_project_id, invoice_number, company_name, project_name, invoice_date, due_date, total_prices, milestone_id, milestone_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                milestone.customer_id,
                milestone.internal_project_id,
                invoiceNumber,
                milestone.customer_name,
                milestone.project_name,
                invoiceDate, // Use custom_date if provided, otherwise current date
                dueDate, // Calculate due date based on custom_date or current date
                milestone.amount,
                milestone.milestone_id,
                milestone.milestone_name
            ]);

            await connection.query(`
                UPDATE milestones
                SET pending = 'no'
                WHERE milestone_id = ?
            `, [milestone.milestone_id]);

            console.log("Data inserted and milestone updated successfully");
        } catch (error) {
            console.error("Error inserting data or updating milestone:", error);
        }
    }

    async function generateInvoiceNumber() {
        const currentYear = new Date().getFullYear();
        let nextNumber = 1;

        try {
            const [rows] = await connection.query(`
                SELECT MAX(invoice_number) AS lastInvoiceNumber 
                FROM Invoices 
                WHERE invoice_number LIKE '${currentYear}-%'
            `);

            if (rows.length > 0 && rows[0].lastInvoiceNumber) {
                const lastInvoiceNumber = rows[0].lastInvoiceNumber;
                const lastSequentialNumber = parseInt(lastInvoiceNumber.split('-')[1]);
                nextNumber = lastSequentialNumber + 1;
            }
        } catch (error) {
            console.error("Error fetching last invoice number:", error);
        }

        return `${currentYear}-${nextNumber.toString().padStart(3, '0')}`;
    }

    event.reply('invoiceCreated');
});

const templateConfig = {
    filePath: "IEC_Invoice_template.xlsx",
    cells: {
        companyName: "A13",
        address1: "A14",
        address2: "A15",
        address3: "A16",
        gstin: "A16",
        pan: "A17",
        cin: "C17",
        description: "A22",
        pono: "A21",
        totalPrice: "C21",
        invoiceDate: "F3",
        invoiceNumber: "F4",
        dueDate: "F5",
        milestonesStartRow: 24
    }
};

ipcMain.on("createForm", async (event, data) => {
    const selectedMilestones = data.selectedMilestones;

    try {
        // Retrieve necessary data from the first milestone
        const milestone = selectedMilestones[0];

        // Fetch customer details if not present
        const [customerDetails] = await connection.execute('SELECT company_name, address1, address2, address3, gstin, pan, cin FROM customers WHERE customer_id = ?', [milestone.customer_id]);
        const customer = customerDetails[0];

        // Fetch project details if not present
        const [projectDetails] = await connection.execute('SELECT pono, total_prices FROM projects WHERE customer_id = ? AND internal_project_id = ?', [milestone.customer_id, milestone.internal_project_id]);
        const project = projectDetails[0];

        // Fetch invoice details
        const [details] = await connection.execute('SELECT invoice_number, invoice_date, due_date FROM invoices WHERE customer_id = ? AND internal_project_id = ?', [milestone.customer_id, milestone.internal_project_id]);
        const detail = details[0];

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateConfig.filePath);

        const worksheet = workbook.getWorksheet("Invoice");
        if (!worksheet) throw new Error("Worksheet not found in the Excel file.");

        const cells = templateConfig.cells;
        worksheet.getCell(cells.companyName).value = '  ' + customer.company_name;
        worksheet.getCell(cells.address1).value = '  ' + customer.address1;
        worksheet.getCell(cells.address2).value = '  ' + customer.address2;
        worksheet.getCell(cells.address3).value = '  ' + customer.address3;
        worksheet.getCell(cells.gstin).value = '  GST No.-' + customer.gstin;
        worksheet.getCell(cells.pan).value = '  PAN No.-' + customer.pan;
        worksheet.getCell(cells.cin).value = 'CIN No.- ' + customer.cin;
        worksheet.getCell(cells.pono).value = ' PO No.: ' + milestone.project_name + '& Date: ' + project.project_date;
        worksheet.getCell(cells.description).value = milestone.description || '';
        worksheet.getCell(cells.totalPrice).value = Number(project.total_prices);
        worksheet.getCell(cells.invoiceNumber).value = detail.invoice_number;
        worksheet.getCell(cells.invoiceDate).value = detail.invoice_date;
        worksheet.getCell(cells.dueDate).value = detail.due_date;

        let row = cells.milestonesStartRow;
        selectedMilestones.forEach((milestone) => {
            worksheet.getCell(`A${row}`).value = '  ' + milestone.milestone_name;
            worksheet.getCell(`D${row}`).value = '  ' + Number(milestone.claim_percent) + '%';
            worksheet.getCell(`F${row}`).value = '  ' + Number(milestone.amount);
            row++;
        });

        const options = {
            title: "Save Invoice",
            defaultPath: `IEC_Invoice_${detail.invoice_number}_${customer.company_name}_${project.pono}.xlsx`,
            buttonLabel: "Save",
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        };

        const result = await dialog.showSaveDialog(null, options);
        if (!result.canceled) {
            const filePath = result.filePath;
            await workbook.xlsx.writeFile(filePath);
            await shell.openPath(filePath);
        }
        win.reload();   
    } catch (error) {
        console.error(error);
    }
});

ipcMain.handle('payInvoice', async (event, milestone_id) => {
    try {
        await connection.execute('UPDATE invoices SET status = "paid" WHERE milestone_id = ?', [milestone_id]);
        win.reload();
    } catch (error) {
        console.error('Error updating milestone status:', error);
        throw error;
    }
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
            "SELECT projects.project_name, projects.internal_project_id FROM projects INNER JOIN customers ON projects.customer_id = customers.customer_id WHERE customers.company_name = ?",
            [companyName]
        );
        return { projects };
    } catch (error) {
        console.error("Error fetching data from database:", error);
    }
});
ipcMain.handle("fetchMilestones", async (event, selectedProjectId) => {
    try {
        const [milestones] = await connection.execute(
            "SELECT * FROM milestones INNER JOIN projects ON milestones.customer_id = projects.customer_id AND milestones.internal_project_id = projects.internal_project_id WHERE projects.internal_project_id = ?",
            [selectedProjectId]
        );
        return { milestones };
    } catch (error) {
        console.error("Error fetching data from database:", error);
    }
});

function sendNotification(data) {
    const options = {
        title: 'Invoice Due Today',
        body: `Invoice Pending From Customer ${data.customer} (${data.project}) For Milestone ${data.milestone}`,
        silent: false,
        icon: path.join(__dirname, 'assets/bell-solid.svg'),
        timeoutType: 'never',
        urgency: 'critical',
        closeButtonText: 'Close',
        tag: `invoice_due_${data.customer}_${data.project}`,
    };
    const customNotification = new Notification(options);
    customNotification.show();
}

// Schedule the daily check for invoices due today
const dailyCheckJob = schedule.scheduleJob('0 0 * * *', async () => { // Run at midnight every day
    try {
        const [invoices] = await connection.execute('SELECT * FROM invoices WHERE due_date = CURDATE() AND noti_sent = "no"');
        const [customers] = await connection.execute('SELECT * FROM customers');
        const [projects] = await connection.execute('SELECT * FROM projects');
        const [milestones] = await connection.execute('SELECT * FROM milestones');

        invoices.forEach(invoice => {
            const customer = customers.find(c => c.customer_id === invoice.customer_id);
            const project = projects.find(p => p.internal_project_id === invoice.internal_project_id);
            const milestone = milestones.find(m => m.milestone_id === invoice.milestone_id);

            if (customer && project && milestone) {
                const data = {
                    customer: customer.company_name,
                    project: project.project_name,
                    milestone: milestone.milestone_name,
                    invoice: invoice
                };

                // Send notification
                sendNotification(data);

                // Update the invoice to mark the notification as sent
                const updatedQuery = 'UPDATE invoices SET noti_sent = ? WHERE customer_id = ? AND internal_project_id = ? AND milestone_id = ?';
                connection.execute(updatedQuery, [
                    'yes',
                    invoice.customer_id,
                    invoice.internal_project_id,
                    invoice.milestone_id
                ]);
            }
        });
    } catch (error) {
        console.error('Error checking due dates:', error);
    }
});

ipcMain.handle('get-summary-data', async () => {
    try {
        const [results] = await connection.execute(`
            SELECT 
                (SELECT COUNT(*) FROM invoices) AS totalMilestones,
                (SELECT SUM(total_prices) FROM invoices WHERE status = 'paid') AS amountCollected,
                (SELECT SUM(total_prices) FROM invoices WHERE status = 'unpaid') AS amountPending
        `);
        return results[0];
    } catch (error) {
        console.error('Error fetching summary data:', error);
        return { totalMilestones: 0, amountCollected: 0, amountPending: 0 };
    }
});

ipcMain.handle('get-invoice-data', async () => {
    try {
        const [results] = await connection.execute(`
            SELECT invoice_date, total_prices FROM invoices ORDER BY invoice_date
        `);
        return results;
    } catch (error) {
        console.error('Error fetching invoice data:', error);
        return [];
    }
});

ipcMain.handle('get-invoice-status-data', async () => {
    try {
        const [results] = await connection.execute(`
            SELECT status, COUNT(*) as count FROM invoices GROUP BY status
        `);
        return results;
    } catch (error) {
        console.error('Error fetching invoice status data:', error);
        return [];
    }
});

ipcMain.handle('get-projects', async () => {
    try {
        const [projects] = await connection.execute(`
            SELECT * FROM projects
        `);
        return projects;
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
});

ipcMain.handle('get-milestones', async (event, projectdata) => {
    try {
        const [milestones] = await connection.execute(`
            SELECT * FROM milestones WHERE customer_id = ? AND internal_project_id = ?
        `, [projectdata.customer_id, projectdata.project_id]);

        const [customers] = await connection.execute(`
            SELECT * FROM customers WHERE customer_id = ?
        `, [projectdata.customer_id]);

        return { milestones, customers };
    } catch (error) {
        console.error('Error fetching milestones:', error);
        return { milestones: [], customers: [] };
    }
});

app.on("quit", () => {
    if (connection) {
        connection.end();
    }
});
