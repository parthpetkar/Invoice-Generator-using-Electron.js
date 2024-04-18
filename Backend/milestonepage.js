let $milestoneDetails = null; // Declare and initialize $milestoneDetails outside of the loop

try {
    const { customers, milestones } = await window.electron.invoke('fetchData');

    customers.forEach(customerData => {
        const matchingMilestones = milestones.filter(milestone => milestone.pono === customerData.pono);

        const $clientBox = $('<div>').addClass('box');
        const $companyname = $('<h2>').addClass("company_name").text(customerData.company_name);
        $companyname.appendTo($clientBox);
        const $clientDetailsHeader = $('<h3>').addClass('show-details').text('Client Details');
        $clientBox.append($clientDetailsHeader);

        const $clientDetails = $('<div>').addClass('milestone-details');

        $('<p>').html(`<strong>Address:</strong> <span id="client_address">${customerData.address}</span>`).appendTo($clientDetails);
        $('<p>').html(`<strong>GSTIN:</strong> <span id="client_gstin">${customerData.gstin}</span>`).appendTo($clientDetails);
        $('<p>').html(`<strong>PAN:</strong> <span id="client_pan">${customerData.pan}</span>`).appendTo($clientDetails);
        $('<p>').html(`<strong>Corporate Identification Number (CIN):</strong> <span id="client_cin">${customerData.cin}</span>`).appendTo($clientDetails);
        $('<p>').html(`<strong>Purchase Order Number (PAN):</strong> <span id="client_poNo">${customerData.pono}</span>`).appendTo($clientDetails);
        $('<p>').html(`<strong>Total Price (Without GST):</strong> <span id="total_price">${customerData.total_price}</span>`).appendTo($clientDetails);

        $clientBox.append($clientDetails);

        if (matchingMilestones.length > 0) {
            const $milestone = $('<div>').addClass('milestone');// Fetch and display milestone data
            $clientBox.append($milestone);
            const $milestoneHeader = $('<h3>').addClass('show-details').text('Milestone Details');
            $milestone.append($milestoneHeader);
            $milestoneDetails = $('<div>').addClass('milestone-details'); // Assign $milestoneDetails inside the block
            try {
                matchingMilestones.forEach(milestone => {
                    $('<p>').html(`<strong>Milestone Name:</strong> <span>${milestone.milestone_name}</span>`).appendTo($milestoneDetails);
                    $('<p>').html(`<strong>Claim Percentage:</strong> <span>${milestone.claim_percentage}</span>`).appendTo($milestoneDetails);
                    $('<p>').html(`<strong>Amount:</strong> <span>${milestone.amount}</span>`).appendTo($milestoneDetails);
                });
            } catch (error) {
                console.error("Error fetching or displaying milestone data:", error);
            }
        }

        $('#clientDataContainer').append($clientBox);

        $clientDetailsHeader.on('click', function () {
            $clientDetails.toggle();
            if ($milestoneDetails) { // Check if $milestoneDetails is defined before toggling
                $milestoneDetails.toggle();
            }
        });
    });
} catch (error) {
    console.log(error);
}