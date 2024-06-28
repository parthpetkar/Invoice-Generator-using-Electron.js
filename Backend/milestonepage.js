$(document).ready(async () => {
    try {
        const { customers, milestones, projects, invoices } = await window.electron.invoke('fetchData');
        let displayedMilestones = [...milestones];

        const tableBody = $('#displayTable tbody');

        function daysUntilDue(dueDate) {
            const currentDate = new Date();
            const dueDateObj = new Date(dueDate);
            const diffTime = dueDateObj - currentDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        }

        function displayMilestones(milestonesToDisplay) {
            tableBody.empty();

            milestonesToDisplay.forEach(async (milestone) => {
                try {
                    const row = $('<tr>');

                    const customer = customers.find(customer => customer.customer_id === milestone.customer_id);
                    const project = projects.find(project => project.customer_id === milestone.customer_id && project.internal_project_id === milestone.internal_project_id);
                    const invoice = invoices.find(invoice => invoice.customer_id === milestone.customer_id && invoice.internal_project_id === milestone.internal_project_id && invoice.milestone_id === milestone.milestone_id);

                    row.append(`<td class="customer-name">${customer ? customer.company_name : '-'}</td>`);
                    row.append(`<td class="project-name">${project ? project.internal_project_id : '-'}</td>`);
                    row.append(`<td class="milestone-name">${milestone ? milestone.milestone_name : '-'}</td>`);
                    row.append(`<td>${milestone ? milestone.claim_percent + '%' : '-'}</td>`);
                    row.append(`<td>${milestone ? formatCurrency(milestone.amount) : '-'}</td>`);

                    // Add indicator for due date
                    if (invoice) {
                        const daysLeft = daysUntilDue(invoice.invoice_date);
                        let textColor;
                        if (daysLeft < 0) {
                            textColor = 'red'; // Overdue
                        } else if (daysLeft === 0) {
                            textColor = 'orange'; // Due today
                        } else if (daysLeft <= 3) {
                            textColor = 'black'; // Due within a week
                        } else {
                            textColor = 'green'; // Due later
                        }
                        const dueDateContent = invoice.status === 'paid' ? '-' : `${daysLeft} days`;
                        row.append(`<td style="color: ${textColor};">${dueDateContent}</td>`);
                    } else {
                        row.append('<td>-</td>');
                    }

                    row.append(`<td>${milestone.pending === 'no' ? `${invoice.status === 'paid' ? 'Paid' : 'Invoice Issued'}` : 'Invoice Not Issued'}</td>`);

                    const actionCell = $('<td>');
                    if (milestone.pending === 'no') {
                        const checkInvoiceDetailsButton = $('<button class="button">Check Invoice Details</button>');
                        checkInvoiceDetailsButton.on('click', () => {
                            openInvoiceDetails(invoice, milestone);
                        });
                        actionCell.append(checkInvoiceDetailsButton);
                    } else {
                        const checkbox = $('<input type="checkbox" class="select-milestone">').data('milestone', {
                            ...milestone,
                            customer_name: customer ? customer.company_name : '-',
                            project_name: project ? project.project_name : '-'
                        });
                        actionCell.append(checkbox);
                    }
                    row.append(actionCell);

                    tableBody.append(row);
                } catch (error) {
                    console.error('Error processing milestone:', error);
                }
            });
        }

        // Initial display of milestones
        displayMilestones(displayedMilestones);

        $('#create_invoice').click(function () {
            const selectedMilestones = $('.select-milestone:checked').map(function () {
                return $(this).data('milestone');
            }).get();

            openModal(selectedMilestones);
        });

        $('#tableFilter').on('input', function () {
            const filterValue = $(this).val().toLowerCase();
            $('#displayTable tbody tr').filter(function () {
                $(this).toggle($(this).text().toLowerCase().indexOf(filterValue) > -1);
            });
        });

        function formatCurrency(amount) {
            return parseFloat(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
        }

        function openModal(selectedMilestones) {
            $('#invoiceModal').show();

            const totalAmount = selectedMilestones.reduce((sum, milestone) => sum + parseFloat(milestone.amount), 0);
            const customerName = selectedMilestones[0]?.customer_name || '-';
            const projectID = selectedMilestones[0]?.internal_project_id || '-';

            const selectedMilestonesList = selectedMilestones.map(milestone =>
                `<li>${milestone.milestone_name} - ${formatCurrency(milestone.amount)}</li>`
            ).join('');

            $('#selectedMilestones').html(`
                <h3>Selected Milestones:</h3>
                <p>Company Name: ${customerName}</p>
                <p>Project ID: ${projectID}</p>
                <p>Total Amount: ${formatCurrency(totalAmount)}</p>
                <ul>${selectedMilestonesList}</ul>
            `);

            // Show/hide custom date container based on checkbox state
            $('#customDateCheckbox').change(function () {
                if ($(this).is(':checked')) {
                    $('#customDateContainer').show();
                } else {
                    $('#customDateContainer').hide();
                }
            });

            $('#createInvoiceBtn').off('click').on('click', async function () {
                try {
                    let customDate = null;
                    if ($('#customDateCheckbox').is(':checked')) {
                        customDate = $('#customDate').val();
                    }

                    // Add custom date to each milestone
                    selectedMilestones.forEach(milestone => {
                        milestone.custom_date = customDate;
                    });

                    const invoiceType = $('#invoiceType').val();
                    // await window.electron.send('createInvoice', { selectedMilestones });
                    await window.electron.send('createForm', { selectedMilestones, invoiceType });

                    $('#invoiceModal').hide();
                    displayMilestones(displayedMilestones); // Refresh the table
                } catch (error) {
                    console.error('Error creating invoices:', error);
                }
            });

            $('.close-btn').click(function () {
                $('#invoiceModal').hide();
            });

            $(window).click(function (event) {
                if (event.target.id === 'invoiceModal') {
                    $('#invoiceModal').hide();
                }
            });
        }

        function openInvoiceDetails(invoice, milestone) {
            const invoiceDetailsCard = $('#invoiceDetailsCard');
            const cardBody = invoiceDetailsCard.find('.card-body');
            console.log(invoice);
            cardBody.html(`
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Invoice Date:</strong> ${invoice.invoice_date}</p>
                <p><strong>Due Date:</strong> ${invoice.due_date}</p>
                <p><strong>Total Price:</strong> ${formatCurrency(invoice.total_prices)}</p>
                <p><strong>Milestone Name:</strong> ${milestone.milestone_name}</p>
            `);

            const cardFooter = invoiceDetailsCard.find('.card-footer');
            cardFooter.empty();

            if (invoice.status === 'unpaid') {
                const payButton = $('<button class="button" id="payInvoiceBtn">Pay</button>');
                payButton.on('click', async () => {
                    try {
                        await window.electron.invoke('payInvoice', milestone.milestone_id);
                        invoiceDetailsCard.hide();
                        invoice.status = 'paid';
                        displayMilestones(displayedMilestones); // Refresh the table
                    } catch (error) {
                        console.error('Error updating milestone status:', error);
                    }
                });
                cardFooter.append(payButton);
            }

            $('#closeInvoiceDetailsCard').off('click').on('click', function () {
                invoiceDetailsCard.hide();
            });

            invoiceDetailsCard.show();
        }

    } catch (error) {
        console.error('Error fetching data:', error);
    }
});