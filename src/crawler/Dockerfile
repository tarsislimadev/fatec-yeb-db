FROM python:3.10-slim

# Install system dependencies for Chrome and Node.js
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libasound2 \
    libxkbcommon0 \
    libgbm1 \
    libxshmfence1 \
    libx11-xcb1 \
    --no-install-recommends && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download pt_core_news_sm

# Install chrome using puppeteer browsers CLI
RUN npx @puppeteer/browsers install chrome@stable

COPY . .

CMD ["python", "app.py"]
