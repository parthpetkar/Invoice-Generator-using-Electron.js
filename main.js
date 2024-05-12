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

const NOTIFICATION_TITLE = 'Basic Notification'
const NOTIFICATION_BODY = 'Notification from the Main process'

function showNotification() {
    try {
        new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show();
    } catch (error) {
        console.error("Error showing notification:", error);
    }
}

if (require('electron-squirrel-startup')) app.quit();
app.whenReady().then(() => {
    createWindow();
    // showNotification();
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


ipcMain.on("insertMilestone", async (event, data) => {
    const { rowDataArray, projectData } = data;
    var c_name = projectData.customerName;

    try {
        const [result] = await connection.execute(
            `SELECT cin FROM customers where company_name = '${c_name}'`
        );
        const cin = result[0].cin;

        rowDataArray.forEach(async (rowData) => {
            const { milestone, claimPercentage, amount } = rowData;
            const query = `INSERT INTO milestones (cin, pono, milestone_name, claim_percent, amount) VALUES (?, ?, ?, ?, ?)`;
            await connection.query(query, [
                cin, projectData.poNo, milestone, claimPercentage, amount
            ]
            );
        });
        win.reload();
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
            projectData.taxTypes[0],
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
        // win.reload();
        console.log("Data inserted successfully");
    } catch (error) {
        console.error("Error inserting data:", error);
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

ipcMain.on("createForm", async (event, data) => {
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

    function formatInvoiceNumber(invoiceNumber) {
        const yearPart = invoiceNumber.slice(0, 4);
        const sequentialPart = invoiceNumber.slice(4);
        return `${yearPart}-${sequentialPart}`;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.xlsx
        .readFile("IEC_Invoice_template.xlsx")
        .then(() => {
            const worksheet = workbook.getWorksheet("Invoice 2");
            if (worksheet) {
                worksheet.getCell("A13").value = '  ' + company_name;
                worksheet.getCell("A14").value = '  ' + address;
                worksheet.getCell("A15").value = '  ' + phone;
                worksheet.getCell("A16").value = '  GST No.-' + gstin;
                worksheet.getCell("A17").value = '  PAN No.-' + pan;
                worksheet.getCell("C17").value = 'CIN No.- ' + cin;
                worksheet.getCell("A20").value = formData.description;
                worksheet.getCell("A22").value = ' PONo, : ' + pono;
                worksheet.getCell("C22").value = Number(total_price);
                worksheet.getCell("F4").value = formatInvoiceNumber(formData.invoiceNumber);
                worksheet.getCell("F3").value = formData.invoiceDate;
                worksheet.getCell("F5").value = formData.dueDate;

                let row = 24;
                milestones.forEach((milestone) => {
                    worksheet.getCell(`A${row}`).value = '  ' + milestone.milestone_name;
                    worksheet.getCell(`D${row}`).value = '  ' + Number(milestone.claim_percent) + '%';
                    worksheet.getCell(`F${row}`).value = '  ' + Number(milestone.amount);
                    row++;
                });

                const options = {
                    title: "Save Invoice",
                    defaultPath: `INV${formData.invoiceNumber}.xlsx`,
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
            body: 'Invoice Pending From Customer ' + data.customer + '(' + data.project + ') ' + 'For Milestone ' + data.milestone, // Milestone name
            silent: false,
            icon: path.join(__dirname, '../assets/notification-icon.png'),
            timeoutType: 'never',
            urgency: 'critical',
            closeButtonText: 'Close Button',
        }

        const customNotification = new Notification(options);
        customNotification.show();
    } catch (error) {
        console.error('Error:', err);
    }
});

app.on("quit", () => {
    if (connection) {
        connection.end();
    }
});
