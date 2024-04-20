$(document).ready(async () => { //it waits for html to load
    function saveCustomerData() {
        var companyName = $('#customer_company_name').val();
        var address = $('#customer_address').val();
        var phone = $('#customer_phone').val();
        var gstin = $('#customer_gstin').val();
        var pan = $('#customer_pan').val();
        var cin = $('#customer_cin').val();

        // Create a customer object
        var customer = {
            companyName: companyName,
            address: address,
            phone: phone,
            gstin: gstin,
            pan: pan,
            cin: cin
        };
        return customer;
    }

    // Function to save project data
    function saveProjectData() {
        var customerName = $('#customerSelect').val();
        var projectName = $('#project_name').val();
        var poNo = $('#customer_poNo').val();
        var totalPrice = $('#total_price').val();
        var taxes = $('#taxes_select').val();
        var taxTypes = $('#tax_type_select').val();
        // Create a project object
        var project = {
            customerName: customerName,
            projectName: projectName,
            poNo: poNo,
            totalPrice: totalPrice,
            taxes: taxes,
            taxTypes: taxTypes
        };
        return project;
    }
    var customerData = {};
    var projectData = {};
    // Save customer data when save button on panel 1 is clicked
    $('#saveCustomer').on('click', function () {
        customerData = saveCustomerData();
    });

    // Save project data when save button on panel 2 is clicked
    $('#saveProject').on('click', function () {
        projectData = saveProjectData();
    });

    try {
        $('#back_btn').click(async (e) => {
            e.preventDefault();
            $('#milestone_table').hide();
            $('#customer_form').show();
        });


        const tax = $('#taxes_select').val();
        const tax_options = $('#tax_type_select').val();
        if (tax === true) {
            $('#tax_type').show();
        }

        $('#taxes_select').change(function () {
            const tax = $(this).val();
            if (tax === "True") {
                $('#tax_type').show();
            } else {
                $('#tax_type').hide();
            }
        });
        $('#tax_type_select').change(function () {
            const tax_options = $(this).val();
        })
        const table = $("#dataTable");


        let rowDataArray = [];

        // Function to check if claim percentage exceeds 100%
        function calculateTotalClaimPercentage() {
            let totalClaimPercentage = 0;
            rowDataArray.forEach(function (rowData) {
                totalClaimPercentage += rowData.claimPercentage;
            });
            return totalClaimPercentage;
        }

        // Function to toggle addRowBtn based on total claim percentage
        function toggleAddRowButton() {
            const totalClaimPercentage = calculateTotalClaimPercentage();
            if (totalClaimPercentage === 100) {
                $("#addRowBtn").prop("disabled", true);
            } else {
                $("#addRowBtn").prop("disabled", false);
            }
        }

        // Event listener for Save button click
        $("#dataTable").on("click", ".saveBtn", function () {
            const row = $(this).closest("tr"); // Get the closest row to the clicked button

            // Get milestone name, claim percentage, and amount from the row
            const milestone = row.find(".milestoneCell").text();
            const claimPercentage = parseFloat(row.find(".claimPercentageCell").text());
            const amount = parseFloat(row.find(".amountCell").text());

            // Create an object representing row data
            const rowData = {
                milestone: milestone,
                claimPercentage: claimPercentage,
                amount: amount.toFixed(2)
            };

            // Push the row data object into the array
            rowDataArray.push(rowData);
            toggleAddRowButton();
        });

        $("#addRowBtn").click(function () {
            // Create a new row
            const newRow = $("<tr>");

            // Add cells to the new row
            const milestoneCell = $("<td>").addClass("milestoneCell").text("Milestone Name");
            const claimPercentageCell = $("<td>").addClass("claimPercentageCell").text("Claim Percentage");
            const amountCell = $("<td>").addClass("amountCell").text("Amount").prop("disabled", true); // Initially disabled
            const saveBtn = $("<button>").addClass("saveBtn").text("Save");
            const deleteBtn = $("<button>").addClass("deleteBtn").text("Delete"); // Add delete button

            // Make cells mutable
            milestoneCell.attr("contenteditable", true);
            claimPercentageCell.attr("contenteditable", true);

            // Event listener for claimPercentageCell changes
            claimPercentageCell.on("input", function () {
                const claimPercentage = parseFloat($(this).text());
                if (!isNaN(claimPercentage)) { // If claim percentage is a valid number
                    const amount = claimPercentage * projectData.totalPrice / 100;
                    amountCell.text(amount.toFixed(2)).prop("disabled", false); // Enable and display amount
                } else {
                    amountCell.text("Amount").prop("disabled", true); // Disable amount if claim percentage is not valid
                }
            });

            newRow.append(milestoneCell, claimPercentageCell, amountCell, $("<td>").append(saveBtn).append(deleteBtn)); // Append the new row to the table
            $("#dataTable tbody").append(newRow);
        });

        // Event listener for Delete button click
        $("#dataTable").on("click", ".deleteBtn", function () {
            const row = $(this).closest("tr"); // Get the closest row to the clicked button
            const index = row.index(); // Get the index of the row
            rowDataArray.splice(index, 1); // Remove the row data from the array
            row.remove(); // Remove the row from the table
            toggleAddRowButton(); // Toggle addRowBtn based on total claim percentage
        });



        $("#create_milestone").click(async () => {
            try {
                //await window.electron.send('createCustomer', { customerData });
                await window.electron.send('insertMilestone', { rowDataArray, projectData });
            } catch (error) {
                console.log(error)
            }
        });

        $("#saveCustomer").click(async () => {
            try {
                await window.electron.send('createCustomer', { customerData });
                // await window.electron.send('insertmilestone', { rowDataArray });
            } catch (error) {
                console.log(error)
            }
        });

        $("#saveProject").click(async () => {
            try {
                await window.electron.send('createProject', { projectData });
            }
            catch(error) {
                console.log(error);
            }
        })

        const { company_name } = await window.electron.invoke('fetchCustomer');
        $('#customerSelect').empty();

        // Add a default option
        $('#customerSelect').append('<option value="" disabled selected>Select Customer</option>');

        // Populate the dropdown with company names
        company_name.forEach(function (obj) {
            $('#customerSelect').append('<option value="' + obj.company_name + '">' + obj.company_name + '</option>');
        });

    } catch (error) {
        console.log(error);
    }
});