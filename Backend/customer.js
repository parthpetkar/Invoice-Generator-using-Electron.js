$(document).ready(async () => { //it waits for html to load

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

    try {
        const data = await window.electron.invoke('fetchData');
        await data.forEach(customerData => {
            const $clientBox = $('<div>').addClass('box');
            const $companyname = $('<h2>').addClass("company_name").text(customerData.company_name);
            $companyname.appendTo($clientBox);
            const $clientDetailsHeader = $('<h3>').addClass('show-details').text('Client Details');
            $clientBox.append($clientDetailsHeader);

            const $milestoneDetails = $('<div>').addClass('milestone-details');

            $('<p>').html(`<strong>Address:</strong> <span id="client_address">${customerData.address}</span>`).appendTo($milestoneDetails);
            $('<p>').html(`<strong>GSTIN:</strong> <span id="client_gstin">${customerData.gstin}</span>`).appendTo($milestoneDetails);
            $('<p>').html(`<strong>PAN:</strong> <span id="client_pan">${customerData.pan}</span>`).appendTo($milestoneDetails);
            $('<p>').html(`<strong>Corporate Identification Number (CIN):</strong> <span id="client_cin">${customerData.cin}</span>`).appendTo($milestoneDetails);
            $('<p>').html(`<strong>Purchase Order Number (PAN):</strong> <span id="client_poNo">${customerData.pono}</span>`).appendTo($milestoneDetails);

            $clientBox.append($milestoneDetails);
            $('#clientDataContainer').append($clientBox);

            $clientDetailsHeader.on('click', function () {
                $milestoneDetails.toggle();
            });
        });
    } catch (error) {
        console.log(error);
    }
});