$(document).ready(function () {
    $('.content-section').hide();
    $('#dashboard').show();

    $('.nav-menu-item').click(function (e) {
        e.preventDefault();
        const sectionToShow = $(this).attr('href');
        $('.content-section').hide();
        $(sectionToShow).show();
    });

    $('.menu-toggle').click(function (e) {
        e.preventDefault(); // Prevent event bubbling
        $('#mainMenu').toggleClass('expanded');
        if ($(window).width() <= 875) {
            $('.main-menu, .menu-toggle').toggleClass('clicked'); // Toggle background color class
        }
    });

    $(document).click(function (e) {
        if (!$(e.target).closest('.main-menu').length) {
            $('#mainMenu').removeClass('expanded');
        }
    });

    $('.show-details').click(function () {
        $(this).next('.milestone-details').slideToggle(300);
    });

    $('#saveProject').click(function () {
        var currentTab = $(this).closest('.tabs-panel');
        var nextTab = currentTab.next('.tabs-panel');

        currentTab.removeClass('is-active');
        nextTab.addClass('is-active');
        var currentTabLink = currentTab.attr('id');
        $('a[href="#' + currentTabLink + '"]').parent().removeClass('is-active');
        $('a[href="#' + nextTab.attr('id') + '"]').parent().addClass('is-active');
    });

    // Back button functionality
    $('#backToProject').click(function () {
        var currentTab = $(this).closest('.tabs-panel');
        var prevTab = currentTab.prev('.tabs-panel');

        currentTab.removeClass('is-active');
        prevTab.addClass('is-active');
        var currentTabLink = currentTab.attr('id');
        $('a[href="#' + currentTabLink + '"]').parent().removeClass('is-active');
        $('a[href="#' + prevTab.attr('id') + '"]').parent().addClass('is-active');
    });

});
