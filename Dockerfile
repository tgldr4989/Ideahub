FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
COPY public ./public
RUN useradd -u 10001 -M app && mkdir -p /data/uploads && chown app /data/uploads
USER app
ENV HOST=0.0.0.0 PORT=8000 IDEAHUB_UPLOADS=/data/uploads PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["python", "server.py"]
