const { test } = require('@playwright/test');
const { _electron: electron } = require('playwright');

test('Create customer flow with debugging', async () => {
  // Launch the Electron app
  console.log('Launching Electron app...');
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();
  console.log('App launched, first window loaded.');

  // Debug mode: open Playwright inspector
  // await page.pause();

  // Step 1: Login
  console.log('Filling in login credentials...');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('#loginButton');
  console.log('Login button clicked, waiting for #create_customers...');;

  // Step 2: Go to "Create Customer" page
  console.log('Navigating to Create Customer section...');
  await page.click('a[href="#create_customers"]');
  await page.waitForSelector('#customer_company_name');
  console.log('Create Customer section loaded.');

  // Step 3: Fill customer form
  console.log('Filling customer form...');
  await page.fill('#customer_company_name', 'Test Company');
  await page.fill('#customer_address1', '123 Street');
  await page.fill('#customer_address2', 'Suite 100');
  await page.fill('#customer_address3', 'City XYZ');
  await page.fill('#customer_gstin', '22AAAAA0000A1Z5');
  await page.fill('#customer_pan', 'ABCDE1234F');
  await page.fill('#customer_cin', 'L12345MH2020PLC123456');
  console.log('Customer form filled, submitting...');

  // Step 4: Submit and handle dialog
  const dialogPromise = page.waitForEvent('dialog');
  await page.click('#saveCustomer');
  const dialog = await dialogPromise;
  console.log('Dialog message:', dialog.message());
  await dialog.dismiss();

  console.log('Closing app...');
  await app.close();
});
