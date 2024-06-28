$(document).ready(async () => {
    try {
        const summaryData = await window.electron.invoke("get-summary-data");
        $("#totalAmount").text(`₹${summaryData.totalAmount.toLocaleString()}`);
        $("#totalCollected").text(`₹${summaryData.amountCollected.toLocaleString()}`);
        $("#totalPending").text(`₹${summaryData.amountPending.toLocaleString()}`);
    } catch (error) {
        console.error("Error fetching data:", error);
    }

    try {
        const invoiceData = await window.electron.invoke("get-invoice-data");

        const groupedByDate = invoiceData.reduce((acc, invoice) => {
            const dateKey = new Date(invoice.invoice_date).toDateString();
            if (!acc[dateKey]) {
                acc[dateKey] = { totalAmount: 0, count: 0 };
            }
            acc[dateKey].totalAmount += parseFloat(invoice.total_prices);
            acc[dateKey].count++;
            return acc;
        }, {});

        const dates = Object.keys(groupedByDate);
        const avgAmounts = dates.map((date) => {
            const avg = groupedByDate[date].totalAmount / groupedByDate[date].count;
            return avg.toFixed(2);
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
            xaxis: { showgrid: false, zeroline: false },
            yaxis: { title: "Average Amount", showline: false },
        };

        Plotly.newPlot("invoicesChart", invoicesData, layout);
    } catch (error) {
        console.error("Error fetching data:", error);
    }

    try {
        const invoiceStatusData = await window.electron.invoke("get-invoice-status-data");
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
            xaxis: { title: "Status", showgrid: false, zeroline: false },
            yaxis: { title: "Count", showline: false },
        };

        Plotly.newPlot("statusChart", statusData, statusLayout);
    } catch (error) {
        console.error("Error fetching data:", error);
    }

    try {
        const projects = await window.electron.invoke("get-projects");
        projects.forEach((project) => {
            const projectCard = $(`
                <div class="project-card" data-customer-id="${project.customer_id}" data-project-id="${project.internal_project_id}">
                    <h3>${project.project_name}</h3>
                    <p>Customer ID: ${project.customer_id}</p>
                    <p>Internal Project Number: ${project.internal_project_id}</p>
                    <p>Project Date: ${new Date(project.project_date).toLocaleDateString()}</p>
                    <p>PO No. : ${project.pono}</p>
                    <p>Total Price: ₹ ${project.total_prices.toLocaleString()}</p>
                    <button class="extend-button">Extend</button>
                    <button class="edit-button">Edit</button>
                </div>
            `);
            $("#projectsContainer").append(projectCard);
        });

        $(".project-card").on("click", ".extend-button", async function () {
            const projectCard = $(this).closest(".project-card");
            const projectdata = {
                customer_id: projectCard.data("customer-id"),
                project_id: projectCard.data("project-id"),
            };  

            const { milestones, customers } = await window.electron.invoke("get-milestones", projectdata);
            const modalContent = $("#milestonesModal .modal-content");
            modalContent.empty();
            modalContent.append($(`<h2>${customers[0].company_name}</h2>`));

            milestones.forEach((milestone) => {
                const milestoneCard = $(`
                    <div class="milestone-card">
                        <h4>${milestone.milestone_name}</h4>
                        <p>Claim Percent: ${milestone.claim_percent}%</p>
                        <p>Amount: ₹${milestone.amount}</p>
                        <p>Pending: ${milestone.pending}</p>
                    </div>
                `);
                modalContent.append(milestoneCard);
            });

            $("#milestonesModal").css("display", "block");
        });

        $(".project-card").on("click", ".edit-button", function () {
            const projectCard = $(this).closest(".project-card");
            const projectId = projectCard.data("project-id");
            const customerId = projectCard.data("customer-id");

            $("#projectName").val(projectCard.find("h3").text());
            $("#projectDate").val(new Date(projectCard.find("p:nth-child(4)").text().split(": ")[1]).toISOString().split("T")[0]);
            $("#poNo").val(projectCard.find("p:nth-child(5)").text().split(": ")[1]);
            $("#totalPrices").val(projectCard.find("p:nth-child(6)").text().split("₹ ")[1].replace(/,/g, ''));

            $("#editProjectForm").data("project-id", projectId).data("customer-id", customerId);

            $("#editProjectModal").css("display", "block");
        });

        $("#editProjectForm").submit(async function (event) {
            event.preventDefault();

            const projectData = {
                project_id: $(this).data("project-id"),
                customer_id: $(this).data("customer-id"),
                project_name: $("#projectName").val(),
                project_date: $("#projectDate").val(),
                pono: $("#poNo").val(),
                total_prices: $("#totalPrices").val(),
            };

            try {
                await window.electron.invoke("update-project", projectData);
                alert("Project updated successfully!");
                $("#editProjectModal").css("display", "none");
                location.reload();
            } catch (error) {
                console.error("Error updating project:", error);
            }
        });

        $("#editProjectModal .close, #editProjectModal").on("click", function (event) {
            if (event.target === this) {
                $("#editProjectModal").css("display", "none");
            }
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
});
