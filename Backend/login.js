$(document).ready(async () => {
    $('#loginButton').click(async () => {
        var username = $('#username').val().trim();
        var password = $('#password').val().trim();
        // Validation: only allow alphanumeric, min 3 chars
        var validPattern = /^[a-zA-Z0-9]{3,}$/;
        if (!validPattern.test(username)) {
            alert('Username must be at least 3 characters and contain only letters and numbers.');
            return;
        }
        try {
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