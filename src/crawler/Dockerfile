FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download pt_core_news_sm

COPY . .

CMD ["python", "app.py"]
