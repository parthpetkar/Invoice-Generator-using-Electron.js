$(document).ready(function () {
    // Function to update the height of the main menu based on window size
    function updateMenuHeight() {
        var windowHeight = $(window).height();
        $('#mainMenu').height(windowHeight);
    }

    // Call the function initially and whenever the window is resized
    updateMenuHeight();
    $(window).resize(updateMenuHeight);
});
