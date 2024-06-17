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
            user: "root",
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

        event.reply('createCustomerResponse', { success: true, message: "Data inserted successfully", customerId: newCustomerId });
    } catch (error) {
        event.reply('createCustomerResponse', { success: false, message: "Error inserting data", error: error.message });
    }
});

ipcMain.on("insertMilestone", async (event, data) => {
    const { milestones, projectData } = data;
    const customer_name = projectData.customerName;
    const currentYear = new Date().getFullYear();

    try {
        const [result] = await connection.execute(
            `SELECT customer_id FROM customers WHERE company_name = ?`,
            [customer_name]
        );
        const customer_id = result[0].customer_id;

        // Begin transaction
        await connection.beginTransaction();

        const [lastProjectResult] = await connection.execute(
            `SELECT internal_project_id FROM projects WHERE internal_project_id LIKE ? ORDER BY internal_project_id DESC LIMIT 1`,
            [`${currentYear}-%`]
        );

        // Generate a new project ID
        let newProjectId;
        if (lastProjectResult.length > 0) {
            const lastProjectId = lastProjectResult[0].internal_project_id;
            const lastProjectNumber = parseInt(lastProjectId.split('-')[1]);
            const newProjectNumber = (lastProjectNumber + 1).toString().padStart(3, '0');
            newProjectId = `${currentYear}-${newProjectNumber}`;
        } else {
            newProjectId = `${currentYear}-001`;
        }

        const insertProjectQuery = `
          INSERT INTO projects (customer_id, internal_project_id, pono, total_prices, taxes, project_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.query(insertProjectQuery, [
            customer_id,
            newProjectId,
            projectData.poNo,
            projectData.totalPrice,
            projectData.taxTypes[0],
            projectData.projectName,
        ]);

        // Insert milestones
        for (const [index, milestone] of milestones.entries()) {
            const milestoneNumber = (index + 1).toString().padStart(3, '0');
            const milestone_id = `${newProjectId}_${milestoneNumber}`;

            const query = `INSERT INTO milestones (customer_id, internal_project_id, milestone_id, milestone_name, claim_percent, amount) 
            VALUES (?, ?, ?, ?, ?, ?)`;
            await connection.query(query, [
                customer_id,
                newProjectId,
                milestone_id,
                milestone.milestone,
                milestone.claimPercentage,
                milestone.amount
            ]);
        }

        // Commit transaction
        await connection.commit();

        win.reload();
        event.reply('createProjectResponse', { success: true, message: "Project created successfully", internalProjectId: newProjectId });
    } catch (error) {
        console.error("Error inserting project data:", error);
        // Rollback transaction in case of error
        await connection.rollback();
        event.reply('createProjectResponse', { success: false, message: "Error inserting project data", error: error.message });
    }
});



ipcMain.on("createInvoice", async (event, data) => {
    const invoiceData = data.invoiceData;
    const { formData, milestones } = invoiceData;
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
                milestone.amount,
                milestone.amount,
                milestone.milestone_name,
                calculateRemainingAmount(milestone)
            ]);
            win.reload();
            console.log("Data inserted successfully");
        } catch (error) {
            console.error("Error inserting data:", error);
        }

    })

    function calculateRemainingAmount(milestone) {
        const totalAmount = parseFloat(milestone.total_prices);
        const totalPaidAmount = parseFloat(milestone.amount);
        const remainingAmount = totalAmount - totalPaidAmount;

        return remainingAmount;
    }
});

const templateConfig = {
    template1: {
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
    },
};

ipcMain.on("createForm", async (event, data) => {
    const invoiceData = data.invoiceData;
    const { formData, milestones } = invoiceData;
    const templateType = formData.templateType;

    if (!templateConfig[templateType]) {
        console.error("Invalid template type");
        return;
    }

    const template = templateConfig[templateType];
    const cells = template.cells;

    const [rowforcin] = await connection.execute('select cin from invoices where invoice_number = ?', [formData.invoiceNumber]);
    const cin = rowforcin[0].cin;

    const [customerDetails] = await connection.execute('select company_name, address1, address2, address3, gstin, pan from customers where cin = ?', [cin]);
    const address1 = customerDetails[0].address1;
    const address2 = customerDetails[0].address2;
    const address3 = customerDetails[0].address3;
    const gstin = customerDetails[0].gstin;
    const pan = customerDetails[0].pan;
    const company_name = customerDetails[0].company_name;

    const pono = milestones[0].pono;
    const total_price = milestones[0].total_prices;

    function formatInvoiceNumber(invoiceNumber) {
        const yearPart = invoiceNumber.slice(0, 4);
        const sequentialPart = invoiceNumber.slice(4);
        return `${yearPart}-${sequentialPart}`;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.xlsx
        .readFile(template.filePath)
        .then(() => {
            const worksheet = workbook.getWorksheet("Invoice");
            if (worksheet) {
                worksheet.getCell(cells.companyName).value = '  ' + company_name;
                worksheet.getCell(cells.address1).value = '  ' + address1;
                worksheet.getCell(cells.address2).value = '  ' + address2;
                worksheet.getCell(cells.address3).value = '  ' + address3;
                worksheet.getCell(cells.gstin).value = '  GST No.-' + gstin;
                worksheet.getCell(cells.pan).value = '  PAN No.-' + pan;
                worksheet.getCell(cells.cin).value = 'CIN No.- ' + cin;
                worksheet.getCell(cells.pono).value = ' PO NO : ' + pono;
                worksheet.getCell(cells.description).value = formData.description;
                worksheet.getCell(cells.totalPrice).value = Number(total_price);
                worksheet.getCell(cells.invoiceNumber).value = formatInvoiceNumber(formData.invoiceNumber);
                worksheet.getCell(cells.invoiceDate).value = formData.invoiceDate;
                worksheet.getCell(cells.dueDate).value = formData.dueDate;

                let row = cells.milestonesStartRow;
                milestones.forEach((milestone) => {
                    worksheet.getCell(`A${row}`).value = '  ' + milestone.milestone_name;
                    worksheet.getCell(`D${row}`).value = '  ' + Number(milestone.claim_percent) + '%';
                    worksheet.getCell(`F${row}`).value = '  ' + Number(milestone.amount);
                    row++;
                });

                const options = {
                    title: "Save Invoice",
                    defaultPath: `IEC_Invoice_${formatInvoiceNumber(formData.invoiceNumber)}_${company_name}_${pono}.xlsx`,
                    buttonLabel: "Save",
                    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
                };

                dialog.showSaveDialog(null, options).then(result => {
                    if (!result.canceled) {
                        const filePath = result.filePath;
                        workbook.xlsx.writeFile(filePath)
                            .then(() => {
                                console.log("Invoice generated successfully!");
                                shell.openPath(filePath);
                            })
                            .catch((error) => {
                                console.error(error);
                            });
                    }
                });
            } else {
                throw new Error("Worksheet not found in the Excel file.");
            }
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

        const selectQuery = 'SELECT * FROM milestones WHERE cin = ? AND pono = ? AND milestone_name = ?';
        const [milestones] = await connection.execute(selectQuery, [milestone.cin, milestone.pono, milestone.milestone_name]);

        if (milestones.length > 0) {
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

ipcMain.on("notification", async (event, data) => {
    try {
        const options = {
            title: 'Invoice Due Today',
            body: 'Invoice Pending From Customer '
                + data.customer
                + '(' + data.project + ') '
                + 'For Milestone ' + data.milestone,
            silent: false,
            icon: path.join(__dirname, '../assets/bell-solid.svg'),
            timeoutType: 'never',
            urgency: 'critical',
            closeButtonText: 'Close Button',
            tag: 'invoice_due_' + data.customer + '_' + data.project,
        }
        const customNotification = new Notification(options);
        customNotification.show();
    } catch (error) {
        console.error('Error:', error);
    }
    try {
        const updatedQuery = 'UPDATE invoices SET noti_sent = ? WHERE cin = ? AND pono = ? AND milestone_name = ?';
        await connection.execute(updatedQuery, [
            'yes',
            data.invoice.cin,
            data.invoice.pono,
            data.invoice.milestone_name
        ]);
    } catch (error) {
        console.error('Error:', error);
    }
});

ipcMain.handle('get-summary-data', async () => {
    try {
        const [results] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM milestones) AS totalMilestones,
          (SELECT SUM(amount) FROM milestones WHERE status = 'paid') AS amountCollected,
          (SELECT SUM(amount) FROM milestones WHERE status = 'unpaid') AS amountPending
      `);
        return results[0];
    } catch (error) {
        console.error('Error fetching summary data:', error);
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
    }
});

ipcMain.handle('get-invoice-status-data', async () => {
    try {
        const [results] = await connection.execute(`
        SELECT status, COUNT(*) as count FROM milestones GROUP BY status
      `);
        return results;
    } catch (error) {
        console.error('Error fetching invoice status data:', error);
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
    }
});

ipcMain.handle('get-milestones', async (event, projectdata) => {
    try {
        const [milestones] = await connection.execute(`
            SELECT * FROM milestones WHERE cin = ? AND pono = ?
        `, [projectdata.cin, projectdata.pono]);

        const [customers] = await connection.execute(`
            SELECT * FROM customers WHERE cin = ?
        `, [projectdata.cin]);

        return { milestones, customers };
    } catch (error) {
        console.error('Error fetching milestones:', error);
    }
});

app.on("quit", () => {
    if (connection) {
        connection.end();
    }
});
