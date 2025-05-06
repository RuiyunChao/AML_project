# Use Base Python 3.10.13 Docker image
FROM python:3.10.13-slim

# Set working directory
WORKDIR /app

# Copy requirements.txt and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install papermill and Jupyter
RUN pip install --no-cache-dir papermill jupyter

# Install Supervisor
RUN apt-get update && apt-get install -y supervisor

# Copy Jupyter notebooks, individual CSV files, and supervisord.conf into the notebooks directory
COPY notebooks /app/notebooks
COPY csv_files/* /app/notebooks/  
COPY supervisord.conf /etc/supervisor/supervisord.conf

# Ensure output directory exists
RUN mkdir -p /mnt/output

# Set permissions for the notebooks directory and output folder
RUN chmod -R 777 /app/notebooks /mnt/output

# Define entrypoint to run supervisord
ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
