$(document).ready(async () => {
    try {
        const $customerChoose = $('#customerChoose');
        const $projectChoose = $('#projectChoose');

        // Fetch customer names
        const { company_name } = await window.electron.invoke('fetchCustomer');

        // Populate customer dropdown with autocomplete
        const customerNames = company_name.map(obj => obj.company_name);
        $customerChoose.autocomplete({
            source: customerNames
        });

        // On customer selection change
        $customerChoose.on('autocompleteselect', async function (event, ui) {
            const selectedCompanyName = ui.item.value;

            try {
                // Fetch projects for the selected customer
                const { projects } = await window.electron.invoke('fetchProject', selectedCompanyName);

                // Populate project dropdown with autocomplete
                const projectOptions = projects.map(obj => ({
                    label: `${obj.internal_project_id}: ${obj.project_name}`,
                    value: obj.internal_project_id
                }));
                $projectChoose.autocomplete({
                    source: projectOptions
                });
            } catch (error) {
                console.error("Error fetching project data:", error);
            }
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
            const templateType = $('#template_type').val();

            console.log(templateType)

            // Create an object to store the form data
            return {
                customer: customer,
                project: project,
                invoiceNumber: invoiceNumber,
                invoiceDate: invoiceDate,
                dueDate: dueDate,
                description: description,
                templateType: templateType
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
