FROM python:3.11-slim

WORKDIR /app

# Install system dependencies + git-lfs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*

# Initialize git lfs
RUN git lfs install

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Explicitly pull LFS files (this ensures we get real pkl files, not pointers)
# We do this after COPY . . so the .git folder is present
RUN git lfs pull

# Cloud Run sets the PORT environment variable. 
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
