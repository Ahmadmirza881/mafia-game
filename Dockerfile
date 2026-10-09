FROM python:3.11-slim

# Create a non-root user with UID 1000 (Hugging Face Spaces standard)
RUN useradd -m -u 1000 user

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files and grant ownership to user 1000
COPY --chown=user:user . .

# Set write permissions for database storage
RUN chmod -R 777 /app

USER user

# Hugging Face Spaces default web port
EXPOSE 7860

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
