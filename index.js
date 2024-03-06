$(document).ready(function () {
    $('.content-section').hide();

    $('#create_invoices').show();

    $('.nav-menu-item').click(function (e) {
        e.preventDefault();

        const sectionToShow = $(this).attr('href');

        $('.content-section').hide();
        $(sectionToShow).show();
    })

});