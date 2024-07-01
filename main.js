const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const path = require("path");
const mysql = require("mysql2/promise");
const ExcelJS = require("exceljs");
const { dialog, shell } = require('electron');
require("dotenv").config();
const { Menu, MenuItem } = require('electron');

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

    win.loadFile("public/login.html");
    win.maximize();
}

if (require('electron-squirrel-startup')) app.quit();
app.whenReady().then(() => {
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

ipcMain.on("login", async (event, data) => {
    try {
        const { username, password } = data;
        connection = await mysql.createConnection({
            host: '192.168.2.5',
            user: username,
            password: password,
            database: "invoice",
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        event.reply('loginResponse', { success: true, message: "Login successful" });
        win.reload();
        await checkInvoicesDueToday();
    } catch (error) {
        event.reply('loginResponse', { success: false, message: "Invalid Credentials" });
    }
});

async function checkInvoicesDueToday() {
    try {
        // Fetch invoices due today and not yet notified
        const [invoices] = await connection.execute('SELECT * FROM invoices WHERE due_date = CURDATE() AND noti_send = "no"');

        if (invoices.length === 0) return;

        // Fetch all necessary related data
        const [customers] = await connection.execute('SELECT * FROM customers');
        const [projects] = await connection.execute('SELECT * FROM projects');
        const [milestones] = await connection.execute('SELECT * FROM milestones');

        // Process each invoice
        for (let invoice of invoices) {
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
                const updatedQuery = 'UPDATE invoices SET noti_send = ? WHERE customer_id = ? AND internal_project_id = ? AND milestone_id = ?';
                await connection.execute(updatedQuery, [
                    'yes',
                    invoice.customer_id,
                    invoice.internal_project_id,
                    invoice.milestone_id
                ]);
            }
        }
    } catch (error) {
        console.error('Error checking due dates:', error);
    }
}


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

ipcMain.on("load-main-content", () => {
    win.loadFile("public/index.html");  // Load the main content page after successful login
});

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
    try {
        const [result] = await connection.execute(
            `SELECT customer_id FROM customers WHERE company_name = ?`,
            [projectData.customerName]
        );
        const customer_id = result[0].customer_id;
        // Begin transaction
        await connection.beginTransaction();

        const insertProjectQuery = `
          INSERT INTO projects (customer_id, internal_project_id, project_name, project_date, pono, total_prices, taxes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(insertProjectQuery, [
            customer_id,
            projectData.projectNumber,
            projectData.projectName,    // Change order here
            projectData.projectDate,
            projectData.poNo,
            projectData.totalPrice,
            projectData.taxTypes[0]
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
        event.reply('createProjectResponse', { success: true, message: "Project created successfully", internalProjectId: projectData.projectNumber });
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

async function loadTemplateConfigs() {
    const data = await fs.readFile(path.join(__dirname, "templateConfigs.json"), "utf8");
    return JSON.parse(data);
}


ipcMain.on("createForm", async (event, data) => {
    const { selectedMilestones, invoiceType } = data;
    try {
        const templateConfigs = await loadTemplateConfigs();

        function to_date(date) {
            if (!date) return '-';
            const d = new Date(date);
            const day = d.getDate().toString().padStart(2, '0');
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        }

        // Select the template config based on invoice type
        const templateConfig = templateConfigs[invoiceType];
        if (!templateConfig) {
            throw new Error("Invalid invoice type selected.");
        }

        // Retrieve necessary data from the first milestone
        const milestone = selectedMilestones[0];

        // Fetch customer details
        const [customerDetails] = await connection.execute('SELECT company_name, address1, address2, address3, gstin, pan, cin FROM customers WHERE customer_id = ?', [milestone.customer_id]);
        const customer = customerDetails[0];

        // Fetch project details
        const [projectDetails] = await connection.execute('SELECT project_date, pono, total_prices FROM projects WHERE customer_id = ? AND internal_project_id = ?', [milestone.customer_id, milestone.internal_project_id]);
        const project = projectDetails[0];

        // Fetch invoice details
        const [details] = await connection.execute('SELECT invoice_number, invoice_date, due_date FROM invoices WHERE customer_id = ? AND internal_project_id = ?', [milestone.customer_id, milestone.internal_project_id]);
        const detail = details[0];

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateConfig.filePath);

        const worksheet = workbook.getWorksheet("Invoice");
        if (!worksheet) {
            throw new Error("Worksheet not found in the Excel file.");
        }

        const cells = templateConfig.cells;

        // Update cells only if they exist in the template
        if (cells.companyName) {
            const companyCell = worksheet.getCell(cells.companyName);
            companyCell.value = customer.company_name || '-';
            companyCell.font = { name: 'Trebuchet MS', size: 10 };
            companyCell.alignment = { horizontal: 'left', vertical: 'bottom' };
        }

        if (cells.address1) {
            worksheet.getCell(cells.address1).value = customer.address1 || '-';
            worksheet.getCell(cells.address1).font = { name: 'Trebuchet MS', size: 10 };
            worksheet.getCell(cells.address1).alignment = { horizontal: 'left', vertical: 'bottom' };
        }

        if (cells.address2) {
            worksheet.getCell(cells.address2).value = customer.address2 || '-';
            worksheet.getCell(cells.address2).font = { name: 'Trebuchet MS', size: 10 };
            worksheet.getCell(cells.address2).alignment = { horizontal: 'left', vertical: 'bottom' };
        }

        if (cells.address3) {
            worksheet.getCell(cells.address3).value = customer.address3 || '-';
            worksheet.getCell(cells.address3).font = { name: 'Trebuchet MS', size: 10 };
            worksheet.getCell(cells.address3).alignment = { horizontal: 'left', vertical: 'bottom' };
        }

        if (cells.gstin) {
            worksheet.getCell(cells.gstin).value = customer.gstin ? `GST No.- ${customer.gstin}` : '-';
            worksheet.getCell(cells.gstin).font = { name: 'Trebuchet MS', size: 10 };
            worksheet.getCell(cells.gstin).alignment = { horizontal: 'left', vertical: 'bottom' };
        }

        if (cells.cin) {
            worksheet.getCell(cells.cin).value = customer.cin ? `CIN No.- ${customer.cin}` : '-';
            worksheet.getCell(cells.cin).font = { name: 'Trebuchet MS', size: 10 };
            worksheet.getCell(cells.cin).alignment = { horizontal: 'left', vertical: 'bottom' };
        }

        if (cells.pono) {
            worksheet.getCell(cells.pono).value = `PO No. & Date: ${milestone.project_name || '-'} , ${to_date(project.project_date) || '-'}`;
            worksheet.getCell(cells.pono).font = { name: 'Trebuchet MS', size: 10 };
            worksheet.getCell(cells.pono).alignment = { horizontal: 'left', vertical: 'bottom' };
        }

        if (cells.totalPrice) {
            worksheet.getCell(cells.totalPrice).value = project.total_prices || '-';
            worksheet.getCell(cells.totalPrice).font = { name: 'Trebuchet MS', size: 10 };
        }

        if (cells.invoiceNumber) {
            worksheet.getCell(cells.invoiceNumber).value = detail.invoice_number || '-';
            worksheet.getCell(cells.invoiceNumber).font = { name: 'Trebuchet MS', size: 10 };
        }

        if (cells.invoiceDate) {
            worksheet.getCell(cells.invoiceDate).value = to_date(detail.invoice_date) || '-';
            worksheet.getCell(cells.invoiceDate).font = { name: 'Trebuchet MS', size: 10 };
            worksheet.getCell(cells.invoiceDate).alignment = { horizontal: 'center' };
        }

        if (cells.dueDate) {
            worksheet.getCell(cells.dueDate).value = to_date(detail.due_date) || '-';
            worksheet.getCell(cells.dueDate).font = { name: 'Trebuchet MS', size: 10 };
            worksheet.getCell(cells.dueDate).alignment = { horizontal: 'center' };
        }

        // Update milestones if the start row is defined
        if (cells.milestonesStartRow) {
            let row = cells.milestonesStartRow;
            selectedMilestones.forEach((milestone) => {
                worksheet.getCell(`A${row}`).value = milestone.milestone_name || '-';
                worksheet.getCell(`A${row}`).font = { name: 'Trebuchet MS', size: 10 };
                worksheet.getCell(`A${row}`).alignment = { horizontal: 'left', vertical: 'bottom' };

                worksheet.getCell(`D${row}`).value = Number(milestone.claim_percent) ? `${Number(milestone.claim_percent)}%` : '-';
                worksheet.getCell(`D${row}`).font = { name: 'Trebuchet MS', size: 10 };
                worksheet.getCell(`D${row}`).alignment = { horizontal: 'left', vertical: 'bottom' };

                row++;
            });
        }

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

ipcMain.handle('get-summary-data', async () => {
    try {
        const [total] = await connection.execute(`SELECT SUM(total_prices) as total_prices FROM projects`);

        const [paidResults] = await connection.execute(`
            SELECT SUM(total_prices) AS amountCollected FROM invoices WHERE status = 'paid'
        `);

        const [unpaidResults] = await connection.execute(`
            SELECT SUM(total_prices) AS amountPending FROM invoices WHERE status = 'unpaid'
        `);
        const amountCollected = Number(paidResults[0].amountCollected) || 0;
        const amountPending = Number(unpaidResults[0].amountPending) || 0;
        const totalAmount = total[0].total_prices;

        return {
            amountCollected: amountCollected,
            amountPending: amountPending,
            totalAmount: totalAmount
        };
    } catch (error) {
        console.error('Error fetching summary data:', error);
        return { amountCollected: 0, amountPending: 0, totalAmount: 0 };
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

ipcMain.handle('update-project', async (event, projectData) => {
    const connection = await pool.getConnection(); // Assuming you are using a connection pool
    await connection.beginTransaction(); // Begin a transaction

    try {
        const { project_id, customer_id, project_name, project_date, pono, total_prices } = projectData;

        // Update the project details
        await connection.execute(
            'UPDATE projects SET project_name = ?, project_date = ?, pono = ?, total_prices = ? WHERE customer_id = ? AND internal_project_id = ?',
            [project_name, project_date, pono, total_prices, customer_id, project_id]
        );

        // Retrieve the milestones for this project
        const [milestones] = await connection.execute(
            'SELECT milestone_id, claim_percent FROM milestones WHERE customer_id = ? AND internal_project_id = ?',
            [customer_id, project_id]
        );

        // Update the milestone amounts based on the new total price
        for (const milestone of milestones) {
            const newAmount = (milestone.claim_percent / 100) * total_prices;
            await connection.execute(
                'UPDATE milestones SET amount = ? WHERE milestone_id = ?',
                [newAmount, milestone.milestone_id]
            );
        }

        await connection.commit(); // Commit the transaction

        return { success: true };
    } catch (error) {
        await connection.rollback(); // Rollback the transaction in case of error
        console.error('Error updating project:', error);
        throw error;
    } finally {
        connection.release(); // Release the connection back to the pool
    }
});


app.on("quit", () => {
    if (connection) {
        connection.end();
    }
});
