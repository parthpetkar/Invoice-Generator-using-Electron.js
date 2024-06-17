$(document).ready(async () => {
    function saveCustomerData() {
        // var gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        // var panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        // var cinPattern = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

        var isValid = true;
        var companyName = $('#customer_company_name').val().trim();
        var address1 = $('#customer_address1').val().trim();
        var address2 = $('#customer_address2').val().trim();
        var address3 = $('#customer_address3').val().trim();
        var gstin = $('#customer_gstin').val().trim();
        var pan = $('#customer_pan').val().trim();
        var cin = $('#customer_cin').val().trim();

        $('.error').remove();

        if (companyName === '') {
            isValid = false;
            $('#customer_company_name').after('<span class="error">This field is required</span>');
        }

        if (address1 === '') {
            isValid = false;
            $('#customer_address1').after('<span class="error">This field is required</span>');
        }

        if (address3 === '') {
            isValid = false;
            $('#customer_address3').after('<span class="error">This field is required</span>');
        }

        if (gstin === '') {
            isValid = false;
            $('#customer_gstin').after('<span class="error">This field is required</span>');
        }
        // else if (!gstinPattern.test(gstin)) {
        //     isValid = false;
        //     $('#customer_gstin').after('<span class="error">Invalid GSTIN format</span>');
        // }

        if (pan === '') {
            isValid = false;
            $('#customer_pan').after('<span class="error">This field is required</span>');
        }
        // else if (!panPattern.test(pan)) {
        //     isValid = false;
        //     $('#customer_pan').after('<span class="error">Invalid PAN format</span>');
        // }

        // Validate CIN
        if (cin === '') {
            isValid = false;
            $('#customer_cin').after('<span class="error">This field is required</span>');
        }
        // else if (!cinPattern.test(cin)) {
        //     isValid = false;
        //     $('#customer_cin').after('<span class="error">Invalid CIN format</span>');
        // }

        // If the form is valid, submit it
        if (!isValid) {
            alert('Form is invalid');
        }

        return {
            companyName: companyName,
            address1: address1,
            address2: address2,
            address3: address3, 
            gstin: gstin,
            pan: pan,
            cin: cin
        };
    }

    var projectData = {};
    function saveProjectData() {
        var isValid = true;
        var customerName = $('#customerSelect').val();
        var projectName = $('#project_name').val().trim();
        var poNo = $('#customer_poNo').val().trim();
        var totalPrice = $('#total_price').val().trim();
        var taxes = $('#taxes_select').val();
        var taxTypes = $('#tax_type_select').val();

        $('.error').remove();

        if (!customerName) {
            isValid = false;
            $('#customerSelect').after('<span class="error">This field is required</span>');
        }

        if (projectName === '') {
            isValid = false;
            $('#project_name').after('<span class="error">This field is required</span>');
        }

        if (poNo === '') {
            isValid = false;
            $('#customer_poNo').after('<span class="error">This field is required</span>');
        }

        if (totalPrice === '') {
            isValid = false;
            $('#total_price').after('<span class="error">This field is required</span>');
        } else if (isNaN(totalPrice)) {
            isValid = false;
            $('#total_price').after('<span class="error">Invalid price format</span>');
        }

        if (!isValid) {
            alert('Form is invalid');
        }

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

    try {
        function calculateTotalClaimPercentage() {
            let total = 0;
            $("#dataTable tbody tr").each(function () {
                const claimPercentage = parseFloat($(this).find(".claimPercentageCell").text());
                if (!isNaN(claimPercentage)) {
                    total += claimPercentage;
                }
            });
            return total;
        }

        function toggleAddMilestoneButton() {
            $("#add_milestone").prop("disabled", calculateTotalClaimPercentage() >= 100);
        }

        function addRow() {
            if (calculateTotalClaimPercentage() < 100) {
                const newRow = $("<tr>");
                const milestoneCell = $("<td>").addClass("milestoneCell").text("Milestone Name").attr("contenteditable", true);
                const claimPercentageCell = $("<td>").addClass("claimPercentageCell").text("Claim Percentage").attr("contenteditable", true);
                const amountCell = $("<td>").addClass("amountCell").text("Amount").prop("disabled", true);
                const editBtn = $("<button>").addClass("editBtn").text("Edit");
                const deleteBtn = $("<button>").addClass("deleteBtn").text("Delete");

                claimPercentageCell.on("input", function () {
                    const claimPercentage = parseFloat($(this).text());
                    if (!isNaN(claimPercentage)) {
                        const amount = claimPercentage * projectData.totalPrice / 100;
                        amountCell.text(amount.toFixed(2)).prop("disabled", false);
                    } else {
                        amountCell.text("Amount").prop("disabled", true);
                    }
                });

                newRow.append(milestoneCell, claimPercentageCell, amountCell, $("<td>").append(editBtn).append(deleteBtn));
                $("#dataTable tbody").append(newRow);
            }
        }

        // $(document).ready(function () {
        //     toggleAddMilestoneButton();

        //     $("#add_milestone").click(function () {
        //         addRow();
        //     });

        //     $("#create_milestones").click(function () {
        //         saveMilestones();
        //     });
        // });

        $("#dataTable").on("click", ".editBtn", function () {
            const row = $(this).closest("tr");
            const milestoneCell = row.find(".milestoneCell");
            const claimPercentageCell = row.find(".claimPercentageCell");

            milestoneCell.attr("contenteditable", true);
            claimPercentageCell.attr("contenteditable", true);

            milestoneCell.focus(); // Optional: focus on milestone cell to start editing

            $(this).remove(); // Remove edit button
            row.find("td:last-child").prepend($("<button>").addClass("saveBtn").text("Save")); // Add save button
        });

        $("#dataTable").on("click", ".saveBtn", function () {
            const row = $(this).closest("tr");
            const milestoneCell = row.find(".milestoneCell");
            const claimPercentageCell = row.find(".claimPercentageCell");

            milestoneCell.attr("contenteditable", false);
            claimPercentageCell.attr("contenteditable", false);

            $(this).remove(); // Remove save button
            row.find("td:last-child").prepend($("<button>").addClass("editBtn").text("Edit")); // Add edit button

            toggleAddMilestoneButton();
        });

        $("#dataTable").on("click", ".deleteBtn", function () {
            $(this).closest("tr").remove();
            toggleAddMilestoneButton();
        });

        async function saveMilestones() {
            const milestones = [];
            $("#dataTable tbody tr").each(function () {
                const row = $(this);
                const milestone = row.find(".milestoneCell").text();
                const claimPercentage = parseFloat(row.find(".claimPercentageCell").text());
                const amount = parseFloat(row.find(".amountCell").text());

                if (!isNaN(claimPercentage) && claimPercentage > 0 && milestone.trim() !== "") {
                    milestones.push({
                        milestone: milestone,
                        claimPercentage: claimPercentage,
                        amount: amount.toFixed(2)
                    });
                }
            });

            if (milestones.length > 0) {
                // Handle saving milestones
                console.log("Saving milestones:", milestones);
                await window.electron.send('insertMilestone', { milestones, projectData });
                window.electron.receive('createProjectResponse', (response) => {
                    if (response.success) {
                        alert(`Project created successfully`);
                    } else {
                        alert(`Error: ${response.message}\n${response.error}`);
                    }
                });
            } else {
                console.log("No valid milestones to save.");
            }
        }
        $("#add_milestone").click(function () {
            toggleAddMilestoneButton();
            addRow();
        });
        $("#create_milestone").click(async () => {
            try {
                saveMilestones();
            } catch (error) {
                console.log(error);
            }
        });
    } catch (error) {
        console.log(error);
    }

    $("#saveCustomer").click(async () => {
        try {
            const customerData = saveCustomerData();
            await window.electron.send('createCustomer', { customerData });
            window.electron.receive('createCustomerResponse', (response) => {
                if (response.success) {
                    alert(`Customer created successfully with ID: ${response.customerId}`);
                } else {
                    alert(`Error: ${response.message}\n${response.error}`);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });

    $("#saveProject").click(async () => {
        try {
            projectData = saveProjectData();
            $('#milestone_table').show();
            $('#customer_form').hide();
        } catch (error) {
            console.log(error);
        }
    });

    // $("#create_milestone").click(async () => {
    //     try {
    //         await window.electron.send('insertMilestone', { rowDataArray, projectData });
    //         window.electron.receive('createProjectResponse', (response) => {
    //             if (response.success) {
    //                 alert(`Project created successfully with ID: ${response.newProjectId}`);
    //             } else {
    //                 alert(`Error: ${response.message}\n${response.error}`);
    //             }
    //         });
    //     } catch (error) {
    //         console.log(error);
    //     }
    // });

    try {
        const { company_name } = await window.electron.invoke('fetchCustomer');
        $('#customerSelect').empty();
        $('#customerSelect').append('<option value="" disabled selected>Select Customer</option>');
        company_name.forEach(obj => $('#customerSelect').append(`<option value="${obj.company_name}">${obj.company_name}</option>`));
    } catch (error) {
        console.log(error);
    }
});
