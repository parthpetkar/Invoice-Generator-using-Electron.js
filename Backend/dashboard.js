$(document).ready(async () => {
    try {
        const summaryData = await window.electron.invoke("get-summary-data");
        $("#totalInvoices").text(summaryData.totalMilestones);
        $("#totalCollected").text(
            `₹${summaryData.amountCollected.toLocaleString()}`
        );
        $("#totalPending").text(`₹${summaryData.amountPending.toLocaleString()}`);

        const invoiceData = await window.electron.invoke("get-invoice-data");

        // Group invoices by date and calculate the total amount for each day
        const groupedByDate = invoiceData.reduce((acc, invoice) => {
            const dateKey = invoice.invoice_date.toDateString();
            if (!acc[dateKey]) {
                acc[dateKey] = { totalAmount: 0, count: 0 };
            }
            acc[dateKey].totalAmount += parseFloat(invoice.total_prices);
            acc[dateKey].count++;
            return acc;
        }, {});

        // Calculate the average amount for each day
        const dates = Object.keys(groupedByDate);
        const avgAmounts = dates.map((date) => {
            const avg = groupedByDate[date].totalAmount / groupedByDate[date].count;
            return avg.toFixed(2); // Round to 2 decimal places
        });

        const invoicesData = [
            {
                x: dates,
                y: avgAmounts,
                type: "scatter",
                mode: "lines+markers",
                name: "Invoices",
            },
        ];

        const layout = {
            title: "Average Invoice Amount Over Time",
            xaxis: {
                showgrid: false,
                zeroline: false,
            },
            yaxis: {
                title: "Average Amount",
                showline: false,
            },
        };

        Plotly.newPlot("invoicesChart", invoicesData, layout);

        const invoiceStatusData = await window.electron.invoke(
            "get-invoice-status-data"
        );
        const statuses = invoiceStatusData.map((item) => item.status);
        const counts = invoiceStatusData.map((item) => item.count);

        const statusData = [
            {
                x: statuses,
                y: counts,
                type: "bar",
                name: "Invoices by Status",
            },
        ];

        const statusLayout = {
            title: "Invoices by Status",
            xaxis: {
                title: "Status",
                showgrid: false,
                zeroline: false,
            },
            yaxis: {
                title: "Count",
                showline: false,
            },
        };

        Plotly.newPlot("statusChart", statusData, statusLayout);

        const projects = await window.electron.invoke("get-projects");
        projects.forEach((project) => {
            const projectCard = $(`
                <div class="project-card" data-cin="${project.cin}" data-pono="${project.pono}">
                    <h3>${project.project_name}</h3>
                    <p>CIN: ${project.cin}</p>
                    <p>PONO: ${project.pono}</p>
                    <p>Total Price: ₹ ${project.total_prices}</p>
                    <button class="extend-button">Extend</button>
                </div>
            `);
            $("#projectsContainer").append(projectCard);
        });

        // Event listener for the "Extend" button
        $(".project-card").on("click", ".extend-button", async function () {
            const projectCard = $(this).closest(".project-card");
            const projectdata = {
                cin: projectCard.data("cin"),
                pono: projectCard.data("pono"),
            };

            const { milestones, customers } = await window.electron.invoke("get-milestones", projectdata);
            const modalContent = $("#milestonesModal .modal-content");
            modalContent.empty();
            modalContent.append($(`<h2>${customers[0].company_name}</h2>`));

            milestones.forEach((milestone) => {
                const milestoneCard = $(`
                    <div class="milestone-card">
                        <h4>${milestone.milestone_name}</h4>
                        <p>CIN: ${milestone.cin}</p>
                        <p>PONO: ${milestone.pono}</p>
                        <p>Claim Percent: ${milestone.claim_percent}%</p>
                        <p>Amount: ₹${milestone.amount}</p>
                        <p>Status: ${milestone.status}</p>
                    </div>
                `);
                modalContent.append(milestoneCard);
            });

            // Show the modal
            $("#milestonesModal").css("display", "block");
        });

        // Close the modal when clicking on the close button or outside the modal content
        $("#milestonesModal .close, #milestonesModal").on("click", function (event) {
            if (event.target === this) {
                $("#milestonesModal").css("display", "none");
            }
        });

    } catch (error) {
        console.error("Error fetching data:", error);
    }
});
