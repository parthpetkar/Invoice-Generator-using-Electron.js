$(document).ready(async () => {

    try {
        const { customers, milestones, projects, invoices } = await window.electron.invoke('fetchData');
        let displayedMilestones = [...milestones];

        const tableBody = $('#displayTable tbody');

        function displayMilestones(milestonesToDisplay) {
            tableBody.empty();

            milestonesToDisplay.forEach(async (milestone) => {
                try {
                    const row = $('<tr>');

                    const customer = customers.find(customer => customer.customer_id === milestone.customer_id);
                    const project = projects.find(project => project.customer_id === milestone.customer_id && project.internal_project_id === milestone.internal_project_id);
                    const invoice = invoices.find(invoices => invoices.customer_id === milestone.customer_id && invoices.internal_project_id === milestone.internal_project_id && invoices.milestone_id === milestone.milestone_id);

                    row.append(`<td class="customer-name">${customer ? customer.company_name : '-'}</td>`);
                    row.append(`<td class="project-name">${project ? project.internal_project_id : '-'}</td>`);
                    row.append(`<td class="milestone-name">${milestone ? milestone.milestone_name : '-'}</td>`);
                    row.append(`<td>${milestone ? milestone.claim_percent + '%' : '-'}</td>`);
                    row.append(`<td>${milestone ? formatCurrency(milestone.amount) : '-'}</td>`);
                    row.append(`<td>${invoice && invoice.pending === 'no' ? 'Invoice Issued' : 'Invoice Not Issued'}</td>`);

                    const actionCell = $('<td>');
                    const checkbox = $('<input type="checkbox" class="select-milestone">').data('milestone', { ...milestone, customer_name: customer ? customer.company_name : '-' }); // Include customer_name in the data object
                    actionCell.append(checkbox);
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

    } catch (error) {
        console.error('Error fetching data:', error);
    }
});

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

    $('#create_invoice').off('click').on('click', async function () {
        try {
            // Send data to ipcMain
            window.electron.send('createForm', { invoiceData: { selectedMilestones } });

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


function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}
