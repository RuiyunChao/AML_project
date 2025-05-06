import sqlite3

DB_NAME = 'mydatabase.db'

def drop_items_table(db_name):
    """Drop the 'amb' table from the SQLite database."""
    conn = sqlite3.connect(db_name)
    c = conn.cursor()

    # Drop the 'items' table
    try:
        c.execute("DROP TABLE IF EXISTS amb;")
        conn.commit()
        print("Table 'items' has been dropped.")
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
    finally:
        conn.close()

# Call the function to drop the table
drop_items_table(DB_NAME)
