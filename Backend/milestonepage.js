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

                row.append(`<td class="invoice-number">${invoice ? formatInvoiceNumber(invoice.invoice_number) : '-'}</td>`);
                row.append(`<td class="customer-name">${customer ? customer.company_name : '-'}</td>`);
                row.append(`<td class="project-name">${project ? project.project_name : '-'}</td>`);
                row.append(`<td class="milestone-name">${milestone.milestone_name}</td>`);
                row.append(`<td>${invoice ? formatDate(invoice.due_date) : '-'}</td>`);
                // row.append(`<td class="remainingamount">${invoice ? formatCurrency(milestone.amount) : 'N/A'}</td>`);

                const statusCell = $('<td>');

                if (invoice && milestone.status !== 'paid') {
                    const payButton = $('<button>').addClass('pay-btn').text('Pay');
                    payButton.click(async function () {
                        try {
                            $(this).hide();
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
                    statusCell.text('-');
                }
                row.append(statusCell);
                tableBody.append(row);

                const dueDate = new Date(invoice.due_date);
                const currentDate = new Date();
                const differenceInDays = (Math.floor((dueDate - currentDate) / (1000 * 60 * 60 * 24))) + 1;

                const statusBox = $('<span>')
                    .addClass('status-box')
                    .attr('data-difference', `${differenceInDays > 0 ? (differenceInDays === 0 ? 'Today' : `${Math.abs(differenceInDays)} day(s) left`) : `${Math.abs(differenceInDays)} day(s) overdue`}`);

                if (differenceInDays > 7) {
                    statusBox.addClass('status-box-far');
                } else if (differenceInDays > 0) {
                    statusBox.addClass('status-box-close');
                } else if (differenceInDays === 0) {
                    statusBox.addClass('status-box-exact');
                    await window.electron.send('notification', { invoiceNumber: invoice.invoiceNumber, customer: customer.company_name, project: project.project_name, milestone: milestone.milestone_name })
                } else {
                    statusBox.addClass('status-box-passed');
                }

                row.find('td:nth-child(5)').addClass('due-date').append(statusBox);
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
