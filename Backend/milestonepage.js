$(document).ready(async () => {
    const { customers, milestones, projects, invoices } = await window.electron.invoke('fetchData');
    const tableBody = $('#displayTable tbody');

    // Iterate over each milestone data and create table rows
    milestones.forEach(async (milestone) => {
        const row = $('<tr>');

        // Find the corresponding customer and project data using milestone's cin and pono
        const customer = customers.find(customer => customer.cin === milestone.cin);
        const project = projects.find(project => project.cin === milestone.cin && project.pono === milestone.pono);
        const invoice = invoices.find(invoice => invoice.cin === milestone.cin && invoice.pono === milestone.pono && invoice.milestone_name === milestone.milestone_name);

        // Fill the table cells with data
        row.append(`<td>${invoice ? invoice.invoice_number : 'N/A'}</td>`);
        row.append(`<td>${customer ? customer.company_name : 'N/A'}</td>`); // Check if customer exists
        row.append(`<td>${project ? project.project_name : 'N/A'}</td>`); // Check if project exists
        row.append(`<td>${milestone.milestone_name}</td>`);
        row.append(`<td>${invoice ? formatDate(invoice.due_date) : 'N/A'}</td>`); // Update this with the actual due date field
        row.append(`<td>${invoice ? formatCurrency(invoice.remaining_amount) : 'N/A'}</td>`); // Remaining Amount);

        // Status - Use the status from the milestone object
        const statusCell = $('<td>'); // Create a cell for the status
        if (invoice) {
            const payButton = $('<button>').addClass('pay-btn').text('Pay'); // Create the "Pay" button
            payButton.click(function () {
                // Hide the button
                $(this).hide();

                // Get the row index
                const rowIndex = $(this).closest('tr').index();

                // Update the status to "paid"
                invoices[rowIndex].status = 'paid';

                // Update the corresponding cell text
                statusCell.text('Paid');

                // You might need to send an update request to your backend here to update the status in the database
            });
            statusCell.append(payButton);
        } else {
            statusCell.text('N/A');
        }
        row.append(statusCell);

        // Append the row to the table body
        tableBody.append(row);

        function formatDate(dateString) {
            const date = new Date(dateString);
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-IN', options);
        };

        function formatCurrency(amount) {
            // Assuming amount is in USD, change currency and locale as needed
            return parseFloat(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
        };

        await window.electron.send('updatestatus', milestone)
    });
});
