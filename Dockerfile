FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1

WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock /app/backend/
RUN uv sync --frozen --no-dev --project /app/backend

COPY backend /app/backend
COPY config.json /app/config.json

WORKDIR /app/backend
EXPOSE 8000

CMD ["uv", "run", "--frozen", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
