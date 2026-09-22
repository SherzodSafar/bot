FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OMP_THREAD_LIMIT=1

# Tesseract + tillar: o'zbek (lotin va kirill), rus, ingliz
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        tesseract-ocr tesseract-ocr-uzb tesseract-ocr-uzb-cyrl \
        tesseract-ocr-rus tesseract-ocr-eng \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app.py .

# Render PORT o'zgaruvchisini beradi (odatda 10000)
CMD gunicorn -w 1 --threads 4 -b 0.0.0.0:${PORT:-10000} --timeout 180 app:app
