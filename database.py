import sqlite3
import os
import pandas as pd

DB_NAME = 'mydatabase.db'

# Define file paths and table configurations
FILE_TABLE_MAPPING = {
    "abm.csv": {
        "table_name": "abm",
        "columns": {
            "abm_id": "TEXT PRIMARY KEY",
            "customer_id": "TEXT",
            "amount_cad": "REAL",
            "debit_credit": "TEXT",
            "cash_indicator": "BOOLEAN",
            "country": "TEXT",
            "province": "TEXT",
            "city": "TEXT",
            "transaction_date": "TEXT",
            "transaction_time": "TEXT"
        }
    },
    "all_transactions_month.csv": {
        "table_name": "all_transactions_month",
        "columns": {
            "customer_id": "TEXT",
            "transaction_id": "TEXT PRIMARY KEY",
            "transaction_type": "TEXT",
            "amount_cad": "REAL",
            "debit_credit": "TEXT",
            "month": "TEXT"
        }
    },
    "card.csv": {
        "table_name": "card",
        "columns": {
            "card_trxn_id": "TEXT PRIMARY KEY",
            "customer_id": "TEXT",
            "amount_cad": "REAL",
            "debit_credit": "TEXT",
            "merchant_category": "TEXT",
            "ecommerce_ind": "BOOLEAN",
            "country": "TEXT",
            "province": "TEXT",
            "city": "TEXT",
            "transaction_date": "TEXT",
            "transaction_time": "TEXT"
        }
    },
    "cheque.csv": {
        "table_name": "cheque",
        "columns": {
            "cheque_id": "TEXT PRIMARY KEY",
            "customer_id": "TEXT",
            "amount_cad": "REAL",
            "debit_credit": "TEXT",
            "transaction_date": "TEXT"
        }
    },
    "eft.csv": {
        "table_name": "eft",
        "columns": {
            "eft_id": "TEXT PRIMARY KEY",
            "customer_id": "TEXT",
            "amount_cad": "REAL",
            "debit_credit": "TEXT",
            "transaction_date": "TEXT",
            "transaction_time": "TEXT"
        }
    },
    "emt.csv": {
        "table_name": "emt",
        "columns": {
            "emt_id": "TEXT PRIMARY KEY",
            "customer_id": "TEXT",
            "amount_cad": "REAL",
            "debit_credit": "TEXT",
            "transaction_date": "TEXT",
            "transaction_time": "TEXT"
        }
    },
    "kyc_industry_codes.csv": {
        "table_name": "kyc_industry_codes",
        "columns": {
            "industry_code": "TEXT PRIMARY KEY",
            "industry": "TEXT"
        }
    },
    "kyc.csv": {
        "table_name": "kyc",
        "columns": {
            "customer_id": "TEXT PRIMARY KEY",
            "country": "TEXT",
            "province": "TEXT",
            "city": "TEXT",
            "industry_code": "TEXT",
            "employee_count": "INTEGER",
            "sales": "REAL",
            "established_date": "TEXT",
            "onboard_date": "TEXT"
        }
    },
    "major_group_classification.csv": {
        "table_name": "major_group_classification",
        "columns": {
            "major_group": "TEXT PRIMARY KEY",
            "name": "TEXT"
        }
    },

    "final_anomalies(in).csv": {
        "table_name": "final_anomalies",
        "columns": {
            "customer_id": "TEXT PRIMARY KEY"
        }
    },


    "wire.csv": {
        "table_name": "wire",
        "columns": {
            "wire_id": "TEXT PRIMARY KEY",
            "customer_id": "TEXT",
            "amount_cad": "REAL",
            "debit_credit": "TEXT",
            "transaction_date": "TEXT",
            "transaction_time": "TEXT"
        }

    
    }
}

CSV_FOLDER = 'csv_files/'


def init_table(db_name, table_name, columns):
    """Initialize the SQLite database and create a table with specified columns."""
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # Drop the table if it already exists
    cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
    print(f"Existing table '{table_name}' has been dropped.")

    # Create the table with specified schema
    column_definitions_sql = ", ".join([f"{col} {dtype}" for col, dtype in columns.items()])
    create_table_sql = f"CREATE TABLE {table_name} ({column_definitions_sql});"
    print(f"Creating table with SQL: {create_table_sql}")
    cursor.execute(create_table_sql)

    # Commit and close the connection
    conn.commit()
    conn.close()


def load_csv_to_db(csv_path, db_name, table_name, expected_columns):
    """Load data from a CSV file into the SQLite database."""
    # Load the CSV file into a pandas DataFrame
    df = pd.read_csv(csv_path)

    # Ensure the column names match the desired schema
    if not all(col in df.columns for col in expected_columns):
        raise ValueError(f"The CSV file is missing required columns. Expected: {expected_columns}")

    # Reorder columns to match the table schema
    df = df[expected_columns]

    # Connect to the database
    conn = sqlite3.connect(db_name)

    try:
        # Insert the data into the table
        df.to_sql(table_name, conn, if_exists='append', index=False)
        print(f"Data from {csv_path} has been loaded into the table {table_name}.")
    except Exception as e:
        print(f"Error while inserting data: {e}")
    finally:
        # Close the connection
        conn.close()


if __name__ == "__main__":
    for file_name, config in FILE_TABLE_MAPPING.items():
        csv_path = os.path.join(CSV_FOLDER, file_name)
        table_name = config["table_name"]
        columns = config["columns"]

        print(f"\n--- Processing {file_name} ---")
        
        # Check if the file exists
        if not os.path.exists(csv_path):
            print(f"Error: File not found -> {csv_path}")
            continue

        try:
            # Step 1: Initialize the table
            init_table(DB_NAME, table_name, columns)

            # Step 2: Load CSV data into the database
            load_csv_to_db(csv_path, DB_NAME, table_name, list(columns.keys()))
        except Exception as e:
            print(f"Error processing {file_name}: {e}")

    print("\nAll tables have been initialized, and data has been loaded!")

