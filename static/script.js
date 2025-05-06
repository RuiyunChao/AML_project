// Create an alert card element
function createAlertCard(alert) {
  const card = document.createElement('div');
  card.classList.add('alert-card');

  // Determine risk level based on anomaly score
  if (alert.anomaly_score < -0.1) {
    card.classList.add('high');
  } else if (alert.anomaly_score < -0.05) {
    card.classList.add('medium');
  } else {
    card.classList.add('low');
  }

  // Build the card content using a template literal
  card.innerHTML = `
      <h3>Alert ID: ${alert.abm_id || 'N/A'}</h3>
      <p><strong>Customer ID:</strong> ${alert.customer_id}</p>
      <p><strong>Transaction Amount:</strong> ${alert.amount_cad}</p>
      <p><strong>Date/Time:</strong> ${alert.transaction_date} ${alert.transaction_time}</p>
      <p><strong>Location:</strong> ${alert.city || 'N/A'}</p>
      <p><strong>Industry Code:</strong> ${alert.industry_code || 'N/A'}</p>
      <p><strong>Employee Count:</strong> ${alert.employee_count || 'N/A'}</p>
      <p><strong>Sales:</strong> ${alert.sales || 'N/A'}</p>
      <p><strong>Risk Score:</strong> ${alert.anomaly_score.toFixed(2)}</p>
      <p><strong>Rule Based Flag:</strong> ${alert.rule_based_flag}</p>
  `;

  // Create a star button for flagging the alert
  const starButton = document.createElement('button');
  starButton.classList.add('star-button');
  // Default to an empty star
  starButton.innerHTML = '☆';

  // Persist the flagged state using localStorage (using alert.abm_id as key)
  const storageKey = `starred-${alert.abm_id}`;
  let isStarred = localStorage.getItem(storageKey) === 'true';
  if (isStarred) {
    starButton.classList.add('starred');
    starButton.innerHTML = '★';
  }

  // Toggle star state on click
  starButton.addEventListener('click', (event) => {
    // Prevent the card's click event from firing
    event.stopPropagation();
    isStarred = !isStarred;
    if (isStarred) {
      starButton.classList.add('starred');
      starButton.innerHTML = '★';
    } else {
      starButton.classList.remove('starred');
      starButton.innerHTML = '☆';
    }
    localStorage.setItem(storageKey, isStarred);
  });

  // Append the star button to the card
  card.appendChild(starButton);

  // Make the entire card clickable to show alert details
  card.addEventListener('click', () => {
    console.log("Alert card clicked:", alert);
    showAlertDialog(alert);
  });

  return card;
}

// Display alert cards in the alert list container
function displayAlerts(alerts) {
  const alertList = document.getElementById('alert-list');
  alertList.innerHTML = ''; // Clear existing content

  if (alerts.length === 0) {
    alertList.innerHTML = '<p>No alerts found.</p>';
    return;
  }

  alerts.forEach(alert => {
    const card = createAlertCard(alert);
    alertList.appendChild(card);
  });
}

// Get filter values from filter form elements
function getFilters() {
  const customerId = document.getElementById('customer-id-filter').value;
  const transactionType = document.getElementById('transaction-type-filter').value;
  const amountMin = parseFloat(document.getElementById('amount-min-filter').value);
  const amountMax = parseFloat(document.getElementById('amount-max-filter').value);
  const riskScoreMin = parseFloat(document.getElementById('risk-score-min-filter').value);
  const riskScoreMax = parseFloat(document.getElementById('risk-score-max-filter').value);
  const ruleBasedFlag = document.getElementById('rule-based-flag-filter').value;
  const cashIndicator = document.getElementById('cash-indicator-filter').value;
  const country = document.getElementById('country-filter').value;
  const province = document.getElementById('province-filter').value;
  const city = document.getElementById('city-filter').value;
  const industryCode = document.getElementById('industry-code-filter').value;
  const employeeCountMin = parseInt(document.getElementById('employee-count-min-filter').value);
  const employeeCountMax = parseInt(document.getElementById('employee-count-max-filter').value);
  const salesMin = parseFloat(document.getElementById('sales-min-filter').value);
  const salesMax = parseFloat(document.getElementById('sales-max-filter').value);

  return {
    customerId,
    transactionType,
    amountMin,
    amountMax,
    riskScoreMin,
    riskScoreMax,
    ruleBasedFlag,
    cashIndicator,
    country,
    province,
    city,
    industryCode,
    employeeCountMin,
    employeeCountMax,
    salesMin,
    salesMax
  };
}

// Filter alerts based on filter criteria
function filterAlerts(alerts, filters) {
  return alerts.filter(alert => {
    if (filters.customerId && !alert.customer_id.includes(filters.customerId)) return false;
    if (filters.transactionType && alert.transaction_type !== filters.transactionType) return false;
    if (!isNaN(filters.amountMin) && alert.amount_cad < filters.amountMin) return false;
    if (!isNaN(filters.amountMax) && alert.amount_cad > filters.amountMax) return false;
    if (!isNaN(filters.riskScoreMin) && alert.anomaly_score < filters.riskScoreMin) return false;
    if (!isNaN(filters.riskScoreMax) && alert.anomaly_score > filters.riskScoreMax) return false;
    if (filters.ruleBasedFlag && alert.rule_based_flag.toString() !== filters.ruleBasedFlag) return false;
    if (filters.cashIndicator && alert.cash_indicator.toString() !== filters.cashIndicator) return false;
    if (filters.country && !alert.country.includes(filters.country)) return false;
    if (filters.province && !alert.province.includes(filters.province)) return false;
    if (filters.city && !alert.city.includes(filters.city)) return false;
    if (filters.industryCode && !alert.industry_code.includes(filters.industryCode)) return false;
    if (!isNaN(filters.employeeCountMin) && alert.employee_count < filters.employeeCountMin) return false;
    if (!isNaN(filters.employeeCountMax) && alert.employee_count > filters.employeeCountMax) return false;
    if (!isNaN(filters.salesMin) && alert.sales < filters.salesMin) return false;
    if (!isNaN(filters.salesMax) && alert.sales > filters.salesMax) return false;
    return true;
  });
}

// Fetch alerts from the backend, apply filters, and display them
function fetchAndDisplayAlerts() {
  fetch('/get_alerts')
    .then(response => response.json())
    .then(alerts => {
      const filters = getFilters();
      const filteredAlerts = filterAlerts(alerts, filters);
      displayAlerts(filteredAlerts);
    })
    .catch(error => {
      console.error('Error fetching alerts:', error);
      const alertList = document.getElementById('alert-list');
      alertList.innerHTML = '<p>Error loading alerts.</p>';
    });
}

// Event listener for the "Apply Filters" button
const applyFiltersBtn = document.getElementById('apply-filters-btn');
applyFiltersBtn.addEventListener('click', fetchAndDisplayAlerts);

// Initial fetch and display of alerts
fetchAndDisplayAlerts();

// Function to show alert details in a dialog
function showAlertDialog(alert) {
  // Create overlay to grey out the background
  const overlay = document.createElement('div');
  overlay.classList.add('modal-overlay');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '998';
  document.body.appendChild(overlay);

  // Create the dialog element
  const dialog = document.createElement('div');
  dialog.id = 'alert-dialog';
  dialog.classList.add('alert-dialog');
  dialog.style.zIndex = '999';
  dialog.innerHTML = `
    <div class="dialog-header">
      <h3>Alert Details - ${alert.abm_id || 'N/A'}</h3>
      <button class="close-dialog-btn">X</button>
    </div>
    <div class="dialog-content">
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
            <!-- Additional rows if needed -->
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

  // Append the dialog to the body
  document.body.appendChild(dialog);

  // Add event listeners for tabs
  const tabs = dialog.querySelectorAll('.sidebar ul li a');
  tabs.forEach(tab => {
    tab.addEventListener('click', function(event) {
      event.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      // Deactivate all tabs and hide all content sections
      tabs.forEach(t => t.classList.remove('active-tab'));
      const allContentSections = dialog.querySelectorAll('.tab-content');
      allContentSections.forEach(section => section.style.display = 'none');
      // Activate the clicked tab and show the corresponding content
      this.classList.add('active-tab');
      document.getElementById(targetId).style.display = 'block';
    });
  });

  // Show the first tab as active initially
  dialog.querySelector('#overview').style.display = 'block';

  // Add event listener for the close button
  const closeButton = dialog.querySelector('.close-dialog-btn');
  closeButton.addEventListener('click', () => {
    document.body.removeChild(dialog);
    document.body.removeChild(overlay);
  });
}
