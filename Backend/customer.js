$(document).ready(function () { //it waits for html to load

    // Clear previous error messages
    // $('.error-msg').text('');

    $('#save_customer').click(function () {
        var company_name = $('#customer_company_name').val();
        var address = $('#customer_address').val();
        var phone = $('#customer_phone').val();
        var gstin = $('#customer_gstin').val();
        var pan = $('#customer_pan').val();
        var cin = $('#customer_cin').val();
        var poNo = $('#customer_poNo').val();

        window.electron.send('createCustomer', { company_name: company_name, address: address, phone: phone, gstin: gstin, pan: pan, cin: cin, poNo: poNo });
    });

    var itemsPerPage = 14;
    var customerData = []; // Declare an empty array to hold customer data

    $(document).ready(async () => {
        try {
            const data = await window.electron.invoke('fetchData');
            customerData = data;

            // After fetching data, calculate the total pages
            totalPagesCustomer = Math.ceil(customerData.length / itemsPerPage);

            // Initial population of the table
            renderCustomerPage(currentPageCustomer);
        } catch (error) {
            console.log(error);
        }
    });

    var currentPageCustomer = 1;
    var totalPagesCustomer = 0; // Initialize total pages

    function paginateCustomerData(page) {
        var startIndex = (page - 1) * itemsPerPage;
        var endIndex = startIndex + itemsPerPage;
        return customerData.slice(startIndex, endIndex);
    }

    function populateCustomerTable(tableId, data) {
        var tbody = $('#' + tableId + ' tbody');
        tbody.empty();
        $.each(data, function (index, item) {
            var row = $('<tr>');
            $.each(item, function (key, value) {
                row.append($('<td>').text(value));
            });
            tbody.append(row);
        });
    }

    function updateCustomerPaginationButtons() {
        $('#prevCustomerBtn').prop('disabled', currentPageCustomer === 1);
        $('#nextCustomerBtn').prop('disabled', currentPageCustomer === totalPagesCustomer);
    }

    function renderCustomerPage(page) {
        currentPageCustomer = page;
        var paginatedData = paginateCustomerData(currentPageCustomer);
        populateCustomerTable("CustomerDataTable", paginatedData);
        updateCustomerPaginationButtons();
    }

    // Pagination event handlers
    $('#prevCustomerBtn').on('click', function () {
        if (currentPageCustomer > 1) {
            renderCustomerPage(currentPageCustomer - 1);
        }
    });

    $('#nextCustomerBtn').on('click', function () {
        if (currentPageCustomer < totalPagesCustomer) {
            renderCustomerPage(currentPageCustomer + 1);
        }
    });

})