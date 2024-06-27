$(document).ready(async () => {
    $('#loginbutton').click(async () => {
        var username = $('#username').val().trim();
        var password = $('#password').val().trim();
        console.log(username, password);
        try {
            // const customerData = saveCustomerData();
            await window.electron.send('login', { username, password });
            window.electron.receive('loginResponse', (response) => {
                if (response.success) {
                    alert(`${response.message}`);
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