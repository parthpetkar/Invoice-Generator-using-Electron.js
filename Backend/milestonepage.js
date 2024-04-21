$(document).ready(async () => {
    const { customers, milestones, projects, invoices } = await window.electron.invoke('fetchData');
    console.log(projects)
    const tableBody = $('#displayTable tbody');

    // Iterate over each milestone data and create table rows
    milestones.forEach(milestone => {
        const row = $('<tr>');

        // Find the corresponding customer and project data using milestone's cin and pono
        const customer = customers.find(customer => customer.cin === milestone.cin);
        const project = projects.find(project => project.cin === milestone.cin && project.pono === milestone.pono);
        const invoice = invoices.find(invoice => invoice.cin === milestone.cin && invoice.pono === milestone.pono && invoice.milestone_name === milestone.milestone_name);
        console.log(project)
        // Fill the table cells with data
        row.append(`<td>${customer.company_name}</td>`);
        row.append(`<td>${project.project_name}</td>`);
        row.append(`<td>${milestone.milestone_name}</td>`);
        row.append(`<td>${invoice ? invoice.invoice_number : 'N/A'}</td>`);
        row.append(`<td>${invoice ? invoice.invoice_date : 'N/A'}</td>`); // Update this with the actual date field
        row.append(`<td>${invoice ? invoice.due_date : 'N/A'}</td>`); // Update this with the actual due date field
        row.append(`<td>${invoice ? invoice.taxes_excluded : 'N/A'}</td>`);
        row.append(`<td>${project.total_prices}</td>`);
        row.append(`<td>${invoice ? invoice.remaining_amount : 'N/A'}</td>`);

        // Status - Use the status from the milestone object
        if (invoice) {
            if (invoice.status === 'unpaid') {

                row.append(`<td>Unpaid  </td>`); // Add an empty cell if invoice not created
            } else {
                row.append(`<td><button class="pay-btn">Pay</button></td>`);
            }
        } else {
            row.append(`<td>N/A</td>`); // Add an empty cell if invoice not created
        }

        // Actions - Add any action buttons or links here
        row.append(`<td><button>Edit</button><button>Delete</button></td>`);

        // Append the row to the table body
        tableBody.append(row);
    });

    // Attach click event to the "Pay" button
    $('.pay-btn').click(function () {
        // Hide the button
        $(this).hide();

        // Get the row index
        const rowIndex = $(this).closest('tr').index();

        // Update the status to "paid"
        invoices[rowIndex].status = 'paid';

        // Update the corresponding cell text
        $(this).closest('tr').find('td:eq(9)').text('Paid'); // Update the index if the status column changes

        // You might need to send an update request to your backend here to update the status in the database
    });
});
