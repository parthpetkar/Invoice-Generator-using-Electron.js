$(document).ready(function () {
    $('.content-section').hide();
    $('#create_customers').show();

    $('.nav-menu-item').click(function (e) {
        e.preventDefault();
        const sectionToShow = $(this).attr('href');
        $('.content-section').hide();
        $(sectionToShow).show();
    });

    var itemsPerPage = 14;
    // Sample data for demonstration
    var invoiceData = [
        { no: 1, name: "Task 1", date: "2024-03-08", due: "2024-03-15", status: "Pending", action: "Edit" },
        { no: 2, name: "Task 2", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
        // Add more data as needed
    ];

    var currentPageInvoice = 1;
    var totalPagesInvoice = Math.ceil(invoiceData.length / itemsPerPage);

    function paginateData(page) {
        var startIndex = (page - 1) * itemsPerPage;
        var endIndex = startIndex + itemsPerPage;
        return invoiceData.slice(startIndex, endIndex);
    }

    function populateTable(tableId, data) {
        var tbody = $('#' + tableId + ' tbody');
        tbody.empty();
        $.each(data, function (index, item) {
            var row = $('<tr>');
            $.each(item, function (key, value) {
                if (key === 'action') {
                    var button = $('<button>').text(value).addClass('action-btn');
                    row.append($('<td>').append(button));
                } else {
                    row.append($('<td>').text(value));
                }
            });
            tbody.append(row);
        });
    }

    function updatePaginationButtons() {
        $('#prevInvoiceBtn').prop('disabled', currentPageInvoice === 1);
        $('#nextInvoiceBtn').prop('disabled', currentPageInvoice === totalPagesInvoice);
    }

    function renderPage(page) {
        currentPageInvoice = page;
        var paginatedData = paginateData(currentPageInvoice);
        populateTable("InvoiceDataTable", paginatedData);
        updatePaginationButtons();
    }

    // Initial population of the table
    renderPage(currentPageInvoice);

    // Pagination event handlers
    $('#prevInvoiceBtn').on('click', function () {
        if (currentPageInvoice > 1) {
            renderPage(currentPageInvoice - 1);
        }
    });

    $('#nextInvoiceBtn').on('click', function () {
        if (currentPageInvoice < totalPagesInvoice) {
            renderPage(currentPageInvoice + 1);
        }
    });

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
    
});