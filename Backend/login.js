$(document).ready(async () => {
    $('#loginButton').click(async () => {
        var username = $('#username').val().trim();
        var password = $('#password').val().trim();
        try {
            console.log("press")
            await window.electron.send('login', { username, password });
            window.electron.receive('loginResponse', (response) => {
                if (response.success) {
                    alert(`${response.message}`);
                    window.electron.send('load-main-content');
                }
                else {
                    alert(`Invalid Credentials Error: ${response.message}`);
                }
            });
        } catch (error) {
            console.log(error);
        }
    })
});