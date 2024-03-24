$(document).ready(function () {
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
});