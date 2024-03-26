$(document).ready(function () { //it waits for html to load

    // Clear previous error messages
    // $('.error-msg').text('');

    $('#save_customer').click(function () {
        var company_name = $('#customer_company_name').val();
        var address = $('#customer_address').val();
        var phone = $('#customer_phone').val();
        var gstin = $('#customer_gstin').val();
        var pan = $('#customer_pan').val();
        var cin = $('#customer_cin').val();
        var poNo = $('#customer_poNo').val();

        window.electron.send('createCustomer', { company_name: company_name, address: address, phone: phone, gstin: gstin, pan: pan, cin: cin, poNo: poNo });
    });
})