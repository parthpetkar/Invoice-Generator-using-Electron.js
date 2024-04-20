$(document).ready(async () => {
    try {
        const { company_name } = await window.electron.invoke('fetchCustomer');
        $('#customerChoose').empty();

        // Add a default option
        $('#customerChoose').append('<option value="" disabled selected>Select Customer</option>');

        // Populate the dropdown with company names
        company_name.forEach(obj => {
            $('#customerChoose').append('<option value="' + obj.company_name + '">' + obj.company_name + '</option>');
        });

        $('#customerChoose').change(async () => {
            const selectedCompanyName = $('#customerChoose').val();

            const { projects } = await window.electron.invoke('fetchProject', selectedCompanyName);
            $('#projectChoose').empty();

            // Add a default option
            $('#projectChoose').append('<option value="" disabled selected>Select Project</option>');

            // Populate the dropdown with project names
            projects.forEach(obj => {
                $('#projectChoose').append('<option value="' + obj.project_name + '">' + obj.project_name + '</option>');
            });
        });

        let selectedMilestones = [];

        $('#projectChoose').change(async () => {
            const selectedProjectName = $('#projectChoose').val();
            const { milestones } = await window.electron.invoke('fetchMilestones', selectedProjectName);

            // Clear previous data
            $('#invoiceTable tbody').empty();

            // Loop through milestoneData and insert into the table
            milestones.forEach(milestone => {
                // Create a new row
                const newRow = $('<tr>');

                // Add milestone name, claim percentage, and amount as cells in the row
                newRow.append('<td>' + milestone.milestone_name + '</td>');
                newRow.append('<td>' + milestone.claim_percent + '</td>');
                newRow.append('<td>' + milestone.amount + '</td>');

                // Create a checkbox for the action column
                const checkbox = $('<input type="checkbox">');
                checkbox.on('change', function () {
                    // If checkbox is checked, add the milestone to the selectedMilestones array
                    if ($(this).is(':checked')) {
                        selectedMilestones.push(milestone);
                    } else {
                        // If checkbox is unchecked, remove the milestone from the selectedMilestones array
                        selectedMilestones = selectedMilestones.filter(item => item !== milestone);
                    }
                });
                const actionCell = $('<td>').append(checkbox);

                newRow.append(actionCell);

                // Append the new row to the table body
                $('#invoiceTable tbody').append(newRow);
            });
        });

        function formdatafetch() {
            // Get form field values
            var customer = $('#customerChoose').val();
            var project = $('#projectChoose').val();
            var invoiceNumber = $("#invoice_number").val();
            var invoiceDate = $("#invoice_date").val();
            var dueDate = $("#due_date").val();
            var description = $("#description").val();

            // Create an object to store the form data
            var data = {
                customer: customer,
                project: project,
                invoiceNumber: invoiceNumber,
                invoiceDate: invoiceDate,
                dueDate: dueDate,
                description: description
            };
            return data;
        }

        $("#createInvoice").click(async () => {
            var formData = formdatafetch();
            var invoiceData = {
                formData: formData,
                milestones: selectedMilestones
            };
            try {
                await window.electron.send('createInvoice', { invoiceData });//send to  db
                await window.electron.send('createForm', { invoiceData }); //send to excel
            }
            catch (error) {
                console.log(error);
            }
        });
    } catch (error) {
        console.log(error);
    }
});
