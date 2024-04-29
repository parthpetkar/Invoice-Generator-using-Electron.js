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
    try {

        const tax = $('#taxes_select').val();
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
                $(".saveBtn").prop("disabled", true);
            } else {
                $(".saveBtn").prop("disabled", false);
            }
        }
        addRow();
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
            addRow();
            toggleAddRowButton();
        });

        function addRow() {
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
        };

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
                await window.electron.send('insertMilestone', { rowDataArray, projectData });
            } catch (error) {
                console.log(error)
            }
        });

        $("#saveCustomer").click(async () => {
            try {
                await window.electron.send('createCustomer', { customerData });
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


        $("#saveCustomer").click(function () {
            $(".error").empty();
            var isValid = true;

            // Validate Company Name
            var companyName = $("#customer_company_name").val().trim();
            if (companyName === "") {
                $("#companyNameError").text("Please enter Company Name");
                isValid = false;
            }

            // Validate Address
            var address = $("#customer_address").val().trim();
            if (address === "") {
                $("#addressError").text("Please enter Address");
                isValid = false;
            }

            // Validate Phone Number
            var phone = $("#customer_phone").val().trim();
            if (phone === "") {
                $("#phoneError").text("Please enter Phone Number");
                isValid = false;
            } else if (!/^\d{10}$/.test(phone)) {
                $("#phoneError").text("Invalid Phone Number");
                isValid = false;
            }

            // Validate GST Identification Number
            var gstin = $("#customer_gstin").val().trim();
            if (gstin === "") {
                $("#gstinError").text("Please enter GST Identification Number");
                isValid = false;
            } else if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[A-Z\d]{1}$/.test(gstin)) {
                $("#gstinError").text("Invalid GST Identification Number");
                isValid = false;
            }

            // Validate PAN Number
            var pan = $("#customer_pan").val().trim();
            if (pan === "") {
                $("#panError").text("Please enter PAN Number");
                isValid = false;
            } else if (!/[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(pan)) {
                $("#panError").text("Invalid PAN Number");
                isValid = false;
            }

            // Validate Corporate Identification Number
            var cin = $("#customer_cin").val().trim();
            if (cin === "") {
                $("#cinError").text("Please enter Corporate Identification Number");
                isValid = false;
            } else if (!/^([LUu]{1})([0-9]{5})([A-Za-z]{2})([0-9]{4})([A-Za-z]{3})([0-9]{6})$/.test(cin)) {
                $("#cinError").text("Invalid Corporate Identification Number");
                isValid = false;
            }

            // If all fields are valid, submit the form
            if (isValid) {
                $("#myForm").submit(function () {
                    customerData = saveCustomerData();
                });
                // Save customer data

            }
        });
        $("#saveProject").click(function () {
            $(".error").empty();
            var isValid = true;

            // Validate Select Customer
            var customerSelect = $("#customerSelect").val();
            if (customerSelect === null) {
                $("#customerSelectError").text("Please select a customer");
                isValid = false;
            }

            // Validate Project Name
            var projectName = $("#project_name").val().trim();
            if (projectName === "") {
                $("#projectNameError").text("Please enter Project Name");
                isValid = false;
            }

            // Validate Purchase Order Number
            var poNo = $("#customer_poNo").val().trim();
            if (poNo === "") {
                $("#poNoError").text("Please enter Purchase Order Number");
                isValid = false;
            } else if (!/^\d{4}-\d{4}$/.test(poNo)) {
                $("#poNoError").text("Invalid Purchase Order Number. Format: XXXX-XXXX");
                isValid = false;
            }

            // Validate Total Price
            var totalPrice = $("#total_price").val().trim();
            if (totalPrice === "") {
                $("#totalPriceError").text("Please enter Total Price");
                isValid = false;
            } else if (!/^\d+(\.\d{1,2})?$/.test(totalPrice)) {
                $("#totalPriceError").text("Invalid Total Price. Please enter a valid amount.");
                isValid = false;
            }

            // If all fields are valid, submit the form
            if (isValid) {
                $("#myForm").submit(function () {
                    projectData = saveProjectData();
                    e.preventDefault();
                    $('#customer_form').hide();
                    $('#milestone_table').show();
                    addRow();
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
});