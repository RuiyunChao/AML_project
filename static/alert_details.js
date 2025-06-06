function getAlertIdFromQueryString() {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('alertId');
}

function fetchAndDisplayAlertDetails(alertId) {
    // Assuming you have an endpoint to fetch a specific alert by ID
    fetch(`/get_alert/${alertId}`)
        .then(response => response.json())
        .then(alert => {
            displayAlertDetails(alert);
        })
        .catch(error => {
            console.error('Error fetching alert details:', error);
            const alertDetailsContainer = document.getElementById('alert-details-container');
            alertDetailsContainer.innerHTML = '<p>Error loading alert details.</p>';
        });
}

function displayAlertDetails(alert) {
    const alertDetailsContainer = document.getElementById('alert-details-container');
    alertDetailsContainer.innerHTML = ''; // Clear existing content

    if (!alert) {
        alertDetailsContainer.innerHTML = '<p>Alert not found.</p>';
        return;
    }

    // Create a div for the alert details
    const alertDetails = document.createElement('div');
    alertDetails.id = 'alert-details';
    alertDetails.classList.add('alert-details');

    // Populate alert details
    alertDetails.innerHTML = `
        <div class="details-header">
            <h3>Alert Details - ${alert.abm_id || 'N/A'}</h3>
        </div>
        <div class="details-content">
            <div class="sidebar">
                <ul>
                    <li><a href="#overview" class="active-tab">Overview</a></li>
                    <li><a href="#transaction-details">Transaction Details</a></li>
                    <li><a href="#customer-profile">Customer Profile</a></li>
                    <li><a href="#risk-factors">Risk Factors</a></li>
                    <li><a href="#model-explanations">Model Explanations</a></li>
                    <li><a href="#network-graph">Network Graph</a></li>
                    <li><a href="#case-history">Case History</a></li>
                </ul>
            </div>
            <div class="main-content">
                <div id="overview" class="tab-content">
                    <h4>Overview</h4>
                    <p>Alert ID: ${alert.abm_id || 'N/A'}</p>
                    <p>Summary of the alert (generated by RAG model, potentially)</p>
                    <p>Key risk factors</p>
                    <p>Links to relevant policies and procedures</p>
                </div>
                <div id="transaction-details" class="tab-content" style="display: none;">
                    <h4>Transaction Details</h4>
                    <p>Detailed information about the flagged transaction(s):</p>
                    <table>
                        <tr><td>Amount:</td><td>${alert.amount_cad}</td></tr>
                        <tr><td>Date:</td><td>${alert.transaction_date}</td></tr>
                        <tr><td>Time:</td><td>${alert.transaction_time}</td></tr>
                        <tr><td>Currency:</td><td>CAD</td></tr>
                        <tr><td>Counterparty:</td><td>${alert.counterparty || 'N/A'}</td></tr>
                        <tr><td>Location:</td><td>${alert.city || 'N/A'}</td></tr>
                    </table>
                    <h5>Related Transactions:</h5>
                    <table>
                        </table>
                </div>
                <div id="customer-profile" class="tab-content" style="display: none;">
                    <h4>Customer Profile</h4>
                    <p>Customer ID: ${alert.customer_id}</p>
                    <p>Industry Code: ${alert.industry_code || 'N/A'}</p>
                    <p>Employee Count: ${alert.employee_count || 'N/A'}</p>
                    <p>Sales: ${alert.sales || 'N/A'}</p>
                    <p>Transaction history (summary and visualizations)</p>
                    <p>Risk assessment based on historical behavior and KYC data</p>
                </div>
                <div id="risk-factors" class="tab-content" style="display: none;">
                    <h4>Risk Factors</h4>
                    <p>List of all factors contributing to the risk score:</p>
                    <p>Risk Score: ${alert.anomaly_score.toFixed(2)}</p>
                    <p>Rule Based Flag: ${alert.rule_based_flag}</p>
                    <p>Cash Indicator: ${alert.cash_indicator}</p>
                    <ul>
                        <li>Specific rules triggered</li>
                        <li>ML model outputs</li>
                    </ul>
                    <p>Each factor with a brief explanation and a link to more details</p>
                </div>
                <div id="model-explanations" class="tab-content" style="display: none;">
                    <h4>Model Explanations</h4>
                    <p>Visualizations and explanations generated by XAI techniques (e.g., SHAP values, LIME)</p>
                    <p>Explanation of the model's reasoning in human-understandable terms</p>
                </div>
                <div id="network-graph" class="tab-content" style="display: none;">
                    <h4>Network Graph</h4>
                    <p>Visualization of the transaction network surrounding the flagged transaction</p>
                    <p>Interactive features to explore the network</p>
                </div>
                <div id="case-history" class="tab-content" style="display: none;">
                    <h4>Case History</h4>
                    <p>Record of all actions taken on the alert:</p>
                    <ul>
                        <li>Comments</li>
                        <li>Status changes</li>
                        <li>Assigned investigator</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    alertDetailsContainer.appendChild(alertDetails);

    // Add event listeners to tabs
    const tabs = alertDetails.querySelectorAll('.sidebar ul li a');
    tabs.forEach(tab => {
        tab.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('href').substring(1);

            // Deactivate all tabs and hide all content sections
            tabs.forEach(t => t.classList.remove('active-tab'));
            const allContentSections = alertDetails.querySelectorAll('.tab-content');
            allContentSections.forEach(section => section.style.display = 'none');

            // Activate the clicked tab and show the corresponding content
            this.classList.add('active-tab');
            document.getElementById(targetId).style.display = 'block';
        });
    });

    // Show the first tab as active initially
    alertDetails.querySelector('#overview').style.display = 'block';
}

// Get the alert ID from the query string on page load
document.addEventListener('DOMContentLoaded', () => {
    const alertId = getAlertIdFromQueryString();
    if (alertId) {
        fetchAndDisplayAlertDetails(alertId);
    } else {
        // Handle the case where no alert ID is provided
        document.getElementById('alert-details-container').innerHTML = '<p>No alert ID specified.</p>';
    }
});