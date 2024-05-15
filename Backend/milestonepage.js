$(document).ready(async () => {

    try {
        const { customers, milestones, projects, invoices } = await window.electron.invoke('fetchData');
        let displayedInvoices = [...invoices];

        const tableBody = $('#displayTable tbody');

        function displayInvoices(invoicesToDisplay) {
            tableBody.empty();

            invoicesToDisplay.forEach(async (invoice) => {
                try {
                    const row = $('<tr>');

                    const customer = customers.find(customer => customer.cin === invoice.cin);
                    const project = projects.find(project => project.cin === invoice.cin && project.pono === invoice.pono);
                    const milestone = milestones.find(
                        milestone => milestone.cin === invoice.cin && milestone.pono === invoice.pono && milestone.milestone_name === invoice.milestone_name
                    );

                    row.append(`<td class="invoice-number">${invoice ? formatInvoiceNumber(invoice.invoice_number) : '-'}</td>`);
                    row.append(`<td class="customer-name">${customer ? customer.company_name : '-'}</td>`);
                    row.append(`<td class="project-name">${project ? project.project_name : '-'}</td>`);
                    row.append(`<td class="milestone-name">${milestone ? milestone.milestone_name : '-'}</td>`);
                    row.append(`<td>${invoice ? formatDate(invoice.due_date) : '-'}</td>`);
                    row.append(`<td>${milestone ? formatCurrency(milestone.amount) : '-'}</td>`);

                    const statusCell = $('<td>');

                    if (invoice && milestone && milestone.status !== 'paid') {
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
                    } else if (invoice && milestone && milestone.status === 'paid') {
                        statusCell.text('Paid');
                    } else {
                        statusCell.text('-');
                    }
                    row.append(statusCell);

                    const differenceInDays = finddifferenceindays(invoice.due_date);

                    const statusBox = $('<span>')
                        .addClass('status-box')
                        .attr('data-difference', `${differenceInDays > 0 ?
                            (differenceInDays === 0 ? 'Today'
                                : `${Math.abs(differenceInDays)} day(s) left`)
                            : `${Math.abs(differenceInDays)} day(s) overdue`}`
                        );

                    if (differenceInDays > 7) {
                        statusBox.addClass('status-box-far');
                    } else if (differenceInDays > 0) {
                        statusBox.addClass('status-box-close');
                    } else if (differenceInDays === 0) {
                        statusBox.addClass('status-box-exact');
                        if (invoice.noti_sent === 'no') {
                            await window.electron.send('notification', {
                                invoiceNumber: invoice.invoiceNumber,
                                customer: customer.company_name,
                                project: project.project_name,
                                milestone: milestone.milestone_name,
                                invoice: invoice
                            })
                        }
                    } else {
                        statusBox.addClass('status-box-passed');
                    }

                    row.find('td:nth-child(5)').addClass('due-date').append(statusBox);
                    tableBody.append(row);
                } catch (error) {
                    console.error('Error processing invoice:', error);
                }
            });
        }

        // Initial display of invoices
        displayInvoices(displayedInvoices);

        // Filter invoices based on selected due date option
        $('#dueDateFilter').change(function () {
            const selectedFilter = $(this).val();
            if (selectedFilter === 'newest') {
                displayedInvoices = [...invoices];
                displayedInvoices.sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
            } else if (selectedFilter === 'oldest') {
                displayedInvoices = [...invoices];
                displayedInvoices.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
            } else if (selectedFilter === 'dueToday') {
                const today = new Date();
                displayedInvoices = invoices.filter(invoice => {
                    const dueDate = new Date(invoice.due_date);
                    return dueDate.getFullYear() === today.getFullYear() &&
                        dueDate.getMonth() === today.getMonth() &&
                        dueDate.getDate() === today.getDate();
                });
            } else {
                displayedInvoices = [...invoices]; // Reset to show all invoices
            }
            displayInvoices(displayedInvoices);
        });

        $('#tableFilter').on('input', function () {
            const filterValue = $(this).val().toLowerCase();
            $('#displayTable tbody tr').filter(function () {
                $(this).toggle($(this).text().toLowerCase().indexOf(filterValue) > -1);
            });
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

        function finddifferenceindays(duwdate) {
            const dueDate = new Date(duwdate);
            const currentDate = new Date();
            const differenceInDays = Math.floor((dueDate - currentDate) / (1000 * 60 * 60 * 24)) + 1;
            return differenceInDays;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
});
