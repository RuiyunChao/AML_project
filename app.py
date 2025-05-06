from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import pandas as pd
from sklearn.ensemble import IsolationForest
import sqlite3
import logging

# NEW: Import for password hashing (optional)
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# NEW: Secret key is required for session management
app.secret_key = "someRandomSecretKey"  # Use a strong, random value for production

DB_NAME = 'mydatabase.db'

# NEW: Example of a mock user dictionary, storing hashed passwords
# In production, retrieve user credentials from a database
mock_users = {
    # Username : hashed_password
    "testuser": generate_password_hash("testpassword")
}

# -------------- LOGIN ROUTES --------------

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        # Fetch hashed password from database
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("SELECT password FROM users WHERE username = ?", (username,))
        row = c.fetchone()
        conn.close()

        if row is None:
            # No user found with that username
            flash("Invalid username or password.", "danger")
            return redirect(url_for("login"))

        user_hashed_pw = row[0]

        if check_password_hash(user_hashed_pw, password):
            # Password correct
            session["username"] = username
            flash("You have successfully logged in.", "success")
            return redirect(url_for("index"))
        else:
            flash("Invalid username or password.", "danger")
            return redirect(url_for("login"))

    # if GET
    return render_template("login.html")



@app.route("/logout")
def logout():
    """
    Logs out the current user by removing 'username' from the session.
    """
    if "username" in session:
        session.pop("username", None)
        flash("You have been logged out.", "info")
    else:
        flash("You are not currently logged in.", "warning")
    return redirect(url_for("login"))




# -------------- REGISTRATION ROUTES --------------

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")

        # Check if the two password fields match
        if password != confirm_password:
            flash("Passwords do not match. Please try again.", "danger")
            return redirect(url_for("register"))

        # Hash the password for storage
        hashed_pw = generate_password_hash(password)

        # Insert the user into the database
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()

        try:
            # Attempt to insert new user
            c.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_pw))
            conn.commit()
            #flash("Registration successful! You can now log in.", "success")
            return redirect(url_for("login"))

        except sqlite3.IntegrityError:
            # This error occurs if username is not unique (UNIQUE constraint in DB)
            flash("Username already taken. Please choose a different one.", "danger")
            return redirect(url_for("register"))

        finally:
            conn.close()

    # If GET, just render the registration page
    return render_template("registration.html")






# -------------- EXISTING CODE --------------

def load_atm_data():
    """Loads and preprocesses ATM transaction data from the database."""
    conn = sqlite3.connect(DB_NAME)
    try:
        query = "SELECT * FROM abm INNER JOIN final_anomalies USING (customer_id)"  # Assuming 'abm' table for ATM data
        df = pd.read_sql_query(query, conn)

        # Basic preprocessing
        df['amount_cad'] = pd.to_numeric(df['amount_cad'], errors='coerce')
        df.dropna(subset=['amount_cad'], inplace=True)
        df['transaction_date'] = pd.to_datetime(df['transaction_date'])
        df['day_of_week'] = df['transaction_date'].dt.dayofweek
        try:
            df['hour_of_day'] = pd.to_datetime(df['transaction_time'], format='%H:%M:%S').dt.hour
        except ValueError:
            # If the above format fails, try an alternative format
            df['hour_of_day'] = pd.to_datetime(df['transaction_time'], format='%I:%M %p').dt.hour

        return df
    except Exception as e:
        print(f"Error loading ATM data: {e}")
        return None
    finally:
        conn.close()


def load_kyc_data():
    """Loads KYC data from the database."""
    conn = sqlite3.connect(DB_NAME)
    try:
        query = "SELECT customer_id, industry_code, employee_count, sales FROM kyc"
        kyc_data = pd.read_sql_query(query, conn)

        return kyc_data

    except Exception as e:
        print(f"Error loading KYC data: {e}")
        return None
    finally:
        conn.close()


def create_features(df):
    """Creates features from ATM transaction data."""
    features = df.groupby('customer_id').agg(
        total_transactions=('customer_id', 'count'),
        avg_amount=('amount_cad', 'mean'),
        max_amount=('amount_cad', 'max'),
        std_amount=('amount_cad', 'std'),
        unique_locations=('city', 'nunique')  # Assuming 'city' represents location
    )

    features['amount_ratio'] = features['max_amount'] / features['avg_amount']

    # Fill NaN values with 0, you can adjust this strategy as needed
    features.fillna(0, inplace=True)

    return features


def train_anomaly_detection_model(features):
    """Trains a simple Isolation Forest model."""
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(features)
    return model


def detect_anomalies(model, features):
    """Predicts anomalies using the trained model."""
    predictions = model.predict(features)
    scores = model.decision_function(features)
    features['anomaly'] = predictions
    features['anomaly_score'] = scores
    return features


# --- Load data ---
atm_data = load_atm_data()
kyc_data = load_kyc_data()

if atm_data is not None and kyc_data is not None:
    # --- Join KYC data with ATM data ---
    atm_data = atm_data.merge(kyc_data, on='customer_id', how='left')

    # --- Create features ---
    features = create_features(atm_data)

    # --- Train the model ---
    model = train_anomaly_detection_model(features)

    # --- Detect anomalies ---
    anomalies = detect_anomalies(model, features)

    # --- Merge anomaly scores and flags back into the main ATM data ---
    atm_data = atm_data.merge(
        anomalies[['anomaly', 'anomaly_score']],
        left_on='customer_id',
        right_index=True,
        how='left'
    )

    # --- Rule-Based System ---
    def apply_rules(df):
        """Applies simple rule-based logic."""
        df['rule_based_flag'] = 0  # Initialize the column with 0

        # Rule 1: Large cash withdrawals (example threshold: $5000)
        df.loc[df['amount_cad'] > 5000, 'rule_based_flag'] = 1

        # Rule 2: Multiple transactions in a short period (example: within 1 hour)
        # Sort the DataFrame by customer_id and transaction_date
        df.sort_values(['customer_id', 'transaction_date'], inplace=True)

        # Calculate the time difference between consecutive transactions for each customer
        df['time_diff'] = df.groupby('customer_id')['transaction_date'].diff()

        # Flag transactions where the time difference is less than 1 hour (3600 seconds)
        df.loc[df['time_diff'].dt.total_seconds() < 3600, 'rule_based_flag'] = 1

        # Remove the 'time_diff' column as it's no longer needed
        df.drop('time_diff', axis=1, inplace=True)

        return df

    atm_data = apply_rules(atm_data)

    # --- Prepare data for the frontend ---
    alerts_data = atm_data[(atm_data['anomaly'] == -1) | (atm_data['rule_based_flag'] == 1)]

    # Clean the data for JSON serialization
    alerts_data = alerts_data.fillna('N/A')
    alerts_data = alerts_data.replace([True, False], [1, 0])
    alerts_data['transaction_date'] = alerts_data['transaction_date'].dt.strftime('%Y-%m-%d %H:%M:%S')

    alerts_data = alerts_data.to_dict(orient='records')

else:
    logging.error("Error: Data loading or preprocessing failed.")
    alerts_data = []

print(len(alerts_data))


# -------------- PROTECTED ROUTES --------------
# Notice we check for a logged-in user in the index route.

@app.route('/base')
def show_base():
    """
    Route to directly render base.html for testing/design purposes.
    Typically, base.html is used as a parent template,
    but this route allows you to open it directly in your browser.
    """
    return render_template('base.html')

@app.route('/about')
def show_about():
    return render_template('about.html')


@app.route('/')
def index():
    """Homepage with a link to the lookup feature."""
    # NEW: If user is not logged in, redirect to login page.
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template('base.html')

@app.route('/get_alerts', methods=['GET'])
def get_alerts():
    logging.info(f"Alerts data: {alerts_data}")  # Log the data being sent
    return jsonify(alerts_data)


@app.route('/explore')
def explore():
    """
    Explore page that can also be protected or public,
    depending on your requirements.
    """
    if "username" not in session:
        return redirect(url_for("login"))
    alert_count = len(alerts_data)
    return render_template('index_mvp.html', alert_count=alert_count)


@app.route('/lookup', methods=['GET', 'POST'])
def lookup_item():
    """Lookup and display a record based on the given eft_id."""
    # NEW: If user is not logged in, redirect to login page.
    if "username" not in session:
        flash("Please log in first.", "warning")
        return redirect(url_for("login"))

    record = None
    if request.method == 'POST':
        eft_id = request.form.get('eftId')
        if eft_id:
            conn = sqlite3.connect(DB_NAME)
            c = conn.cursor()
            # Query the database for the specified eft_id
            c.execute("SELECT * FROM eft WHERE eft_id=?", (eft_id,))
            record = c.fetchone()
            conn.close()
    return render_template('lookup_item.html', record=record)

@app.route('/alert_details')
def alert_details_page():
    # NEW: If user is not logged in, redirect to login page.
    if "username" not in session:
        flash("Please log in first.", "warning")
        return redirect(url_for("login"))

    return render_template('alert_details.html')

@app.route('/get_alert/<alert_id>')
def get_alert_details(alert_id):
    # NEW: If user is not logged in, redirect to login page.
    if "username" not in session:
        flash("Please log in first.", "warning")
        return redirect(url_for("login"))

    # Assuming 'abm_id' is the unique identifier in the 'abm' table
    alert = None
    for a in alerts_data:
        if a['abm_id'] == alert_id:
            alert = a
            break

    if alert:
        # Remove any non-serializable objects
        return jsonify(alert)
    else:
        return jsonify({'error': 'Alert not found'}), 404


if __name__ == '__main__':
    app.run(debug=True)
