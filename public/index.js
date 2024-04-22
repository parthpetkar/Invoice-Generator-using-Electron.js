$(document).ready(function () {
    $('.content-section').hide();
    $('#milestones').show();

    $('.nav-menu-item').click(function (e) {
        e.preventDefault();
        const sectionToShow = $(this).attr('href');
        $('.content-section').hide();
        $(sectionToShow).show();
    });
    // Function to update the height of the main menu based on window size
    $('.menu-toggle').click(function (e) {
        e.stopPropagation(); // Prevent event bubbling
        $('#mainMenu').toggleClass('expanded');
        if ($(window).width() <= 875) {
            $('.main-menu').toggleClass('clicked'); // Toggle the class for background color
            $('.menu-toggle').toggleClass('clicked'); // Toggle the class for background color
        }
    });

    // Close menu when clicking outside
    $(document).click(function (e) {
        if (!$(e.target).closest('.main-menu').length) {
            $('#mainMenu').removeClass('expanded');
        }
    });

    $('.show-details').click(function () {
        $(this).next('.milestone-details').slideToggle(300);
    });
});

$(document).ready(function () {
    $('.next-tab').click(function () {
        var currentTab = $(this).closest('.tabs-panel');
        var nextTab = currentTab.next('.tabs-panel');

        currentTab.removeClass('is-active');
        nextTab.addClass('is-active');

        var currentTabLink = currentTab.attr('id');
        $('a[href="#' + currentTabLink + '"]').parent().removeClass('is-active');
        $('a[href="#' + nextTab.attr('id') + '"]').parent().addClass('is-active');
    });

    $('.prev-tab').click(function () {
        var currentTab = $(this).closest('.tabs-panel');
        var prevTab = currentTab.prev('.tabs-panel');

        currentTab.removeClass('is-active');
        prevTab.addClass('is-active');

        var currentTabLink = currentTab.attr('id');
        $('a[href="#' + currentTabLink + '"]').parent().removeClass('is-active');
        $('a[href="#' + prevTab.attr('id') + '"]').parent().addClass('is-active');
    });
});

// $(document).ready(function () {
//     $('a[href^="#"]').on('click', function (e) {
//         e.preventDefault();

//         var target = this.hash;
//         var $target = $(target);

//         $('html, body').stop().animate({
//             'scrollTop': $target.offset().top
//         }, 900, 'swing', function () {
//             window.location.hash = target;
//         });
//     });
// });


