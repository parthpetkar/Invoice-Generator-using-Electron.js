$(document).ready(async () => {
    try {
        const { customers, milestones, projects, invoices } = await window.electron.invoke('fetchData');
        const tableBody = $('#displayTable tbody');

        milestones.forEach(async (milestone) => {
            try {
                const row = $('<tr>');

                const customer = customers.find(customer => customer.cin === milestone.cin);
                const project = projects.find(project => project.cin === milestone.cin && project.pono === milestone.pono);
                const invoice = invoices.find(invoice => invoice.cin === milestone.cin && invoice.pono === milestone.pono && invoice.milestone_name === milestone.milestone_name);

                row.append(`<td>${invoice ? formatInvoiceNumber(invoice.invoice_number) : 'N/A'}</td>`);
                row.append(`<td>${customer ? customer.company_name : 'N/A'}</td>`);
                row.append(`<td>${project ? project.project_name : 'N/A'}</td>`);
                row.append(`<td>${milestone.milestone_name}</td>`);
                row.append(`<td>${invoice ? formatDate(invoice.due_date) : 'N/A'}</td>`);
                row.append(`<td>${invoice ? formatCurrency(milestone.amount) : 'N/A'}</td>`);

                const statusCell = $('<td>');

                if (invoice && milestone.status !== 'paid') {
                    const payButton = $('<button>').addClass('pay-btn').text('Pay');
                    payButton.click(async function () {
                        try {
                            $(this).hide();
                            // const rowIndex = $(this).closest('tr').index();
                            milestone.status = 'paid';
                            statusCell.text('Paid');
                            await window.electron.send('paidstatus', { milestone });
                        } catch (error) {
                            console.error('Error paying milestone:', error);
                        }
                    });
                    statusCell.append(payButton);
                } else if (invoice && milestone.status === 'paid') {
                    statusCell.text('Paid');
                } else {
                    statusCell.text('N/A');
                }
                row.append(statusCell);
                tableBody.append(row);
            } catch (error) {
                console.error('Error processing milestone:', error);
            }
        });

        function formatDate(dateString) {
            const date = new Date(dateString);
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-IN', options);
        };

        function formatCurrency(amount) {
            return parseFloat(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
        };

        function formatInvoiceNumber(invoiceNumber) {
            const yearPart = invoiceNumber.slice(0, 4);
            const sequentialPart = invoiceNumber.slice(4);
            return `${yearPart}-${sequentialPart}`;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
});
