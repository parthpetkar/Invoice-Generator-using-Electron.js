$(document).ready(async () => {
    try {
        const { company_name } = await window.electron.invoke('fetchCustomer');
        const $customerChoose = $('#customerChoose');
        $customerChoose.empty();
        $customerChoose.append('<option value="" disabled selected>Select Customer</option>');
        company_name.forEach(obj => {
            $customerChoose.append(`<option value="${obj.company_name}">${obj.company_name}</option>`);
        });

        $customerChoose.change(async () => {
            const selectedCompanyName = $customerChoose.val();
            const { projects } = await window.electron.invoke('fetchProject', selectedCompanyName);
            const $projectChoose = $('#projectChoose');
            $projectChoose.empty();
            $projectChoose.append('<option value="" disabled selected>Select Project</option>');
            projects.forEach(obj => {
                $projectChoose.append(`<option value="${obj.project_name}">${obj.project_name}</option>`);
            });
        });

        const $invoiceTableBody = $('#invoiceTable tbody');
        let selectedMilestones = [];

        $('#projectChoose').change(async () => {
            const selectedProjectName = $('#projectChoose').val();
            const { milestones } = await window.electron.invoke('fetchMilestones', selectedProjectName);
            $invoiceTableBody.empty();
            milestones.forEach(milestone => {
                // Create a new row
                const newRow = $('<tr>');

                newRow.append(`<td>${milestone.milestone_name}</td>`);
                newRow.append(`<td>${milestone.claim_percent}</td>`);
                newRow.append(`<td>${milestone.amount}</td>`);

                const checkbox = $('<input type="checkbox">');
                checkbox.on('change', function () {
                    if ($(this).is(':checked')) {
                        selectedMilestones.push(milestone);
                    } else {
                        selectedMilestones = selectedMilestones.filter(item => item !== milestone);
                    }
                });
                const actionCell = $('<td>').append(checkbox);

                newRow.append(actionCell);
                $invoiceTableBody.append(newRow);
            });
        });

        function formdatafetch() {
            // Get form field values
            const customer = $customerChoose.val();
            const project = $('#projectChoose').val();
            const invoiceNumber = $("#invoice_number").val();
            const invoiceDate = $("#invoice_date").val();
            const dueDate = $("#due_date").val();
            const description = $("#description").val();

            // Create an object to store the form data
            return {
                customer: customer,
                project: project,
                invoiceNumber: invoiceNumber,
                invoiceDate: invoiceDate,
                dueDate: dueDate,
                description: description
            };
        }

        $("#createInvoice").click(async () => {
            const formData = formdatafetch();
            const invoiceData = {
                formData: formData,
                milestones: selectedMilestones
            };
            try {
                await window.electron.send('createInvoice', { invoiceData });
                await window.electron.send('createForm', { invoiceData });
            } catch (error) {
                console.log(error);
            }
        });
    } catch (error) {
        console.log(error);
    }
});
