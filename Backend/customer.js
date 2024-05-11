$(document).ready(async () => {
    function saveCustomerData() {
        var companyName = $('#customer_company_name').val();
        var address = $('#customer_address').val();
        var phone = $('#customer_phone').val();
        var gstin = $('#customer_gstin').val();
        var pan = $('#customer_pan').val();
        var cin = $('#customer_cin').val();

        return {
            companyName: companyName,
            address: address,
            phone: phone,
            gstin: gstin,
            pan: pan,
            cin: cin
        };
    }

    function saveProjectData() {
        var customerName = $('#customerSelect').val();
        var projectName = $('#project_name').val();
        var poNo = $('#customer_poNo').val();
        var totalPrice = $('#total_price').val();
        var taxes = $('#taxes_select').val();
        var taxTypes = $('#tax_type_select').val();

        return {
            customerName: customerName,
            projectName: projectName,
            poNo: poNo,
            totalPrice: totalPrice,
            taxes: taxes,
            taxTypes: taxTypes
        };
    }

    try {
        const tax = $('#taxes_select').val();
        $('#tax_type').toggle(tax === "True");

        $('#taxes_select').change(function () {
            $('#tax_type').toggle($(this).val() === "True");
        });

    } catch (error) {
        console.log(error);
    }

    let rowDataArray = [];
    try {

        function calculateTotalClaimPercentage() {
            return rowDataArray.reduce((total, rowData) => total + rowData.claimPercentage, 0);
        }

        function toggleAddRowButton() {
            $("#addRowBtn").prop("disabled", calculateTotalClaimPercentage() >= 100);
        }

        function addRow() {
            if (calculateTotalClaimPercentage() < 100) {
                const newRow = $("<tr>");
                const milestoneCell = $("<td>").addClass("milestoneCell").text("Milestone Name");
                const claimPercentageCell = $("<td>").addClass("claimPercentageCell").text("Claim Percentage");
                const amountCell = $("<td>").addClass("amountCell").text("Amount").prop("disabled", true);
                const saveBtn = $("<button>").addClass("saveBtn").text("Save");
                const deleteBtn = $("<button>").addClass("deleteBtn").text("Delete");

                milestoneCell.attr("contenteditable", true);
                claimPercentageCell.attr("contenteditable", true);
                projectData = saveProjectData();
                claimPercentageCell.on("input", function () {
                    const claimPercentage = parseFloat($(this).text());
                    if (!isNaN(claimPercentage)) {
                        const amount = claimPercentage * projectData.totalPrice / 100;
                        amountCell.text(amount.toFixed(2)).prop("disabled", false);
                    } else {
                        amountCell.text("Amount").prop("disabled", true);
                    }
                });

                newRow.append(milestoneCell, claimPercentageCell, amountCell, $("<td>").append(saveBtn).append(deleteBtn));
                $("#dataTable tbody").append(newRow);
            }
        }

        $(document).ready(function () {
            addRow();
            toggleAddRowButton();
        });

        $("#dataTable").on("click", ".saveBtn", function () {
            const row = $(this).closest("tr");
            const milestone = row.find(".milestoneCell").text();
            const claimPercentage = parseFloat(row.find(".claimPercentageCell").text());
            const amount = parseFloat(row.find(".amountCell").text());

            const rowData = {
                milestone: milestone,
                claimPercentage: claimPercentage,
                amount: amount.toFixed(2)
            };

            rowDataArray.push(rowData);
            toggleAddRowButton();
            addRow();
        });

        $("#dataTable").on("click", ".deleteBtn", function () {
            const row = $(this).closest("tr");
            const index = row.index();
            rowDataArray.splice(index, 1);
            row.remove();
            toggleAddRowButton();
        });

    } catch (error) {
        console.log(error);
    }

    $("#saveCustomer").click(async () => {
        try {
            const customerData = saveCustomerData();
            const result = await window.electron.send('createCustomer', { customerData });
            console.log(result);
        } catch (error) {
            console.log(error);
        }
    });

    $("#saveProject").click(async () => {
        projectData = saveProjectData();
        try {
            await window.electron.send('createProject', { projectData });
            $('#milestone_table').show();
            $('#customer_form').hide();
        } catch (error) {
            console.log(error);
        }
    });

    $("#create_milestone").click(async () => {
        try {
            await window.electron.send('insertMilestone', { rowDataArray, projectData });
        } catch (error) {
            console.log(error);
        }
    });

    try {
        const { company_name } = await window.electron.invoke('fetchCustomer');
        $('#customerSelect').empty();
        $('#customerSelect').append('<option value="" disabled selected>Select Customer</option>');
        company_name.forEach(obj => $('#customerSelect').append(`<option value="${obj.company_name}">${obj.company_name}</option>`));
    } catch (error) {
        console.log(error);
    }
});
