FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# No compiler or system libraries are needed: every dependency in
# requirements.txt ships a prebuilt wheel (psycopg and psycopg2 use their
# "binary" packages, which bundle libpq).

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files and seed data
COPY . .

# Cloud Run injects $PORT environment variable
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
