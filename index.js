$(document).ready(function () {
    $('.content-section').hide();

    $('#create_customers').show();

    $('.nav-menu-item').click(function (e) {
        e.preventDefault();

        const sectionToShow = $(this).attr('href');

        $('.content-section').hide();
        $(sectionToShow).show();
    })


    $(document).ready(function () {
        // Sample data for demonstration
        var data = [
            { no: 1, name: "Task 1", date: "2024-03-08", due: "2024-03-15", status: "Pending", action: "Edit" },
            { no: 2, name: "Task 2", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
            { no: 2, name: "Task 3", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
            { no: 2, name: "Task 4", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
            { no: 2, name: "Task 5", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
            { no: 2, name: "Task 6", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
            { no: 2, name: "Task 7", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
            { no: 2, name: "Task 8", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
            { no: 2, name: "Task 9", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
            { no: 2, name: "Task 10", date: "2024-03-09", due: "2024-03-16", status: "Completed", action: "Delete" },
            // Add more data as needed
        ];

        var itemsPerPage = 8;
        var currentPage = 1;
        var totalPages = Math.ceil(data.length / itemsPerPage);

        function paginateData(page) {
            var startIndex = (page - 1) * itemsPerPage;
            var endIndex = startIndex + itemsPerPage;
            return data.slice(startIndex, endIndex);
        }

        function populateTable(data) {
            var tbody = $('#dataTable tbody');
            tbody.empty();
            $.each(data, function (index, item) {
                var row = $('<tr>');
                $.each(item, function (key, value) {
                    row.append($('<td>').text(value));
                });
                tbody.append(row);
            });
        }

        function updatePaginationButtons() {
            $('#prevBtn').prop('disabled', currentPage === 1);
            $('#nextBtn').prop('disabled', currentPage === totalPages);
        }

        function renderPage(page) {
            currentPage = page;
            var paginatedData = paginateData(currentPage);
            populateTable(paginatedData);
            updatePaginationButtons();
        }

        // Initial population of the table
        renderPage(currentPage);

        // Pagination event handlers
        $('#prevBtn').on('click', function () {
            if (currentPage > 1) {
                renderPage(currentPage - 1);
            }
        });

        $('#nextBtn').on('click', function () {
            if (currentPage < totalPages) {
                renderPage(currentPage + 1);
            }
        });
    });

});