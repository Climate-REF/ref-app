# Build the API container for the REF compute engine
# The frontend and backend are built separately and then combined into a single image

FROM ghcr.io/astral-sh/uv:python3.13-bookworm AS backend

  # Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

# Disable Python downloads, because we want to use the system interpreter across both images.
ENV UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# Install the project's dependencies using the lockfile and settings
COPY backend/pyproject.toml backend/uv.lock /app/
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-editable --no-dev --no-install-project

ADD backend /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev


# Build the frontend
# The frontend builds to static content that can be served via the backend
FROM node:22 AS frontend

WORKDIR /frontend

COPY /frontend/package*.json /frontend/

RUN npm install

COPY /frontend/ /frontend/

RUN npm run build

# Runtime container
# Copy the installed packages from the build stage to decrease the size of the final image
FROM python:3.13-slim-bookworm AS runtime

LABEL maintainer="Jared Lewis <jared.lewis@climate-resource.com>"
LABEL description="Docker image for the REF API"

ENV PATH="/app/.venv/bin:${PATH}"
ENV STATIC_DIR=/app/static
ENV REF_CONFIGURATION=/app/.ref
ENV FRONTEND_HOST=http://0.0.0.0:8000

WORKDIR /app

# Copy the installed packages from the build stage
COPY --from=backend --chown=app:app /app /app
COPY /backend /app
COPY --from=frontend --chown=app:app /frontend/dist /app/static

# Run the REF CLI tool by default
ENTRYPOINT ["fastapi", "run", "--workers", "4", "/app/src/ref_backend/main.py"]
