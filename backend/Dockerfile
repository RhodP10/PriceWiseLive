# Use an official Python runtime with Debian
FROM python:3.11-slim

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies required by Playwright (Chromium)
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libasound2 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN playwright install chromium

# Copy the rest of the application code
COPY . .

# Expose the port Uvicorn runs on
EXPOSE 8000

# Run the FastAPI app using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
