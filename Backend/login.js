$(document).ready(async () => {
    $('#loginbutton').click(async () => {
        var username = $('#username').val().trim();
        var password = $('#password').val().trim();
        console.log(username, password);
        try {
            // const customerData = saveCustomerData();
            await window.electron.send('login', { username, password });
            // window.electron.receive('createCustomerResponse', (response) => {
            //     if (response.success) {
            //         alert(`Customer created successfully with ID: ${response.customerId}`);
            //     } else {
            //         alert(`Error: ${response.message}\n${response.error}`);
            //     }
            // });
        } catch (error) {
            console.log(error);
        }
    })
});