$(document).ready(function () { //it waits for html to load
    $('#save_customer').click(function () {
        var name = $('#customer_company_name').val();
        var address = $('#customer_address').val();
        var phone = $('#customer_phone').val();
        var gstin = $('#customer_gstin').val();
        var pan = $('#customer_pan').val();
        
        window.electron.send('createCustomer', { name: name, address: address, phone: phone, gstin: gstin, pan: pan });
    });
})