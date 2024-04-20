$(document).ready(async () => {
    const { customers, milestones, projects, invoices } = await window.electron.invoke('fetchData');
    console.log(customers, milestones, projects, invoices)
    const tableBody = $('#displayTable tbody');

    // Iterate over each milestone data and create table rows
    milestones.forEach(milestone => {
        const row = $('<tr>');

        // Find the corresponding customer and project data using milestone's cin and pono
        const customer = customers.find(customer => customer.cin === milestone.cin);
        const project = projects.find(project => project.cin === milestone.cin && project.pono === milestone.pono);
        const invoice = invoices.find(invoice => invoice.cin === milestone.cin && invoice.pono === milestone.pono && invoice.milestone_name === milestone.milestone_name);

        // Fill the table cells with data
        row.append(`<td>${invoice.invoice_number}</td>`);
        row.append(`<td>${customer.company_name}</td>`);
        row.append(`<td>${project.project_name}</td>`);
        row.append(`<td>${invoice.milestone_name}</td>`);
        row.append(`<td>${invoice.invoice_date}</td>`); // Update this with the actual date field
        row.append(`<td>${invoice.due_date}</td>`); // Update this with the actual due date field
        row.append(`<td>${invoice.taxes_excluded}</td>`);
        row.append(`<td>${invoice.total_prices}</td>`);

        // Calculate remaining amount
        const remainingAmount = invoice.total_prices - milestone.amount;

        // Remaining Table data
        row.append(`<td>${remainingAmount}</td>`);

        // Status - Use the status from the milestone object
        row.append(`<td>${milestone.status}</td>`);

        // Actions - Add any action buttons or links here
        row.append(`<td><button>Edit</button><button>Delete</button></td>`);

        // Append the row to the table body
        tableBody.append(row);
    });
});
